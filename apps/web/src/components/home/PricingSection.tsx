'use client';

import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { Check, Crown, Rocket } from 'lucide-react';
import SectionHeader from './SectionHeader';

const premiumBenefits = [
  'Badge Premium visible',
  'Priorisation dans les résultats',
  'Plus de visibilité locale',
  'Profil plus attractif',
];

const boostBenefits = [
  'Position boostée',
  'Visibilité dans la ville',
  'Plus de demandes clients',
];

export default function PricingSection() {
  const { isAuthenticated, user } = useAuthStore();

  if (isAuthenticated && user?.role === 'CLIENT') {
    return null;
  }

  return (
    <section aria-labelledby="pricing-title" className="py-24 bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          id="pricing-title"
          badge="Pour les professionnels"
          title="Passez au niveau supérieur"
          subtitle="Premium et Boost renforcent votre crédibilité et votre visibilité auprès des clients."
        />

        {/* Cards */}
        <div className="grid gap-8 md:grid-cols-2">
          {/* Premium Card */}
          <div className="relative bg-surface rounded-2xl border-2 border-primary-500 p-8 shadow-card-hover flex flex-col">
            {/* Badge */}
            <span className="absolute -top-3.5 left-6 inline-flex items-center gap-1.5 bg-primary-500 text-white text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-orange">
              <Crown className="w-3.5 h-3.5" aria-hidden="true" />
              Recommandé
            </span>

            <div className="mt-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
                  <Crown className="w-5 h-5" aria-hidden="true" />
                </div>
                <h3 className="text-2xl font-bold text-text-primary">Premium</h3>
              </div>
              <p className="text-text-secondary text-sm leading-relaxed mb-6">
                Gagnez la confiance des clients
              </p>
            </div>

            <ul className="space-y-3 mb-8 flex-1">
              {premiumBenefits.map((benefit) => (
                <li key={benefit} className="flex items-center gap-3 text-sm text-text-secondary">
                  <Check className="w-4 h-4 text-primary-500 flex-shrink-0" aria-hidden="true" />
                  {benefit}
                </li>
              ))}
            </ul>

            <Link
              href="/plans"
              className="block w-full text-center px-6 py-3.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-semibold shadow-orange hover:shadow-orange-lg transition-all duration-300 hover:-translate-y-0.5 motion-reduce:transform-none focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:outline-offset-2"
            >
              Voir Premium
            </Link>
          </div>

          {/* Boost Card */}
          <div className="bg-surface rounded-2xl border border-border p-8 shadow-card hover:shadow-card-hover transition-shadow duration-300 motion-reduce:transition-none flex flex-col">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
                <Rocket className="w-5 h-5" aria-hidden="true" />
              </div>
              <h3 className="text-2xl font-bold text-text-primary">Boost</h3>
            </div>
            <p className="text-text-secondary text-sm leading-relaxed mb-6">
              Soyez mis en avant pendant plusieurs jours
            </p>

            <ul className="space-y-3 mb-8 flex-1">
              {boostBenefits.map((benefit) => (
                <li key={benefit} className="flex items-center gap-3 text-sm text-text-secondary">
                  <Check className="w-4 h-4 text-primary-500 flex-shrink-0" aria-hidden="true" />
                  {benefit}
                </li>
              ))}
            </ul>

            <Link
              href="/plans"
              className="block w-full text-center px-6 py-3.5 border-2 border-primary-500 text-primary-600 hover:bg-primary-50 rounded-xl font-semibold transition-all duration-200 focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:outline-offset-2"
            >
              Booster mon profil
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
