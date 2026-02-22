import Link from 'next/link';
import type { PublicProCard } from '@khadamat/contracts';

interface ProCardProps {
  pro: PublicProCard;
}

/**
 * ProCard
 *
 * Carte d'affichage d'un Pro dans la liste de recherche
 * - Avatar placeholder
 * - Nom masqué (ex: "Ahmed B.")
 * - Badge "Vérifié" si KYC approuvé
 * - Ville
 * - Liste des services avec prix
 */
export default function ProCard({ pro }: ProCardProps) {
  return (
    <Link href={`/pro/${pro.id}`}>
      <div className="bg-surface rounded-lg border border-border p-6 hover:shadow-lg transition cursor-pointer">
        <div className="flex items-start gap-4">
          {/* Avatar Placeholder */}
          <div className="w-16 h-16 bg-surface-active rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-2xl font-bold text-text-secondary">
              {pro.firstName.charAt(0).toUpperCase()}
            </span>
          </div>

          {/* Informations */}
          <div className="flex-1 space-y-3">
            {/* Nom + Badge */}
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-text-primary">
                {pro.firstName} {pro.lastName}
              </h3>
              {pro.isVerified && (
                <span className="inline-flex items-center px-2 py-1 bg-success-100 text-success-800 text-xs font-medium rounded-full">
                  ✓ Vérifié
                </span>
              )}
            </div>

            {/* Ville */}
            <p className="text-sm text-text-secondary">
              📍 {pro.city}
            </p>

            {/* Services */}
            <div className="space-y-1">
              {pro.services.slice(0, 3).map((service, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-text-label">
                    {service.name}
                  </span>
                  <span className="font-medium text-text-primary">
                    {service.priceFormatted}
                  </span>
                </div>
              ))}
              {pro.services.length > 3 && (
                <p className="text-xs text-text-muted mt-2">
                  +{pro.services.length - 3} autre{pro.services.length - 3 > 1 ? 's' : ''} service{pro.services.length - 3 > 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
