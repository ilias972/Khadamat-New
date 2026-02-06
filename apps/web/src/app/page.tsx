// =============================================================
// app/page.tsx
// =============================================================
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import Navbar from '../components/Navbar';
import type { PublicCity, PublicCategory } from '@khadamat/contracts';
import { ArrowRight } from 'lucide-react';

// Client sections (Framer Motion + sticky CTA + immersive hero)
const SearchHeroImmersive = dynamic(() => import('../components/home/SearchHeroImmersive'), {
  ssr: false,
  loading: () => <HeroSkeleton />,
});

const TestimonialsSection = dynamic(() => import('../components/home/TestimonialsSection'), {
  ssr: false,
  loading: () => <SectionSkeleton title="Témoignages" />,
});

const ProsOfWeekSection = dynamic(() => import('../components/home/ProsOfWeekSection'), {
  ssr: false,
  loading: () => <SectionSkeleton title="Les pros abonnés de la semaine" />,
});

const MobileStickyCTA = dynamic(() => import('../components/home/MobileStickyCTA'), {
  ssr: false,
});

const CategoryGrid = dynamic(() => import('../components/home/CategoryGrid'), {
  ssr: false,
  loading: () => <CategoryGridSkeleton />,
});

/**
 * Page d'accueil - Khadamat Landing Page
 * Objectif: look premium + UX, sans casser ton existant.
 */
export default async function Home() {
  const apiUrl = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL;

  let cities: PublicCity[] = [];
  let categories: PublicCategory[] = [];

  try {
    const [citiesResponse, categoriesResponse] = await Promise.all([
      fetch(`${apiUrl}/public/cities`, {
        cache: 'no-store',
        next: { revalidate: 3600 },
      }),
      fetch(`${apiUrl}/public/categories`, {
        cache: 'no-store',
        next: { revalidate: 3600 },
      }),
    ]);

    if (citiesResponse.ok) cities = await citiesResponse.json();
    if (categoriesResponse.ok) categories = await categoriesResponse.json();
  } catch (error) {
    console.error('Failed to fetch data:', error);
  }

  // Fallback safe
  const displayCategories = categories.length > 0 ? categories : defaultCategories;

  // Combos 1-clic (ville x service)
  // → on s’appuie sur tes data existantes, sans endpoint dédié.
  const quickCombos = buildQuickCombos(cities, displayCategories);

  return (
    <div className="min-h-screen bg-[#F2F0EF] font-sans selection:bg-[#F08C1B] selection:text-white">
      <Navbar />

      {/* HERO IMMERSIF (client + motion) */}
      <Suspense fallback={<HeroSkeleton />}>
        <SearchHeroImmersive cities={cities} categories={displayCategories} quickCombos={quickCombos} />
      </Suspense>

      {/* MOBILE STICKY CTA */}
      <MobileStickyCTA />

      {/* PROS OF THE WEEK (4 cards) */}
      <section className="py-20 bg-[#F2F0EF]" aria-labelledby="pros-week-heading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-10">
            <div className="space-y-3">
              <span className="inline-flex items-center rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#F08C1B]">
                Sélection
              </span>
              <h2 id="pros-week-heading" className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
                Les pros abonnés de la semaine
              </h2>
              <p className="text-slate-600 max-w-2xl">
                4 pros Premium mis en avant — 1 service par ville — sélectionnés pour leurs avis et leur réactivité.
              </p>
            </div>

            <Link
              href="/pros"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-4 font-bold text-slate-800 shadow-sm ring-1 ring-slate-200 hover:ring-[#F08C1B]/30 hover:text-[#F08C1B] transition"
            >
              Explorer tous les pros
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>

          <Suspense fallback={<SectionSkeleton title="Les pros abonnés de la semaine" />}>
            <ProsOfWeekSection cities={cities} categories={displayCategories} />
          </Suspense>
        </div>
      </section>

      {/* CATEGORIES (skeleton + motion) */}
      <section className="py-24 bg-white" aria-labelledby="categories-heading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 mb-16">
            <span className="inline-block px-4 py-1.5 bg-orange-100 text-[#F08C1B] rounded-full text-sm font-bold tracking-wide uppercase">
              Nos Services
            </span>
            <h2 id="categories-heading" className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
              Trouvez le bon expert, en quelques secondes
            </h2>
            <p className="text-slate-600 text-lg max-w-2xl mx-auto">
              Parcourez les catégories les plus demandées et accédez directement aux meilleurs professionnels.
            </p>
          </div>

          <Suspense fallback={<CategoryGridSkeleton />}>
            <CategoryGrid categories={displayCategories} />
          </Suspense>

          <div className="text-center mt-12">
            <Link
              href="/pros"
              className="inline-flex items-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:opacity-95 transition shadow-lg shadow-slate-900/20 group"
            >
              Voir tous les services
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* COMMENT ÇA MARCHE (garde ton style, plus clean) */}
      <HowItWorks />

      {/* TÉMOIGNAGES (client + motion) */}
      <section className="py-24 bg-[#F2F0EF]" aria-labelledby="testimonials-heading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 mb-14">
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-700">
              Preuve sociale
            </span>
            <h2 id="testimonials-heading" className="text-3xl md:text-4xl font-extrabold text-slate-900">
              Ils ont utilisé Khadamat
            </h2>
            <p className="text-slate-600 text-lg max-w-2xl mx-auto">
              Des avis authentiques — qualité, ponctualité, transparence.
            </p>
          </div>

          <Suspense fallback={<SectionSkeleton title="Témoignages" />}>
            <TestimonialsSection />
          </Suspense>
        </div>
      </section>

      {/* CTA PRO (ton bloc, légèrement polish) */}
      <BecomeProCTA />

      {/* Footer */}
      <footer className="bg-white border-t border-slate-100 py-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-8 h-8 bg-[#F08C1B] rounded-lg flex items-center justify-center text-white font-bold">
              K
            </div>
            <span className="text-xl font-bold text-slate-900">Khadamat</span>
          </div>
          <p className="text-slate-500 text-sm">© {new Date().getFullYear()} Khadamat. Fait avec ❤️ au Maroc.</p>
        </div>
      </footer>
    </div>
  );
}

