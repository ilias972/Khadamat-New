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
    <div className="min-h-screen bg-gradient-to-br from-background to-surface-active py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Alerte de statut */}
        {status && (
          <div className="mb-8">
            {isSuccess && (
              <div className="bg-success-50 border border-success-200 rounded-lg p-6">
                <div className="flex items-start gap-4">
                  <CheckCircle className="w-8 h-8 text-success-600 flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-success-900 mb-2">
                      Paiement validé avec succès !
                    </h2>
                    <p className="text-success-700 mb-2">
                      Votre abonnement a été activé. Vous pouvez maintenant profiter de tous les avantages.
                    </p>
                    {oid && (
                      <p className="text-sm text-success-600 font-mono">
                        Référence : {oid}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {isPending && (
              <div className="bg-primary-50 border border-primary-200 rounded-lg p-6">
                <div className="flex items-start gap-4">
                  <Clock className="w-8 h-8 text-primary-600 flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-primary-900 mb-2">
                      Demande en attente de validation
                    </h2>
                    <p className="text-primary-700 mb-2">
                      Votre demande de paiement a été enregistrée. Contactez-nous pour effectuer le règlement.
                    </p>
                    {oid && (
                      <p className="text-sm text-primary-600 font-mono">
                        Référence : {oid}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {isFailed && (
              <div className="bg-error-50 border border-error-200 rounded-lg p-6">
                <div className="flex items-start gap-4">
                  <XCircle className="w-8 h-8 text-error-600 flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-error-900 mb-2">
                      Paiement rejeté
                    </h2>
                    <p className="text-error-700 mb-2">
                      {error || 'Le paiement n\'a pas pu être validé.'}
                    </p>
                    {oid && (
                      <p className="text-sm text-error-600 font-mono">
                        Référence : {oid}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {isError && (
              <div className="bg-warning-50 border border-warning-200 rounded-lg p-6">
                <div className="flex items-start gap-4">
                  <AlertTriangle className="w-8 h-8 text-warning-600 flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-warning-900 mb-2">
                      Erreur lors du traitement
                    </h2>
                    <p className="text-warning-700 mb-2">
                      {error || 'Une erreur technique est survenue.'}
                    </p>
                    {oid && (
                      <p className="text-sm text-warning-600 font-mono">
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
        <div className="bg-surface rounded-2xl shadow-xl p-8">
          <h1 className="text-3xl font-bold text-text-primary mb-6">
            {isSuccess ? 'Abonnement activé' : isPending ? 'Demande enregistrée' : 'Résultat de votre demande'}
          </h1>

          {/* Actions */}
          <div className="space-y-4">
            {isSuccess && (
              <>
                <Link
                  href="/dashboard"
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-inverse-bg text-inverse-text rounded-lg hover:bg-inverse-hover transition font-medium group"
                >
                  Accéder au Dashboard
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  href="/plans"
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 border-2 border-border-strong text-text-primary rounded-lg hover:bg-surface-muted transition font-medium"
                >
                  Voir les autres offres
                </Link>
              </>
            )}

            {isPending && (
              <>
                <div className="bg-surface-active rounded-xl p-6">
                  <h3 className="font-semibold text-text-primary mb-3">Comment régler ?</h3>
                  <ul className="space-y-2 text-sm text-text-secondary">
                    <li>• Virement bancaire</li>
                    <li>• Cash en agence</li>
                    <li>• Mobile Money (Orange Money, inwi money)</li>
                  </ul>
                  <p className="mt-4 text-sm text-text-muted">
                    Mentionnez votre référence lors du paiement.
                  </p>
                </div>
                <Link
                  href="/dashboard"
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-inverse-bg text-inverse-text rounded-lg hover:bg-inverse-hover transition font-medium"
                >
                  Retour au Dashboard
                </Link>
              </>
            )}

            {(isFailed || isError) && (
              <>
                <Link
                  href="/plans"
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-inverse-bg text-inverse-text rounded-lg hover:bg-inverse-hover transition font-medium"
                >
                  Réessayer
                </Link>
                <Link
                  href="/dashboard"
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 border-2 border-border-strong text-text-primary rounded-lg hover:bg-surface-muted transition font-medium"
                >
                  Retour au Dashboard
                </Link>
              </>
            )}

            {!status && (
              <div className="text-center text-text-secondary">
                <p className="mb-4">Aucun résultat de paiement à afficher.</p>
                <Link
                  href="/plans"
                  className="inline-flex items-center gap-2 text-text-primary hover:underline"
                >
                  Découvrir nos offres
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Support */}
        <div className="mt-6 text-center text-sm text-text-secondary">
          <p>
            Besoin d&apos;aide ?{' '}
            <a
              href="mailto:support@khadamat.ma"
              className="underline hover:text-text-primary"
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
          <div className="text-text-secondary">Chargement...</div>
        </div>
      }
    >
      <SubscriptionResultContent />
    </Suspense>
  );
}
