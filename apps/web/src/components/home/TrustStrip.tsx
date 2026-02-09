import { ShieldCheck, Star, Heart } from 'lucide-react';

export default function TrustStrip() {
  return (
    <section aria-labelledby="trust-title" className="py-16 bg-surface border-y border-border">
      <h2 id="trust-title" className="sr-only">Nos engagements</h2>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-success-50 rounded-xl flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6 text-success-600" aria-hidden="true" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-text-primary">Profils vérifiés par Khadamat</h3>
              <p className="text-text-secondary text-sm mt-1 leading-relaxed">
                Chaque professionnel passe par une vérification d&apos;identité rigoureuse (CIN, Domicile) avant d&apos;apparaître ici.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center shrink-0">
              <Star className="w-6 h-6 text-primary-500" aria-hidden="true" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-text-primary">Avis vérifiés</h3>
              <p className="text-text-secondary text-sm mt-1 leading-relaxed">
                Consultez les avis réels laissés par des clients après chaque prestation.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-info-50 rounded-xl flex items-center justify-center shrink-0">
              <Heart className="w-6 h-6 text-info-600" aria-hidden="true" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-text-primary">Support Humain 7j/7</h3>
              <p className="text-text-secondary text-sm mt-1 leading-relaxed">
                Une équipe basée au Maroc, disponible tous les jours pour vous accompagner en cas de besoin.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
