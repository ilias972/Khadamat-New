import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowLeft, Mail } from 'lucide-react';

export const metadata: Metadata = {
  title: "Centre d'aide — Khadamat",
  description: "Besoin d'aide ? Contactez notre équipe ou consultez notre FAQ.",
  alternates: { canonical: 'https://khadamat.ma/help' },
  openGraph: {
    title: "Centre d'aide — Khadamat",
    description: "Besoin d'aide ? Contactez notre équipe ou consultez notre FAQ.",
    url: 'https://khadamat.ma/help',
    siteName: 'Khadamat',
    locale: 'fr_MA',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: "Centre d'aide — Khadamat",
    description: "Besoin d'aide ? Contactez notre équipe ou consultez notre FAQ.",
  },
};

const faqItems = [
  {
    id: 'reservation',
    question: 'Comment réserver un professionnel ?',
    answerText:
      "Rendez-vous sur la page Pros, choisissez un professionnel puis sélectionnez un créneau disponible. La réservation est confirmée dans votre espace client dès validation.",
  },
  {
    id: 'verification',
    question: 'Comment savoir si un professionnel est vérifié ?',
    answerText:
      "Les profils vérifiés affichent un badge 'Vérifié'. Cette vérification passe par un contrôle KYC du professionnel avant activation complète du compte.",
  },
  {
    id: 'paiements',
    question: 'Quels moyens de paiement sont disponibles ?',
    answerText:
      "Le paiement dépend des modalités convenues entre client et professionnel. En phase actuelle, Khadamat privilégie une mise en relation claire et un suivi de réservation.",
  },
  {
    id: 'annulation-pro',
    question: 'Que faire si le professionnel annule ?',
    answerText:
      "Vous recevez une mise à jour du statut de réservation dans votre espace. Vous pouvez ensuite réserver un autre créneau ou choisir un autre professionnel.",
  },
  {
    id: 'annulation-client',
    question: 'Comment modifier ou annuler une réservation ?',
    answerText:
      "Depuis votre espace client, ouvrez vos réservations puis utilisez l'action de modification ou d'annulation disponible selon le statut de la réservation.",
  },
  {
    id: 'pro-visibilite',
    question: 'Je suis professionnel : comment devenir visible sur Khadamat ?',
    answerText:
      "Créez un compte professionnel, complétez votre profil, activez vos services et votre disponibilité. Une fois le KYC validé, votre profil peut être affiché publiquement.",
  },
  {
    id: 'kyc',
    question: 'Comment fonctionne la vérification KYC pour les PRO ?',
    answerText:
      "Le professionnel soumet ses documents d'identité depuis le dashboard. Le dossier est ensuite examiné avant approbation, avec possibilité de resoumission en cas de rejet.",
  },
  {
    id: 'support',
    question: 'Comment contacter le support ?',
    answerText:
      "Écrivez-nous à support@khadamat.ma en indiquant votre problème, l'URL concernée et, si possible, votre référence de réservation pour un traitement plus rapide.",
  },
] as const;

export default function HelpPage() {
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answerText,
      },
    })),
  };

  return (
    <main className="min-h-screen bg-background py-16">
      <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-primary-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Retour à l&apos;accueil
          </Link>

          <nav aria-label="Navigation du centre d'aide" className="flex flex-wrap gap-3 text-sm">
            <Link href="/pros" className="text-text-secondary hover:text-primary-600 transition-colors">
              Trouver un pro
            </Link>
            <Link href="/blog" className="text-text-secondary hover:text-primary-600 transition-colors">
              Blog
            </Link>
            <Link href="/legal/cgu" className="text-text-secondary hover:text-primary-600 transition-colors">
              CGU
            </Link>
            <Link href="/legal/privacy" className="text-text-secondary hover:text-primary-600 transition-colors">
              Confidentialité
            </Link>
          </nav>
        </div>

        <h1 className="text-3xl font-extrabold text-text-primary mb-6">
          Centre d&apos;aide
        </h1>

        <p className="text-text-secondary mb-10 leading-relaxed">
          Vous avez une question ou besoin d&apos;assistance ? Notre équipe est
          disponible pour vous aider.
        </p>

        <section aria-labelledby="contact-support" className="mb-8">
          <h2 id="contact-support" className="text-2xl font-bold text-text-primary mb-4">
            Contact support
          </h2>

          <a
            href="mailto:support@khadamat.ma"
            className="flex items-start gap-4 bg-surface border border-border rounded-2xl p-6 hover:shadow-card-hover transition-shadow"
          >
            <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center shrink-0">
              <Mail className="w-5 h-5 text-primary-500" aria-hidden="true" />
            </div>
            <div>
              <h3 className="font-bold text-text-primary mb-1">Par e-mail</h3>
              <p className="text-sm text-text-secondary mb-1">
                Réponse en général sous 24 à 48h ouvrées.
              </p>
              <p className="text-sm text-text-secondary">
                support@khadamat.ma
              </p>
            </div>
          </a>
        </section>

        <section aria-labelledby="faq-title" className="space-y-4">
          <h2 id="faq-title" className="text-2xl font-bold text-text-primary">
            FAQ
          </h2>

          {faqItems.map((item) => (
            <details key={item.id} className="bg-surface border border-border rounded-xl p-4">
              <summary className="cursor-pointer font-semibold text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 rounded-sm">
                {item.question}
              </summary>
              <p className="mt-3 text-sm text-text-secondary leading-relaxed">
                {item.answerText}
                {item.id === 'reservation' && (
                  <>
                    {' '}
                    Consultez <Link href="/pros" className="text-primary-600 hover:text-primary-700">la liste des pros</Link>.
                  </>
                )}
                {item.id === 'verification' && (
                  <>
                    {' '}
                    Retrouvez plus de contexte dans le <Link href="/blog" className="text-primary-600 hover:text-primary-700">blog</Link>.
                  </>
                )}
                {item.id === 'kyc' && (
                  <>
                    {' '}
                    Les détails réglementaires sont précisés dans la{' '}
                    <Link href="/legal/privacy" className="text-primary-600 hover:text-primary-700">
                      politique de confidentialité
                    </Link>.
                  </>
                )}
              </p>
            </details>
          ))}

          <div className="bg-surface border border-border rounded-xl p-4">
            <p className="text-sm text-text-secondary">
              Vous ne trouvez pas votre réponse ? Écrivez-nous à{' '}
              <a href="mailto:support@khadamat.ma" className="text-primary-600 hover:text-primary-700">
                support@khadamat.ma
              </a>
              .
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
