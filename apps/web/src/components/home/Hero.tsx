'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, MapPin, AlertCircle, RefreshCw, X } from 'lucide-react';
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

const STATS = { pros: 500, missions: 1200, users: 10000 } as const;

type HeroState = 'loading' | 'ready' | 'error';

/** Simple fuzzy match: checks if all query chars appear in target in order */
function fuzzyMatch(query: string, target: string): boolean {
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  let qi = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++;
  }
  return qi === q.length;
}

export default function Hero() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const shouldReduceMotion = useReducedMotion();
  const formRef = useRef<HTMLFormElement>(null);
  const comboboxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);

  const [cities, setCities] = useState<City[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [heroState, setHeroState] = useState<HeroState>('loading');

  const [cityId, setCityId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  // Autosuggest state
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

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

  // Deep link: read ?q= and ?city= from URL on mount
  useEffect(() => {
    if (heroState !== 'ready') return;

    const urlCity = searchParams.get('city');
    const urlQuery = searchParams.get('q');

    if (urlCity) {
      const found = cities.find(
        (c) => c.slug === urlCity || c.id === urlCity || c.name.toLowerCase() === urlCity.toLowerCase(),
      );
      if (found) setCityId(found.id);
    }

    if (urlQuery) {
      const found = categories.find(
        (c) => c.slug === urlQuery || c.name.toLowerCase() === urlQuery.toLowerCase(),
      );
      if (found) {
        setCategoryId(found.id);
        setQuery(found.name);
      } else {
        setQuery(urlQuery);
      }
    }
  }, [heroState, searchParams, cities, categories]);

  // Broadcast city selection to sibling components (e.g. FeaturedPros)
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('hero-city-change', { detail: cityId || null }),
    );
  }, [cityId]);

  // Filtered suggestions
  const suggestions = useMemo(() => {
    if (!query.trim()) return categories;
    return categories.filter((cat) => fuzzyMatch(query, cat.name));
  }, [query, categories]);

  // Close combobox on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (comboboxRef.current && !comboboxRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const isReady = cityId !== '' && categoryId !== '';

  const selectCategory = useCallback(
    (cat: Category) => {
      setCategoryId(cat.id);
      setQuery(cat.name);
      setIsOpen(false);
      setActiveIndex(-1);
    },
    [],
  );

  const clearCategory = useCallback(() => {
    setCategoryId('');
    setQuery('');
    setActiveIndex(-1);
    inputRef.current?.focus();
  }, []);

  const handleInputChange = useCallback((value: string) => {
    setQuery(value);
    setCategoryId('');
    setIsOpen(true);
    setActiveIndex(-1);
  }, []);

  const handleComboboxKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen && (e.key === 'ArrowDown' || e.key === 'Enter')) {
        e.preventDefault();
        setIsOpen(true);
        return;
      }

      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setActiveIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setActiveIndex((prev) => Math.max(prev - 1, -1));
          break;
        case 'Enter':
          e.preventDefault();
          if (activeIndex >= 0 && suggestions[activeIndex]) {
            selectCategory(suggestions[activeIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          setActiveIndex(-1);
          break;
      }
    },
    [isOpen, activeIndex, suggestions, selectCategory],
  );

  // Scroll active option into view
  useEffect(() => {
    if (activeIndex >= 0 && listboxRef.current) {
      const activeEl = listboxRef.current.children[activeIndex] as HTMLElement;
      activeEl?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

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

  const listboxId = 'hero-service-listbox';

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

                {/* Service combobox */}
                <div
                  ref={comboboxRef}
                  className="relative flex-1 w-full md:w-auto px-6 py-3 group"
                >
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
                      <div className="relative flex items-center">
                        <input
                          ref={inputRef}
                          id="home-service"
                          type="text"
                          value={query}
                          onChange={(e) => handleInputChange(e.target.value)}
                          onFocus={() => setIsOpen(true)}
                          onKeyDown={handleComboboxKeyDown}
                          placeholder="Ex: plomberie, ménage…"
                          autoComplete="off"
                          role="combobox"
                          aria-expanded={isOpen}
                          aria-controls={listboxId}
                          aria-activedescendant={
                            activeIndex >= 0 ? `hero-option-${activeIndex}` : undefined
                          }
                          aria-autocomplete="list"
                          className="w-full bg-transparent font-medium text-text-primary focus:outline-none text-sm sm:text-base"
                        />
                        {query && (
                          <button
                            type="button"
                            onClick={clearCategory}
                            className="absolute right-0 p-1 text-text-muted hover:text-text-primary transition-colors"
                            aria-label="Effacer le service"
                            tabIndex={-1}
                          >
                            <X className="w-4 h-4" aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Dropdown suggestions */}
                  {isOpen && suggestions.length > 0 && (
                    <ul
                      ref={listboxRef}
                      id={listboxId}
                      role="listbox"
                      aria-label="Services disponibles"
                      className="absolute left-0 right-0 top-full mt-2 bg-surface border border-border rounded-2xl shadow-card-hover max-h-60 overflow-y-auto z-50"
                    >
                      {suggestions.map((cat, i) => (
                        <li
                          key={cat.id}
                          id={`hero-option-${i}`}
                          role="option"
                          aria-selected={i === activeIndex}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            selectCategory(cat);
                          }}
                          onMouseEnter={() => setActiveIndex(i)}
                          className={`px-5 py-3 text-sm cursor-pointer transition-colors first:rounded-t-2xl last:rounded-b-2xl ${
                            i === activeIndex
                              ? 'bg-primary-50 text-primary-700 font-semibold'
                              : 'text-text-primary hover:bg-primary-50/50'
                          } ${categoryId === cat.id ? 'font-semibold' : ''}`}
                        >
                          {cat.name}
                        </li>
                      ))}
                    </ul>
                  )}

                  {isOpen && query.trim() && suggestions.length === 0 && (
                    <div className="absolute left-0 right-0 top-full mt-2 bg-surface border border-border rounded-2xl shadow-card-hover z-50 px-5 py-4 text-sm text-text-muted text-center">
                      Aucun service trouvé pour &ldquo;{query}&rdquo;
                    </div>
                  )}
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

              </form>
            )}
          </motion.div>

          {/* Stats (hardcoded MVP) */}
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.4, delay: shouldReduceMotion ? 0 : 0.3 }}
            className="mt-8"
          >
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-text-secondary">
              <p>
                <strong className="text-text-primary font-bold">
                  +{STATS.pros.toLocaleString('fr-FR')}
                </strong>{' '}
                pros actifs
              </p>
              <span className="hidden sm:inline text-border-muted" aria-hidden="true">•</span>
              <p>
                <strong className="text-text-primary font-bold">
                  +{STATS.missions.toLocaleString('fr-FR')}
                </strong>{' '}
                missions réalisées
              </p>
              <span className="hidden sm:inline text-border-muted" aria-hidden="true">•</span>
              <p>
                <strong className="text-text-primary font-bold">
                  +{STATS.users.toLocaleString('fr-FR')}
                </strong>{' '}
                utilisateurs
              </p>
            </div>
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
              <strong className="text-text-primary font-bold">
                +{STATS.users.toLocaleString('fr-FR')} utilisateurs
              </strong>{' '}
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
