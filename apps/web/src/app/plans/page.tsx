'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { PaymentButton } from '@/components/payment/PaymentButton';
import { getJSON } from '@/lib/api';
import {
  Crown,
  Zap,
  CheckCircle,
  TrendingUp,
  BarChart3,
  Star,
  MapPin,
  Briefcase,
  Loader2,
} from 'lucide-react';

interface City {
  id: string;
  name: string;
  slug: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

export default function PlansPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  // Premium plan state
  const [isAnnual, setIsAnnual] = useState(false);

  // Boost plan state
  const [selectedCityId, setSelectedCityId] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');

  // Data loading
  const [cities, setCities] = useState<City[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Redirect if not authenticated or not PRO
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    if (user?.role !== 'PRO') {
      router.push('/');
    }
  }, [isAuthenticated, user, router]);

  // Load cities and categories
  useEffect(() => {
    const fetchData = async () => {
      setLoadingData(true);
      try {
        const [citiesData, categoriesData] = await Promise.all([
          getJSON<City[]>('/public/cities'),
          getJSON<Category[]>('/public/categories'),
        ]);
        setCities(citiesData);
        setCategories(categoriesData);
      } catch (err) {
        console.error('Erreur lors du chargement des données:', err);
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, []);

  if (!isAuthenticated || user?.role !== 'PRO') {
    return null;
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-background via-surface to-surface-active py-12 px-4 sm:px-6">
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <div className="absolute -top-20 left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-info-200/35 blur-3xl" />
        <div className="absolute top-1/3 right-0 h-72 w-72 rounded-full bg-primary-200/25 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-80 w-80 rounded-full bg-success-200/20 blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-info-200 bg-info-50 px-4 py-2 text-xs font-semibold text-info-700 mb-5">
            <CheckCircle className="w-4 h-4" aria-hidden="true" />
            Garanti 100% sécurisé
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-text-primary mb-4">
            Propulsez votre expertise au niveau supérieur
          </h1>
          <p className="text-lg text-text-secondary max-w-3xl mx-auto">
            Une offre conçue pour renforcer votre visibilité, accélérer vos demandes et rassurer vos futurs clients.
          </p>
        </header>

        <div className="grid lg:grid-cols-2 gap-8 mb-12 items-stretch">
          <div className="relative rounded-3xl p-[1px] bg-gradient-to-br from-info-300 via-primary-200 to-info-400 shadow-[0_30px_90px_-40px_var(--color-info-400)]">
            <div className="relative bg-white/70 backdrop-blur-md rounded-[calc(theme(borderRadius.3xl)-1px)] p-8 border border-info-500/50 overflow-hidden h-full ring-1 ring-info-200/70">
              <div className="pointer-events-none absolute -top-16 -right-12 h-56 w-56 rounded-full bg-info-100/80 blur-3xl" aria-hidden="true" />

              <div className="absolute top-5 right-5 bg-info-600 text-text-inverse text-xs font-bold px-3 py-1 rounded-full">
                CHOIX N°1
              </div>

              <div className="relative mb-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-full bg-info-600 flex items-center justify-center shadow-lg shadow-info-200">
                    <Crown className="w-6 h-6 text-text-inverse" aria-hidden="true" />
                  </div>
                  <h2 className="text-2xl font-bold text-info-900">
                    PRO Premium
                  </h2>
                </div>
                <p className="text-info-700 text-sm">
                  La formule la plus performante pour dominer votre catégorie.
                </p>
              </div>

              <div className="mb-6">
                <div className="relative mx-auto max-w-sm rounded-full border border-border bg-surface-active p-1 shadow-inner">
                  <div className="grid grid-cols-2 gap-1">
                    <button
                      type="button"
                      onClick={() => setIsAnnual(false)}
                      aria-pressed={!isAnnual}
                      aria-label="Choisir Premium mensuel"
                      className={`rounded-full px-4 py-2.5 text-sm font-semibold motion-safe:transition-all motion-safe:duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info-500 focus-visible:ring-offset-2 ${
                        !isAnnual
                          ? 'bg-info-600 text-text-inverse shadow-md'
                          : 'text-text-secondary hover:text-text-primary motion-safe:hover:scale-105'
                      }`}
                    >
                      Mensuel
                      {!isAnnual && <span className="sr-only"> sélectionné</span>}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAnnual(true)}
                      aria-pressed={isAnnual}
                      aria-label="Choisir Premium annuel"
                      className={`rounded-full px-4 py-2.5 text-sm font-semibold motion-safe:transition-all motion-safe:duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info-500 focus-visible:ring-offset-2 ${
                        isAnnual
                          ? 'bg-info-600 text-text-inverse shadow-md'
                          : 'text-text-secondary hover:text-text-primary motion-safe:hover:scale-105'
                      }`}
                    >
                      Annuel
                      {isAnnual && <span className="sr-only"> sélectionné</span>}
                    </button>
                  </div>
                </div>
              </div>

              <div className="mb-6 text-center">
                <div className="text-5xl font-bold text-info-900">
                  {isAnnual ? '3000' : '350'} MAD
                </div>
                <div className="text-info-700 text-sm mt-1">
                  / {isAnnual ? '365 jours' : '30 jours'}
                </div>
                {isAnnual && (
                  <div className="mt-2 text-sm text-info-600 font-semibold">
                    Meilleure offre • Économisez 200 MAD
                  </div>
                )}
              </div>

              <ul className="space-y-3.5 mb-8">
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-info-100">
                    <CheckCircle className="w-4 h-4 text-info-600" aria-hidden="true" />
                  </span>
                  <span className="text-info-900 text-sm">
                    Visibilité continue et classement renforcé
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-info-100">
                    <CheckCircle className="w-4 h-4 text-info-600" aria-hidden="true" />
                  </span>
                  <span className="text-info-900 text-sm">
                    Jusqu&apos;à 3 services actifs simultanément
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-info-100">
                    <CheckCircle className="w-4 h-4 text-info-600" aria-hidden="true" />
                  </span>
                  <span className="text-info-900 text-sm">
                    Badge &quot;Pro Premium&quot; pour renforcer la confiance
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-info-100">
                    <CheckCircle className="w-4 h-4 text-info-600" aria-hidden="true" />
                  </span>
                  <span className="text-info-900 text-sm">
                    Dashboard Pro complet (vues, clics WhatsApp, statistiques)
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-info-100">
                    <CheckCircle className="w-4 h-4 text-info-600" aria-hidden="true" />
                  </span>
                  <span className="text-info-900 text-sm">
                    Stratégie long terme pour stabiliser votre activité
                  </span>
                </li>
              </ul>

              <PaymentButton
                planType={isAnnual ? 'PREMIUM_ANNUAL' : 'PREMIUM_MONTHLY'}
                amount={isAnnual ? 3000 : 350}
                label="Devenir Premium"
                className="w-full bg-info-600 hover:bg-info-700 text-text-inverse font-bold py-4 shadow-sm hover:shadow-lg motion-safe:transition-all motion-safe:duration-200 motion-safe:hover:scale-105 motion-safe:hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info-500 focus-visible:ring-offset-2"
              />
            </div>
          </div>

          <div className="bg-surface rounded-3xl shadow-lg p-8 border border-border h-full">
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-full bg-primary-600 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-text-inverse" aria-hidden="true" />
                </div>
                <h2 className="text-2xl font-bold text-primary-900">
                  Boost
                </h2>
              </div>
              <p className="text-primary-700 text-sm">
                Campagne ciblée, impact rapide sur une ville et un service.
              </p>
            </div>

            <div className="mb-6 text-center">
              <div className="text-5xl font-bold text-primary-900">
                200 MAD
              </div>
              <div className="text-primary-700 text-sm mt-1">
                / 7 jours
              </div>
            </div>

            <ul className="space-y-3.5 mb-6">
              <li className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary-100">
                  <TrendingUp className="w-4 h-4 text-primary-600" aria-hidden="true" />
                </span>
                <span className="text-primary-900 text-sm">
                  Mise en avant sponsorisée &quot;En tête de liste&quot;
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary-100">
                  <Star className="w-4 h-4 text-primary-600" aria-hidden="true" />
                </span>
                <span className="text-primary-900 text-sm">
                  Ciblage précis : ville × service
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary-100">
                  <BarChart3 className="w-4 h-4 text-primary-600" aria-hidden="true" />
                </span>
                <span className="text-primary-900 text-sm">
                  Activation immédiate pour 7 jours
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary-100">
                  <CheckCircle className="w-4 h-4 text-primary-600" aria-hidden="true" />
                </span>
                <span className="text-primary-900 text-sm">
                  Idéal pour combler les périodes creuses
                </span>
              </li>
            </ul>

            <div className="space-y-4 mb-6">
              <div>
                <label
                  htmlFor="boost-city"
                  className="block text-sm font-medium text-primary-900 mb-2 flex items-center gap-2"
                >
                  <MapPin className="w-4 h-4" aria-hidden="true" />
                  Ville ciblée
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
                  <select
                    id="boost-city"
                    value={selectedCityId}
                    onChange={(e) => setSelectedCityId(e.target.value)}
                    disabled={loadingData}
                    className="w-full pl-10 pr-4 py-3 bg-surface border border-primary-300 rounded-xl text-primary-900 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 disabled:opacity-60"
                    required
                  >
                    <option value="">Sélectionnez une ville</option>
                    {cities.map((city) => (
                      <option key={city.id} value={city.id}>
                        {city.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="boost-category"
                  className="block text-sm font-medium text-primary-900 mb-2 flex items-center gap-2"
                >
                  <Briefcase className="w-4 h-4" aria-hidden="true" />
                  Service ciblé
                </label>
                <div className="relative">
                  <Briefcase className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
                  <select
                    id="boost-category"
                    value={selectedCategoryId}
                    onChange={(e) => setSelectedCategoryId(e.target.value)}
                    disabled={loadingData}
                    className="w-full pl-10 pr-4 py-3 bg-surface border border-primary-300 rounded-xl text-primary-900 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 disabled:opacity-60"
                    required
                  >
                    <option value="">Sélectionnez un service</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={`flex items-center gap-2 text-sm ${loadingData ? 'text-text-secondary' : 'text-text-muted'}`} role="status" aria-live="polite">
                <Loader2 className={`w-4 h-4 ${loadingData ? 'motion-safe:animate-spin' : ''}`} aria-hidden="true" />
                {loadingData ? 'Chargement des villes et services...' : 'Sélectionnez votre ciblage pour activer le Boost'}
              </div>
            </div>

            <PaymentButton
              planType="BOOST"
              amount={200}
              label="Activer le Boost"
              cityId={selectedCityId}
              categoryId={selectedCategoryId}
              disabled={!selectedCityId || !selectedCategoryId}
              className="w-full bg-primary-600 hover:bg-primary-700 text-text-inverse font-bold py-4 shadow-sm hover:shadow-lg motion-safe:transition-all motion-safe:duration-200 motion-safe:hover:scale-105 motion-safe:hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
            />
          </div>
        </div>

        <section className="bg-white/70 backdrop-blur-md rounded-2xl border border-border shadow-sm p-6 md:p-8">
          <div className="text-center mb-6">
            <h3 className="text-2xl font-bold text-text-primary">Trust Center</h3>
            <p className="text-text-secondary mt-2">
              Une expérience de paiement sécurisée avec activation prioritaire et support client humain.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-2 mb-6" aria-label="Moyens de paiement pris en charge">
            <span className="inline-flex items-center rounded-full border border-border bg-surface-active px-3 py-1 text-xs font-semibold text-text-secondary">Visa</span>
            <span className="inline-flex items-center rounded-full border border-border bg-surface-active px-3 py-1 text-xs font-semibold text-text-secondary">Mastercard</span>
            <span className="inline-flex items-center rounded-full border border-border bg-surface-active px-3 py-1 text-xs font-semibold text-text-secondary">Stripe</span>
            <span className="inline-flex items-center rounded-full border border-border bg-surface-active px-3 py-1 text-xs font-semibold text-text-secondary">Virement</span>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <article className="rounded-xl border border-border bg-surface-active p-5">
              <div className="w-10 h-10 rounded-full bg-success-100 text-success-700 flex items-center justify-center mb-3">
                <CheckCircle className="w-5 h-5" aria-hidden="true" />
              </div>
              <h4 className="font-semibold text-text-primary mb-1">Paiement 100% Sécurisé</h4>
              <p className="text-sm text-text-secondary">
                Validation sécurisée et traitement fiable via des méthodes reconnues.
              </p>
            </article>

            <article className="rounded-xl border border-border bg-surface-active p-5">
              <div className="w-10 h-10 rounded-full bg-info-100 text-info-700 flex items-center justify-center mb-3">
                <TrendingUp className="w-5 h-5" aria-hidden="true" />
              </div>
              <h4 className="font-semibold text-text-primary mb-1">Activation Prioritaire</h4>
              <p className="text-sm text-text-secondary">
                Vos offres sont activées sous 24 à 48h après validation.
              </p>
            </article>

            <article className="rounded-xl border border-border bg-surface-active p-5">
              <div className="w-10 h-10 rounded-full bg-warning-100 text-warning-700 flex items-center justify-center mb-3">
                <Crown className="w-5 h-5" aria-hidden="true" />
              </div>
              <h4 className="font-semibold text-text-primary mb-1">Support Dédié</h4>
              <p className="text-sm text-text-secondary">
                Assistance humaine par nos experts pour vous accompagner à chaque étape.
              </p>
            </article>
          </div>
        </section>
      </div>
    </div>
  );
}
