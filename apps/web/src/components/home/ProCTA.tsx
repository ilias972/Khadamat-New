import Link from 'next/link';
import { Sparkles } from 'lucide-react';

export default function ProCTA() {
  return (
    <section aria-labelledby="pro-cta-title" className="py-20 bg-text-primary">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <Sparkles className="w-10 h-10 text-primary-500 mx-auto mb-6" aria-hidden="true" />

        <h2 id="pro-cta-title" className="text-3xl md:text-5xl font-extrabold text-white mb-6">
          Vous êtes un professionnel ?
        </h2>

        <p className="text-lg text-text-muted mb-10 max-w-2xl mx-auto leading-relaxed">
          Rejoignez Khadamat aujourd&apos;hui. Développez votre clientèle sans frais cachés.
          Gérez votre emploi du temps en toute liberté.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/auth/register?role=PRO"
            className="w-full sm:w-auto px-8 py-4 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-bold text-lg transition-all shadow-orange hover:shadow-orange-lg focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:outline-offset-2"
          >
            Devenir Prestataire
          </Link>
          <Link
            href="/pros"
            className="w-full sm:w-auto px-8 py-4 bg-transparent border border-border text-white rounded-xl font-bold text-lg hover:bg-white/5 transition-all focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
          >
            En savoir plus
          </Link>
        </div>
      </div>
    </section>
  );
}
