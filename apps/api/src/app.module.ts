import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { DatabaseModule } from './database/database.module';
import { HealthController } from './health/health.controller';
import { CatalogModule } from './catalog/catalog.module';
import { AuthModule } from './auth/auth.module';
import { ProModule } from './pro/pro.module';
import { BookingModule } from './booking/booking.module';
import { UsersModule } from './users/users.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { PaymentModule } from './payment/payment.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    EventEmitterModule.forRoot(),
    DatabaseModule,
    CatalogModule,
    AuthModule,
    ProModule,
    BookingModule,
    UsersModule,
    DashboardModule,
    PaymentModule,
    NotificationsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