// =============================================================
// SHARED SECTIONS (server components)
// =============================================================

function HowItWorks() {
  return (
    <section className="py-24 bg-white relative overflow-hidden" aria-labelledby="how-it-works-heading">
      <div
        className="absolute top-0 right-0 w-[520px] h-[520px] bg-orange-50 rounded-full blur-3xl opacity-70 translate-x-1/2 -translate-y-1/2"
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center space-y-4 mb-20">
          <h2 id="how-it-works-heading" className="text-3xl md:text-4xl font-extrabold text-slate-900">
            Comment ça marche ?
          </h2>
          <p className="text-slate-600 text-lg">Votre mission réalisée en 3 étapes simples</p>
        </div>

        <div className="grid md:grid-cols-3 gap-12 relative">
          <div className="hidden md:block absolute top-12 left-[15%] right-[15%] h-1 bg-slate-100 rounded-full" aria-hidden="true" />
          <StepCard index={0} title="Recherchez" desc="Décrivez votre besoin et choisissez votre expert." />
          <StepCard index={1} title="Comparez" desc="Vérifiez les avis, les prix et les photos." />
          <StepCard index={2} title="Réservez" desc="Planifiez l'intervention et payez en sécurité." />
        </div>
      </div>
    </section>
  );
}

function StepCard({ index, title, desc }: { index: number; title: string; desc: string }) {
  return (
    <div className="relative text-center">
      <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-10 h-10 bg-slate-900 text-white rounded-full flex items-center justify-center font-bold text-lg z-20">
        {index + 1}
      </div>
      <div className="relative z-10 w-24 h-24 mx-auto mb-6 bg-[#F08C1B] rounded-3xl rotate-3 shadow-lg shadow-orange-200" />
      <h3 className="text-xl font-bold text-slate-900 mb-3">{title}</h3>
      <p className="text-slate-600 leading-relaxed max-w-xs mx-auto">{desc}</p>
    </div>
  );
}

