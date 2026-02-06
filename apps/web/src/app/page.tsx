import Link from 'next/link';
import Navbar from '../components/Navbar';
import SearchHero from '../components/SearchHero';
import type { PublicCity, PublicCategory } from '@khadamat/contracts';
import { 
  Wrench, Zap, Paintbrush, Truck, Snowflake, Leaf, 
  Hammer, Sparkles, CheckCircle, Search, ArrowRight 
} from 'lucide-react';

/**
 * Page d'accueil - Khadamat Landing Page
 * Optimisée pour la performance et l'accessibilité
 */
export default async function Home() {
  const apiUrl = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL;

  let cities: PublicCity[] = [];
  let categories: PublicCategory[] = [];

  try {
    const [citiesResponse, categoriesResponse] = await Promise.all([
      fetch(`${apiUrl}/public/cities`, { 
        cache: 'no-store',
        next: { revalidate: 3600 } // Revalider toutes les heures
      }),
      fetch(`${apiUrl}/public/categories`, { 
        cache: 'no-store',
        next: { revalidate: 3600 }
      }),
    ]);

    if (citiesResponse.ok) cities = await citiesResponse.json();
    if (categoriesResponse.ok) categories = await categoriesResponse.json();
  } catch (error) {
    console.error('Failed to fetch data:', error);
  }

  const displayCategories = categories.length > 0 ? categories : defaultCategories;

  return (
    <div className="min-h-screen bg-[#F2F0EF] font-sans selection:bg-[#F08C1B] selection:text-white">
      <Navbar />
      <SearchHero cities={cities} categories={categories} />

      {/* Categories Section */}
      <section className="py-24 bg-[#F2F0EF]" aria-labelledby="categories-heading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Section Header */}
          <div className="text-center space-y-4 mb-16">
            <span className="inline-block px-4 py-1.5 bg-orange-100 text-[#F08C1B] rounded-full text-sm font-bold tracking-wide uppercase">
              Nos Services
            </span>
            <h2 
              id="categories-heading"
              className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight"
            >
              Catégories populaires
            </h2>
            <p className="text-slate-600 text-lg max-w-2xl mx-auto">
              Explorez nos services les plus demandés et trouvez l'expert qu'il vous faut en quelques clics.
            </p>
          </div>

          {/* Categories Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {displayCategories.slice(0, 8).map((category) => (
              <CategoryCard key={category.id} category={category} />
            ))}
          </div>

          <div className="text-center mt-12">
            <Link
              href="/pros"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white border-2 border-slate-200 text-slate-700 rounded-xl font-bold hover:border-[#F08C1B] hover:text-[#F08C1B] transition-all duration-300 shadow-sm hover:shadow-md group"
            >
              Voir tous les services
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 bg-white relative overflow-hidden" aria-labelledby="how-it-works-heading">
        {/* Decorative background */}
        <div 
          className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-50 rounded-full blur-3xl opacity-50 translate-x-1/2 -translate-y-1/2" 
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
            {/* Connector Line */}
            <div 
              className="hidden md:block absolute top-12 left-[15%] right-[15%] h-1 bg-slate-100 rounded-full" 
              aria-hidden="true"
            />
            
            {steps.map((step, index) => (
              <StepCard key={index} step={step} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* Become a Pro CTA Section */}
      <section className="py-24 bg-slate-900 relative overflow-hidden" aria-labelledby="cta-heading">
        <div 
          className="absolute inset-0 opacity-20 bg-[radial-gradient(#F08C1B_1px,transparent_1px)] [background-size:16px_16px]" 
          aria-hidden="true"
        />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full mb-8">
              <Sparkles className="w-4 h-4 text-[#F08C1B]" />
              <span className="text-white text-sm font-medium">Rejoignez l'élite des pros</span>
            </span>

            <h2 id="cta-heading" className="text-4xl md:text-6xl font-extrabold text-white mb-8 tracking-tight">
              Vous êtes professionnel ?
              <br />
              <span className="text-[#F08C1B]">Boostez votre activité.</span>
            </h2>

            <p className="text-xl text-slate-300 mb-12 max-w-2xl mx-auto leading-relaxed">
              Rejoignez Khadamat et accédez à des milliers de clients. 
              Gérez votre emploi du temps et encaissez vos revenus simplement.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <Link
                href="/auth/register"
                className="w-full sm:w-auto px-10 py-5 bg-[#F08C1B] text-white rounded-2xl font-bold text-lg hover:bg-[#d97706] hover:scale-105 transition-all shadow-lg shadow-orange-500/30"
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
            
            {/* Stats */}
            <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 border-t border-white/10 pt-12">
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

      {/* Footer */}
      <footer className="bg-white border-t border-slate-100 py-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-8 h-8 bg-[#F08C1B] rounded-lg flex items-center justify-center text-white font-bold">
              K
            </div>
            <span className="text-xl font-bold text-slate-900">Khadamat</span>
          </div>
          <p className="text-slate-500 text-sm">
            © {new Date().getFullYear()} Khadamat. Fait avec ❤️ au Maroc.
          </p>
        </div>
      </footer>
    </div>
  );
}

// ============================================================================
// COMPONENTS
// ============================================================================

interface CategoryCardProps {
  category: PublicCategory;
}

function CategoryCard({ category }: CategoryCardProps) {
  return (
    <Link
      href={`/pros?categoryId=${category.id}`}
      className="group relative bg-white rounded-2xl p-5 md:p-6 shadow-sm border border-slate-100 hover:shadow-xl hover:border-[#F08C1B]/30 hover:-translate-y-1 transition-all duration-300 flex flex-col items-center text-center"
    >
      {/* Icon Circle */}
      <div className="w-14 h-14 md:w-16 md:h-16 bg-orange-50 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-[#F08C1B] transition-colors duration-300">
        <div className="text-[#F08C1B] group-hover:text-white transition-colors duration-300">
          {'icon' in category ? category.icon : getCategoryIcon(category.name)}
        </div>
      </div>

      <h3 className="text-base md:text-lg font-bold text-slate-900 group-hover:text-[#F08C1B] transition-colors">
        {category.name}
      </h3>
      
      {/* Arrow indicator */}
      <div className="mt-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 text-[#F08C1B] text-sm font-medium flex items-center gap-1">
        Voir les pros <Search className="w-3 h-3" />
      </div>
    </Link>
  );
}

interface Step {
  title: string;
  desc: string;
  icon: React.ReactNode;
}

interface StepCardProps {
  step: Step;
  index: number;
}

function StepCard({ step, index }: StepCardProps) {
  return (
    <div className="relative text-center group">
      {/* Step Number Badge */}
      <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-10 h-10 bg-slate-900 text-white rounded-full flex items-center justify-center font-bold text-lg z-20">
        {index + 1}
      </div>
      
      <div className="relative z-10 w-24 h-24 mx-auto mb-6 bg-[#F08C1B] rounded-3xl rotate-3 group-hover:rotate-6 transition-transform shadow-lg shadow-orange-200 flex items-center justify-center">
        {step.icon}
      </div>
      
      <h3 className="text-xl font-bold text-slate-900 mb-3">{step.title}</h3>
      <p className="text-slate-600 leading-relaxed max-w-xs mx-auto">{step.desc}</p>
    </div>
  );
}

// ============================================================================
// DATA
// ============================================================================

const steps: Step[] = [
  { 
    title: "Recherchez", 
    desc: "Décrivez votre besoin et choisissez votre expert.", 
    icon: <Search className="w-8 h-8 text-white" /> 
  },
  { 
    title: "Comparez", 
    desc: "Vérifiez les avis, les prix et les photos.", 
    icon: <CheckCircle className="w-8 h-8 text-white" /> 
  },
  { 
    title: "Réservez", 
    desc: "Planifiez l'intervention et payez en sécurité.", 
    icon: <CheckCircle className="w-8 h-8 text-white" /> 
  }
];

const stats = [
  { num: "2k+", label: "Professionnels" },
  { num: "50+", label: "Villes" },
  { num: "10k+", label: "Missions" },
  { num: "4.8", label: "Note Moyenne" }
];

// ============================================================================
// HELPERS
// ============================================================================

function getCategoryIcon(name: string): React.ReactNode {
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

const defaultCategories: PublicCategory[] = [
  { id: '1', name: 'Plomberie', icon: <Wrench className="w-8 h-8" /> },
  { id: '2', name: 'Électricité', icon: <Zap className="w-8 h-8" /> },
  { id: '3', name: 'Peinture', icon: <Paintbrush className="w-8 h-8" /> },
  { id: '4', name: 'Jardinage', icon: <Leaf className="w-8 h-8" /> },
  { id: '5', name: 'Climatisation', icon: <Snowflake className="w-8 h-8" /> },
  { id: '6', name: 'Déménagement', icon: <Truck className="w-8 h-8" /> },
  { id: '7', name: 'Menuiserie', icon: <Hammer className="w-8 h-8" /> },
  { id: '8', name: 'Nettoyage', icon: <Sparkles className="w-8 h-8" /> },
];
