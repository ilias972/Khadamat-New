import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { KycController } from './kyc.controller';
import { KycService } from './kyc.service';
import { DatabaseModule } from '../database/database.module';

/**
 * KycModule
 *
 * Module pour la gestion du KYC (Know Your Customer) des professionnels.
 * Gère l'upload des documents CIN et la soumission du dossier KYC.
 */
@Module({
  imports: [DatabaseModule, ConfigModule],
  controllers: [KycController],
  providers: [KycService],
  exports: [KycService],
})
export class KycModule {}
