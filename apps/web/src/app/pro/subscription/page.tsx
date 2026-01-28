'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, XCircle, AlertTriangle, ArrowRight, Clock } from 'lucide-react';

/**
 * SubscriptionResultContent
 *
 * Composant interne qui utilise useSearchParams.
 * Doit être wrappé dans <Suspense> selon Next.js 14.
 */
function SubscriptionResultContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Récupération des paramètres
  const status = searchParams.get('status'); // 'success' | 'pending' | 'failed' | 'error'
  const error = searchParams.get('error');
  const oid = searchParams.get('oid');

  useEffect(() => {
    console.log('📥 Statut paiement:', { status, error, oid });
  }, [status, error, oid]);

  // Déterminer le type d'alerte
  const isSuccess = status === 'success';
  const isPending = status === 'pending';
  const isFailed = status === 'failed';
  const isError = status === 'error';

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Alerte de statut */}
        {status && (
          <div className="mb-8">
            {isSuccess && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
                <div className="flex items-start gap-4">
                  <CheckCircle className="w-8 h-8 text-green-600 flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-green-900 dark:text-green-50 mb-2">
                      Paiement validé avec succès !
                    </h2>
                    <p className="text-green-700 dark:text-green-300 mb-2">
                      Votre abonnement a été activé. Vous pouvez maintenant profiter de tous les avantages.
                    </p>
                    {oid && (
                      <p className="text-sm text-green-600 dark:text-green-400 font-mono">
                        Référence : {oid}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {isPending && (
              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-6">
                <div className="flex items-start gap-4">
                  <Clock className="w-8 h-8 text-orange-600 flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-orange-900 dark:text-orange-50 mb-2">
                      Demande en attente de validation
                    </h2>
                    <p className="text-orange-700 dark:text-orange-300 mb-2">
                      Votre demande de paiement a été enregistrée. Contactez-nous pour effectuer le règlement.
                    </p>
                    {oid && (
                      <p className="text-sm text-orange-600 dark:text-orange-400 font-mono">
                        Référence : {oid}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {isFailed && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
                <div className="flex items-start gap-4">
                  <XCircle className="w-8 h-8 text-red-600 flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-red-900 dark:text-red-50 mb-2">
                      Paiement rejeté
                    </h2>
                    <p className="text-red-700 dark:text-red-300 mb-2">
                      {error || 'Le paiement n\'a pas pu être validé.'}
                    </p>
                    {oid && (
                      <p className="text-sm text-red-600 dark:text-red-400 font-mono">
                        Référence : {oid}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {isError && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
                <div className="flex items-start gap-4">
                  <AlertTriangle className="w-8 h-8 text-yellow-600 flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-yellow-900 dark:text-yellow-50 mb-2">
                      Erreur lors du traitement
                    </h2>
                    <p className="text-yellow-700 dark:text-yellow-300 mb-2">
                      {error || 'Une erreur technique est survenue.'}
                    </p>
                    {oid && (
                      <p className="text-sm text-yellow-600 dark:text-yellow-400 font-mono">
                        Référence : {oid}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Card principale */}
        <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-xl p-8">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-6">
            {isSuccess ? 'Abonnement activé' : isPending ? 'Demande enregistrée' : 'Résultat de votre demande'}
          </h1>

          {/* Actions */}
          <div className="space-y-4">
            {isSuccess && (
              <>
                <Link
                  href="/dashboard"
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-zinc-900 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition font-medium group"
                >
                  Accéder au Dashboard
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  href="/plans"
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 border-2 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-50 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition font-medium"
                >
                  Voir les autres offres
                </Link>
              </>
            )}

            {isPending && (
              <>
                <div className="bg-slate-100 dark:bg-zinc-700 rounded-xl p-6">
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 mb-3">Comment régler ?</h3>
                  <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                    <li>• Virement bancaire</li>
                    <li>• Cash en agence</li>
                    <li>• Mobile Money (Orange Money, inwi money)</li>
                  </ul>
                  <p className="mt-4 text-sm text-zinc-500">
                    Mentionnez votre référence lors du paiement.
                  </p>
                </div>
                <Link
                  href="/dashboard"
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-zinc-900 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition font-medium"
                >
                  Retour au Dashboard
                </Link>
              </>
            )}

            {(isFailed || isError) && (
              <>
                <Link
                  href="/plans"
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-zinc-900 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition font-medium"
                >
                  Réessayer
                </Link>
                <Link
                  href="/dashboard"
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 border-2 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-50 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition font-medium"
                >
                  Retour au Dashboard
                </Link>
              </>
            )}

            {!status && (
              <div className="text-center text-zinc-600 dark:text-zinc-400">
                <p className="mb-4">Aucun résultat de paiement à afficher.</p>
                <Link
                  href="/plans"
                  className="inline-flex items-center gap-2 text-zinc-900 dark:text-zinc-50 hover:underline"
                >
                  Découvrir nos offres
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Support */}
        <div className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
          <p>
            Besoin d&apos;aide ?{' '}
            <a
              href="mailto:support@khadamat.ma"
              className="underline hover:text-zinc-900 dark:hover:text-zinc-50"
            >
              Contactez le support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * ProSubscriptionPage
 *
 * Page de résultat après demande de paiement.
 * Affiche le résultat (success/pending/failed/error) avec query params.
 */
export default function ProSubscriptionPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-zinc-600 dark:text-zinc-400">Chargement...</div>
        </div>
      }
    >
      <SubscriptionResultContent />
    </Suspense>
  );
}
