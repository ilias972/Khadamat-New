/**
 * BookingEventPayload
 *
 * Payload strictement typé pour les événements de réservation.
 * Tous les événements de booking utilisent cette interface.
 */
export interface BookingEventPayload {
  bookingId: string;
  proId: string;
  clientId: string;

  /**
   * Raison optionnelle (utilisée pour les annulations)
   * Ex: "Client a annulé", "Pas de disponibilité", etc.
   */
  reason?: string;

  /**
   * Métadonnées optionnelles supplémentaires
   * Ex: timeSlot, categoryId, etc. pour enrichir les notifications
   */
  metadata?: Record<string, unknown>;
}

/**
 * BookingEventTypes
 *
 * Constantes pour les noms d'événements.
 * Évite les typos et facilite le refactoring.
 */
export const BookingEventTypes = {
  CREATED: 'booking.created',
  CONFIRMED: 'booking.confirmed',
  CANCELLED: 'booking.cancelled',
  MODIFIED: 'booking.modified',
} as const;

export type BookingEventType = typeof BookingEventTypes[keyof typeof BookingEventTypes];
