'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';
import SectionHeader from './SectionHeader';
import VerifiedBadge from './VerifiedBadge';

interface Testimonial {
  id: string;
  name: string;
  city: string;
  rating: 1 | 2 | 3 | 4 | 5;
  text: string;
  service: string;
  date: string;
  avatar?: string | null;
}

const testimonials: Testimonial[] = [
  {
    id: '1',
    name: 'Fatima Z.',
    city: 'Casablanca',
    rating: 5,
    text: 'J\'ai trouvé un plombier en moins de 10 minutes. Il est venu le jour même, travail propre et prix annoncé respecté. Je recommande à 100%.',
    service: 'Plomberie',
    date: 'Janvier 2026',
  },
  {
    id: '2',
    name: 'Youssef B.',
    city: 'Rabat',
    rating: 5,
    text: 'Le climaticien était ponctuel et très professionnel. Il m\'a tout expliqué avant de commencer. Ça change des galères habituelles.',
    service: 'Climatisation',
    date: 'Janvier 2026',
  },
  {
    id: '3',
    name: 'Samira K.',
    city: 'Marrakech',
    rating: 4,
    text: 'Ménage impeccable, la personne était soigneuse et rapide. Seul bémol : un léger retard de 15 min. Mais je referai appel sans hésiter.',
    service: 'Ménage',
    date: 'Décembre 2025',
  },
  {
    id: '4',
    name: 'Amine R.',
    city: 'Casablanca',
    rating: 5,
    text: 'Panne électrique un samedi soir, j\'ai trouvé un électricien disponible via Khadamat. Intervention rapide et sécurisée. Très rassurant.',
    service: 'Électricité',
    date: 'Décembre 2025',
  },
  {
    id: '5',
    name: 'Nadia M.',
    city: 'Rabat-Salé',
    rating: 5,
    text: 'Le peintre a refait tout le salon en deux jours. Finitions nickel, il a même protégé les meubles lui-même. Franchement pro.',
    service: 'Peinture',
    date: 'Novembre 2025',
  },
  {
    id: '6',
    name: 'Karim H.',
    city: 'Marrakech',
    rating: 4,
    text: 'Bon bricoleur pour monter des meubles et fixer des étagères. Travail soigné et tarif correct. Le fait qu\'il soit vérifié m\'a mis en confiance.',
    service: 'Bricolage',
    date: 'Novembre 2025',
  },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} étoiles sur 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`w-4 h-4 ${
            i < rating
              ? 'text-primary-500 fill-primary-500'
              : 'text-border-muted fill-border-muted'
          }`}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

const AUTOPLAY_MS = 6000;

export default function Testimonials() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchDeltaX = useRef(0);

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  // Visible cards count based on viewport
  const getVisibleCount = useCallback(() => {
    if (typeof window === 'undefined') return 1;
    if (window.innerWidth >= 1024) return 3;
    if (window.innerWidth >= 640) return 2;
    return 1;
  }, []);

  const [visibleCount, setVisibleCount] = useState(1);

  useEffect(() => {
    const update = () => setVisibleCount(getVisibleCount());
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [getVisibleCount]);

  const maxIndex = Math.max(0, testimonials.length - visibleCount);

  const scrollTo = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(index, maxIndex));
      setCurrentIndex(clamped);
    },
    [maxIndex],
  );

  const prev = useCallback(() => scrollTo(currentIndex - 1), [currentIndex, scrollTo]);
  const next = useCallback(() => scrollTo(currentIndex + 1), [currentIndex, scrollTo]);

  // Autoplay — 6s interval, pause on hover, respect reduced motion
  useEffect(() => {
    if (isPaused || prefersReducedMotion) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
    }, AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [isPaused, prefersReducedMotion, maxIndex]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        next();
      }
    },
    [prev, next],
  );

  // Touch swipe
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
  }, []);

  const handleTouchEnd = useCallback(() => {
    const threshold = 50;
    if (touchDeltaX.current > threshold) {
      prev();
    } else if (touchDeltaX.current < -threshold) {
      next();
    }
  }, [prev, next]);

  // Translate
  const translatePercent = -(currentIndex * (100 / visibleCount));

  return (
    <section
      aria-labelledby="testimonials-title"
      role="region"
      className="py-24 bg-background"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-12">
          <div className="text-left">
            <SectionHeader
              id="testimonials-title"
              badge="Avis clients"
              title="Ils ont trouvé un pro de confiance"
              subtitle="Des milliers de missions réussies partout au Maroc"
            />
          </div>

          {/* Navigation arrows */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={prev}
              disabled={currentIndex === 0}
              aria-label="Témoignage précédent"
              className="w-10 h-10 rounded-full border border-border bg-surface hover:bg-surface-hover flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:outline-offset-2"
            >
              <ChevronLeft className="w-5 h-5 text-text-secondary" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={next}
              disabled={currentIndex >= maxIndex}
              aria-label="Témoignage suivant"
              className="w-10 h-10 rounded-full border border-border bg-surface hover:bg-surface-hover flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:outline-offset-2"
            >
              <ChevronRight className="w-5 h-5 text-text-secondary" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Carousel */}
        <div
          className="overflow-hidden"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onFocus={() => setIsPaused(true)}
          onBlur={() => setIsPaused(false)}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          role="group"
          aria-roledescription="carousel"
          aria-label="Témoignages clients"
        >
          <div
            ref={trackRef}
            className={`flex ${prefersReducedMotion ? '' : 'transition-transform duration-500 ease-out'}`}
            style={{ transform: `translateX(${translatePercent}%)` }}
            aria-live="polite"
          >
            {testimonials.map((t) => (
              <article
                key={t.id}
                role="group"
                aria-roledescription="slide"
                aria-label={`Avis de ${t.name}`}
                className="flex-shrink-0 px-3"
                style={{ width: `${100 / visibleCount}%` }}
              >
                <div className="bg-surface rounded-2xl border border-border p-6 shadow-card h-full flex flex-col">
                  {/* Header */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-white" aria-hidden="true">
                        {t.name.charAt(0)}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-text-primary text-sm truncate">
                          {t.name}
                        </span>
                        <VerifiedBadge small />
                      </div>
                      <span className="text-xs text-text-muted">{t.city}</span>
                    </div>
                  </div>

                  {/* Rating + service */}
                  <div className="flex items-center gap-3 mb-3">
                    <StarRating rating={t.rating} />
                    <span className="text-xs font-medium text-text-muted bg-surface-muted px-2 py-0.5 rounded-full">
                      {t.service}
                    </span>
                  </div>

                  {/* Text */}
                  <p className="text-sm text-text-secondary leading-relaxed flex-1">
                    &ldquo;{t.text}&rdquo;
                  </p>

                  {/* Date */}
                  <time className="block mt-4 text-xs text-text-muted">{t.date}</time>
                </div>
              </article>
            ))}
          </div>
        </div>

        {/* Dots indicator */}
        <div className="flex justify-center gap-1.5 mt-8" aria-hidden="true">
          {Array.from({ length: maxIndex + 1 }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => scrollTo(i)}
              tabIndex={-1}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                i === currentIndex
                  ? 'bg-primary-500 w-6'
                  : 'bg-border hover:bg-text-muted'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
