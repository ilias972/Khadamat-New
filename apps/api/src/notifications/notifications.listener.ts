import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationsService } from './notifications.service';
import { BookingEventPayload, BookingEventTypes } from './events/booking-events.types';

function escapeHtml(input: string | undefined | null): string {
  if (!input) return '';
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * NotificationsListener
 *
 * Écoute les événements de réservation et déclenche les notifications appropriées.
 * Complètement découplé de la logique métier (BookingService).
 */
@Injectable()
export class NotificationsListener {
  private readonly logger = new Logger(NotificationsListener.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * Gère l'événement 'booking.created'
   *
   * Envoyé quand un client crée une nouvelle réservation.
   * Actions :
   * - Email au PRO : "Nouvelle demande de réservation"
   * - Push au PRO : "Nouvelle réservation reçue"
   */
  @OnEvent(BookingEventTypes.CREATED, { async: true })
  async handleBookingCreated(payload: BookingEventPayload): Promise<void> {
    try {
      this.logger.log(`📨 Notification envoyée`, {
        event: 'booking.created',
        bookingId: payload.bookingId,
      });

      // Email au PRO
      await this.notificationsService.sendEmail(
        `pro-${payload.proId}@example.com`, // TODO: Récupérer l'email réel depuis la DB
        'Nouvelle demande de réservation',
        `
          <h1>Nouvelle demande de réservation</h1>
          <p>Vous avez reçu une nouvelle demande de réservation.</p>
          <p><strong>ID de réservation :</strong> ${escapeHtml(payload.bookingId)}</p>
          <p>Connectez-vous pour voir les détails et confirmer.</p>
        `,
      );

      // Push au PRO
      await this.notificationsService.sendPush(
        payload.proId,
        'Nouvelle réservation',
        'Vous avez reçu une nouvelle demande de réservation',
        { bookingId: payload.bookingId, type: 'booking_created' },
      );
    } catch (error: unknown) {
      // Ne pas crasher si la notification échoue
      this.logger.error(`❌ Erreur lors de l'envoi de notification (booking.created)`, {
        bookingId: payload.bookingId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Gère l'événement 'booking.confirmed'
   *
   * Envoyé quand le PRO confirme une réservation.
   * Actions :
   * - Email au CLIENT : "Votre réservation est confirmée"
   * - Push au CLIENT : "Réservation confirmée"
   */
  @OnEvent(BookingEventTypes.CONFIRMED, { async: true })
  async handleBookingConfirmed(payload: BookingEventPayload): Promise<void> {
    try {
      this.logger.log(`📨 Notification envoyée`, {
        event: 'booking.confirmed',
        bookingId: payload.bookingId,
      });

      // Email au CLIENT
      await this.notificationsService.sendEmail(
        `client-${payload.clientId}@example.com`, // TODO: Récupérer l'email réel depuis la DB
        'Réservation confirmée',
        `
          <h1>Réservation confirmée ✅</h1>
          <p>Votre réservation a été confirmée par le professionnel.</p>
          <p><strong>ID de réservation :</strong> ${escapeHtml(payload.bookingId)}</p>
          <p>Connectez-vous pour voir les détails.</p>
        `,
      );

      // Push au CLIENT
      await this.notificationsService.sendPush(
        payload.clientId,
        'Réservation confirmée',
        'Le professionnel a confirmé votre réservation',
        { bookingId: payload.bookingId, type: 'booking_confirmed' },
      );
    } catch (error: unknown) {
      this.logger.error(`❌ Erreur lors de l'envoi de notification (booking.confirmed)`, {
        bookingId: payload.bookingId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Gère l'événement 'booking.cancelled'
   *
   * Envoyé quand une réservation est annulée (par le PRO ou le CLIENT).
   * Actions :
   * - Email à l'autre partie : "Réservation annulée"
   * - Push à l'autre partie : "Réservation annulée"
   */
  @OnEvent(BookingEventTypes.CANCELLED, { async: true })
  async handleBookingCancelled(payload: BookingEventPayload): Promise<void> {
    try {
      this.logger.log(`📨 Notification envoyée`, {
        event: 'booking.cancelled',
        bookingId: payload.bookingId,
        reason: payload.reason,
      });

      const reasonText = payload.reason ? `Raison : ${escapeHtml(payload.reason)}` : '';

      // Notifier les deux parties (CLIENT et PRO)
      // Email au CLIENT
      await this.notificationsService.sendEmail(
        `client-${payload.clientId}@example.com`,
        'Réservation annulée',
        `
          <h1>Réservation annulée ❌</h1>
          <p>Votre réservation a été annulée.</p>
          <p><strong>ID de réservation :</strong> ${escapeHtml(payload.bookingId)}</p>
          ${reasonText ? `<p>${reasonText}</p>` : ''}
        `,
      );

      // Email au PRO
      await this.notificationsService.sendEmail(
        `pro-${payload.proId}@example.com`,
        'Réservation annulée',
        `
          <h1>Réservation annulée ❌</h1>
          <p>Une réservation a été annulée.</p>
          <p><strong>ID de réservation :</strong> ${escapeHtml(payload.bookingId)}</p>
          ${reasonText ? `<p>${reasonText}</p>` : ''}
        `,
      );

      // Push au CLIENT
      await this.notificationsService.sendPush(
        payload.clientId,
        'Réservation annulée',
        `Réservation annulée${payload.reason ? ` : ${escapeHtml(payload.reason)}` : ''}`,
        { bookingId: payload.bookingId, type: 'booking_cancelled' },
      );

      // Push au PRO
      await this.notificationsService.sendPush(
        payload.proId,
        'Réservation annulée',
        `Réservation annulée${payload.reason ? ` : ${escapeHtml(payload.reason)}` : ''}`,
        { bookingId: payload.bookingId, type: 'booking_cancelled' },
      );
    } catch (error: unknown) {
      this.logger.error(`❌ Erreur lors de l'envoi de notification (booking.cancelled)`, {
        bookingId: payload.bookingId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Gère l'événement 'booking.modified'
   *
   * Envoyé quand le PRO modifie une réservation (durée, date, etc.).
   * Actions :
   * - Email au CLIENT : "Votre réservation a été modifiée"
   * - Push au CLIENT : "Modification de réservation"
   */
  @OnEvent(BookingEventTypes.MODIFIED, { async: true })
  async handleBookingModified(payload: BookingEventPayload): Promise<void> {
    try {
      this.logger.log(`📨 Notification envoyée`, {
        event: 'booking.modified',
        bookingId: payload.bookingId,
      });

      // Email au CLIENT
      await this.notificationsService.sendEmail(
        `client-${payload.clientId}@example.com`,
        'Modification de réservation',
        `
          <h1>Réservation modifiée 📝</h1>
          <p>Le professionnel a modifié votre réservation.</p>
          <p><strong>ID de réservation :</strong> ${escapeHtml(payload.bookingId)}</p>
          <p>Connectez-vous pour voir les nouvelles informations et accepter ou refuser.</p>
        `,
      );

      // Push au CLIENT
      await this.notificationsService.sendPush(
        payload.clientId,
        'Modification de réservation',
        'Le professionnel a modifié votre réservation',
        { bookingId: payload.bookingId, type: 'booking_modified' },
      );
    } catch (error: unknown) {
      this.logger.error(`❌ Erreur lors de l'envoi de notification (booking.modified)`, {
        bookingId: payload.bookingId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