function BecomeProCTA() {
  return (
    <section className="py-24 bg-slate-900 relative overflow-hidden" aria-labelledby="cta-heading">
      <div
        className="absolute inset-0 opacity-20 bg-[radial-gradient(#F08C1B_1px,transparent_1px)] [background-size:16px_16px]"
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full mb-8">
            <span className="w-2 h-2 rounded-full bg-[#F08C1B]" />
            <span className="text-white text-sm font-medium">Rejoignez l'élite des pros</span>
          </span>

          <h2 id="cta-heading" className="text-4xl md:text-6xl font-extrabold text-white mb-8 tracking-tight">
            Vous êtes professionnel ?
            <br />
            <span className="text-[#F08C1B]">Boostez votre activité.</span>
          </h2>

          <p className="text-xl text-slate-300 mb-12 max-w-2xl mx-auto leading-relaxed">
            Rejoignez Khadamat et accédez à des milliers de clients. Gérez votre emploi du temps et encaissez vos revenus simplement.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <Link
              href="/auth/register"
              className="w-full sm:w-auto px-10 py-5 bg-[#F08C1B] text-white rounded-2xl font-bold text-lg hover:bg-[#d97706] hover:scale-[1.02] transition-all shadow-lg shadow-orange-500/30"
            >
              Devenir Pro gratuitement
            </Link>
            <Link
              href="/pros"
              className="w-full sm:w-auto px-10 py-5 bg-white/5 border border-white/20 text-white rounded-2xl font-bold text-lg hover:bg-white/10 transition-all backdrop-blur-sm"
            >
              En savoir plus
            </Link>
          </div>

          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 border-t border-white/10 pt-12">
            {stats.map((stat, index) => (
              <div key={index} className="group">
                <div className="text-3xl md:text-4xl font-bold text-white group-hover:text-[#F08C1B] transition-colors">
                  {stat.num}
                </div>
                <div className="text-slate-400 text-sm mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// =============================================================
// SKELETONS
// =============================================================

function HeroSkeleton() {
  return (
    <section className="relative overflow-hidden bg-slate-900">
      <div className="absolute inset-0 opacity-30 bg-[radial-gradient(#F08C1B_1px,transparent_1px)] [background-size:18px_18px]" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="max-w-3xl">
          <div className="h-8 w-44 rounded-full bg-white/10" />
          <div className="mt-6 h-12 w-full max-w-xl rounded-2xl bg-white/10" />
          <div className="mt-3 h-6 w-full max-w-lg rounded-2xl bg-white/10" />
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="h-14 rounded-2xl bg-white/10" />
            <div className="h-14 rounded-2xl bg-white/10" />
          </div>
          <div className="mt-10 h-24 rounded-3xl bg-white/10" />
        </div>
      </div>
    </section>
  );
}

function SectionSkeleton({ title }: { title: string }) {
  return (
    <div className="rounded-3xl bg-white/60 backdrop-blur p-6 sm:p-8 border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between gap-6">
        <div>
          <div className="text-sm font-bold text-slate-500">{title}</div>
          <div className="mt-2 h-8 w-64 rounded-2xl bg-slate-200 animate-pulse" />
        </div>
        <div className="h-10 w-28 rounded-2xl bg-slate-200 animate-pulse" />
      </div>
      <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-44 rounded-3xl bg-slate-200 animate-pulse" />
        ))}
      </div>
    </div>
  );
}

function CategoryGridSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-[150px] rounded-3xl bg-slate-200 animate-pulse" />
      ))}
    </div>
  );
}

// =============================================================
// DATA + HELPERS
// =============================================================

