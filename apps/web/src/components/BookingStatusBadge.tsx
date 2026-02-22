interface BookingStatusBadgeProps {
  status: string;
}

/**
 * BookingStatusBadge
 *
 * Badge pour afficher le statut d'une réservation.
 * - PENDING : Jaune (en attente)
 * - CONFIRMED : Vert (confirmé)
 * - DECLINED : Rouge (refusé)
 * - COMPLETED : Bleu (terminé)
 * - CANCELLED : Gris (annulé)
 */
export default function BookingStatusBadge({ status }: BookingStatusBadgeProps) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'PENDING':
        return {
          label: 'En attente',
          className: 'bg-warning-100 text-warning-800 border-warning-200',
        };
      case 'CONFIRMED':
        return {
          label: 'Confirmé',
          className: 'bg-success-100 text-success-800 border-success-200',
        };
      case 'WAITING_FOR_CLIENT':
        return {
          label: 'En attente client',
          className: 'bg-primary-100 text-primary-800 border-primary-200',
        };
      case 'DECLINED':
        return {
          label: 'Refusé',
          className: 'bg-error-100 text-error-800 border-error-200',
        };
      case 'COMPLETED':
        return {
          label: 'Terminé',
          className: 'bg-info-100 text-info-800 border-info-200',
        };
      case 'CANCELLED_BY_CLIENT':
        return {
          label: 'Annulé (client)',
          className: 'bg-surface-active text-text-label border-border',
        };
      case 'CANCELLED_BY_CLIENT_LATE':
        return {
          label: 'Annulé tard (client)',
          className: 'bg-surface-active text-text-label border-border',
        };
      case 'CANCELLED_BY_PRO':
        return {
          label: 'Annulé (pro)',
          className: 'bg-surface-active text-text-label border-border',
        };
      case 'CANCELLED_AUTO_OVERLAP':
        return {
          label: 'Annulé (conflit)',
          className: 'bg-surface-active text-text-label border-border',
        };
      case 'CANCELLED_AUTO_FIRST_CONFIRMED':
        return {
          label: 'Annulée automatiquement',
          className: 'bg-surface-active text-text-label border-border',
        };
      case 'EXPIRED':
        return {
          label: 'Expiré',
          className: 'bg-surface-active text-text-label border-border',
        };
      case 'CANCELLED':
        return {
          label: 'Annulé',
          className: 'bg-surface-active text-text-label border-border',
        };
      default:
        return {
          label: status,
          className: 'bg-surface-active text-text-label border-border',
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${config.className}`}
    >
      {config.label}
    </span>
  );
}
