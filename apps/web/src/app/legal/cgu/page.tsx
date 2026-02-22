import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: "Conditions Générales d'Utilisation — Khadamat",
  description: "Conditions générales d'utilisation de la plateforme Khadamat.",
  alternates: { canonical: 'https://khadamat.ma/legal/cgu' },
  openGraph: {
    title: "Conditions Générales d'Utilisation — Khadamat",
    description: "Conditions générales d'utilisation de la plateforme Khadamat.",
    url: 'https://khadamat.ma/legal/cgu',
    siteName: 'Khadamat',
    locale: 'fr_MA',
    type: 'website',
    images: [{ url: 'https://khadamat.ma/og-image.jpg', width: 1200, height: 630, alt: 'Khadamat' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Conditions Générales d'Utilisation — Khadamat",
    description: "Conditions générales d'utilisation de la plateforme Khadamat.",
    images: ['https://khadamat.ma/og-image.jpg'],
  },
};

export default function CguPage() {
  return (
    <main
      aria-label="Conditions générales d’utilisation"
      className="min-h-screen bg-background py-16"
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-primary-600 motion-safe:transition-colors mb-8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-md"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Retour à l&apos;accueil
        </Link>

        <header className="mb-10">
          <h1 className="text-3xl font-extrabold text-text-primary">
            Conditions Générales d&apos;Utilisation — KHADAMAT
          </h1>
          <p className="text-sm text-text-muted mt-2">
            Dernière mise à jour : 22 février 2026
          </p>
        </header>

        <nav
          aria-label="Sommaire des conditions générales"
          className="mb-10 rounded-xl border border-border bg-surface p-5"
        >
          <h2 className="text-base font-semibold text-text-primary mb-3">Sommaire</h2>
          <ul className="grid gap-2 text-sm sm:grid-cols-2">
            <li><a href="#definitions" className="text-primary-700 hover:text-primary-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-md">1. Définitions</a></li>
            <li><a href="#objet" className="text-primary-700 hover:text-primary-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-md">2. Objet de la Plateforme</a></li>
            <li><a href="#acces" className="text-primary-700 hover:text-primary-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-md">3. Accès et Inscription</a></li>
            <li><a href="#whatsapp-first" className="text-primary-700 hover:text-primary-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-md">4. Fonctionnement du Service (WhatsApp-First)</a></li>
            <li><a href="#responsabilites" className="text-primary-700 hover:text-primary-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-md">5. Responsabilités</a></li>
            <li><a href="#conditions-financieres" className="text-primary-700 hover:text-primary-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-md">6. Conditions Financières</a></li>
            <li><a href="#notations-signalements" className="text-primary-700 hover:text-primary-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-md">7. Système de Notation et Signalements</a></li>
            <li><a href="#annulations-sanctions" className="text-primary-700 hover:text-primary-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-md">8. Annulations et Sanctions</a></li>
            <li><a href="#donnees-personnelles" className="text-primary-700 hover:text-primary-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-md">9. Protection des Données Personnelles</a></li>
            <li><a href="#droit-juridiction" className="text-primary-700 hover:text-primary-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-md">10. Droit Applicable et Juridiction</a></li>
          </ul>
        </nav>

        <div className="space-y-10 text-text-secondary">
          <section aria-labelledby="definitions">
            <h2 id="definitions" className="text-2xl font-bold text-text-primary mb-4">1. Définitions</h2>
            <ul className="space-y-2">
              <li><strong className="text-text-primary">Plateforme :</strong> service web et mobile Khadamat permettant la mise en relation entre clients et professionnels.</li>
              <li><strong className="text-text-primary">Client :</strong> personne recherchant une prestation de service à domicile.</li>
              <li><strong className="text-text-primary">Professionnel :</strong> prestataire inscrit sur Khadamat, soumis à un parcours de vérification d&apos;identité (KYC).</li>
              <li><strong className="text-text-primary">Réservation confirmée :</strong> demande passée au statut <code>CONFIRMED</code> dans le système.</li>
              <li><strong className="text-text-primary">Privacy Shield :</strong> mécanisme de masquage des numéros de téléphone tant qu&apos;une réservation n&apos;est pas confirmée.</li>
            </ul>
          </section>

          <section aria-labelledby="objet">
            <h2 id="objet" className="text-2xl font-bold text-text-primary mb-4">2. Objet de la Plateforme</h2>
            <p>
              Khadamat opère une marketplace de services à domicile au Maroc.
              Khadamat agit en tant qu&apos;intermédiaire technique entre clients et
              professionnels et n&apos;est pas partie au contrat de prestation
              conclu entre eux.
            </p>
          </section>

          <section aria-labelledby="acces">
            <h2 id="acces" className="text-2xl font-bold text-text-primary mb-4">3. Accès et Inscription</h2>
            <ul className="space-y-2">
              <li>L&apos;utilisateur s&apos;engage à fournir des informations exactes et à jour lors de l&apos;inscription.</li>
              <li>L&apos;inscription des professionnels inclut un processus KYC avec vérification d&apos;identité.</li>
              <li>Le professionnel est responsable de la confidentialité de ses accès et de toute activité réalisée depuis son compte.</li>
            </ul>
          </section>

          <section aria-labelledby="whatsapp-first">
            <h2 id="whatsapp-first" className="text-2xl font-bold text-text-primary mb-4">4. Fonctionnement du Service (WhatsApp-First)</h2>
            <p>
              Khadamat privilégie un parcours WhatsApp-first pour faciliter la
              prise de contact, la qualification du besoin et le suivi rapide
              des demandes. Les modalités finales de prestation (prix, délais,
              périmètre) sont discutées entre client et professionnel.
            </p>
          </section>

          <section aria-labelledby="responsabilites">
            <h2 id="responsabilites" className="text-2xl font-bold text-text-primary mb-4">5. Responsabilités</h2>
            <ul className="space-y-2">
              <li>Khadamat fournit un service d&apos;intermédiation technique et met en œuvre des moyens raisonnables de disponibilité et de sécurité.</li>
              <li>Chaque professionnel reste seul responsable de l&apos;exécution de ses prestations, de ses assurances et de ses obligations légales/fiscales.</li>
              <li>Chaque client reste responsable des informations transmises et des engagements pris avec le professionnel.</li>
            </ul>
          </section>

          <section aria-labelledby="conditions-financieres">
            <h2 id="conditions-financieres" className="text-2xl font-bold text-text-primary mb-4">6. Conditions Financières</h2>
            <ul className="space-y-2">
              <li>Les offres Boost et Premium permettent une meilleure visibilité selon les modalités affichées sur la plateforme.</li>
              <li>Les offres Boost et Premium sont non remboursables après activation effective.</li>
              <li>Les prix et conditions d&apos;exécution des prestations restent fixés entre client et professionnel.</li>
            </ul>
          </section>

          <section aria-labelledby="notations-signalements">
            <h2 id="notations-signalements" className="text-2xl font-bold text-text-primary mb-4">7. Système de Notation et Signalements</h2>
            <p>
              Khadamat met à disposition un système de notation et de
              signalement (reports) destiné à améliorer la qualité de la
              marketplace et à détecter les comportements abusifs.
            </p>
          </section>

          <section aria-labelledby="annulations-sanctions">
            <h2 id="annulations-sanctions" className="text-2xl font-bold text-text-primary mb-4">8. Annulations et Sanctions</h2>
            <ul className="space-y-2">
              <li>Les annulations et no-show peuvent entraîner des restrictions temporaires, sanctions de compte ou bannissement.</li>
              <li>Le contournement de la plateforme, la fraude, les faux profils ou tout usage abusif sont strictement interdits.</li>
              <li>Khadamat peut suspendre ou clôturer un compte en cas de violation grave des présentes CGU.</li>
            </ul>
          </section>

          <section aria-labelledby="donnees-personnelles">
            <h2 id="donnees-personnelles" className="text-2xl font-bold text-text-primary mb-4">9. Protection des Données Personnelles</h2>
            <ul className="space-y-2">
              <li>Le traitement des données personnelles est effectué conformément à la Loi marocaine 09-08 et à la politique de confidentialité.</li>
              <li>Le numéro de CIN des professionnels fait l&apos;objet d&apos;un hachage sécurisé (SHA-256) dans le cadre du KYC.</li>
              <li>Le Privacy Shield masque les numéros de téléphone tant qu&apos;une réservation n&apos;est pas confirmée.</li>
            </ul>
          </section>

          <section aria-labelledby="droit-juridiction">
            <h2 id="droit-juridiction" className="text-2xl font-bold text-text-primary mb-4">10. Droit Applicable et Juridiction</h2>
            <p>
              Les présentes CGU sont régies par le droit marocain, notamment la
              Loi 31-08 relative à la protection du consommateur et la Loi
              09-08 relative à la protection des données personnelles. Tout
              litige relèvera de la compétence des juridictions de
              {' '}[À compléter : Ville], Maroc, sous réserve des règles d&apos;ordre
              public applicables.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
