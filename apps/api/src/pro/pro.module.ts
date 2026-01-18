import { Module } from '@nestjs/common';
import { ProController } from './pro.controller';
import { ProService } from './pro.service';
import { DatabaseModule } from '../database/database.module';

/**
 * ProModule
 *
 * Module pour la gestion du profil et de la configuration des Professionnels.
 *
 * Endpoints :
 * - GET /api/pro/me
 * - PATCH /api/pro/profile
 * - PUT /api/pro/services
 * - PUT /api/pro/availability
 */
@Module({
  imports: [DatabaseModule],
  controllers: [ProController],
  providers: [ProService],
  exports: [ProService],
})
export class ProModule {}
