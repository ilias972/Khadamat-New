import Link from 'next/link';
import Navbar from '../components/Navbar';
import SearchHero from '../components/SearchHero';
import type { PublicCity, PublicCategory } from '@khadamat/contracts';
import { Wrench, Zap, Paintbrush, Truck, Snowflake, Leaf, Hammer, Sparkles } from 'lucide-react';

/**
 * Page d'accueil - Khadamat Landing Page
 *
 * - Navbar flottante avec effet blur
 * - Hero avec barre de recherche
 * - Grille de catégories
 * - Section "Comment ça marche"
 * - CTA "Devenir Pro"
 * - Footer
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

    if (citiesResponse.ok) {
      cities = await citiesResponse.json();
    }

    if (categoriesResponse.ok) {
      categories = await categoriesResponse.json();
    }
  } catch (error) {
    console.error('Failed to fetch data:', error);
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <SearchHero cities={cities} categories={categories} />

      {/* Categories Section */}
      <section className="py-20 bg-surface">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            {/* Section Header */}
            <div className="text-center space-y-4 mb-12">
              <span className="inline-block px-4 py-1.5 bg-primary-100 text-primary-700 rounded-full text-sm font-semibold">
                Nos Services
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-text-primary">
                Catégories populaires
              </h2>
              <p className="text-text-secondary max-w-2xl mx-auto">
                Explorez nos services les plus demandés et trouvez l&apos;expert qu&apos;il vous faut
              </p>
            </div>

            {/* Categories Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {categories.length > 0 ? (
                categories.map((category, index) => (
                  <Link
                    key={category.id}
                    href={`/pros?categoryId=${category.id}`}
                    className="group relative bg-white rounded-2xl border border-border p-6 hover:border-primary-300 hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    {/* Icon */}
                    <div className="w-14 h-14 bg-gradient-to-br from-primary-100 to-primary-200 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                      {getCategoryIcon(category.name)}
                    </div>

                    {/* Name */}
                    <h3 className="text-lg font-semibold text-text-primary group-hover:text-primary-600 transition-colors">
                      {category.name}
                    </h3>

                    {/* Arrow */}
                    <div className="absolute bottom-4 right-4 w-8 h-8 rounded-full bg-surface-muted flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg className="w-4 h-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </Link>
                ))
              ) : (
                // Fallback categories if API not available
                defaultCategories.map((category, index) => (
                  <Link
                    key={category.id}
                    href={`/pros?categoryId=${category.id}`}
                    className="group relative bg-white rounded-2xl border border-border p-6 hover:border-primary-300 hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div className="w-14 h-14 bg-gradient-to-br from-primary-100 to-primary-200 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                      {category.icon}
                    </div>
                    <h3 className="text-lg font-semibold text-text-primary group-hover:text-primary-600 transition-colors">
                      {category.name}
                    </h3>
                    <div className="absolute bottom-4 right-4 w-8 h-8 rounded-full bg-surface-muted flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg className="w-4 h-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </Link>
                ))
              )}
            </div>

            {/* View All Link */}
            <div className="text-center mt-10">
              <Link
                href="/pros"
                className="inline-flex items-center gap-2 px-6 py-3 border-2 border-primary-500 text-primary-600 rounded-xl font-semibold hover:bg-primary-50 transition-all duration-200"
              >
                Voir tous les services
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            {/* Section Header */}
            <div className="text-center space-y-4 mb-16">
              <span className="inline-block px-4 py-1.5 bg-primary-100 text-primary-700 rounded-full text-sm font-semibold">
                Simple et rapide
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-text-primary">
                Comment ça marche ?
              </h2>
              <p className="text-text-secondary max-w-2xl mx-auto">
                Trouvez et réservez un professionnel en quelques clics
              </p>
            </div>

            {/* Steps */}
            <div className="grid md:grid-cols-3 gap-8 relative">
              {/* Connector Line (Desktop) */}
              <div className="hidden md:block absolute top-24 left-[16.66%] right-[16.66%] h-0.5 bg-gradient-to-r from-primary-200 via-primary-400 to-primary-200" />

              {/* Step 1 */}
              <div className="relative text-center">
                <div className="relative z-10 w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center shadow-orange">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <span className="inline-block px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-xs font-bold mb-3">
                  Étape 1
                </span>
                <h3 className="text-xl font-bold text-text-primary mb-2">
                  Recherchez
                </h3>
                <p className="text-text-secondary">
                  Choisissez votre ville et le service dont vous avez besoin
                </p>
              </div>

              {/* Step 2 */}
              <div className="relative text-center">
                <div className="relative z-10 w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center shadow-orange">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
                <span className="inline-block px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-xs font-bold mb-3">
                  Étape 2
                </span>
                <h3 className="text-xl font-bold text-text-primary mb-2">
                  Comparez
                </h3>
                <p className="text-text-secondary">
                  Consultez les profils, avis et tarifs des professionnels
                </p>
              </div>

              {/* Step 3 */}
              <div className="relative text-center">
                <div className="relative z-10 w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center shadow-orange">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <span className="inline-block px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-xs font-bold mb-3">
                  Étape 3
                </span>
                <h3 className="text-xl font-bold text-text-primary mb-2">
                  Réservez
                </h3>
                <p className="text-text-secondary">
                  Contactez le pro et planifiez votre intervention
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Become a Pro CTA Section */}
      <section className="py-20 bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 relative overflow-hidden">
        {/* Background Decorations */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
        </div>

        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full mb-6">
              <Sparkles className="w-4 h-4 text-white" />
              <span className="text-white/90 text-sm font-medium">Rejoignez notre communauté</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
              Vous êtes professionnel ?
            </h2>

            <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
              Rejoignez Khadamat et développez votre activité. Des milliers de clients
              recherchent vos services chaque jour.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <Link
                href="/auth/register"
                className="px-8 py-4 bg-white text-primary-600 rounded-xl font-bold text-lg hover:bg-primary-50 shadow-2xl hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              >
                Devenir Pro gratuitement
              </Link>
              <Link
                href="/pros"
                className="px-8 py-4 border-2 border-white/30 text-white rounded-xl font-semibold hover:bg-white/10 transition-all duration-200"
              >
                En savoir plus
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-8 border-t border-white/20">
              <div className="text-center">
                <div className="text-3xl sm:text-4xl font-bold text-white mb-1">2,000+</div>
                <div className="text-white/70 text-sm">Professionnels</div>
              </div>
              <div className="text-center">
                <div className="text-3xl sm:text-4xl font-bold text-white mb-1">50+</div>
                <div className="text-white/70 text-sm">Villes</div>
              </div>
              <div className="text-center">
                <div className="text-3xl sm:text-4xl font-bold text-white mb-1">10,000+</div>
                <div className="text-white/70 text-sm">Projets réalisés</div>
              </div>
              <div className="text-center">
                <div className="text-3xl sm:text-4xl font-bold text-white mb-1">4.8/5</div>
                <div className="text-white/70 text-sm">Note moyenne</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-text-primary py-16">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-4 gap-12 mb-12">
              {/* Brand */}
              <div className="md:col-span-2">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center">
                    <span className="text-white font-bold text-xl">K</span>
                  </div>
                  <span className="text-2xl font-bold text-white">Khadamat</span>
                </div>
                <p className="text-text-inverse/70 mb-6 max-w-sm">
                  La marketplace marocaine qui connecte les particuliers aux meilleurs professionnels de services.
                </p>
                {/* Social Links */}
                <div className="flex items-center gap-4">
                  <a href="#" className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center hover:bg-primary-500 transition-colors">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </a>
                  <a href="#" className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center hover:bg-primary-500 transition-colors">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z"/>
                    </svg>
                  </a>
                  <a href="#" className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center hover:bg-primary-500 transition-colors">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                    </svg>
                  </a>
                </div>
              </div>

              {/* Links */}
              <div>
                <h4 className="text-white font-semibold mb-4">Services</h4>
                <ul className="space-y-3">
                  <li><Link href="/pros" className="text-text-inverse/70 hover:text-primary-400 transition-colors">Trouver un Pro</Link></li>
                  <li><Link href="/auth/register" className="text-text-inverse/70 hover:text-primary-400 transition-colors">Devenir Pro</Link></li>
                  <li><Link href="/plans" className="text-text-inverse/70 hover:text-primary-400 transition-colors">Tarifs Premium</Link></li>
                </ul>
              </div>

              <div>
                <h4 className="text-white font-semibold mb-4">Aide</h4>
                <ul className="space-y-3">
                  <li><a href="#" className="text-text-inverse/70 hover:text-primary-400 transition-colors">Centre d&apos;aide</a></li>
                  <li><a href="#" className="text-text-inverse/70 hover:text-primary-400 transition-colors">Contact</a></li>
                  <li><a href="#" className="text-text-inverse/70 hover:text-primary-400 transition-colors">CGU</a></li>
                </ul>
              </div>
            </div>

            {/* Bottom */}
            <div className="pt-8 border-t border-white/10 text-center">
              <p className="text-text-inverse/50 text-sm">
                © 2026 Khadamat. Tous droits réservés. Fait avec amour au Maroc.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

/**
 * Get icon component for category
 */
function getCategoryIcon(name: string) {
  const iconClass = 'w-7 h-7 text-primary-600';

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

/**
 * Default categories fallback
 */
const defaultCategories = [
  { id: '1', name: 'Plomberie', icon: <Wrench className="w-7 h-7 text-primary-600" /> },
  { id: '2', name: 'Électricité', icon: <Zap className="w-7 h-7 text-primary-600" /> },
  { id: '3', name: 'Peinture', icon: <Paintbrush className="w-7 h-7 text-primary-600" /> },
  { id: '4', name: 'Jardinage', icon: <Leaf className="w-7 h-7 text-primary-600" /> },
  { id: '5', name: 'Climatisation', icon: <Snowflake className="w-7 h-7 text-primary-600" /> },
  { id: '6', name: 'Déménagement', icon: <Truck className="w-7 h-7 text-primary-600" /> },
  { id: '7', name: 'Menuiserie', icon: <Hammer className="w-7 h-7 text-primary-600" /> },
  { id: '8', name: 'Nettoyage', icon: <Sparkles className="w-7 h-7 text-primary-600" /> },
];
