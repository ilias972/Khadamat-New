'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, MapPin, AlertCircle, RefreshCw } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { getJSON } from '@/lib/api';
import HeroSkeleton from './HeroSkeleton';
import HeroMobileCTA from './HeroMobileCTA';

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

type HeroState = 'loading' | 'ready' | 'error';

export default function Hero() {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();
  const formRef = useRef<HTMLFormElement>(null);

  const [cities, setCities] = useState<City[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [heroState, setHeroState] = useState<HeroState>('loading');

  const [cityId, setCityId] = useState('');
  const [categoryId, setCategoryId] = useState('');

  const fetchData = useCallback(async () => {
    setHeroState('loading');
    try {
      const [citiesData, categoriesData] = await Promise.all([
        getJSON<City[]>('/public/cities'),
        getJSON<Category[]>('/public/categories'),
      ]);
      setCities(citiesData);
      setCategories(categoriesData);
      setHeroState('ready');
    } catch {
      setHeroState('error');
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Broadcast city selection to sibling components (e.g. FeaturedPros)
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('hero-city-change', { detail: cityId || null }),
    );
  }, [cityId]);

  const isReady = cityId !== '' && categoryId !== '';

  const handleSubmit = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!isReady) return;
      const params = new URLSearchParams();
      params.set('cityId', cityId);
      params.set('categoryId', categoryId);
      router.push(`/pros?${params.toString()}`);
    },
    [isReady, cityId, categoryId, router],
  );

  const handleMobileCTA = useCallback(() => {
    if (isReady) {
      handleSubmit();
    } else {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isReady, handleSubmit]);

  // Animation variants
  const fadeUp = shouldReduceMotion
    ? { initial: {}, animate: {} }
    : {
        initial: { opacity: 0, y: 16 },
        animate: { opacity: 1, y: 0 },
      };

  return (
    <>
      <section
        aria-labelledby="hero-title"
        className="relative min-h-[88vh] flex items-center justify-center overflow-hidden"
      >
        {/* ── Background layers ── */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary-50 via-primary-50/40 to-background" />
        <div className="absolute inset-0 bg-gradient-to-tr from-primary-100/30 via-transparent to-primary-50/20" />

        {/* Abstract SVG decoration */}
        <svg
          className="absolute top-0 right-0 w-[600px] h-[600px] text-primary-200/20 -translate-y-1/4 translate-x-1/4"
          viewBox="0 0 600 600"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="300" cy="300" r="280" stroke="currentColor" strokeWidth="1" />
          <circle cx="300" cy="300" r="200" stroke="currentColor" strokeWidth="1" />
          <circle cx="300" cy="300" r="120" stroke="currentColor" strokeWidth="0.5" />
        </svg>
        <svg
          className="absolute bottom-0 left-0 w-[400px] h-[400px] text-primary-200/15 translate-y-1/3 -translate-x-1/4"
          viewBox="0 0 400 400"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="200" cy="200" r="180" stroke="currentColor" strokeWidth="1" />
          <circle cx="200" cy="200" r="100" stroke="currentColor" strokeWidth="0.5" />
        </svg>

        {/* ── Content ── */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center py-20 lg:py-28">
          {/* Trust badge */}
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.4, delay: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-surface rounded-full shadow-sm border border-border mb-8"
          >
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success-500 opacity-75 motion-reduce:animate-none" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-success-500" />
            </span>
            <span className="text-sm font-medium text-text-secondary">
              Plateforme vérifiée &amp; sécurisée
            </span>
          </motion.div>

          {/* H1 */}
          <motion.h1
            id="hero-title"
            {...fadeUp}
            transition={{ duration: 0.5, delay: shouldReduceMotion ? 0 : 0.05 }}
            className="max-w-4xl text-4xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight text-text-primary mb-6 leading-[1.08]"
          >
            Trouvez un professionnel{' '}
            <br className="hidden sm:block" />
            <span className="relative inline-block">
              de confiance
              <span className="absolute left-0 right-0 bottom-1 sm:bottom-2 h-3 sm:h-4 bg-primary-500/15 -z-10 rounded-sm" />
            </span>{' '}
            près de chez vous.
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            {...fadeUp}
            transition={{ duration: 0.5, delay: shouldReduceMotion ? 0 : 0.1 }}
            className="max-w-2xl text-base sm:text-lg lg:text-xl text-text-secondary mb-12 leading-relaxed"
          >
            Plomberie, électricité, ménage, climatisation… des pros vérifiés,
            disponibles dans votre ville.
          </motion.p>

          {/* ── Search card ── */}
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.5, delay: shouldReduceMotion ? 0 : 0.2 }}
            className="w-full max-w-3xl"
          >
            {heroState === 'error' ? (
              <div className="bg-surface p-6 rounded-2xl shadow-xl border border-border flex flex-col items-center gap-4">
                <div className="flex items-center gap-2 text-error-600">
                  <AlertCircle className="w-5 h-5" aria-hidden="true" />
                  <span className="font-medium">Impossible de charger les données</span>
                </div>
                <button
                  type="button"
                  onClick={fetchData}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:outline-offset-2"
                  aria-label="Réessayer le chargement des données"
                >
                  <RefreshCw className="w-4 h-4" aria-hidden="true" />
                  Réessayer
                </button>
              </div>
            ) : heroState === 'loading' ? (
              <HeroSkeleton />
            ) : (
              <form
                ref={formRef}
                onSubmit={handleSubmit}
                className="bg-surface p-2 rounded-[2rem] shadow-xl shadow-primary-500/5 border border-border hover:shadow-2xl hover:border-primary-200 transition-all duration-300 motion-reduce:transition-none flex flex-col md:flex-row items-center gap-2"
                role="search"
                aria-label="Rechercher un professionnel"
              >
                {/* City select */}
                <div className="relative flex-1 w-full md:w-auto px-6 py-3 border-b md:border-b-0 md:border-r border-border-muted group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary-50 group-focus-within:bg-primary-100 flex items-center justify-center shrink-0 transition-colors">
                      <MapPin className="w-5 h-5 text-primary-500" aria-hidden="true" />
                    </div>
                    <div className="flex flex-col text-left w-full">
                      <label
                        htmlFor="home-city"
                        className="text-xs font-bold text-text-muted uppercase tracking-wider mb-0.5"
                      >
                        Votre ville
                      </label>
                      <select
                        id="home-city"
                        value={cityId}
                        onChange={(e) => setCityId(e.target.value)}
                        className="w-full bg-transparent font-medium text-text-primary focus:outline-none text-sm sm:text-base appearance-none cursor-pointer"
                        aria-label="Sélectionner une ville"
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
                </div>

                {/* Category select */}
                <div className="relative flex-1 w-full md:w-auto px-6 py-3 group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary-50 group-focus-within:bg-primary-100 flex items-center justify-center shrink-0 transition-colors">
                      <Search className="w-5 h-5 text-primary-500" aria-hidden="true" />
                    </div>
                    <div className="flex flex-col text-left w-full">
                      <label
                        htmlFor="home-service"
                        className="text-xs font-bold text-text-muted uppercase tracking-wider mb-0.5"
                      >
                        Service
                      </label>
                      <select
                        id="home-service"
                        value={categoryId}
                        onChange={(e) => setCategoryId(e.target.value)}
                        className="w-full bg-transparent font-medium text-text-primary focus:outline-none text-sm sm:text-base appearance-none cursor-pointer"
                        aria-label="Sélectionner un service"
                      >
                        <option value="">Choisir un service</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Desktop submit button */}
                <div className="w-full md:w-auto hidden md:block">
                  <button
                    type="submit"
                    disabled={!isReady}
                    title={
                      !isReady
                        ? 'Sélectionnez une ville et un service'
                        : 'Trouver un professionnel'
                    }
                    aria-label="Trouver un professionnel"
                    className="w-full md:w-auto bg-primary-500 hover:bg-primary-600 text-white rounded-[1.5rem] px-8 py-4 font-bold text-lg shadow-orange hover:shadow-orange-lg transition-all duration-300 hover:-translate-y-0.5 motion-reduce:transform-none flex items-center justify-center gap-2 active:scale-[0.97] motion-reduce:active:scale-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary-500 disabled:hover:translate-y-0 disabled:hover:shadow-orange focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
                  >
                    <Search className="w-5 h-5" aria-hidden="true" />
                    Trouver un professionnel
                  </button>
                </div>

                {/* Mobile inline submit (visible only on mobile, in-form) */}
                <div className="w-full md:hidden p-1">
                  <button
                    type="submit"
                    disabled={!isReady}
                    title={
                      !isReady
                        ? 'Sélectionnez une ville et un service'
                        : 'Trouver un professionnel'
                    }
                    aria-label="Trouver un professionnel"
                    className="w-full min-h-[44px] bg-primary-500 hover:bg-primary-600 text-white rounded-[1.5rem] px-6 py-3.5 font-bold text-base shadow-orange transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.98] motion-reduce:transform-none disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary-500 focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
                  >
                    <Search className="w-5 h-5" aria-hidden="true" />
                    Trouver un professionnel
                  </button>
                </div>
              </form>
            )}
          </motion.div>

          {/* Dynamic subtitle */}
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.4, delay: shouldReduceMotion ? 0 : 0.3 }}
            className="mt-8 text-sm text-text-secondary min-h-[1.5rem]"
          >
            {cityId ? (
              <p>Des professionnels vérifiés dans votre ville</p>
            ) : (
              <p>
                + de <strong className="text-text-primary font-bold">500</strong> pros
                actifs sur Khadamat
              </p>
            )}
          </motion.div>

          {/* Social proof */}
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.4, delay: shouldReduceMotion ? 0 : 0.35 }}
            className="mt-6 flex items-center gap-4 text-sm text-text-secondary"
          >
            <div className="flex -space-x-3" aria-hidden="true">
              {['A', 'M', 'S', 'K'].map((letter, i) => (
                <div
                  key={i}
                  className="w-9 h-9 rounded-full border-2 border-surface bg-primary-100 flex items-center justify-center text-xs font-bold text-primary-700"
                >
                  {letter}
                </div>
              ))}
            </div>
            <p>
              Rejoint par{' '}
              <strong className="text-text-primary font-bold">+10 000 utilisateurs</strong>{' '}
              satisfaits
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── Mobile sticky CTA ── */}
      <HeroMobileCTA visible={heroState === 'ready'} disabled={!isReady} onClick={handleMobileCTA} />

      {/* Spacer for mobile sticky CTA */}
      <div className="h-16 md:hidden" aria-hidden="true" />
    </>
  );
}
