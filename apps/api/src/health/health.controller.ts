import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../database/prisma.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Health check — confirms DB connectivity' })
  async health() {
    await this.prisma.$queryRaw`SELECT 1`;
    return { ok: true, time: new Date() };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe — returns 503 if DB unreachable' })
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { ready: true };
    } catch {
      throw new ServiceUnavailableException();
    }
  }
}
