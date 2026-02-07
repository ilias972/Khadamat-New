import Link from 'next/link';
import Navbar from '../components/Navbar';
import {
  Wrench, Zap, Paintbrush, Truck, Snowflake, Leaf,
  Hammer, Sparkles, Shield, CheckCircle, Clock, Star,
  Search, MapPin, ArrowRight, Users, BadgeCheck, Headphones,
} from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#F2F0EF] font-sans selection:bg-[#F08C1B] selection:text-white">
      <Navbar />

      {/* ================================================================
          HERO — Curved bottom, search bar, badge
          ================================================================ */}
      <section className="relative bg-gradient-to-br from-[#FEF7ED] via-[#F2F0EF] to-[#FDECD4] pt-28 pb-32 md:pt-36 md:pb-40 rounded-b-[60px] overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute top-16 left-8 w-72 h-72 bg-[#F08C1B]/10 rounded-full blur-3xl" aria-hidden="true" />
        <div className="absolute bottom-10 right-8 w-96 h-96 bg-[#F08C1B]/8 rounded-full blur-3xl" aria-hidden="true" />

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Live badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full shadow-sm border border-[#F08C1B]/20 mb-8">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-[#4B5563]">
              +2 000 professionnels disponibles
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#3F2E21] leading-tight mb-6">
            Trouvez le{' '}
            <span className="text-[#F08C1B]">professionnel idéal</span>
            <br />
            près de chez vous
          </h1>

          <p className="text-lg sm:text-xl text-[#4B5563] max-w-2xl mx-auto mb-10 leading-relaxed">
            Plombiers, électriciens, peintres… Des milliers d&apos;experts
            qualifiés prêts à intervenir partout au Maroc.
          </p>

          {/* Search bar — rounded-full */}
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-full shadow-2xl p-2 sm:p-3 flex flex-col sm:flex-row items-center gap-2 sm:gap-0">
              {/* City input */}
              <div className="flex items-center gap-2 flex-1 px-4 py-3 sm:py-0 w-full sm:w-auto">
                <MapPin className="w-5 h-5 text-[#F08C1B] shrink-0" />
                <input
                  type="text"
                  placeholder="Votre ville"
                  readOnly
                  className="w-full bg-transparent text-[#1A1A1A] placeholder-[#9CA3AF] font-medium focus:outline-none cursor-pointer"
                />
              </div>

              {/* Divider */}
              <div className="hidden sm:block w-px h-8 bg-[#E5E7EB]" />

              {/* Service input */}
              <div className="flex items-center gap-2 flex-1 px-4 py-3 sm:py-0 w-full sm:w-auto">
                <Search className="w-5 h-5 text-[#9CA3AF] shrink-0" />
                <input
                  type="text"
                  placeholder="Quel service cherchez-vous ?"
                  readOnly
                  className="w-full bg-transparent text-[#1A1A1A] placeholder-[#9CA3AF] font-medium focus:outline-none cursor-pointer"
                />
              </div>

              {/* Search button */}
              <Link
                href="/pros"
                className="w-full sm:w-auto px-8 py-3.5 bg-[#F08C1B] hover:bg-[#D97213] text-white rounded-full font-bold transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-[#F08C1B]/25 hover:shadow-xl hover:shadow-[#F08C1B]/30"
              >
                <Search className="w-5 h-5" />
                <span>Rechercher</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================
          TRUST STRIP — 3 items with icons
          ================================================================ */}
      <section className="py-10 bg-[#F2F0EF]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-16">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center">
                <BadgeCheck className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="font-bold text-[#1A1A1A] text-sm">Pros vérifiés</p>
                <p className="text-[#9CA3AF] text-xs">Identité & CIN validés</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-[#FEF7ED] rounded-2xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-[#F08C1B]" />
              </div>
              <div>
                <p className="font-bold text-[#1A1A1A] text-sm">Réponse rapide</p>
                <p className="text-[#9CA3AF] text-xs">Sous 24h en moyenne</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-yellow-100 rounded-2xl flex items-center justify-center">
                <Star className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="font-bold text-[#1A1A1A] text-sm">Avis clients</p>
                <p className="text-[#9CA3AF] text-xs">Notes transparentes</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================
          CATEGORIES — Grid 2/4 cols, rounded-2xl cards
          ================================================================ */}
      <section className="py-20 bg-[#F2F0EF]" aria-labelledby="categories-heading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="inline-block px-4 py-1.5 bg-[#FEF7ED] text-[#F08C1B] rounded-full text-sm font-bold tracking-wide uppercase mb-4">
              Nos Services
            </span>
            <h2
              id="categories-heading"
              className="text-3xl md:text-4xl font-extrabold text-[#1A1A1A] tracking-tight"
            >
              Catégories populaires
            </h2>
            <p className="text-[#4B5563] text-lg max-w-2xl mx-auto mt-4">
              Explorez nos services les plus demandés et trouvez l&apos;expert
              qu&apos;il vous faut en quelques clics.
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/pros?categoryId=${cat.id}`}
                className="group bg-white rounded-2xl p-6 shadow-sm border border-[#E5E7EB] hover:shadow-xl hover:border-[#F08C1B]/30 hover:-translate-y-1 transition-all duration-300 flex flex-col items-center text-center"
              >
                <div className="w-14 h-14 md:w-16 md:h-16 bg-[#FEF7ED] rounded-2xl flex items-center justify-center mb-4 group-hover:bg-[#F08C1B] transition-colors duration-300">
                  <div className="text-[#F08C1B] group-hover:text-white transition-colors duration-300">
                    {cat.icon}
                  </div>
                </div>
                <h3 className="text-base md:text-lg font-bold text-[#1A1A1A] group-hover:text-[#F08C1B] transition-colors">
                  {cat.name}
                </h3>
                <div className="mt-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 text-[#F08C1B] text-sm font-medium flex items-center gap-1">
                  Voir les pros <ArrowRight className="w-3 h-3" />
                </div>
              </Link>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link
              href="/pros"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white border-2 border-[#E5E7EB] text-[#4B5563] rounded-xl font-bold hover:border-[#F08C1B] hover:text-[#F08C1B] transition-all duration-300 shadow-sm hover:shadow-md group"
            >
              Voir tous les services
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* ================================================================
          SECURITY SPLIT SCREEN — Image left + text right with floating card
          ================================================================ */}
      <section className="py-20 bg-white" aria-labelledby="security-heading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Left — Visual with floating card */}
            <div className="relative">
              <div className="bg-gradient-to-br from-[#FEF7ED] to-[#FDECD4] rounded-3xl p-8 md:p-12 aspect-square flex items-center justify-center">
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 bg-[#F08C1B] rounded-3xl flex items-center justify-center mx-auto shadow-lg shadow-[#F08C1B]/25">
                    <Shield className="w-10 h-10 text-white" />
                  </div>
                  <p className="text-[#3F2E21] font-bold text-xl">Sécurisé & Fiable</p>
                  <p className="text-[#4B5563] text-sm max-w-xs mx-auto">
                    Tous nos professionnels passent une vérification d&apos;identité rigoureuse
                  </p>
                </div>
              </div>

              {/* Floating stats card */}
              <div className="absolute -bottom-6 -right-4 md:-right-8 bg-white rounded-2xl shadow-xl p-5 border border-[#E5E7EB]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-extrabold text-[#1A1A1A]">100%</p>
                    <p className="text-xs text-[#9CA3AF]">Pros vérifiés</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right — Text content */}
            <div className="space-y-8">
              <div>
                <span className="inline-block px-4 py-1.5 bg-[#FEF7ED] text-[#F08C1B] rounded-full text-sm font-bold tracking-wide uppercase mb-4">
                  Confiance & Sécurité
                </span>
                <h2
                  id="security-heading"
                  className="text-3xl md:text-4xl font-extrabold text-[#1A1A1A] leading-tight"
                >
                  Votre tranquillité d&apos;esprit,
                  <br />
                  notre priorité
                </h2>
              </div>

              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-[#FEF7ED] rounded-2xl flex items-center justify-center shrink-0">
                    <BadgeCheck className="w-6 h-6 text-[#F08C1B]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#1A1A1A] mb-1">Identité vérifiée</h3>
                    <p className="text-[#4B5563] text-sm leading-relaxed">
                      Chaque professionnel soumet sa CIN recto/verso, validée manuellement par notre équipe.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-[#FEF7ED] rounded-2xl flex items-center justify-center shrink-0">
                    <Star className="w-6 h-6 text-[#F08C1B]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#1A1A1A] mb-1">Avis authentiques</h3>
                    <p className="text-[#4B5563] text-sm leading-relaxed">
                      Seuls les clients ayant effectué une réservation peuvent laisser un avis. Aucun faux commentaire.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-[#FEF7ED] rounded-2xl flex items-center justify-center shrink-0">
                    <Headphones className="w-6 h-6 text-[#F08C1B]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#1A1A1A] mb-1">Support réactif</h3>
                    <p className="text-[#4B5563] text-sm leading-relaxed">
                      Notre équipe vous accompagne en cas de litige ou de question sur une prestation.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================
          CTA FINAL — Gradient orange, rounded-3xl
          ================================================================ */}
      <section className="py-20 bg-[#F2F0EF]" aria-labelledby="cta-heading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-[#F08C1B] to-[#D97213] rounded-3xl p-10 md:p-16 text-center relative overflow-hidden">
            {/* Decorative pattern */}
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: `radial-gradient(circle, white 1px, transparent 1px)`,
                backgroundSize: '24px 24px',
              }}
              aria-hidden="true"
            />

            <div className="relative z-10 max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full mb-8">
                <Sparkles className="w-4 h-4 text-white" />
                <span className="text-white text-sm font-medium">
                  Rejoignez l&apos;élite des pros
                </span>
              </div>

              <h2
                id="cta-heading"
                className="text-3xl md:text-5xl font-extrabold text-white mb-6 leading-tight"
              >
                Vous êtes professionnel ?
                <br />
                Boostez votre activité.
              </h2>

              <p className="text-lg text-white/85 mb-10 max-w-xl mx-auto leading-relaxed">
                Rejoignez Khadamat et accédez à des milliers de clients.
                Gérez votre emploi du temps et développez vos revenus.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/auth/register"
                  className="w-full sm:w-auto px-10 py-4 bg-white text-[#F08C1B] rounded-2xl font-bold text-lg hover:bg-[#FEF7ED] hover:scale-105 transition-all duration-300 shadow-lg"
                >
                  Devenir Pro gratuitement
                </Link>
                <Link
                  href="/pros"
                  className="w-full sm:w-auto px-10 py-4 bg-white/15 border border-white/30 text-white rounded-2xl font-bold text-lg hover:bg-white/25 transition-all backdrop-blur-sm"
                >
                  En savoir plus
                </Link>
              </div>

              {/* Stats row */}
              <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-6 border-t border-white/20 pt-10">
                {stats.map((stat, i) => (
                  <div key={i}>
                    <div className="text-3xl md:text-4xl font-extrabold text-white">
                      {stat.num}
                    </div>
                    <div className="text-white/70 text-sm mt-1">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================
          FOOTER
          ================================================================ */}
      <footer className="bg-white border-t border-[#E5E7EB] py-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-8 h-8 bg-[#F08C1B] rounded-lg flex items-center justify-center text-white font-bold">
              K
            </div>
            <span className="text-xl font-bold text-[#1A1A1A]">Khadamat</span>
          </div>
          <p className="text-[#9CA3AF] text-sm">
            &copy; {new Date().getFullYear()} Khadamat. Fait avec &hearts; au Maroc.
          </p>
        </div>
      </footer>
    </div>
  );
}

// ============================================================================
// MOCKED DATA
// ============================================================================

const categories = [
  { id: '1', name: 'Plomberie', icon: <Wrench className="w-7 h-7 md:w-8 md:h-8" /> },
  { id: '2', name: 'Électricité', icon: <Zap className="w-7 h-7 md:w-8 md:h-8" /> },
  { id: '3', name: 'Peinture', icon: <Paintbrush className="w-7 h-7 md:w-8 md:h-8" /> },
  { id: '4', name: 'Jardinage', icon: <Leaf className="w-7 h-7 md:w-8 md:h-8" /> },
  { id: '5', name: 'Climatisation', icon: <Snowflake className="w-7 h-7 md:w-8 md:h-8" /> },
  { id: '6', name: 'Déménagement', icon: <Truck className="w-7 h-7 md:w-8 md:h-8" /> },
  { id: '7', name: 'Menuiserie', icon: <Hammer className="w-7 h-7 md:w-8 md:h-8" /> },
  { id: '8', name: 'Nettoyage', icon: <Sparkles className="w-7 h-7 md:w-8 md:h-8" /> },
];

const stats = [
  { num: '2k+', label: 'Professionnels' },
  { num: '50+', label: 'Villes' },
  { num: '10k+', label: 'Missions' },
  { num: '4.8', label: 'Note Moyenne' },
];
