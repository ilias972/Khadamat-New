import { notFound } from 'next/navigation';
import Header from '../../../components/Header';
import ProBookingCTA from '../../../components/ProBookingCTA';
import type { PublicProProfile } from '@khadamat/contracts';

interface ProDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

/**
 * Page de détail d'un Pro
 *
 * - Affiche le profil public complet d'un Pro
 * - 404 si le Pro n'existe pas ou n'est pas actif
 */
export default async function ProDetailPage({ params }: ProDetailPageProps) {
  const { id } = await params;
  const apiUrl = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL;

  // Fetch du profil du Pro
  let pro: PublicProProfile | null = null;

  try {
    const response = await fetch(`${apiUrl}/public/pros/${id}`, {
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
              <div className="w-24 h-24 bg-zinc-200 dark:bg-zinc-700 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-4xl font-bold text-zinc-600 dark:text-zinc-400">
                  {pro.firstName.charAt(0).toUpperCase()}
                </span>
              </div>

              {/* Informations principales */}
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
                    {pro.firstName} {pro.lastName}
                  </h1>
                  {pro.isVerified && (
                    <span className="inline-flex items-center px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100 text-sm font-medium rounded-full">
                      ✓ Vérifié
                    </span>
                  )}
                </div>

                <p className="text-lg text-zinc-600 dark:text-zinc-400">
                  📍 {pro.city}
                </p>

                {pro.bio && (
                  <p className="text-zinc-700 dark:text-zinc-300">{pro.bio}</p>
                )}
              </div>
            </div>
          </div>

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

          {/* Call to Action */}
          <ProBookingCTA proId={pro.id} services={pro.services} />
        </div>
      </main>
    </div>
  );
}