const stats = [
  { num: '2k+', label: 'Professionnels' },
  { num: '50+', label: 'Villes' },
  { num: '10k+', label: 'Missions' },
  { num: '4.8', label: 'Note Moyenne' },
];

function buildQuickCombos(cities: PublicCity[], categories: PublicCategory[]) {
  const safeCities = cities?.slice?.(0, 2) ?? [];
  const safeCats = categories?.slice?.(0, 4) ?? [];

  const combos: Array<{ label: string; href: string }> = [];

  // 1-clic: si on a des ids
  for (let i = 0; i < Math.min(safeCats.length, 4); i++) {
    const cat = safeCats[i];
    const city = safeCities[i % Math.max(1, safeCities.length)];
    const cityPart = city?.id ? `&cityId=${encodeURIComponent(city.id)}` : '';
    combos.push({
      label: city?.name ? `${cat.name} à ${city.name}` : cat.name,
      href: `/pros?categoryId=${encodeURIComponent(cat.id)}${cityPart}`,
    });
  }

  return combos;
}

const defaultCategories: PublicCategory[] = [
  // @ts-expect-error - fallback UI icons in category for empty API case
  { id: '1', name: 'Plomberie' },
  // @ts-expect-error
  { id: '2', name: 'Électricité' },
  // @ts-expect-error
  { id: '3', name: 'Peinture' },
  // @ts-expect-error
  { id: '4', name: 'Jardinage' },
  // @ts-expect-error
  { id: '5', name: 'Climatisation' },
  // @ts-expect-error
  { id: '6', name: 'Déménagement' },
  // @ts-expect-error
  { id: '7', name: 'Menuiserie' },
  // @ts-expect-error
  { id: '8', name: 'Nettoyage' },
];


// =============================================================
// components/home/SearchHeroImmersive.tsx
// =============================================================
// NOTE: mets ce fichier dans: components/home/SearchHeroImmersive.tsx

