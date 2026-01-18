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

    // 3. BOOKINGS EXISTANTS
    // Récupère les bookings du Pro pour cette date (00:00 à 23:59)
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
        status: {
          in: ['PENDING', 'CONFIRMED', 'COMPLETED'],
        },
      },
      select: {
        timeSlot: true,
      },
    });

    // Convertir les bookings en Set de "HH:MM" pour lookup rapide
    const occupiedSlots = new Set(
      existingBookings.map((b) => {
        const hours = b.timeSlot.getHours().toString().padStart(2, '0');
        const minutes = b.timeSlot.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
      }),
    );

    // 4. GÉNÉRATION DES SLOTS
    // Génère des créneaux toutes les 60 minutes entre startMin et endMin
    const slots: string[] = [];

    // startMin et endMin sont en minutes depuis 00:00
    // Ex: 540 = 9h00, 1080 = 18h00
    for (let min = availability.startMin; min < availability.endMin; min += 60) {
      const hours = Math.floor(min / 60);
      const minutes = min % 60;
      const timeSlot = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

      // Vérifier si le slot n'est pas déjà occupé
      if (!occupiedSlots.has(timeSlot)) {
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
   * 2. Vérifie que le slot est disponible (double check)
   * 3. Récupère le cityId depuis le profil du Pro
   * 4. Crée le booking
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

    // 2. RÉCUPÉRATION CITYID
    // Le cityId vient du profil du Pro (source de vérité)
    const proProfile = await this.prisma.proProfile.findUnique({
      where: { userId: dto.proId },
      select: { cityId: true },
    });

    if (!proProfile) {
      throw new NotFoundException('Professionnel non trouvé');
    }

    // 3. CONSTRUCTION TIMEZONE-SAFE
    // On crée une date locale explicite sans passer par UTC direct
    const [year, month, day] = dto.date.split('-').map(Number);
    const [hour, minute] = dto.time.split(':').map(Number);
    const timeSlot = new Date(year, month - 1, day, hour, minute);

    // 4. DOUBLE CHECK DISPONIBILITÉ
    const availableSlots = await this.getAvailableSlots({
      proId: dto.proId,
      date: dto.date,
      categoryId: dto.categoryId,
    });

    if (!availableSlots.includes(dto.time)) {
      throw new ConflictException('Ce créneau n\'est plus disponible');
    }

    // 5. CRÉATION BOOKING
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

    // 2. RÉCUPÉRATION BOOKING
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        proId: true,
        status: true,
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

    // 5. UPDATE
    const updatedBooking = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: dto.status },
      select: {
        id: true,
        status: true,
        timeSlot: true,
      },
    });

    return updatedBooking;
  }
}
