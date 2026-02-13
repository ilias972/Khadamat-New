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

  try {
    const response = await fetch(`${apiUrl}/public/pros/${publicId}`, {
      cache: 'no-store',
    });

    if (response.ok) {
      pro = await response.json();
    } else if (response.status === 404) {
      notFound();
    }
  } catch (error) {
    console.error('Failed to fetch pro profile:', error);
    notFound();
  }

  if (!pro) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <Header />

      <main className="container mx-auto px-6 py-16">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header du profil */}
          <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-8">
            <div className="flex items-start gap-6">
              {/* Avatar */}
              <div className="w-24 h-24 bg-zinc-200 dark:bg-zinc-700 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                {pro.avatarUrl ? (
                  <img src={pro.avatarUrl} alt={pro.firstName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl font-bold text-zinc-600 dark:text-zinc-400">
                    {pro.firstName.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              {/* Informations principales */}
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
                    {pro.firstName} {pro.lastName}
                  </h1>
                  {pro.isVerified && (
                    <span className="inline-flex items-center px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100 text-sm font-medium rounded-full">
                      ✓ Vérifié
                    </span>
                  )}
                  {pro.isPremium && (
                    <span className="inline-flex items-center px-3 py-1 bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-100 text-sm font-medium rounded-full">
                      Premium
                    </span>
                  )}
                </div>

                <p className="text-lg text-zinc-600 dark:text-zinc-400">
                  📍 {pro.city}
                </p>

                {/* Rating */}
                {(pro.ratingCount ?? 0) > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span
                          key={star}
                          className={star <= (pro.ratingAvg ?? 0) ? 'text-yellow-500' : 'text-zinc-300 dark:text-zinc-600'}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                    <span className="text-zinc-700 dark:text-zinc-300 font-medium">
                      {pro.ratingAvg}
                    </span>
                    <span className="text-zinc-500 dark:text-zinc-400 text-sm">
                      ({pro.ratingCount} avis)
                    </span>
                    {(pro.completedBookingsCount ?? 0) > 0 && (
                      <span className="text-zinc-500 dark:text-zinc-400 text-sm ml-2">
                        · {pro.completedBookingsCount} missions
                      </span>
                    )}
                  </div>
                )}

                {/* Bio */}
                {pro.bio && (
                  <p className="text-zinc-600 dark:text-zinc-400">{pro.bio}</p>
                )}

                {/* Favorite button (client-side) */}
                <ProDetailClient proId={pro.id} />
              </div>
            </div>
          </div>

          {/* Portfolio (premium only) */}
          {pro.portfolio && pro.portfolio.length > 0 && (
            <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-8">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-6">
                Réalisations
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {pro.portfolio.map((img, idx) => (
                  <div key={idx} className="aspect-video rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-700">
                    <img src={img.url} alt={`Réalisation ${idx + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Services proposés */}
          <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-8">
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-6">
              Services proposés
            </h2>

            <div className="space-y-4">
              {pro.services.map((service, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-4 border-b border-zinc-200 dark:border-zinc-700 last:border-0"
                >
                  <div>
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                      {service.name}
                    </h3>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                      {service.priceFormatted}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Reviews */}
          {pro.lastReviews && pro.lastReviews.length > 0 && (
            <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-8">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-6">
                Derniers avis
              </h2>
              <div className="space-y-4">
                {pro.lastReviews.map((review, idx) => (
                  <div key={idx} className="border-b border-zinc-200 dark:border-zinc-700 pb-4 last:border-0">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span
                            key={star}
                            className={star <= review.rating ? 'text-yellow-500' : 'text-zinc-300 dark:text-zinc-600'}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        {new Date(review.createdAt).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                    {review.comment && (
                      <p className="text-zinc-700 dark:text-zinc-300">{review.comment}</p>
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
