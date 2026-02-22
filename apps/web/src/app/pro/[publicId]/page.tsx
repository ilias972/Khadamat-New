import Link from 'next/link';
import { notFound } from 'next/navigation';
import Header from '../../../components/Header';
import ProBookingCTA from '../../../components/ProBookingCTA';
import ProDetailClient from './ProDetailClient';
import type { PublicProProfile } from '@khadamat/contracts';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface ProDetailPageProps {
  params: Promise<{ publicId: string }>;
}

export default async function ProDetailPage({ params }: ProDetailPageProps) {
  const { publicId } = await params;
  const apiUrl = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL;

  let pro: PublicProProfile | null = null;
  let hasLoadError = false;

  try {
    const response = await fetch(`${apiUrl}/public/pros/${publicId}`, {
      cache: 'no-store',
    });

    if (response.status === 404) {
      notFound();
    }
    if (!response.ok) {
      throw new Error(`PRO_FETCH_FAILED_${response.status}`);
    }

    pro = await response.json();
  } catch (error) {
    console.error('Failed to fetch pro profile:', error);
    hasLoadError = true;
  }

  if (hasLoadError) {
    return (
      <div className="min-h-screen bg-background">
        <Header />

        <main className="container mx-auto px-6 py-16">
          <div className="max-w-3xl mx-auto">
            <div
              className="bg-surface rounded-lg border border-error-200 p-8"
              role="alert"
              aria-live="polite"
            >
              <h1 className="text-2xl font-bold text-text-primary mb-3">
                Impossible de charger ce profil
              </h1>
              <p className="text-text-secondary mb-6">
                Vérifiez votre connexion ou réessayez.
              </p>
              <div className="flex flex-wrap gap-3">
                <a
                  href={`/pro/${publicId}`}
                  className="inline-flex items-center px-5 py-2.5 bg-inverse-bg text-inverse-text rounded-lg hover:bg-inverse-hover transition"
                >
                  Réessayer
                </a>
                <Link
                  href="/pros"
                  className="inline-flex items-center px-5 py-2.5 border border-border-strong text-text-primary rounded-lg hover:bg-surface-active transition"
                >
                  Retour aux pros
                </Link>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!pro) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-6 py-16">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header du profil */}
          <div className="bg-surface rounded-lg border border-border p-8">
            <div className="flex items-start gap-6">
              {/* Avatar */}
              <div className="w-24 h-24 bg-border rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                {pro.avatarUrl ? (
                  <img src={pro.avatarUrl} alt={pro.firstName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl font-bold text-text-secondary">
                    {pro.firstName.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              {/* Informations principales */}
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-3xl font-bold text-text-primary">
                    {pro.firstName} {pro.lastName}
                  </h1>
                  {pro.isVerified && (
                    <span className="inline-flex items-center px-3 py-1 bg-success-100 text-success-800 text-sm font-medium rounded-full">
                      ✓ Vérifié
                    </span>
                  )}
                  {pro.isPremium && (
                    <span className="inline-flex items-center px-3 py-1 bg-warning-100 text-warning-800 text-sm font-medium rounded-full">
                      Premium
                    </span>
                  )}
                </div>

                <p className="text-lg text-text-secondary">
                  📍 {pro.city}
                </p>

                {/* Rating */}
                {(pro.ratingCount ?? 0) > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span
                          key={star}
                          className={star <= (pro.ratingAvg ?? 0) ? 'text-warning-500' : 'text-text-muted'}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                    <span className="text-text-label font-medium">
                      {pro.ratingAvg}
                    </span>
                    <span className="text-text-muted text-sm">
                      ({pro.ratingCount} avis)
                    </span>
                    {(pro.completedBookingsCount ?? 0) > 0 && (
                      <span className="text-text-muted text-sm ml-2">
                        · {pro.completedBookingsCount} missions
                      </span>
                    )}
                  </div>
                )}

                {/* Bio */}
                {pro.bio && (
                  <p className="text-text-secondary">{pro.bio}</p>
                )}

                {/* Favorite button (client-side) */}
                <ProDetailClient proId={pro.id} />
              </div>
            </div>
          </div>

          {/* Portfolio (premium only) */}
          {pro.portfolio && pro.portfolio.length > 0 && (
            <div className="bg-surface rounded-lg border border-border p-8">
              <h2 className="text-2xl font-bold text-text-primary mb-6">
                Réalisations
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {pro.portfolio.map((img, idx) => (
                  <div key={idx} className="aspect-video rounded-lg overflow-hidden bg-surface-active">
                    <img src={img.url} alt={`Réalisation ${idx + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Services proposés */}
          <div className="bg-surface rounded-lg border border-border p-8">
            <h2 className="text-2xl font-bold text-text-primary mb-6">
              Services proposés
            </h2>

            <div className="space-y-4">
              {pro.services.map((service, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-4 border-b border-border last:border-0"
                >
                  <div>
                    <h3 className="text-lg font-semibold text-text-primary">
                      {service.name}
                    </h3>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-text-primary">
                      {service.priceFormatted}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Reviews */}
          {pro.lastReviews && pro.lastReviews.length > 0 && (
            <div className="bg-surface rounded-lg border border-border p-8">
              <h2 className="text-2xl font-bold text-text-primary mb-6">
                Derniers avis
              </h2>
              <div className="space-y-4">
                {pro.lastReviews.map((review, idx) => (
                  <div key={idx} className="border-b border-border pb-4 last:border-0">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span
                            key={star}
                            className={star <= review.rating ? 'text-warning-500' : 'text-text-muted'}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                      <span className="text-xs text-text-muted">
                        {new Date(review.createdAt).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                    {review.comment && (
                      <p className="text-text-label">{review.comment}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Call to Action */}
          <ProBookingCTA proId={pro.id} services={pro.services} />
        </div>
      </main>
    </div>
  );
}
