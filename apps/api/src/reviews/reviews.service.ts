import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async createReview(clientId: string, dto: { bookingId: string; rating: number; comment?: string }) {
    // Validate rating
    if (!Number.isInteger(dto.rating) || dto.rating < 1 || dto.rating > 5) {
      throw new BadRequestException('La note doit être entre 1 et 5');
    }

    // Verify booking exists
    const booking = await this.prisma.booking.findUnique({
      where: { id: dto.bookingId },
    });

    if (!booking) {
      throw new NotFoundException('Réservation introuvable');
    }

    // Verify ownership
    if (booking.clientId !== clientId) {
      throw new ForbiddenException('Accès refusé');
    }

    // Verify status
    if (booking.status !== 'COMPLETED') {
      throw new BadRequestException('Seules les réservations terminées peuvent être notées');
    }

    // Check if already reviewed (unique constraint on bookingId)
    const existingReview = await this.prisma.review.findUnique({
      where: { bookingId: dto.bookingId },
    });

    if (existingReview) {
      throw new BadRequestException('Un avis a déjà été laissé pour cette réservation');
    }

    return this.prisma.review.create({
      data: {
        bookingId: dto.bookingId,
        clientId,
        proId: booking.proId,
        rating: dto.rating,
        comment: dto.comment || null,
      },
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
      },
    });
  }
}
