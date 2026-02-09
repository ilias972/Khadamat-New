import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@khadamat/database';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      await this.$connect();
      await this.$executeRaw`SET statement_timeout = '30s'`;
      this.logger.log('Database connected (Prisma) — statement_timeout=30s');
    } catch (err) {
      this.logger.error('Database connection failed', err);
      throw err;
    }

    if (process.env.LOG_QUERIES === 'true') {
      // @ts-expect-error -- Prisma event typing requires explicit log config
      this.$on('query', (e: any) => {
        this.logger.debug(`Query: ${e.query} — Duration: ${e.duration}ms`);
      });
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database disconnected (Prisma)');
  }
}
