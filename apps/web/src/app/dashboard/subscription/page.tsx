'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CheckCircle2, Clock3, Crown, Loader2, Zap } from 'lucide-react';
import DashboardLayout, { useDashboardContext } from '@/components/dashboard/DashboardLayout';
import { APIError, getJSON, postJSON } from '@/lib/api';
import type {
  CheckoutResponse,
  PaymentPlan,
  PaymentPlanType,
  PaymentPlansResponse,
  PendingPaymentOrder,
  PendingPaymentOrderResponse,
} from '@/lib/types/payment';

type PlanType = Extract<PaymentPlanType, 'PREMIUM_MONTHLY' | 'PREMIUM_ANNUAL'>;
type PremiumPlan = PaymentPlan & { planType: PlanType };

function isKycNotApprovedError(error: APIError): boolean {
  const responseCode = error.response?.code;
  if (responseCode === 'KYC_NOT_APPROVED') {
    return true;
  }

  const nestedCode = error.response?.message?.code;
  if (nestedCode === 'KYC_NOT_APPROVED') {
    return true;
  }

  if (error.statusCode === 403) {
    const responseMessage =
      typeof error.response?.message === 'string'
        ? error.response.message
        : typeof error.response?.message?.message === 'string'
          ? error.response.message.message
          : '';
    const mergedMessage = `${error.message} ${responseMessage}`.toUpperCase();
    return mergedMessage.includes('KYC');
  }

  return false;
}

function parseApiMessage(error: APIError): string {
  if (typeof error.response?.message === 'string' && error.response.message.length > 0) {
    return error.response.message;
  }

  if (typeof error.response?.message?.message === 'string' && error.response.message.message.length > 0) {
    return error.response.message.message;
  }

  return error.message || 'Une erreur est survenue lors de la création de la demande.';
}

