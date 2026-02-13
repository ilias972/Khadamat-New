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
          className: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-800',
        };
      case 'CONFIRMED':
        return {
          label: 'Confirmé',
          className: 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200 border-green-200 dark:border-green-800',
        };
      case 'WAITING_FOR_CLIENT':
        return {
          label: 'En attente client',
          className: 'bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-200 border-orange-200 dark:border-orange-800',
        };
      case 'DECLINED':
        return {
          label: 'Refusé',
          className: 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800',
        };
      case 'COMPLETED':
        return {
          label: 'Terminé',
          className: 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800',
        };
      case 'CANCELLED_BY_CLIENT':
        return {
          label: 'Annulé (client)',
          className: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border-zinc-200 dark:border-zinc-700',
        };
      case 'CANCELLED_BY_CLIENT_LATE':
        return {
          label: 'Annulé tard (client)',
          className: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border-zinc-200 dark:border-zinc-700',
        };
      case 'CANCELLED_BY_PRO':
        return {
          label: 'Annulé (pro)',
          className: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border-zinc-200 dark:border-zinc-700',
        };
      case 'CANCELLED_AUTO_OVERLAP':
        return {
          label: 'Annulé (conflit)',
          className: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border-zinc-200 dark:border-zinc-700',
        };
      case 'EXPIRED':
        return {
          label: 'Expiré',
          className: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border-zinc-200 dark:border-zinc-700',
        };
      case 'CANCELLED':
        return {
          label: 'Annulé',
          className: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border-zinc-200 dark:border-zinc-700',
        };
      default:
        return {
          label: status,
          className: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border-zinc-200 dark:border-zinc-700',
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
