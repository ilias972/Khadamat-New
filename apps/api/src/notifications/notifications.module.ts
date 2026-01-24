import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NotificationsService } from './notifications.service';
import { NotificationsListener } from './notifications.listener';

/**
 * NotificationsModule
 *
 * Module pour la gestion des notifications (Email, Push, SMS).
 * Écoute les événements via EventEmitter et envoie les notifications appropriées.
 */
@Module({
  imports: [ConfigModule],
  providers: [NotificationsService, NotificationsListener],
  exports: [NotificationsService], // Exporté si d'autres modules veulent envoyer des notifications directement
})
export class NotificationsModule {}
