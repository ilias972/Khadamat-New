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
  const { user, accessToken, isAuthenticated } = useAuthStore();

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
    if (!isAuthenticated || !accessToken) {
      router.push('/auth/login');
      return;
    }

    if (user?.role !== 'PRO') {
      router.push('/');
    }
  }, [isAuthenticated, accessToken, user, router]);

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
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">
            Boostez votre activité
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
            Choisissez l&apos;offre qui correspond à vos besoins professionnels
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Premium Card */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 rounded-2xl shadow-2xl p-8 border-2 border-blue-200 dark:border-blue-800 relative overflow-hidden">
            {/* Badge "Recommandé" */}
            <div className="absolute top-4 right-4 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">
              RECOMMANDÉ
            </div>

            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center">
                  <Crown className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-blue-900 dark:text-blue-50">
                  PRO Premium
                </h2>
              </div>
              <p className="text-blue-700 dark:text-blue-300 text-sm">
                Passez au niveau professionnel
              </p>
            </div>

            {/* Pricing Toggle */}
            <div className="mb-6">
              <div className="flex items-center justify-center gap-3 bg-white dark:bg-zinc-800 rounded-lg p-1">
                <button
                  type="button"
                  onClick={() => setIsAnnual(false)}
                  className={`flex-1 py-2 px-4 rounded-md font-medium transition ${
                    !isAnnual
                      ? 'bg-blue-600 text-white'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50'
                  }`}
                >
                  Mensuel
                </button>
                <button
                  type="button"
                  onClick={() => setIsAnnual(true)}
                  className={`flex-1 py-2 px-4 rounded-md font-medium transition ${
                    isAnnual
                      ? 'bg-blue-600 text-white'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50'
                  }`}
                >
                  Annuel
                </button>
              </div>
            </div>

            {/* Price */}
            <div className="mb-6 text-center">
              <div className="text-5xl font-bold text-blue-900 dark:text-blue-50">
                {isAnnual ? '3000' : '350'} MAD
              </div>
              <div className="text-blue-700 dark:text-blue-300 text-sm mt-1">
                / {isAnnual ? '365 jours' : '30 jours'}
              </div>
              {isAnnual && (
                <div className="mt-2 text-sm text-blue-600 dark:text-blue-400 font-medium">
                  Meilleure offre • Économisez 200 MAD
                </div>
              )}
            </div>

            {/* Features */}
            <ul className="space-y-3 mb-8">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <span className="text-blue-900 dark:text-blue-50 text-sm">
                  Visibilité continue et classement renforcé
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <span className="text-blue-900 dark:text-blue-50 text-sm">
                  Jusqu&apos;à 3 services actifs simultanément
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <span className="text-blue-900 dark:text-blue-50 text-sm">
                  Badge &quot;Pro Premium&quot; (Gage de confiance clients)
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <span className="text-blue-900 dark:text-blue-50 text-sm">
                  Accès au Dashboard Pro (Vues, Clics WhatsApp, Stats)
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <span className="text-blue-900 dark:text-blue-50 text-sm">
                  Outil de travail long terme
                </span>
              </li>
            </ul>

            {/* CTA Button */}
            <PaymentButton
              planType={isAnnual ? 'PREMIUM_ANNUAL' : 'PREMIUM_MONTHLY'}
              amount={isAnnual ? 3000 : 350}
              label="Devenir Premium"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4"
            />
          </div>

          {/* Boost Card */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 rounded-2xl shadow-xl p-8 border border-purple-200 dark:border-purple-800">
            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-purple-900 dark:text-purple-50">
                  Boost
                </h2>
              </div>
              <p className="text-purple-700 dark:text-purple-300 text-sm">
                Publicité sponsorisée ponctuelle
              </p>
            </div>

            {/* Price */}
            <div className="mb-6 text-center">
              <div className="text-5xl font-bold text-purple-900 dark:text-purple-50">
                200 MAD
              </div>
              <div className="text-purple-700 dark:text-purple-300 text-sm mt-1">
                / 7 jours
              </div>
            </div>

            {/* Features */}
            <ul className="space-y-3 mb-6">
              <li className="flex items-start gap-2">
                <TrendingUp className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                <span className="text-purple-900 dark:text-purple-50 text-sm">
                  Mise en avant sponsorisée &quot;En tête de liste&quot;
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Star className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                <span className="text-purple-900 dark:text-purple-50 text-sm">
                  Ciblage : Par Ville × Service
                </span>
              </li>
              <li className="flex items-start gap-2">
                <BarChart3 className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                <span className="text-purple-900 dark:text-purple-50 text-sm">
                  Durée : 7 jours d&apos;activation
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                <span className="text-purple-900 dark:text-purple-50 text-sm">
                  Idéal pour remplir une semaine creuse
                </span>
              </li>
            </ul>

            {/* Boost Selectors */}
            <div className="space-y-4 mb-6">
              {/* City Selector */}
              <div>
                <label
                  htmlFor="boost-city"
                  className="block text-sm font-medium text-purple-900 dark:text-purple-50 mb-2 flex items-center gap-2"
                >
                  <MapPin className="w-4 h-4" />
                  Ville ciblée
                </label>
                <select
                  id="boost-city"
                  value={selectedCityId}
                  onChange={(e) => setSelectedCityId(e.target.value)}
                  disabled={loadingData}
                  className="w-full px-4 py-3 bg-white dark:bg-zinc-800 border border-purple-300 dark:border-purple-700 rounded-lg text-purple-900 dark:text-purple-50 focus:outline-none focus:ring-2 focus:ring-purple-600"
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

              {/* Category Selector */}
              <div>
                <label
                  htmlFor="boost-category"
                  className="block text-sm font-medium text-purple-900 dark:text-purple-50 mb-2 flex items-center gap-2"
                >
                  <Briefcase className="w-4 h-4" />
                  Service ciblé
                </label>
                <select
                  id="boost-category"
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  disabled={loadingData}
                  className="w-full px-4 py-3 bg-white dark:bg-zinc-800 border border-purple-300 dark:border-purple-700 rounded-lg text-purple-900 dark:text-purple-50 focus:outline-none focus:ring-2 focus:ring-purple-600"
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

            {/* CTA Button */}
            <PaymentButton
              planType="BOOST"
              amount={200}
              label="Activer le Boost"
              cityId={selectedCityId}
              categoryId={selectedCategoryId}
              disabled={!selectedCityId || !selectedCategoryId}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4"
            />
          </div>
        </div>

        {/* Reassurance Section */}
        <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 text-center">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            💳 Paiement manuel (virement, cash, mobile money) • 🔒 Activation sous 24-48h après validation • ✅ Sans engagement
          </p>
        </div>
      </div>
    </div>
  );
}
