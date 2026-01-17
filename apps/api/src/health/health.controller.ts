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
    const cities = await this.prisma.city.count();

    return {
      ok: true,
      cities,
      timestamp: new Date().toISOString(),
    };
  }
}
