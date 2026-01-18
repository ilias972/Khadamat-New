import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@khadamat/database';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();
    console.log('✅ Database connected (Prisma)');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    console.log('🔌 Database disconnected (Prisma)');
  }

  // Compatibility layer for raw queries (used by health check)
  async query(sql: string, params?: any[]) {
    return this.$queryRawUnsafe(sql, ...(params || []));
  }
}
