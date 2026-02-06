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
