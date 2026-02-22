import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Mentions Légales — Khadamat',
  description: 'Mentions légales de la plateforme Khadamat.',
  alternates: { canonical: 'https://khadamat.ma/legal/mentions' },
  openGraph: {
    title: 'Mentions Légales — Khadamat',
    description: 'Mentions légales de la plateforme Khadamat.',
    url: 'https://khadamat.ma/legal/mentions',
    siteName: 'Khadamat',
    locale: 'fr_MA',
    type: 'website',
    images: [{ url: 'https://khadamat.ma/og-image.jpg', width: 1200, height: 630, alt: 'Khadamat' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mentions Légales — Khadamat',
    description: 'Mentions légales de la plateforme Khadamat.',
    images: ['https://khadamat.ma/og-image.jpg'],
  },
};

export default function MentionsPage() {
  return (
    <main className="min-h-screen bg-background py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-primary-600 motion-safe:transition-colors mb-8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-md"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Retour à l&apos;accueil
        </Link>

        <header className="space-y-4 mb-10">
          <h1 className="text-3xl font-extrabold text-text-primary">
            Mentions Légales — KHADAMAT
          </h1>
          <p className="text-sm text-text-muted">
            Dernière mise à jour : 22/02/2026
          </p>
          <div className="rounded-xl border border-warning-200 bg-warning-50 p-4">
            <p className="text-sm text-warning-800">
              Informations à compléter : certaines mentions administratives
              (raison sociale, RC, IF, ICE, coordonnées, hébergeur) sont
              volontairement laissées en placeholders en attendant
              l&apos;immatriculation finale.
            </p>
          </div>
        </header>

        <nav
          aria-label="Sommaire des mentions légales"
          className="mb-10 rounded-xl border border-border bg-surface p-5"
        >
          <h2 className="text-base font-semibold text-text-primary mb-3">
            Sommaire
          </h2>
          <ul className="grid gap-2 text-sm sm:grid-cols-2">
            <li>
              <a
                href="#editeur"
                className="text-primary-700 hover:text-primary-800 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-md"
              >
                1. Éditeur du site
              </a>
            </li>
            <li>
              <a
                href="#publication"
                className="text-primary-700 hover:text-primary-800 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-md"
              >
                2. Directeur de la publication
              </a>
            </li>
            <li>
              <a
                href="#hebergement"
                className="text-primary-700 hover:text-primary-800 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-md"
              >
                3. Hébergement
              </a>
            </li>
            <li>
              <a
                href="#marketplace"
                className="text-primary-700 hover:text-primary-800 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-md"
              >
                4. Activité de marketplace
              </a>
            </li>
            <li>
              <a
                href="#donnees"
                className="text-primary-700 hover:text-primary-800 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-md"
              >
                5. Protection des données
              </a>
            </li>
            <li>
              <a
                href="#propriete"
                className="text-primary-700 hover:text-primary-800 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-md"
              >
                6. Propriété intellectuelle
              </a>
            </li>
            <li>
              <a
                href="#responsabilite"
                className="text-primary-700 hover:text-primary-800 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-md"
              >
                7. Responsabilité
              </a>
            </li>
          </ul>
        </nav>

        <section id="editeur" className="mb-10 scroll-mt-24">
          <h2 className="text-2xl font-bold text-text-primary mb-4">
            1) Éditeur du site
          </h2>
          <p className="text-text-secondary mb-4">
            Le présent site web et l&apos;application mobile Khadamat sont
            édités par :
          </p>
          <ul className="space-y-2 text-text-secondary">
            <li><strong className="text-text-primary">Raison sociale :</strong> [À compléter — ex : Khadamat SARL]</li>
            <li><strong className="text-text-primary">Forme juridique :</strong> [À compléter — ex : SARL / SARL AU]</li>
            <li><strong className="text-text-primary">Capital social :</strong> [À compléter] DH</li>
            <li><strong className="text-text-primary">Siège social :</strong> [À compléter — adresse complète au Maroc]</li>
            <li><strong className="text-text-primary">Registre du Commerce (RC) :</strong> [À compléter] — Ville : [À compléter — ex : Casablanca]</li>
            <li><strong className="text-text-primary">Identifiant Fiscal (IF) :</strong> [À compléter]</li>
            <li><strong className="text-text-primary">Taxe Professionnelle (Patente) :</strong> [À compléter]</li>
            <li><strong className="text-text-primary">ICE (Identifiant Commun de l&apos;Entreprise) :</strong> [À compléter]</li>
            <li><strong className="text-text-primary">Email :</strong> [À compléter — ex : contact@khadamat.ma]</li>
            <li><strong className="text-text-primary">Téléphone :</strong> [À compléter — ex : +212 6XX XXX XXX]</li>
          </ul>
        </section>

        <section id="publication" className="mb-10 scroll-mt-24">
          <h2 className="text-2xl font-bold text-text-primary mb-4">
            2) Directeur de la publication
          </h2>
          <ul className="space-y-2 text-text-secondary">
            <li><strong className="text-text-primary">Nom :</strong> [À compléter — responsable légal]</li>
          </ul>
        </section>

        <section id="hebergement" className="mb-10 scroll-mt-24">
          <h2 className="text-2xl font-bold text-text-primary mb-4">
            3) Hébergement
          </h2>
          <p className="text-text-secondary mb-4">
            Le site est hébergé par :
          </p>
          <ul className="space-y-2 text-text-secondary">
            <li><strong className="text-text-primary">Nom :</strong> [À compléter — ex : Vercel / AWS / Autre]</li>
            <li><strong className="text-text-primary">Adresse :</strong> [À compléter]</li>
          </ul>
        </section>

        <section id="marketplace" className="mb-10 scroll-mt-24">
          <h2 className="text-2xl font-bold text-text-primary mb-4">
            4) Activité de marketplace
          </h2>
          <div className="space-y-4 text-text-secondary">
            <p>
              Khadamat agit en tant qu&apos;intermédiaire technique mettant en
              relation des Clients et des Professionnels (notamment plomberie,
              électricité, climatisation, serrurerie, ménage, bricolage et
              autres services à domicile).
            </p>
            <p>
              Les professionnels inscrits sur la plateforme ne sont pas des
              employés de Khadamat. Ils exercent leur activité sous leur propre
              responsabilité.
            </p>
            <p>
              Les conditions de la prestation (prix, modalités d&apos;exécution,
              délais) sont définies entre les parties, notamment via
              l&apos;approche WhatsApp-first intégrée au parcours de réservation.
            </p>
            <p>
              Le périmètre opérationnel actuel couvre Casablanca, Rabat et
              Marrakech.
            </p>
          </div>
        </section>

        <section id="donnees" className="mb-10 scroll-mt-24">
          <h2 className="text-2xl font-bold text-text-primary mb-4">
            5) Protection des données (Loi marocaine 09-08)
          </h2>
          <div className="space-y-5 text-text-secondary">
            <div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">
                Finalités du traitement
              </h3>
              <p>
                Les données personnelles sont traitées pour la gestion des
                réservations, la mise en relation entre clients et
                professionnels, la sécurisation des échanges et la vérification
                d&apos;identité (KYC) des professionnels.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">
                Données sensibles et mesures de sécurité
              </h3>
              <ul className="space-y-2">
                <li>
                  Le numéro de téléphone des parties est masqué tant que la
                  réservation n&apos;est pas confirmée (privacy shield).
                </li>
                <li>
                  Le numéro de CIN des professionnels est haché via SHA-256
                  et traité dans un flux de vérification sécurisé.
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">
                Cadre réglementaire CNDP
              </h3>
              <p>
                Déclaration CNDP n° : [À compléter]
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">
                Vos droits
              </h3>
              <p>
                Conformément à la loi 09-08, vous disposez d&apos;un droit d&apos;accès,
                de rectification et d&apos;opposition au traitement de vos données.
                Pour exercer ces droits :
                {' '}[À compléter — ex : privacy@khadamat.ma].
              </p>
            </div>
          </div>
        </section>

        <section id="propriete" className="mb-10 scroll-mt-24">
          <h2 className="text-2xl font-bold text-text-primary mb-4">
            6) Propriété intellectuelle
          </h2>
          <div className="space-y-4 text-text-secondary">
            <p>
              Les textes, logos, éléments graphiques, bases de données et
              développements logiciels (backend NestJS, frontend Next.js)
              publiés sur Khadamat appartiennent à
              {' '}[À compléter — nom société] ou font l&apos;objet de droits
              d&apos;utilisation.
            </p>
            <p>
              Toute reproduction, représentation, adaptation ou exploitation,
              totale ou partielle, sans autorisation préalable écrite est
              interdite.
            </p>
          </div>
        </section>

        <section id="responsabilite" className="scroll-mt-24">
          <h2 className="text-2xl font-bold text-text-primary mb-4">
            7) Responsabilité
          </h2>
          <div className="space-y-4 text-text-secondary">
            <p>
              Khadamat s&apos;efforce d&apos;assurer l&apos;exactitude et la mise à jour des
              informations diffusées sur la plateforme.
            </p>
            <p>
              En tant qu&apos;intermédiaire technique, Khadamat n&apos;est pas
              responsable des litiges liés à l&apos;exécution des prestations par
              les professionnels.
            </p>
            <p>
              Afin d&apos;améliorer la qualité de la marketplace, un système de
              notation et de signalement est mis à disposition des utilisateurs.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
