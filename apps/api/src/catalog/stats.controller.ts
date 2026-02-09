import { Controller, Get, Header } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Controller('public/stats')
export class PublicStatsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('home')
  @Header('Cache-Control', 'public, max-age=300, s-maxage=300')
  async getHomeStats() {
    const [pros, missions, users] = await Promise.all([
      this.prisma.proProfile.count({
        where: {
          kycStatus: 'APPROVED',
          user: { status: 'ACTIVE' },
        },
      }),
      this.prisma.booking.count({
        where: { status: 'COMPLETED' },
      }),
      this.prisma.user.count({
        where: { status: 'ACTIVE' },
      }),
    ]);

    return { pros, missions, users, updatedAt: new Date() };
  }
}
