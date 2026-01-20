import { Injectable, NotFoundException, ConflictException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type { GetSlotsInput, CreateBookingInput, UpdateBookingStatusInput } from '@khadamat/contracts';

/**
 * BookingService
 *
 * Service pour la gestion des réservations.
 * Algorithme de calcul de disponibilité et création de bookings.
 */
@Injectable()
export class BookingService {
  constructor(private prisma: PrismaService) {}

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
    const { proId, date, categoryId } = dto;

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

    // 3. Récupération Pro (ville)
    const proProfile = await this.prisma.proProfile.findUnique({
      where: { userId: dto.proId },
      select: { cityId: true },
    });
    if (!proProfile) throw new NotFoundException('Professionnel non trouvé');

    // 4. City match
    if (user.cityId !== proProfile.cityId) {
      throw new BadRequestException('CITY_MISMATCH');
    }

    // 5. CONSTRUCTION TIMEZONE-SAFE
    // On crée une date locale explicite sans passer par UTC direct
    const [year, month, day] = dto.date.split('-').map(Number);
    const [hour, minute] = dto.time.split(':').map(Number);
    const timeSlot = new Date(year, month - 1, day, hour, minute);

    // 6. DOUBLE CHECK DISPONIBILITÉ
    const availableSlots = await this.getAvailableSlots({
      proId: dto.proId,
      date: dto.date,
      categoryId: dto.categoryId,
    });

    if (!availableSlots.includes(dto.time)) {
      throw new ConflictException('Ce créneau n\'est plus disponible');
    }

    // 7. CRÉATION BOOKING
    // expiresAt = timeSlot + 24 heures (PRD: expiration si pas de confirmation)
    const booking = await this.prisma.booking.create({
      data: {
        clientId: clientUserId,
        proId: dto.proId,
        categoryId: dto.categoryId,
        cityId: proProfile.cityId,
        timeSlot: timeSlot,
        status: 'PENDING',
        estimatedDuration: 'H1', // MVP: fixé à 1 heure
        expiresAt: new Date(timeSlot.getTime() + 24 * 60 * 60 * 1000), // Expire dans 24h
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
   * @returns Array de bookings avec relations
   */
  async getMyBookings(userId: string, userRole: string) {
    // Filtrage selon le rôle
    const where = userRole === 'CLIENT'
      ? { clientId: userId }
      : { proId: userId };

    const bookings = await this.prisma.booking.findMany({
      where,
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
    });

    return bookings;
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

    // Si DECLINED, pas besoin de transaction
    if (dto.status === 'DECLINED') {
      const booking = await this.prisma.booking.findUnique({
        where: { id: bookingId },
        select: { id: true, proId: true, status: true },
      });

      if (!booking) throw new NotFoundException('Réservation introuvable');
      if (booking.proId !== userId) throw new ForbiddenException('Vous ne pouvez modifier que vos propres réservations');
      if (booking.status !== 'PENDING') throw new BadRequestException('Seules les réservations en attente peuvent être modifiées');

      return this.prisma.booking.update({
        where: { id: bookingId },
        data: { status: 'DECLINED' },
        select: { id: true, status: true, timeSlot: true, proId: true },
      });
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
            data: { status: 'CANCELLED_AUTO_OVERLAP' },
          });
        }
      }

      return updatedBooking;
    }).then(async (booking) => {
      // 9. AUTOMATION BACK-TO-BACK (hors transaction)
      await this.autoCompletePreviousBooking(booking.proId, booking.timeSlot);
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

    // 2. RÉCUPÉRATION BOOKING
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        proId: true,
        status: true,
        isModifiedByPro: true,
        timeSlot: true,
        categoryId: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Réservation introuvable');
    }

    // 3. VÉRIFICATION OWNERSHIP
    if (booking.proId !== userId) {
      throw new ForbiddenException('Vous ne pouvez modifier que vos propres réservations');
    }

    // 4. VÉRIFICATION STATUT
    if (booking.status !== 'PENDING') {
      throw new BadRequestException('Seules les réservations en attente peuvent être modifiées');
    }

    // 5. VÉRIFICATION FLAG
    if (booking.isModifiedByPro) {
      throw new BadRequestException('Cette réservation a déjà été modifiée');
    }

    // 6. VALIDATION DURÉE
    if (duration < 1 || duration > 8) {
      throw new BadRequestException('La durée doit être entre 1 et 8 heures');
    }

    // 7. VÉRIFICATION DISPONIBILITÉ CRÉNEAUX CONSÉCUTIFS
    if (duration > 1) {
      // Récupérer les bookings existants pour vérifier les créneaux consécutifs
      const startTime = new Date(booking.timeSlot);
      const endTime = new Date(startTime.getTime() + duration * 60 * 60 * 1000);

      const conflictingBookings = await this.prisma.booking.findMany({
        where: {
          proId: userId,
          id: { not: bookingId }, // Exclure le booking actuel
          timeSlot: {
            gte: startTime,
            lt: endTime,
          },
          status: {
            in: ['PENDING', 'CONFIRMED', 'WAITING_FOR_CLIENT'],
          },
        },
      });

      if (conflictingBookings.length > 0) {
        throw new ConflictException('Les créneaux consécutifs ne sont pas tous disponibles');
      }
    }

    // 8. UPDATE
    const updatedBooking = await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        duration: duration,
        isModifiedByPro: true,
        status: 'WAITING_FOR_CLIENT',
      },
      select: {
        id: true,
        status: true,
        timeSlot: true,
        duration: true,
        isModifiedByPro: true,
      },
    });

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
        select: { id: true, clientId: true, status: true },
      });

      if (!booking) throw new NotFoundException('Réservation introuvable');
      if (booking.clientId !== userId) throw new ForbiddenException('Vous ne pouvez répondre qu\'à vos propres réservations');
      if (booking.status !== 'WAITING_FOR_CLIENT') throw new BadRequestException('Cette réservation n\'attend pas de réponse');

      return this.prisma.booking.update({
        where: { id: bookingId },
        data: { status: 'DECLINED' },
        select: { id: true, status: true, timeSlot: true, proId: true },
      });
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
            data: { status: 'CANCELLED_AUTO_OVERLAP' },
          });
        }
      }

      return updatedBooking;
    }).then(async (booking) => {
      // 9. AUTOMATION BACK-TO-BACK (hors transaction)
      await this.autoCompletePreviousBooking(booking.proId, booking.timeSlot);
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

    // 2. RÉCUPÉRATION BOOKING
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        proId: true,
        status: true,
        timeSlot: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Réservation introuvable');
    }

    // 3. VÉRIFICATION OWNERSHIP
    if (booking.proId !== userId) {
      throw new ForbiddenException('Vous ne pouvez marquer que vos propres réservations comme terminées');
    }

    // 4. VÉRIFICATION STATUT
    if (booking.status !== 'CONFIRMED') {
      throw new BadRequestException('Seules les réservations confirmées peuvent être marquées comme terminées');
    }

    // 5. VÉRIFICATION QUE LE CRÉNEAU EST PASSÉ
    const now = new Date();
    if (booking.timeSlot > now) {
      throw new BadRequestException('Vous ne pouvez marquer comme terminée qu\'une mission passée');
    }

    // 6. UPDATE
    const updatedBooking = await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
      select: {
        id: true,
        status: true,
        timeSlot: true,
        completedAt: true,
      },
    });

    return updatedBooking;
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
}
