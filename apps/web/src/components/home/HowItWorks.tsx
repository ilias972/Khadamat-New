import Link from 'next/link';
import { Search, CalendarCheck, ThumbsUp } from 'lucide-react';
import type { ReactNode } from 'react';
import SectionHeader from './SectionHeader';

interface Step {
  number: string;
  title: string;
  description: string;
  details: string[];
  icon: ReactNode;
}

const steps: Step[] = [
  {
    number: '01',
    title: 'Trouvez',
    description: 'Recherchez le professionnel idéal pour votre besoin.',
    details: ['Recherche par ville et service', 'Filtres avancés', 'Avis vérifiés'],
    icon: <Search className="w-6 h-6" aria-hidden="true" />,
  },
  {
    number: '02',
    title: 'Réservez',
    description: 'Contactez-le et planifiez votre intervention.',
    details: ['Choix du créneau', 'Mise en relation directe avec le professionnel', 'Devis transparent'],
    icon: <CalendarCheck className="w-6 h-6" aria-hidden="true" />,
  },
  {
    number: '03',
    title: 'Profitez',
    description: 'Recevez un service de qualité en toute sérénité.',
    details: ['Devis gratuit et prix convenu avec le pro', 'Coordination simple par téléphone', 'Évaluation après service'],
    icon: <ThumbsUp className="w-6 h-6" aria-hidden="true" />,
  },
];

export default function HowItWorks() {
  return (
    <section
      id="comment-ca-marche"
      aria-labelledby="how-title"
      className="scroll-mt-24 py-24 bg-surface"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          id="how-title"
          badge="Mode d'emploi"
          title="Comment ça marche ?"
          subtitle="Trois étapes simples pour trouver et réserver un professionnel de confiance."
        />

        {/* Steps */}
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {steps.map((step) => (
            <article
              key={step.number}
              className="relative bg-surface rounded-2xl border border-border p-8 shadow-card hover:shadow-card-hover transition-shadow duration-300 motion-reduce:transition-none flex flex-col"
            >
              {/* Step number */}
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center flex-shrink-0">
                  {step.icon}
                </div>
                <span className="text-4xl font-extrabold text-primary-100 select-none" aria-hidden="true">
                  {step.number}
                </span>
              </div>

              {/* Content */}
              <h3 className="text-xl font-bold text-text-primary mb-2">
                {step.title}
              </h3>
              <p className="text-text-secondary text-sm leading-relaxed mb-4">
                {step.description}
              </p>

              {/* Details */}
              <ul className="mt-auto space-y-2">
                {step.details.map((detail) => (
                  <li
                    key={detail}
                    className="flex items-center gap-2 text-sm text-text-secondary"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-400 flex-shrink-0" aria-hidden="true" />
                    {detail}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-16 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/pros"
            className="px-8 py-3.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-semibold shadow-orange hover:shadow-orange-lg transition-all duration-300 hover:-translate-y-0.5 motion-reduce:transform-none focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:outline-offset-2"
          >
            Trouver un professionnel
          </Link>
          <Link
            href="/auth/register?role=PRO"
            className="px-8 py-3.5 border-2 border-primary-500 text-primary-600 hover:bg-primary-50 rounded-xl font-semibold transition-all duration-200 focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:outline-offset-2"
          >
            Devenir Pro
          </Link>
        </div>
      </div>
    </section>
  );
}
