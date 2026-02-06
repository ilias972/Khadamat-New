import Link from 'next/link';
import Navbar from '../components/Navbar';
import SearchHero from '../components/SearchHero';
import type { PublicCity, PublicCategory } from '@khadamat/contracts';
import { Wrench, Zap, Paintbrush, Truck, Snowflake, Leaf, Hammer, Sparkles, CheckCircle, Search } from 'lucide-react';

/**
 * Page d'accueil - Khadamat Landing Page (Version Premium Fix)
 */
export default async function Home() {
  const apiUrl = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL;

  let cities: PublicCity[] = [];
  let categories: PublicCategory[] = [];

  try {
    const [citiesResponse, categoriesResponse] = await Promise.all([
      fetch(`${apiUrl}/public/cities`, { cache: 'no-store' }),
      fetch(`${apiUrl}/public/categories`, { cache: 'no-store' }),
    ]);

    if (citiesResponse.ok) cities = await citiesResponse.json();
    if (categoriesResponse.ok) categories = await categoriesResponse.json();
  } catch (error) {
    console.error('Failed to fetch data:', error);
  }

  return (
    <div className="min-h-screen bg-[#F2F0EF] font-sans selection:bg-[#F08C1B] selection:text-white">
      <Navbar />

      <SearchHero cities={cities} categories={categories} />

      {/* Categories Section */}
      <section className="py-24 bg-[#F2F0EF]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Section Header */}
          <div className="text-center space-y-4 mb-16">
            <span className="inline-block px-4 py-1.5 bg-orange-100 text-[#F08C1B] rounded-full text-sm font-bold tracking-wide uppercase">
              Nos Services
            </span>
            <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
              Catégories populaires
            </h2>
            <p className="text-slate-600 text-lg max-w-2xl mx-auto">
              Explorez nos services les plus demandés et trouvez l'expert qu'il vous faut en quelques clics.
            </p>
          </div>

          {/* Categories Grid (Fix: Grid plus serrée et cartes plus petites) */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {(categories.length > 0 ? categories : defaultCategories).map((category, index) => (
              <Link
                key={category.id}
                href={`/pros?categoryId=${category.id}`}
                className="group relative bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-xl hover:border-[#F08C1B]/30 hover:-translate-y-1 transition-all duration-300 flex flex-col items-center text-center"
              >
                {/* Icon Circle */}
                <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-[#F08C1B] transition-colors duration-300">
                   <div className="text-[#F08C1B] group-hover:text-white transition-colors duration-300">
                     {'icon' in category ? category.icon : getCategoryIcon(category.name)}
                   </div>
                </div>

                <h3 className="text-lg font-bold text-slate-900 group-hover:text-[#F08C1B] transition-colors">
                  {category.name}
                </h3>
                
                {/* Petite flèche discrète */}
                <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0 text-[#F08C1B] text-sm font-medium flex items-center gap-1">
                  Voir les pros <Search className="w-3 h-3" />
                </div>
              </Link>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link
              href="/pros"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white border-2 border-slate-200 text-slate-700 rounded-xl font-bold hover:border-[#F08C1B] hover:text-[#F08C1B] transition-all duration-300 shadow-sm hover:shadow-md"
            >
              Voir tous les services
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 bg-white relative overflow-hidden">
        {/* Decorative background blob */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-50 rounded-full blur-3xl opacity-50 translate-x-1/2 -translate-y-1/2" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center space-y-4 mb-20">
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900">
              Comment ça marche ?
            </h2>
            <p className="text-slate-600 text-lg">Votre mission réalisée en 3 étapes simples</p>
          </div>

          <div className="grid md:grid-cols-3 gap-12 relative">
             {/* Connector Line (Fix: mieux positionnée) */}
            <div className="hidden md:block absolute top-12 left-[15%] right-[15%] h-1 bg-slate-100 rounded-full" />
            
            {[
              { title: "Recherchez", desc: "Décrivez votre besoin et choisissez votre expert.", icon: <Search className="w-8 h-8 text-white" /> },
              { title: "Comparez", desc: "Vérifiez les avis, les prix et les photos.", icon: <CheckCircle className="w-8 h-8 text-white" /> },
              { title: "Réservez", desc: "Planifiez l'intervention et payez en sécurité.", icon: <CheckCircle className="w-8 h-8 text-white" /> }
            ].map((step, i) => (
              <div key={i} className="relative text-center group">
                <div className="relative z-10 w-24 h-24 mx-auto mb-6 bg-[#F08C1B] rounded-3xl rotate-3 group-hover:rotate-6 transition-transform shadow-lg shadow-orange-200 flex items-center justify-center">
                   {step.icon}
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{step.title}</h3>
                <p className="text-slate-600 leading-relaxed max-w-xs mx-auto">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Become a Pro CTA Section (Fix: Contraste Noir & Blanc) */}
      <section className="py-24 bg-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#F08C1B_1px,transparent_1px)] [background-size:16px_16px]" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full mb-8">
              <Sparkles className="w-4 h-4 text-[#F08C1B]" />
              <span className="text-white text-sm font-medium">Rejoignez l'élite des pros</span>
            </span>

            <h2 className="text-4xl md:text-6xl font-extrabold text-white mb-8 tracking-tight">
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
            
            {/* Stats minimalistes */}
            <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 border-t border-white/10 pt-12">
               {[
                 { num: "2k+", label: "Professionnels" },
                 { num: "50+", label: "Villes" },
                 { num: "10k+", label: "Missions" },
                 { num: "4.8", label: "Note Moyenne" }
               ].map((stat, i) => (
                 <div key={i}>
                   <div className="text-3xl font-bold text-white">{stat.num}</div>
                   <div className="text-slate-400 text-sm mt-1">{stat.label}</div>
                 </div>
               ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer Simple */}
      <footer className="bg-white border-t border-slate-100 py-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
                <div className="w-8 h-8 bg-[#F08C1B] rounded-lg flex items-center justify-center text-white font-bold">K</div>
                <span className="text-xl font-bold text-slate-900">Khadamat</span>
            </div>
            <p className="text-slate-500 text-sm">© 2026 Khadamat. Fait avec ❤️ au Maroc.</p>
        </div>
      </footer>
    </div>
  );
}

// Helpers... (Garde tes fonctions getCategoryIcon et defaultCategories existantes en bas du fichier)
function getCategoryIcon(name: string) {
  const iconClass = 'w-8 h-8'; // Enlève la couleur ici, gérée par le parent
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

const defaultCategories = [
  { id: '1', name: 'Plomberie', icon: <Wrench className="w-8 h-8" /> },
  { id: '2', name: 'Électricité', icon: <Zap className="w-8 h-8" /> },
  { id: '3', name: 'Peinture', icon: <Paintbrush className="w-8 h-8" /> },
  { id: '4', name: 'Jardinage', icon: <Leaf className="w-8 h-8" /> },
  { id: '5', name: 'Climatisation', icon: <Snowflake className="w-8 h-8" /> },
  { id: '6', name: 'Déménagement', icon: <Truck className="w-8 h-8" /> },
  { id: '7', name: 'Menuiserie', icon: <Hammer className="w-8 h-8" /> },
  { id: '8', name: 'Nettoyage', icon: <Sparkles className="w-8 h-8" /> },
];