/*
'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import SearchHero from '../SearchHero';
import type { PublicCity, PublicCategory } from '@khadamat/contracts';
import { ArrowRight, Sparkles } from 'lucide-react';

export default function SearchHeroImmersive({
  cities,
  categories,
  quickCombos,
}: {
  cities: PublicCity[];
  categories: PublicCategory[];
  quickCombos: Array<{ label: string; href: string }>;
}) {
  return (
    <section id="top" className="relative overflow-hidden bg-slate-950">
      {/* Ambient */}
      <div className="absolute inset-0">
        <div className="absolute -top-28 -left-28 h-80 w-80 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-[520px] w-[520px] rounded-full bg-orange-500/10 blur-3xl" />
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#F08C1B_1px,transparent_1px)] [background-size:18px_18px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <div className="grid lg:grid-cols-12 gap-10 items-center">
          {/* Left copy */}
          <div className="lg:col-span-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 backdrop-blur"
            >
              <Sparkles className="h-4 w-4 text-[#F08C1B]" />
              <span className="text-white/90 text-sm font-semibold">Des pros vérifiés, des avis, un paiement sécurisé</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.05 }}
              className="mt-6 text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white"
            >
              Le bon pro,
              <span className="text-[#F08C1B]"> au bon moment.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.1 }}
              className="mt-4 text-white/70 text-lg leading-relaxed max-w-xl"
            >
              Plomberie, électricité, nettoyage, déménagement… Décris ton besoin et compare les meilleurs pros près de chez toi.
            </motion.p>

            {/* 1-clic */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.15 }}
              className="mt-8"
            >
              <div className="text-white/60 text-sm font-semibold mb-3">Parcours 1‑clic (populaire)</div>
              <div className="flex flex-wrap gap-3">
                {quickCombos.slice(0, 4).map((c) => (
                  <Link
                    key={c.href}
                    href={c.href}
                    className="rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 text-sm font-semibold text-white/90 transition"
                  >
                    {c.label}
                  </Link>
                ))}
              </div>
            </motion.div>

            {/* Small CTA row */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.2 }}
              className="mt-10 flex flex-col sm:flex-row gap-4"
            >
              <Link
                href="#search"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#F08C1B] px-6 py-4 text-white font-bold shadow-lg shadow-orange-500/25 hover:brightness-95 transition"
              >
                Trouver un pro
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/auth/register"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/5 px-6 py-4 text-white font-bold border border-white/10 hover:bg-white/10 transition"
              >
                Devenir Pro
              </Link>
            </motion.div>
          </div>

          {/* Right search card */}
          <div className="lg:col-span-6">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.15 }}
              className="rounded-[28px] bg-white/70 backdrop-blur-xl border border-white/50 shadow-2xl shadow-slate-900/30"
            >
              <div className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm font-extrabold text-slate-900">Recherche rapide</div>
                  <div className="text-xs font-bold text-slate-600">~ 30 sec</div>
                </div>

                <div id="search" className="rounded-2xl bg-white p-4 sm:p-5 border border-slate-100">
                  <SearchHero cities={cities} categories={categories} />
                </div>

                <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                  {[
                    { t: 'Vérifiés', d: 'Profils contrôlés' },
                    { t: 'Avis', d: 'Retours clients' },
                    { t: 'Sécurisé', d: 'Paiement protégé' },
                  ].map((b) => (
                    <div key={b.t} className="rounded-2xl bg-white/60 border border-slate-100 px-3 py-3">
                      <div className="text-sm font-extrabold text-slate-900">{b.t}</div>
                      <div className="text-[11px] text-slate-600 mt-0.5">{b.d}</div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
*/


// =============================================================
// components/home/ProsOfWeekSection.tsx
// =============================================================
// NOTE: mets ce fichier dans: components/home/ProsOfWeekSection.tsx

/*
'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import type { PublicCity, PublicCategory } from '@khadamat/contracts';
import { MapPin, BadgeCheck, Star, ArrowRight } from 'lucide-react';

type ProWeekCard = {
  cityName: string;
  cityId?: string;
  categoryName: string;
  categoryId: string;
  proName: string;
  rating: number;
  jobs: number;
  responseTime: string;
};

export default function ProsOfWeekSection({
  cities,
  categories,
}: {
  cities: PublicCity[];
  categories: PublicCategory[];
}) {
  const cards = buildProsOfWeek(cities, categories);

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((p, idx) => (
        <motion.div
          key={`${p.categoryId}-${p.cityName}-${idx}`}
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.35, delay: idx * 0.04 }}
          className="group rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition"
        >
          <div className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-slate-500">{p.categoryName}</div>
                <div className="mt-1 text-lg font-extrabold text-slate-900">{p.proName}</div>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 text-[#F08C1B] border border-orange-200 px-3 py-1 text-xs font-bold">
                <BadgeCheck className="h-4 w-4" />
                Premium
              </span>
            </div>

            <div className="mt-4 flex items-center gap-2 text-sm text-slate-700">
              <MapPin className="h-4 w-4 text-slate-500" />
              <span className="font-semibold">{p.cityName}</span>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-2xl bg-slate-50 border border-slate-100 px-3 py-3">
                <div className="flex items-center gap-1 text-slate-900 font-extrabold">
                  <Star className="h-4 w-4 text-[#F08C1B]" />
                  {p.rating.toFixed(1)}
                </div>
                <div className="text-[11px] text-slate-600 mt-0.5">note</div>
              </div>
              <div className="rounded-2xl bg-slate-50 border border-slate-100 px-3 py-3">
                <div className="text-slate-900 font-extrabold">{p.jobs}</div>
                <div className="text-[11px] text-slate-600 mt-0.5">missions</div>
              </div>
              <div className="rounded-2xl bg-slate-50 border border-slate-100 px-3 py-3">
                <div className="text-slate-900 font-extrabold">{p.responseTime}</div>
                <div className="text-[11px] text-slate-600 mt-0.5">réponse</div>
              </div>
            </div>

            <Link
              href={`/pros?categoryId=${encodeURIComponent(p.categoryId)}${p.cityId ? `&cityId=${encodeURIComponent(p.cityId)}` : ''}`}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-white font-bold hover:opacity-95 transition"
            >
              Voir les pros
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function buildProsOfWeek(cities: PublicCity[], categories: PublicCategory[]): ProWeekCard[] {
  const fallbackCities = cities?.slice?.(0, 4) ?? [];
  const picks = pickTop4Categories(categories);

  // Data mock (tu peux brancher une vraie route plus tard)
  const mockNames = ['Youssef', 'Aya', 'Hamza', 'Sara'];

  return Array.from({ length: 4 }).map((_, i) => {
    const cat = picks[i];
    const city = fallbackCities[i] ?? fallbackCities[0];
    return {
      cityName: city?.name ?? 'Votre ville',
      cityId: city?.id,
      categoryName: cat?.name ?? 'Service',
      categoryId: cat?.id ?? String(i + 1),
      proName: `${mockNames[i]} • ${cat?.name ?? 'Pro'}`,
      rating: 4.6 + (i % 3) * 0.1,
      jobs: 120 + i * 35,
      responseTime: ['< 10 min', '< 1h', '< 2h', '< 30 min'][i] ?? '< 1h',
    };
  });
}

function pickTop4Categories(categories: PublicCategory[]) {
  const safe = categories ?? [];
  const wanted = ['Plomberie', 'Électricité', 'Nettoyage', 'Déménagement'];
  const picked: PublicCategory[] = [];

  for (const w of wanted) {
    const found = safe.find((c) => c?.name?.toLowerCase?.() === w.toLowerCase());
    if (found) picked.push(found);
  }

  // complète si pas trouvé
  for (const c of safe) {
    if (picked.length >= 4) break;
    if (!picked.some((p) => p.id === c.id)) picked.push(c);
  }

  return picked.slice(0, 4);
}
*/


// =============================================================
// components/home/CategoryGrid.tsx
// =============================================================
// NOTE: mets ce fichier dans: components/home/CategoryGrid.tsx

/*
'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import type { PublicCategory } from '@khadamat/contracts';
import { Search } from 'lucide-react';
import { getCategoryIcon } from './icons';

export default function CategoryGrid({ categories }: { categories: PublicCategory[] }) {
  const display = (categories ?? []).slice(0, 8);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
      {display.map((category, idx) => (
        <motion.div
          key={category.id}
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.3, delay: idx * 0.03 }}
        >
          <Link
            href={`/pros?categoryId=${encodeURIComponent(category.id)}`}
            className="group relative block rounded-3xl bg-white p-5 md:p-6 shadow-sm border border-slate-200 hover:shadow-xl hover:border-[#F08C1B]/30 hover:-translate-y-1 transition-all duration-300"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 md:w-16 md:h-16 bg-orange-50 rounded-2xl flex items-center justify-center group-hover:bg-[#F08C1B] transition-colors">
                <div className="text-[#F08C1B] group-hover:text-white transition-colors">
                  {('icon' in category && (category as any).icon) ? (category as any).icon : getCategoryIcon(category.name)}
                </div>
              </div>

              <div className="min-w-0">
                <h3 className="text-base md:text-lg font-extrabold text-slate-900 group-hover:text-[#F08C1B] transition-colors truncate">
                  {category.name}
                </h3>
                <div className="mt-1 text-sm text-slate-600">Voir les pros disponibles</div>
              </div>
            </div>

            <div className="mt-4 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 text-[#F08C1B] text-sm font-bold flex items-center gap-2">
              Explorer <Search className="w-4 h-4" />
            </div>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
*/


// =============================================================
// components/home/TestimonialsSection.tsx
// =============================================================
// NOTE: mets ce fichier dans: components/home/TestimonialsSection.tsx

/*
'use client';

import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';

const testimonials = [
  {
    name: 'Nadia',
    city: 'Casablanca',
    service: 'Plomberie',
    rating: 5,
    text: "Intervention rapide et propre. Le pro a expliqué le problème et le prix était clair dès le début.",
  },
  {
    name: 'Rachid',
    city: 'Rabat',
    service: 'Électricité',
    rating: 5,
    text: "Très ponctuel, travail nickel. J'ai pu comparer plusieurs pros et choisir facilement.",
  },
  {
    name: 'Salma',
    city: 'Marrakech',
    service: 'Nettoyage',
    rating: 4,
    text: "Super expérience, communication fluide, résultat impeccable. Je recommande Khadamat.",
  },
  {
    name: 'Omar',
    city: 'Tanger',
    service: 'Déménagement',
    rating: 5,
    text: "Équipe efficace, respect des horaires. Réservation simple, tout s'est fait en quelques minutes.",
  },
];

export default function TestimonialsSection() {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {testimonials.map((t, idx) => (
        <motion.div
          key={t.name}
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.35, delay: idx * 0.05 }}
          className="relative rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition p-6"
        >
          <div className="absolute -top-3 -right-3 h-12 w-12 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center">
            <Quote className="h-5 w-5 text-[#F08C1B]" />
          </div>

          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`h-4 w-4 ${i < t.rating ? 'text-[#F08C1B]' : 'text-slate-200'}`}
                fill={i < t.rating ? 'currentColor' : 'none'}
              />
            ))}
          </div>

          <p className="mt-4 text-slate-700 leading-relaxed">{t.text}</p>

          <div className="mt-6 flex items-center justify-between">
            <div>
              <div className="font-extrabold text-slate-900">{t.name}</div>
              <div className="text-sm text-slate-600">{t.city} • {t.service}</div>
            </div>
            <span className="text-xs font-bold text-slate-500 bg-slate-50 border border-slate-200 rounded-full px-3 py-1">
              Client
            </span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
*/


// =============================================================
// components/home/MobileStickyCTA.tsx
// =============================================================
// NOTE: mets ce fichier dans: components/home/MobileStickyCTA.tsx

/*
'use client';

import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Search, Sparkles } from 'lucide-react';

export default function MobileStickyCTA() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setShow(y > 240);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed bottom-3 left-0 right-0 z-50 px-3 sm:hidden"
        >
          <div className="rounded-3xl bg-white/90 backdrop-blur-xl border border-slate-200 shadow-2xl shadow-slate-900/15 p-2">
            <div className="grid grid-cols-2 gap-2">
              <a
                href="#search"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-3 py-3 text-white font-extrabold"
              >
                <Search className="h-5 w-5" />
                Trouver un pro
              </a>
              <Link
                href="/auth/register"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#F08C1B] px-3 py-3 text-white font-extrabold"
              >
                <Sparkles className="h-5 w-5" />
                Devenir Pro
              </Link>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
*/


// =============================================================
// components/home/icons.tsx
// =============================================================
// NOTE: mets ce fichier dans: components/home/icons.tsx

/*
import React from 'react';
import { Wrench, Zap, Paintbrush, Truck, Snowflake, Leaf, Hammer, Sparkles } from 'lucide-react';

export function getCategoryIcon(name: string): React.ReactNode {
  const iconClass = 'w-7 h-7 md:w-8 md:h-8';
  const icons: Record<string, React.ReactNode> = {
    Plomberie: <Wrench className={iconClass} />,
    Électricité: <Zap className={iconClass} />,
    Jardinage: <Leaf className={iconClass} />,
    Menuiserie: <Hammer className={iconClass} />,
    Peinture: <Paintbrush className={iconClass} />,
    Nettoyage: <Sparkles className={iconClass} />,
    Climatisation: <Snowflake className={iconClass} />,
    Déménagement: <Truck className={iconClass} />,
  };
  return icons[name] || <Wrench className={iconClass} />;
}
*/
