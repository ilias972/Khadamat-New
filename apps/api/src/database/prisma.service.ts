import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Client } from 'pg';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private client: Client;

  constructor(private configService: ConfigService) {
    const databaseUrl = this.configService.get<string>('DATABASE_URL');
    this.client = new Client({ connectionString: databaseUrl });
  }

  async onModuleInit() {
    await this.client.connect();
    console.log('✅ Database connected');
  }

  async onModuleDestroy() {
    await this.client.end();
    console.log('🔌 Database disconnected');
  }

  // Helper methods for health check
  async query(sql: string, params?: any[]) {
    return this.client.query(sql, params);
  }

  get city() {
    return {
      count: async () => {
        const result = await this.client.query('SELECT COUNT(*) FROM "City"');
        return parseInt(result.rows[0].count, 10);
      },
    };
  }
}
