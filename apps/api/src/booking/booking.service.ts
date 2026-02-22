import { Injectable, NotFoundException, ConflictException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../database/prisma.service';
import { CatalogResolverService } from '../catalog/catalog-resolver.service';
import { getPagination, getPaginationMeta } from '../common/utils/pagination';
import type { GetSlotsInput, CreateBookingInput, UpdateBookingStatusInput, CancelBookingInput } from '@khadamat/contracts';
import { BookingEventTypes, BookingEventPayload } from '../notifications/events/booking-events.types';

/**
 * BookingService
 *
 * Service pour la gestion des réservations.
 * Algorithme de calcul de disponibilité et création de bookings.
 */
@Injectable()
export class BookingService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    private catalogResolver: CatalogResolverService,
  ) {}

  /**
   * getAvailableSlots
   *
   * Récupère les créneaux disponibles pour un Pro à une date donnée.
   *
   * ALGORITHME :
   * 1. Vérifier que le Pro a un service actif pour cette catégorie
   * 2. Récupérer la disponibilité hebdomadaire pour le jour de la semaine
   * 3. Récupérer les bookings existants pour cette date
   * 4. Générer les slots de 60 minutes et filtrer les occupés
   *
   * @param dto - { proId, date (YYYY-MM-DD), categoryId }
   * @returns Array de strings (ex: ["09:00", "10:00", "11:00"])
   */
  async getAvailableSlots(dto: GetSlotsInput): Promise<string[]> {
    const proId = await this.resolveProId(dto.proId);
    const { date } = dto;
    const categoryId = await this.catalogResolver.resolveCategoryId(dto.categoryId);

    // 1. VALIDATION SERVICE
    // Vérifie que le Pro a un service actif pour ce categoryId
    const service = await this.prisma.proService.findUnique({
      where: {
        proUserId_categoryId: {
          proUserId: proId,
          categoryId: categoryId,
        },
      },
    });

    if (!service || !service.isActive) {
      return []; // Pas de service actif -> Pas de slots disponibles
    }

    // 2. JOUR DE LA SEMAINE
    // Récupère le dayOfWeek (0=Dimanche, 1=Lundi, ..., 6=Samedi)
    const dateObj = new Date(date);
    const dayOfWeek = dateObj.getDay(); // getDay() retourne 0-6

    // Récupère la disponibilité hebdomadaire pour ce jour
    const availability = await this.prisma.weeklyAvailability.findUnique({
      where: {
        proUserId_dayOfWeek: {
          proUserId: proId,
          dayOfWeek: dayOfWeek,
        },
      },
    });

    if (!availability || !availability.isActive) {
      return []; // Pas de dispo ou jour repos -> Pas de slots
    }

    // 3. BOOKINGS EXISTANTS - Logique d'intervalle
    // Récupère UNIQUEMENT les bookings CONFIRMED (PENDING/WAITING ne bloquent pas)
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const existingBookings = await this.prisma.booking.findMany({
      where: {
        proId: proId,
        timeSlot: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: 'CONFIRMED', // SEULS les CONFIRMED bloquent
      },
      select: {
        timeSlot: true,
        duration: true, // Nécessaire pour la logique d'intervalle
      },
    });

    // Convertir les bookings en Set de "HH:MM" avec logique d'intervalle
    // Une réservation de 2h bloque 2 créneaux consécutifs
    const occupiedSlots = new Set<string>();
    for (const booking of existingBookings) {
      const duration = booking.duration || 1; // Default 1h si non défini

      // Marquer tous les créneaux couverts par cette réservation
      for (let hour = 0; hour < duration; hour++) {
        const slotTime = new Date(booking.timeSlot.getTime() + hour * 60 * 60 * 1000);
        const hours = slotTime.getHours().toString().padStart(2, '0');
        const minutes = slotTime.getMinutes().toString().padStart(2, '0');
        occupiedSlots.add(`${hours}:${minutes}`);
      }
    }

    // 4. GÉNÉRATION DES SLOTS
    // Génère des créneaux toutes les 60 minutes entre startMin et endMin
    const slots: string[] = [];

    // Date/heure actuelle pour filtrer les créneaux passés
    const now = new Date();

    // startMin et endMin sont en minutes depuis 00:00
    // Ex: 540 = 9h00, 1080 = 18h00
    for (let min = availability.startMin; min < availability.endMin; min += 60) {
      const hours = Math.floor(min / 60);
      const minutes = min % 60;
      const timeSlot = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

      // Construire la date complète du slot pour comparaison
      const slotDateTime = new Date(dateObj);
      slotDateTime.setHours(hours, minutes, 0, 0);

      // Vérifier si le slot n'est pas déjà occupé ET n'est pas dans le passé
      if (!occupiedSlots.has(timeSlot) && slotDateTime > now) {
        slots.push(timeSlot);
      }
    }

    return slots;
  }

  /**
   * createBooking
   *
   * Crée une réservation pour un client.
   *
   * VALIDATION :
   * 1. Vérifie que l'utilisateur est un CLIENT
   * 2. Vérifie que le client a renseigné sa ville (cityId)
   * 3. Vérifie que le client a renseigné son adresse
   * 4. Validation géographique : cityId client === cityId pro
   * 5. Vérifie que le slot est disponible (double check)
   * 6. Crée le booking
   *
   * @param clientUserId - ID de l'utilisateur client
   * @param userRole - Rôle de l'utilisateur (pour validation)
   * @param dto - { proId, categoryId, date, time }
   * @returns Booking créé
   */
  async createBooking(
    clientUserId: string,
    userRole: string,
    dto: CreateBookingInput,
  ) {
    // 1. VALIDATION ROLE
    if (userRole !== 'CLIENT') {
      throw new ForbiddenException('Seuls les clients peuvent créer des réservations');
    }

    // Resolve proId (accepts publicId or cuid)
    const resolvedProId = await this.resolveProId(dto.proId);

    // 1. Récupération User
    const user = await this.prisma.user.findUnique({
      where: { id: clientUserId },
      select: { id: true, cityId: true, addressLine: true },
    });
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    // 2. Validations strictes
    if (!user.cityId) throw new BadRequestException('CITY_REQUIRED');
    if (!user.addressLine || user.addressLine.trim() === '') {
      throw new BadRequestException('ADDRESS_REQUIRED');
    }

    // 3. Récupération Pro (ville + KYC)
    const proProfile = await this.prisma.proProfile.findUnique({
      where: { userId: resolvedProId },
      select: { cityId: true, kycStatus: true },
    });
    if (!proProfile) throw new NotFoundException('Professionnel non trouvé');

    // 3b. KYC gate — seuls les pros APPROVED sont réservables
    if (proProfile.kycStatus !== 'APPROVED') {
      throw new ForbiddenException('Ce professionnel n\'est pas disponible à la réservation');
    }

    // 4. City match
    if (user.cityId !== proProfile.cityId) {
      throw new BadRequestException('CITY_MISMATCH');
    }

    // 5. CONSTRUCTION TIMEZONE-SAFE
    // On crée une date locale explicite sans passer par UTC direct
    const [year, month, day] = dto.date.split('-').map(Number);
    const [hour, minute] = dto.time.split(':').map(Number);
    const timeSlot = new Date(year, month - 1, day, hour, minute);

    const categoryId = await this.catalogResolver.resolveCategoryId(dto.categoryId);

    // 5b. VALIDATION SERVICE — le Pro doit avoir un service actif pour cette catégorie
    const proService = await this.prisma.proService.findUnique({
      where: {
        proUserId_categoryId: { proUserId: resolvedProId, categoryId },
      },
    });
    if (!proService || !proService.isActive) {
      throw new ConflictException({
        message: 'Créneau déjà pris',
        code: 'SLOT_TAKEN',
      });
    }

    // 6-8. TRANSACTION ATOMIQUE : vérification disponibilité + création booking
    const booking = await this.prisma.$transaction(async (tx) => {
      // 6. VÉRIFICATION DISPONIBILITÉ DANS LA TRANSACTION
      // Seuls les CONFIRMED bloquent (logique métier existante)
      const startOfDay = new Date(timeSlot);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(timeSlot);
      endOfDay.setHours(23, 59, 59, 999);

      const confirmedBookings = await tx.booking.findMany({
        where: {
          proId: resolvedProId,
          status: 'CONFIRMED',
          timeSlot: { gte: startOfDay, lte: endOfDay },
        },
        select: { timeSlot: true, duration: true },
      });

      // Vérifier si le créneau est bloqué par un booking CONFIRMED
      const occupiedSlots = new Set<string>();
      for (const b of confirmedBookings) {
        const dur = b.duration || 1;
        for (let h = 0; h < dur; h++) {
          const st = new Date(b.timeSlot.getTime() + h * 60 * 60 * 1000);
          const hh = st.getHours().toString().padStart(2, '0');
          const mm = st.getMinutes().toString().padStart(2, '0');
          occupiedSlots.add(`${hh}:${mm}`);
        }
      }

      if (occupiedSlots.has(dto.time)) {
        throw new ConflictException({
          message: 'Créneau déjà pris',
          code: 'SLOT_TAKEN',
        });
      }

      // Vérifier également la disponibilité hebdomadaire et service (inchangé)
      const dateObj2 = new Date(dto.date);
      const dayOfWeek = dateObj2.getDay();
      const availability = await tx.weeklyAvailability.findUnique({
        where: {
          proUserId_dayOfWeek: { proUserId: resolvedProId, dayOfWeek },
        },
      });
      if (!availability || !availability.isActive) {
        throw new ConflictException({
          message: 'Créneau déjà pris',
          code: 'SLOT_TAKEN',
        });
      }

      const slotMinutes = hour * 60 + minute;
      if (slotMinutes < availability.startMin || slotMinutes >= availability.endMin) {
        throw new ConflictException({
          message: 'Créneau déjà pris',
          code: 'SLOT_TAKEN',
        });
      }

      // Slot dans le passé
      const now = new Date();
      if (timeSlot <= now) {
        throw new ConflictException({
          message: 'Créneau déjà pris',
          code: 'SLOT_TAKEN',
        });
      }

      // 7. CRÉATION BOOKING (atomique dans la transaction)
      const created = await tx.booking.create({
        data: {
          clientId: clientUserId,
          proId: resolvedProId,
          categoryId: categoryId,
          cityId: proProfile.cityId,
          timeSlot: timeSlot,
          status: 'PENDING',
          estimatedDuration: 'H1',
          expiresAt: new Date(timeSlot.getTime() + 24 * 60 * 60 * 1000),
        },
        select: {
          id: true,
          status: true,
          timeSlot: true,
          category: { select: { id: true, name: true } },
          pro: {
            select: {
              user: { select: { firstName: true, lastName: true } },
              city: { select: { name: true } },
            },
          },
        },
      });

      // 8. PERSISTER ÉVÉNEMENT EN DB (dans la transaction)
      await this.createBookingEvent(
        tx, created.id, 'CREATED', clientUserId, 'CLIENT',
        { categoryId: dto.categoryId, timeSlot: timeSlot.toISOString() },
      );

      return created;
    });

    // 9. ÉMETTRE ÉVÉNEMENT (hors transaction — fire-and-forget)
    const eventPayload: BookingEventPayload = {
      bookingId: booking.id,
      proId: resolvedProId,
      clientId: clientUserId,
      metadata: {
        categoryId: dto.categoryId,
        timeSlot: timeSlot.toISOString(),
      },
    };
    this.eventEmitter.emit(BookingEventTypes.CREATED, eventPayload);

    return booking;
  }

  /**
   * getMyBookings
   *
   * Récupère les réservations de l'utilisateur connecté.
   * - CLIENT : bookings où clientId = userId
   * - PRO : bookings où proId = userId
   *
   * @param userId - ID de l'utilisateur connecté
   * @param userRole - Rôle de l'utilisateur (CLIENT ou PRO)
   * @param page - Page number
   * @param limit - Items per page
   * @param scope - Optional filter: "history" for closed bookings
   * @returns Array de bookings avec relations
   */
  async getMyBookings(userId: string, userRole: string, page: number = 1, limit: number = 20, scope?: string) {
    // Filtrage selon le rôle
    const where: any = userRole === 'CLIENT'
      ? { clientId: userId }
      : { proId: userId };

    // Filtre scope=history : statuts terminés uniquement
    if (scope === 'history') {
      where.status = {
        in: [
          'COMPLETED',
          'DECLINED',
          'EXPIRED',
          'CANCELLED_BY_PRO',
          'CANCELLED_BY_CLIENT',
          'CANCELLED_AUTO_FIRST_CONFIRMED',
          'CANCELLED_AUTO_OVERLAP',
        ],
      };
    }

    const { skip, take } = getPagination(page, limit);

    const [bookings, total] = await this.prisma.$transaction([
      this.prisma.booking.findMany({
        where,
        skip,
        take,
        orderBy: { timeSlot: 'desc' },
        select: {
          id: true,
          status: true,
          timeSlot: true,
          estimatedDuration: true,
          duration: true,
          isModifiedByPro: true,
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          city: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          // Pour le CLIENT: inclure infos du PRO
          ...(userRole === 'CLIENT' && {
            pro: {
              select: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                    phone: true,
                  },
                },
                city: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          }),
          // Pour le PRO: inclure infos du CLIENT
          ...(userRole === 'PRO' && {
            client: {
              select: {
                firstName: true,
                lastName: true,
                phone: true,
              },
            },
          }),
        },
      }),
      this.prisma.booking.count({ where }),
    ]);

    return {
      data: bookings,
      meta: getPaginationMeta(page, limit, total),
    };
  }

  /**
   * updateBookingStatus
   *
   * Met à jour le statut d'une réservation (PRO uniquement).
   *
   * SÉCURITÉ :
   * - Seul le PRO propriétaire peut modifier le statut
   * - Seulement si status === PENDING
   *
   * @param bookingId - ID du booking à modifier
   * @param userId - ID du PRO connecté
   * @param userRole - Rôle (doit être PRO)
   * @param dto - { status: 'CONFIRMED' | 'DECLINED' }
   * @returns Booking mis à jour
   */
  async updateBookingStatus(
    bookingId: string,
    userId: string,
    userRole: string,
    dto: UpdateBookingStatusInput,
  ) {
    // 1. VALIDATION ROLE
    if (userRole !== 'PRO') {
      throw new ForbiddenException('Seuls les professionnels peuvent modifier le statut des réservations');
    }

    // DECLINED → Transaction atomique avec updateMany conditionnel
    if (dto.status === 'DECLINED') {
      const result = await this.prisma.$transaction(async (tx) => {
        // Atomic conditional update: only succeeds if status is still PENDING
        const { count } = await tx.booking.updateMany({
          where: { id: bookingId, proId: userId, status: 'PENDING' },
          data: { status: 'DECLINED' },
        });

        if (count === 0) {
          // Diagnose why it failed
          const booking = await tx.booking.findUnique({
            where: { id: bookingId },
            select: { proId: true, status: true },
          });
          if (!booking) throw new NotFoundException('Réservation introuvable');
          if (booking.proId !== userId) throw new ForbiddenException('Vous ne pouvez modifier que vos propres réservations');
          throw new BadRequestException({
            message: 'Statut incompatible avec cette action',
            code: 'INVALID_STATUS_TRANSITION',
          });
        }

        // Fetch updated booking for return value + events
        const updatedBooking = await tx.booking.findUnique({
          where: { id: bookingId },
          select: { id: true, status: true, timeSlot: true, proId: true, clientId: true },
        });

        await this.createBookingEvent(tx, bookingId, 'DECLINED', userId, 'PRO');

        return updatedBooking!;
      });

      // Emit event outside transaction
      this.eventEmitter.emit(BookingEventTypes.CANCELLED, {
        bookingId: result.id,
        proId: result.proId,
        clientId: result.clientId,
        reason: 'Réservation refusée par le professionnel',
      } as BookingEventPayload);

      return { id: result.id, status: result.status, timeSlot: result.timeSlot, proId: result.proId };
    }

    // CONFIRMED → Transaction atomique avec Winner-Takes-All
    return this.prisma.$transaction(async (tx) => {
      // 2. RÉCUPÉRATION BOOKING
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        select: {
          id: true,
          proId: true,
          status: true,
          timeSlot: true,
          duration: true,
        },
      });

      if (!booking) throw new NotFoundException('Réservation introuvable');

      // 3. VÉRIFICATION OWNERSHIP
      if (booking.proId !== userId) {
        throw new ForbiddenException('Vous ne pouvez modifier que vos propres réservations');
      }

      // 4. VÉRIFICATION STATUT
      if (booking.status !== 'PENDING') {
        throw new BadRequestException('Seules les réservations en attente peuvent être modifiées');
      }

      // 5. CALCUL INTERVALLE CIBLE
      const targetStart = booking.timeSlot;
      const targetEnd = this.computeEndTime(targetStart, booking.duration);

      // 6. VÉRIFICATION CONFLITS AVEC CONFIRMED EXISTANTS
      const startOfDay = new Date(targetStart);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetStart);
      endOfDay.setHours(23, 59, 59, 999);

      const confirmedBookings = await tx.booking.findMany({
        where: {
          proId: booking.proId,
          status: 'CONFIRMED',
          timeSlot: { gte: startOfDay, lte: endOfDay },
        },
        select: { id: true, timeSlot: true, duration: true },
      });

      for (const confirmed of confirmedBookings) {
        const confirmedEnd = this.computeEndTime(confirmed.timeSlot, confirmed.duration);
        if (this.overlaps(targetStart, targetEnd, confirmed.timeSlot, confirmedEnd)) {
          throw new BadRequestException("Ce créneau n'est plus disponible.");
        }
      }

      // 7. CONFIRMATION
      const updatedBooking = await tx.booking.update({
        where: { id: bookingId },
        data: { status: 'CONFIRMED', confirmedAt: new Date() },
        select: { id: true, status: true, timeSlot: true, proId: true, duration: true },
      });

      // PERSISTER ÉVÉNEMENT CONFIRMED
      await this.createBookingEvent(tx, bookingId, 'CONFIRMED', userId, 'PRO');

      // 8. NETTOYAGE - Annuler les réservations concurrentes
      const competingBookings = await tx.booking.findMany({
        where: {
          proId: booking.proId,
          id: { not: bookingId },
          status: { in: ['PENDING', 'WAITING_FOR_CLIENT'] },
          timeSlot: { gte: startOfDay, lte: endOfDay },
        },
        select: { id: true, timeSlot: true, duration: true },
      });

      for (const competing of competingBookings) {
        const competingEnd = this.computeEndTime(competing.timeSlot, competing.duration);
        if (this.overlaps(targetStart, targetEnd, competing.timeSlot, competingEnd)) {
          await tx.booking.update({
            where: { id: competing.id },
            data: { status: 'CANCELLED_AUTO_OVERLAP', cancelledAt: new Date() },
          });
          await this.createBookingEvent(tx, competing.id, 'CANCELLED', null, null, { reason: 'auto_overlap' });
        }
      }

      return updatedBooking;
    }).then(async (booking) => {
      // 9. AUTOMATION BACK-TO-BACK (hors transaction)
      await this.autoCompletePreviousBooking(booking.proId, booking.timeSlot);

      // 10. ÉMETTRE ÉVÉNEMENT CONFIRMATION
      // Récupérer clientId pour l'événement
      const bookingDetails = await this.prisma.booking.findUnique({
        where: { id: booking.id },
        select: { clientId: true },
      });

      if (bookingDetails) {
        const eventPayload: BookingEventPayload = {
          bookingId: booking.id,
          proId: booking.proId,
          clientId: bookingDetails.clientId,
          metadata: {
            timeSlot: booking.timeSlot.toISOString(),
            duration: booking.duration,
          },
        };
        this.eventEmitter.emit(BookingEventTypes.CONFIRMED, eventPayload);
      }

      return booking;
    });
  }

  /**
   * updateBooking
   *
   * Permet au PRO de modifier la durée d'une réservation PENDING (une seule fois).
   *
   * RÈGLES :
   * - Booking doit être en statut PENDING
   * - isModifiedByPro doit être false (une seule modification autorisée)
   * - Si duration > 1h, vérifie que les créneaux consécutifs sont libres
   * - Passe le booking en statut WAITING_FOR_CLIENT
   * - Marque isModifiedByPro = true
   *
   * @param bookingId - ID du booking à modifier
   * @param userId - ID du PRO connecté
   * @param userRole - Rôle (doit être PRO)
   * @param duration - Nouvelle durée en heures (1-8)
   * @returns Booking mis à jour
   */
  async updateBooking(
    bookingId: string,
    userId: string,
    userRole: string,
    duration: number,
  ) {
    // 1. VALIDATION ROLE
    if (userRole !== 'PRO') {
      throw new ForbiddenException('Seuls les professionnels peuvent modifier les réservations');
    }

    // 2. VALIDATION DURÉE (before transaction)
    if (duration < 1 || duration > 8) {
      throw new BadRequestException('La durée doit être entre 1 et 8 heures');
    }

    // 3-8. TRANSACTION ATOMIQUE
    const updatedBooking = await this.prisma.$transaction(async (tx) => {
      // Atomic conditional update: PENDING + not yet modified
      const { count } = await tx.booking.updateMany({
        where: {
          id: bookingId,
          proId: userId,
          status: 'PENDING',
          isModifiedByPro: false,
        },
        data: {
          duration: duration,
          isModifiedByPro: true,
          status: 'WAITING_FOR_CLIENT',
        },
      });

      if (count === 0) {
        // Diagnose why it failed
        const booking = await tx.booking.findUnique({
          where: { id: bookingId },
          select: { proId: true, status: true, isModifiedByPro: true },
        });
        if (!booking) throw new NotFoundException('Réservation introuvable');
        if (booking.proId !== userId) throw new ForbiddenException('Vous ne pouvez modifier que vos propres réservations');
        if (booking.isModifiedByPro) {
          throw new BadRequestException({
            message: 'Cette réservation a déjà été modifiée',
            code: 'ALREADY_MODIFIED',
          });
        }
        throw new BadRequestException({
          message: 'Statut incompatible avec cette action',
          code: 'INVALID_STATUS_TRANSITION',
        });
      }

      // Verify consecutive slot availability INSIDE the transaction
      if (duration > 1) {
        const booking = await tx.booking.findUnique({
          where: { id: bookingId },
          select: { timeSlot: true },
        });

        if (booking) {
          const startTime = new Date(booking.timeSlot);
          const endTime = new Date(startTime.getTime() + duration * 60 * 60 * 1000);

          const conflicting = await tx.booking.findMany({
            where: {
              proId: userId,
              id: { not: bookingId },
              timeSlot: { gte: startTime, lt: endTime },
              status: { in: ['PENDING', 'CONFIRMED', 'WAITING_FOR_CLIENT'] },
            },
            select: { id: true },
          });

          if (conflicting.length > 0) {
            // Rollback: revert the update
            await tx.booking.update({
              where: { id: bookingId },
              data: { duration: 1, isModifiedByPro: false, status: 'PENDING' },
            });
            throw new ConflictException({
              message: 'Les créneaux consécutifs ne sont pas tous disponibles',
              code: 'SLOT_CONFLICT',
            });
          }
        }
      }

      return tx.booking.findUnique({
        where: { id: bookingId },
        select: {
          id: true,
          status: true,
          timeSlot: true,
          duration: true,
          isModifiedByPro: true,
          clientId: true,
        },
      });
    });

    // 9. ÉMETTRE ÉVÉNEMENT MODIFICATION (hors transaction)
    if (updatedBooking) {
      const eventPayload: BookingEventPayload = {
        bookingId: updatedBooking.id,
        proId: userId,
        clientId: updatedBooking.clientId,
        metadata: {
          newDuration: duration,
          timeSlot: updatedBooking.timeSlot.toISOString(),
        },
      };
      this.eventEmitter.emit(BookingEventTypes.MODIFIED, eventPayload);
    }

    return updatedBooking;
  }

  /**
   * respondToModification
   *
   * Permet au CLIENT de répondre à une modification de durée proposée par le PRO.
   *
   * RÈGLES :
   * - Booking doit être en statut WAITING_FOR_CLIENT
   * - Si accept: passe en CONFIRMED avec vérification des conflits
   * - Si refuse: passe en DECLINED
   *
   * @param bookingId - ID du booking
   * @param userId - ID du CLIENT connecté
   * @param userRole - Rôle (doit être CLIENT)
   * @param accept - true = accepter, false = refuser
   * @returns Booking mis à jour
   */
  async respondToModification(
    bookingId: string,
    userId: string,
    userRole: string,
    accept: boolean,
  ) {
    // 1. VALIDATION ROLE
    if (userRole !== 'CLIENT') {
      throw new ForbiddenException('Seuls les clients peuvent répondre aux modifications');
    }

    // Si DECLINED, pas besoin de transaction
    if (!accept) {
      const booking = await this.prisma.booking.findUnique({
        where: { id: bookingId },
        select: { id: true, clientId: true, proId: true, status: true },
      });

      if (!booking) throw new NotFoundException('Réservation introuvable');
      if (booking.clientId !== userId) throw new ForbiddenException('Vous ne pouvez répondre qu\'à vos propres réservations');
      if (booking.status !== 'WAITING_FOR_CLIENT') throw new BadRequestException('Cette réservation n\'attend pas de réponse');

      const updatedBooking = await this.prisma.booking.update({
        where: { id: bookingId },
        data: { status: 'DECLINED' },
        select: { id: true, status: true, timeSlot: true, proId: true },
      });

      // PERSISTER ÉVÉNEMENT EN DB
      await this.createBookingEvent(
        this.prisma, booking.id, 'DECLINED', userId, 'CLIENT',
        { reason: 'Modification refusée par le client' },
      );

      // ÉMETTRE ÉVÉNEMENT ANNULATION
      const eventPayload: BookingEventPayload = {
        bookingId: booking.id,
        proId: booking.proId,
        clientId: booking.clientId,
        reason: 'Modification refusée par le client',
      };
      this.eventEmitter.emit(BookingEventTypes.CANCELLED, eventPayload);

      return updatedBooking;
    }

    // CONFIRMED → Transaction atomique avec Winner-Takes-All
    return this.prisma.$transaction(async (tx) => {
      // 2. RÉCUPÉRATION BOOKING
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        select: {
          id: true,
          clientId: true,
          proId: true,
          status: true,
          timeSlot: true,
          duration: true,
        },
      });

      if (!booking) throw new NotFoundException('Réservation introuvable');

      // 3. VÉRIFICATION OWNERSHIP
      if (booking.clientId !== userId) {
        throw new ForbiddenException('Vous ne pouvez répondre qu\'à vos propres réservations');
      }

      // 4. VÉRIFICATION STATUT
      if (booking.status !== 'WAITING_FOR_CLIENT') {
        throw new BadRequestException('Cette réservation n\'attend pas de réponse');
      }

      // 5. CALCUL INTERVALLE CIBLE
      const targetStart = booking.timeSlot;
      const targetEnd = this.computeEndTime(targetStart, booking.duration);

      // 6. VÉRIFICATION CONFLITS AVEC CONFIRMED EXISTANTS
      const startOfDay = new Date(targetStart);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetStart);
      endOfDay.setHours(23, 59, 59, 999);

      const confirmedBookings = await tx.booking.findMany({
        where: {
          proId: booking.proId,
          status: 'CONFIRMED',
          timeSlot: { gte: startOfDay, lte: endOfDay },
        },
        select: { id: true, timeSlot: true, duration: true },
      });

      for (const confirmed of confirmedBookings) {
        const confirmedEnd = this.computeEndTime(confirmed.timeSlot, confirmed.duration);
        if (this.overlaps(targetStart, targetEnd, confirmed.timeSlot, confirmedEnd)) {
          throw new BadRequestException("Ce créneau n'est plus disponible.");
        }
      }

      // 7. CONFIRMATION
      const updatedBooking = await tx.booking.update({
        where: { id: bookingId },
        data: { status: 'CONFIRMED', confirmedAt: new Date() },
        select: { id: true, status: true, timeSlot: true, proId: true, duration: true },
      });

      // PERSISTER ÉVÉNEMENT CONFIRMED (client accepte modification)
      await this.createBookingEvent(tx, bookingId, 'CONFIRMED', userId, 'CLIENT', { modificationAccepted: true });

      // 8. NETTOYAGE - Annuler les réservations concurrentes
      const competingBookings = await tx.booking.findMany({
        where: {
          proId: booking.proId,
          id: { not: bookingId },
          status: { in: ['PENDING', 'WAITING_FOR_CLIENT'] },
          timeSlot: { gte: startOfDay, lte: endOfDay },
        },
        select: { id: true, timeSlot: true, duration: true },
      });

      for (const competing of competingBookings) {
        const competingEnd = this.computeEndTime(competing.timeSlot, competing.duration);
        if (this.overlaps(targetStart, targetEnd, competing.timeSlot, competingEnd)) {
          await tx.booking.update({
            where: { id: competing.id },
            data: { status: 'CANCELLED_AUTO_OVERLAP', cancelledAt: new Date() },
          });
          await this.createBookingEvent(tx, competing.id, 'CANCELLED', null, null, { reason: 'auto_overlap' });
        }
      }

      return updatedBooking;
    }).then(async (booking) => {
      // 9. AUTOMATION BACK-TO-BACK (hors transaction)
      await this.autoCompletePreviousBooking(booking.proId, booking.timeSlot);

      // 10. ÉMETTRE ÉVÉNEMENT CONFIRMATION (client accepte modification)
      const bookingDetails = await this.prisma.booking.findUnique({
        where: { id: booking.id },
        select: { clientId: true },
      });

      if (bookingDetails) {
        const eventPayload: BookingEventPayload = {
          bookingId: booking.id,
          proId: booking.proId,
          clientId: bookingDetails.clientId,
          metadata: {
            timeSlot: booking.timeSlot.toISOString(),
            duration: booking.duration,
            modificationAccepted: true,
          },
        };
        this.eventEmitter.emit(BookingEventTypes.CONFIRMED, eventPayload);
      }

      return booking;
    });
  }

  /**
   * completeBooking
   *
   * Permet au PRO de marquer une réservation CONFIRMED comme COMPLETED.
   *
   * RÈGLES :
   * - Booking doit être en statut CONFIRMED
   * - Le créneau doit être dans le passé
   * - Passe en statut COMPLETED
   * - Enregistre completedAt
   *
   * @param bookingId - ID du booking
   * @param userId - ID du PRO connecté
   * @param userRole - Rôle (doit être PRO)
   * @returns Booking mis à jour
   */
  async completeBooking(
    bookingId: string,
    userId: string,
    userRole: string,
  ) {
    // 1. VALIDATION ROLE
    if (userRole !== 'PRO') {
      throw new ForbiddenException('Seuls les professionnels peuvent marquer une mission comme terminée');
    }

    // 2-6. TRANSACTION ATOMIQUE
    const result = await this.prisma.$transaction(async (tx) => {
      // Atomic conditional update: only succeeds if status is still CONFIRMED
      const { count } = await tx.booking.updateMany({
        where: { id: bookingId, proId: userId, status: 'CONFIRMED' },
        data: { status: 'COMPLETED', completedAt: new Date() },
      });

      if (count === 0) {
        // Diagnose why it failed
        const booking = await tx.booking.findUnique({
          where: { id: bookingId },
          select: { proId: true, status: true },
        });
        if (!booking) throw new NotFoundException('Réservation introuvable');
        if (booking.proId !== userId) throw new ForbiddenException('Vous ne pouvez marquer que vos propres réservations comme terminées');
        throw new BadRequestException({
          message: 'Statut incompatible avec cette action',
          code: 'INVALID_STATUS_TRANSITION',
        });
      }

      // Fetch updated booking + verify timing with duration
      const updatedBooking = await tx.booking.findUnique({
        where: { id: bookingId },
        select: { id: true, status: true, timeSlot: true, completedAt: true, duration: true },
      });

      // Verify that the full duration has elapsed (timeSlot + duration*1h <= now)
      if (updatedBooking) {
        const endTime = this.computeEndTime(updatedBooking.timeSlot, updatedBooking.duration);
        const now = new Date();
        if (endTime > now) {
          // Rollback: revert to CONFIRMED
          await tx.booking.update({
            where: { id: bookingId },
            data: { status: 'CONFIRMED', completedAt: null },
          });
          throw new BadRequestException({
            message: 'La mission n\'est pas encore terminée',
            code: 'TOO_EARLY_TO_COMPLETE',
          });
        }
      }

      await this.createBookingEvent(tx, bookingId, 'COMPLETED', userId, 'PRO');

      return updatedBooking!;
    });

    return result;
  }

  /**
   * cancelBooking
   *
   * Permet au CLIENT ou au PRO d'annuler une réservation CONFIRMED.
   *
   * CLIENT :
   * - Si timeSlot > now + 24h → CANCELLED_BY_CLIENT
   * - Si timeSlot <= now + 24h → CANCELLED_BY_CLIENT_LATE
   * - Pas de reason requise
   *
   * PRO :
   * - Status → CANCELLED_BY_PRO
   * - reason obligatoire (5-200 chars)
   */
  async cancelBooking(
    bookingId: string,
    userId: string,
    userRole: string,
    dto: CancelBookingInput,
  ) {
    // PRO: validate reason upfront (before transaction)
    if (userRole === 'PRO') {
      // KYC gate for PRO cancellation
      const proProfile = await this.prisma.proProfile.findUnique({
        where: { userId },
        select: { kycStatus: true },
      });
      if (!proProfile || proProfile.kycStatus !== 'APPROVED') {
        throw new ForbiddenException({
          message: 'KYC non approuvé',
          code: 'KYC_NOT_APPROVED',
        });
      }

      if (!dto.reason || dto.reason.trim().length < 5) {
        throw new BadRequestException('Le motif d\'annulation est obligatoire pour les professionnels (min 5 caractères)');
      }
    }

    if (userRole === 'CLIENT') {
      // CLIENT cancellation — atomic transaction
      const result = await this.prisma.$transaction(async (tx) => {
        const { count } = await tx.booking.updateMany({
          where: { id: bookingId, clientId: userId, status: 'CONFIRMED' },
          data: { status: 'CANCELLED_BY_CLIENT', cancelledAt: new Date() },
        });

        if (count === 0) {
          const booking = await tx.booking.findUnique({
            where: { id: bookingId },
            select: { clientId: true, status: true },
          });
          if (!booking) throw new NotFoundException('Réservation introuvable');
          if (booking.clientId !== userId) throw new ForbiddenException('Vous ne pouvez annuler que vos propres réservations');
          throw new BadRequestException({
            message: 'Statut incompatible avec cette action',
            code: 'INVALID_STATUS_TRANSITION',
          });
        }

        // Determine late vs normal based on timeSlot
        const updated = await tx.booking.findUnique({
          where: { id: bookingId },
          select: { id: true, status: true, timeSlot: true, proId: true, clientId: true },
        });

        if (updated) {
          const now = new Date();
          const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
          if (updated.timeSlot <= twentyFourHoursFromNow) {
            // Late cancellation — update status
            await tx.booking.update({
              where: { id: bookingId },
              data: { status: 'CANCELLED_BY_CLIENT_LATE' },
            });
            updated.status = 'CANCELLED_BY_CLIENT_LATE' as any;
          }
        }

        await this.createBookingEvent(tx, bookingId, 'CANCELLED', userId, 'CLIENT', { status: updated!.status });

        return updated!;
      });

      this.eventEmitter.emit(BookingEventTypes.CANCELLED, {
        bookingId: result.id,
        proId: result.proId,
        clientId: result.clientId,
        reason: 'Annulation par le client',
      } as BookingEventPayload);

      return { id: result.id, status: result.status, timeSlot: result.timeSlot };
    }

    if (userRole === 'PRO') {
      // PRO cancellation — atomic transaction
      const result = await this.prisma.$transaction(async (tx) => {
        const { count } = await tx.booking.updateMany({
          where: { id: bookingId, proId: userId, status: 'CONFIRMED' },
          data: { status: 'CANCELLED_BY_PRO', cancelledAt: new Date(), cancelReason: dto.reason },
        });

        if (count === 0) {
          const booking = await tx.booking.findUnique({
            where: { id: bookingId },
            select: { proId: true, status: true },
          });
          if (!booking) throw new NotFoundException('Réservation introuvable');
          if (booking.proId !== userId) throw new ForbiddenException('Vous ne pouvez annuler que vos propres réservations');
          throw new BadRequestException({
            message: 'Statut incompatible avec cette action',
            code: 'INVALID_STATUS_TRANSITION',
          });
        }

        const updated = await tx.booking.findUnique({
          where: { id: bookingId },
          select: { id: true, status: true, timeSlot: true, proId: true, clientId: true },
        });

        await this.createBookingEvent(tx, bookingId, 'CANCELLED', userId, 'PRO', { reason: dto.reason });

        return updated!;
      });

      this.eventEmitter.emit(BookingEventTypes.CANCELLED, {
        bookingId: result.id,
        proId: result.proId,
        clientId: result.clientId,
        reason: dto.reason,
      } as BookingEventPayload);

      return { id: result.id, status: result.status, timeSlot: result.timeSlot };
    }

    throw new ForbiddenException('Rôle non autorisé pour cette action');
  }

  /**
   * resolveProId
   * Accepts either a ProProfile.publicId (pro_<hex32>) or a User.id (cuid).
   * Returns the internal userId (cuid) for use as FK.
   */
  private async resolveProId(input: string): Promise<string> {
    if (/^pro_[0-9a-f]{32}$/.test(input)) {
      const profile = await this.prisma.proProfile.findUnique({
        where: { publicId: input },
        select: { userId: true },
      });
      if (!profile) {
        throw new NotFoundException('Professionnel non trouvé');
      }
      return profile.userId;
    }
    return input;
  }

  /**
   * computeEndTime
   * Calcule l'heure de fin d'une réservation
   * @param start - Heure de début
   * @param duration - Durée en heures
   * @returns Heure de fin
   */
  private computeEndTime(start: Date, duration: number): Date {
    return new Date(start.getTime() + duration * 60 * 60 * 1000);
  }

  /**
   * overlaps
   * Vérifie si deux intervalles de temps se chevauchent
   * @param startA - Début intervalle A
   * @param endA - Fin intervalle A
   * @param startB - Début intervalle B
   * @param endB - Fin intervalle B
   * @returns true si chevauchement
   */
  private overlaps(startA: Date, endA: Date, startB: Date, endB: Date): boolean {
    // Deux intervalles se chevauchent si :
    // startA < endB && startB < endA
    return startA < endB && startB < endA;
  }

  /**
   * autoCompletePreviousBooking (Automation Back-to-Back)
   *
   * Logique "Domino" : Quand une réservation passe à CONFIRMED,
   * vérifie s'il existe une réservation précédente back-to-back
   * pour le même PRO et la marque automatiquement comme COMPLETED.
   *
   * Condition stricte : previousBooking.startTime + previousBooking.duration === currentStartTime
   *
   * @param proId - ID du PRO
   * @param currentStartTime - Heure de début de la réservation actuelle
   */
  private async autoCompletePreviousBooking(
    proId: string,
    currentStartTime: Date,
  ) {
    try {
      // Calculer le début de la journée pour filtrer par même jour
      const startOfDay = new Date(currentStartTime);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(currentStartTime);
      endOfDay.setHours(23, 59, 59, 999);

      // Chercher toutes les réservations CONFIRMED du PRO pour ce jour
      const confirmedBookings = await this.prisma.booking.findMany({
        where: {
          proId: proId,
          status: 'CONFIRMED',
          timeSlot: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        select: {
          id: true,
          timeSlot: true,
          duration: true,
        },
        orderBy: {
          timeSlot: 'asc',
        },
      });

      // Vérifier chaque booking pour trouver celui qui se termine exactement au début du current
      for (const previousBooking of confirmedBookings) {
        // Calculer l'heure de fin de previousBooking
        const previousEndTime = new Date(
          previousBooking.timeSlot.getTime() +
            previousBooking.duration * 60 * 60 * 1000,
        );

        // Comparaison stricte : previousEndTime === currentStartTime
        // On compare les timestamps pour éviter les problèmes de millisecondes
        if (previousEndTime.getTime() === currentStartTime.getTime()) {
          // Marquer automatiquement comme COMPLETED
          await this.prisma.booking.update({
            where: { id: previousBooking.id },
            data: {
              status: 'COMPLETED',
              completedAt: new Date(),
            },
          });

          // Une seule réservation peut être back-to-back, on arrête
          break;
        }
      }
    } catch (error) {
      // Ne pas bloquer la confirmation en cas d'erreur automation
      console.error('Erreur automation back-to-back:', error);
    }
  }

  /**
   * createBookingEvent
   * Persiste un événement dans la table BookingEvent.
   * @param tx - Transaction Prisma ou PrismaService
   */
  private async createBookingEvent(
    tx: any,
    bookingId: string,
    type: string,
    actorUserId?: string,
    actorRole?: string,
    metadata?: Record<string, any>,
  ) {
    await tx.bookingEvent.create({
      data: {
        bookingId,
        type,
        actorUserId: actorUserId || null,
        actorRole: actorRole || null,
        metadata: metadata || null,
      },
    });
  }

}
