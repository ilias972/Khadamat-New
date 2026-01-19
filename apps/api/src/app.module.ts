import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { HealthController } from './health/health.controller';
import { CatalogModule } from './catalog/catalog.module';
import { AuthModule } from './auth/auth.module';
import { ProModule } from './pro/pro.module';
import { BookingModule } from './booking/booking.module';
import { UsersModule } from './users/users.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DatabaseModule,
    CatalogModule,
    AuthModule,
    ProModule,
    BookingModule,
    UsersModule,
    DashboardModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
