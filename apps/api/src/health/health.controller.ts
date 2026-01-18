import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../database/prisma.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Health check endpoint with database proof' })
  async check() {
    // Utilisation de la syntaxe standard Prisma
    const citiesCount = await this.prisma.city.count();

    return {
      ok: true,
      cities: citiesCount,
      timestamp: new Date().toISOString(),
    };
  }
}