function formatDate(value: string | null | undefined): string | null {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function formatAmount(value: number, currency: string): string {
  const amount = Number.isInteger(value) ? value.toString() : value.toFixed(2);
  return `${amount} ${currency}`;
}

export default function DashboardSubscriptionPage() {
  return (
    <DashboardLayout>
      <SubscriptionHubInner />
    </DashboardLayout>
  );
}

function SubscriptionHubInner() {
  const router = useRouter();
  const { proMe, loading: dashboardLoading, refresh } = useDashboardContext();
  const profile = proMe?.profile ?? null;
  const loadingProfile = dashboardLoading && !profile;

  const [planOptions, setPlanOptions] = useState<PremiumPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError] = useState('');
  const [activeCheckout, setActiveCheckout] = useState<PlanType | null>(null);
  const [lastAttemptedPlan, setLastAttemptedPlan] = useState<PlanType | null>(null);
  const [pendingOrder, setPendingOrder] = useState<PendingPaymentOrder | null>(null);
  const [checkoutError, setCheckoutError] = useState('');
  const [checkoutCode, setCheckoutCode] = useState<string | null>(null);

  const premiumExpiryDate = useMemo(
    () => (profile?.premiumActiveUntil ? new Date(profile.premiumActiveUntil) : null),
    [profile?.premiumActiveUntil],
  );

  const boostExpiryDate = useMemo(
    () => (profile?.boostActiveUntil ? new Date(profile.boostActiveUntil) : null),
    [profile?.boostActiveUntil],
  );

  const isPremiumActive = useMemo(() => {
    if (!profile) return false;
    if (premiumExpiryDate && !Number.isNaN(premiumExpiryDate.getTime())) {
      return premiumExpiryDate.getTime() > Date.now();
    }
    return profile.isPremium;
  }, [premiumExpiryDate, profile]);

  const isBoostActive = useMemo(() => {
    if (!boostExpiryDate || Number.isNaN(boostExpiryDate.getTime())) return false;
    return boostExpiryDate.getTime() > Date.now();
  }, [boostExpiryDate]);

  const loadSubscriptionData = useCallback(async () => {
    setPlansLoading(true);
    setPlansError('');

    const [plansResult, pendingResult] = await Promise.allSettled([
      getJSON<PaymentPlansResponse>('/payment/plans'),
      getJSON<PendingPaymentOrderResponse>('/payment/pending'),
    ]);

    if (plansResult.status === 'fulfilled') {
      const premiumPlans = plansResult.value.plans.filter(
        (plan): plan is PremiumPlan =>
          plan.planType === 'PREMIUM_MONTHLY' || plan.planType === 'PREMIUM_ANNUAL',
      );
      setPlanOptions(premiumPlans);
    } else {
      setPlansError("Impossible de charger les offres d'abonnement pour le moment.");
      setPlanOptions([]);
    }

    if (pendingResult.status === 'fulfilled') {
      setPendingOrder(pendingResult.value.order);
    } else {
      setPendingOrder(null);
    }

    setPlansLoading(false);
  }, []);

  useEffect(() => {
    void loadSubscriptionData();
  }, [loadSubscriptionData]);

  const startCheckout = useCallback(
    async (planType: PlanType) => {
      try {
        setActiveCheckout(planType);
        setLastAttemptedPlan(planType);
        setCheckoutError('');
        setCheckoutCode(null);

        const response = await postJSON<CheckoutResponse>('/payment/checkout', { planType });
        const oid = response.order?.reference;
        if (!oid) {
          setCheckoutError('La demande a été créée, mais la référence est introuvable.');
          await refresh();
          return;
        }

        if (response.reusedPendingOrder) {
          setPendingOrder({
            reference: oid,
            planType: response.order.planType as PaymentPlanType,
            amount: response.order.amount,
            currency: response.order.currency,
          });
          await refresh();
          return;
        }

        router.push(`/dashboard/subscription/success?oid=${encodeURIComponent(oid)}`);
        return;
      } catch (error) {
        if (error instanceof APIError) {
          setCheckoutCode(isKycNotApprovedError(error) ? 'KYC_NOT_APPROVED' : null);
          setCheckoutError(parseApiMessage(error));
        } else {
          setCheckoutCode(null);
          setCheckoutError('Une erreur est survenue lors de la création de la demande.');
        }
      } finally {
        setActiveCheckout(null);
      }
    },
    [refresh, router],
  );

  const handleRetryCheckout = () => {
    if (!lastAttemptedPlan || activeCheckout) return;
    void startCheckout(lastAttemptedPlan);
  };

  return (
    <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Abonnement</h1>
          <p className="mt-2 text-text-secondary">
            Consultez votre statut Premium et lancez une nouvelle demande d&apos;abonnement.
          </p>
        </div>

        {checkoutError && (
          <div className="rounded-lg border border-warning-200 bg-warning-50 p-4" role="alert">
            <p className="text-warning-900">{checkoutError}</p>
            {checkoutCode === 'KYC_NOT_APPROVED' ? (
              <Link
                href="/dashboard/kyc"
                className="mt-3 inline-flex items-center rounded-lg bg-warning-700 px-4 py-2 text-sm font-medium text-text-inverse hover:bg-warning-800 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warning-700"
              >
                Compléter mon KYC
              </Link>
            ) : (
              <button
                type="button"
                onClick={handleRetryCheckout}
                disabled={!lastAttemptedPlan || Boolean(activeCheckout)}
                className="mt-3 inline-flex items-center rounded-lg bg-warning-700 px-4 py-2 text-sm font-medium text-text-inverse hover:bg-warning-800 motion-safe:transition-colors disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warning-700"
              >
                Réessayer
              </button>
            )}
          </div>
        )}

        {pendingOrder && (
          <div className="rounded-lg border border-info-200 bg-info-50 p-4" role="status">
            <p className="text-info-900">
              Une commande est déjà en attente de validation. Référence:{' '}
              <span className="font-semibold">{pendingOrder.reference}</span>.
            </p>
            <Link
              href={`/dashboard/subscription/success?oid=${encodeURIComponent(pendingOrder.reference)}`}
              className="mt-3 inline-flex items-center rounded-lg bg-info-700 px-4 py-2 text-sm font-medium text-text-inverse hover:bg-info-800 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info-700"
            >
              Voir le statut
            </Link>
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-2">
          <article className="rounded-xl border border-border bg-surface p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-info-700" aria-hidden="true" />
                <h2 className="text-lg font-semibold text-text-primary">Premium</h2>
              </div>
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                  isPremiumActive ? 'bg-success-100 text-success-800' : 'bg-surface-active text-text-secondary'
                }`}
              >
                {isPremiumActive ? 'Actif' : 'Inactif'}
              </span>
            </div>
            <p className="text-sm text-text-secondary">
              {isPremiumActive ? 'Votre visibilité premium est active.' : 'Aucun abonnement premium actif.'}
            </p>
            <p className="mt-3 text-sm text-text-secondary">
              Expiration:{' '}
              <span className="font-medium text-text-primary">
                {formatDate(profile?.premiumActiveUntil) ?? '—'}
              </span>
            </p>
          </article>

          <article className="rounded-xl border border-border bg-surface p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary-700" aria-hidden="true" />
                <h2 className="text-lg font-semibold text-text-primary">Boost</h2>
              </div>
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                  isBoostActive ? 'bg-success-100 text-success-800' : 'bg-surface-active text-text-secondary'
                }`}
              >
                {isBoostActive ? 'Actif' : 'Inactif'}
              </span>
            </div>
            <p className="text-sm text-text-secondary">
              {isBoostActive ? 'Votre boost est en cours sur votre ciblage actuel.' : 'Aucun boost actif pour le moment.'}
            </p>
            <p className="mt-3 text-sm text-text-secondary">
              Expiration:{' '}
              <span className="font-medium text-text-primary">
                {formatDate(profile?.boostActiveUntil) ?? '—'}
              </span>
            </p>
          </article>
        </section>

        <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-text-primary">Lancer une demande Premium</h2>
          <p className="mt-2 text-sm text-text-secondary">
            Une fois la demande créée, vous serez redirigé vers le suivi du paiement.
          </p>

          {loadingProfile || plansLoading ? (
            <div className="mt-6 flex items-center gap-3 text-sm text-text-secondary" aria-busy="true" role="status">
              <Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" />
              Chargement des offres...
            </div>
          ) : plansError ? (
            <div className="mt-6 rounded-lg border border-warning-200 bg-warning-50 p-4 text-sm text-warning-900" role="alert">
              <p>{plansError}</p>
              <button
                type="button"
                onClick={() => void loadSubscriptionData()}
                className="mt-3 inline-flex items-center rounded-lg bg-warning-700 px-4 py-2 text-sm font-medium text-text-inverse hover:bg-warning-800 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warning-700"
              >
                Réessayer
              </button>
            </div>
          ) : (
            planOptions.length === 0 ? (
              <div className="mt-6 rounded-lg border border-warning-200 bg-warning-50 p-4 text-sm text-warning-900" role="status">
                Aucune offre Premium n&apos;est disponible pour le moment.
              </div>
            ) : (
              <div className="mt-6 grid gap-3 md:grid-cols-2">
                {planOptions.map((plan) => {
                  const isLoadingPlan = activeCheckout === plan.planType;

                  return (
                    <button
                      key={plan.planType}
                      type="button"
                      onClick={() => void startCheckout(plan.planType)}
                      disabled={Boolean(activeCheckout)}
                      aria-busy={isLoadingPlan}
                      className="rounded-xl border border-border bg-background px-4 py-4 text-left hover:border-inverse-bg hover:bg-surface-active motion-safe:transition-colors disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inverse-bg"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-text-primary">{plan.label}</p>
                        <span className="text-sm font-semibold text-text-primary">{formatAmount(plan.amount, plan.currency)}</span>
                      </div>
                      <p className="mt-2 text-sm text-text-secondary">{plan.description}</p>
                      {isLoadingPlan && (
                        <span className="mt-3 inline-flex items-center gap-2 text-sm text-text-secondary" role="status">
                          <Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" />
                          Création de la demande...
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )
          )}

          <div className="mt-6 rounded-lg border border-info-200 bg-info-50 p-4 text-sm text-info-900">
            <div className="flex items-start gap-2">
              <Clock3 className="mt-0.5 h-4 w-4" aria-hidden="true" />
              <p>Le paiement est validé côté plateforme, puis votre abonnement est activé automatiquement.</p>
            </div>
            <div className="mt-2 flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4" aria-hidden="true" />
              <p>
                Pour lancer un boost ciblé (ville + service), utilisez la page{' '}
                <Link
                  href="/plans"
                  className="font-semibold underline decoration-info-500 underline-offset-2 hover:text-info-700 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info-600"
                >
                  Offres
                </Link>
                .
              </p>
            </div>
          </div>
        </section>

        {!loadingProfile && !profile && (
          <div className="rounded-lg border border-warning-200 bg-warning-50 p-4 text-warning-900" role="alert">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4" aria-hidden="true" />
              <p>Impossible de charger votre statut d&apos;abonnement pour le moment.</p>
            </div>
            <button
              type="button"
              onClick={() => void refresh()}
              className="mt-3 inline-flex items-center rounded-lg bg-warning-700 px-4 py-2 text-sm font-medium text-text-inverse hover:bg-warning-800 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warning-700"
            >
              Réessayer
            </button>
          </div>
        )}
      </div>
  );
}
