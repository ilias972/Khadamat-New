import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Politique de Confidentialité — Khadamat',
  description:
    'Politique de confidentialité et protection des données personnelles de Khadamat.',
  alternates: {
    canonical: 'https://khadamat.ma/legal/privacy',
  },
  openGraph: {
    title: 'Politique de Confidentialité — Khadamat',
    description:
      'Politique de confidentialité et protection des données personnelles de Khadamat.',
    url: 'https://khadamat.ma/legal/privacy',
    siteName: 'Khadamat',
    locale: 'fr_MA',
    type: 'website',
    images: [
      {
        url: 'https://khadamat.ma/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Khadamat',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Politique de Confidentialité — Khadamat',
    description:
      'Politique de confidentialité et protection des données personnelles de Khadamat.',
    images: ['https://khadamat.ma/og-image.jpg'],
  },
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-4xl px-6 py-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Retour à l&apos;accueil
        </Link>

        <header className="mt-6">
          <h1 className="text-3xl font-semibold tracking-tight">
            Politique de Confidentialité
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Dernière mise à jour : 21/02/2026
          </p>
        </header>

        <section className="mt-10 space-y-10">
          <section className="space-y-3">
            <h2 className="text-xl font-semibold">1. Introduction</h2>
            <p className="text-sm leading-6 text-foreground">
              La présente Politique de Confidentialité décrit la manière dont la
              plateforme Khadamat (ci-après « Khadamat ») collecte, utilise,
              conserve et protège vos données à caractère personnel. Elle vise à
              assurer la transparence du traitement de vos données, conformément
              à la Loi 09-08 relative à la protection des personnes physiques à
              l&apos;égard du traitement des données à caractère personnel, sous
              le contrôle de la CNDP, et s&apos;aligne sur les principes de
              transparence et d&apos;information reconnus par le RGPD lorsque
              cela est applicable.
            </p>
            <p className="text-sm leading-6 text-foreground">
              Cette politique explique notamment quelles données nous collectons,
              pourquoi nous les collectons, pendant combien de temps nous les
              conservons, avec qui nous pouvons les partager, et comment exercer
              vos droits.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">
              2. Responsable du traitement et contact
            </h2>
            <p className="text-sm leading-6 text-foreground">
              Khadamat, en tant que plateforme de mise en relation entre clients
              et professionnels (« PRO »), est responsable du traitement des
              données personnelles collectées et traitées via ses services.
            </p>
            <p className="text-sm leading-6 text-foreground">
              Pour toute question relative à la protection des données, vous
              pouvez nous contacter à l&apos;adresse :{' '}
              <a
                href="mailto:support@khadamat.ma"
                className="font-medium text-foreground underline underline-offset-4"
              >
                support@khadamat.ma
              </a>
              .
            </p>
            <p className="text-sm leading-6 text-foreground">
              Le numéro d&apos;autorisation CNDP, lorsqu&apos;il sera obtenu, sera
              affiché sur cette page.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">3. Données collectées</h2>
            <p className="text-sm leading-6 text-foreground">
              Nous collectons différentes catégories de données en fonction de
              votre rôle sur la plateforme (Client ou PRO) et de votre usage des
              services.
            </p>

            <div className="space-y-3">
              <h3 className="text-base font-semibold">
                3.1 Données de compte (tous utilisateurs)
              </h3>
              <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-foreground">
                <li>Nom et prénom</li>
                <li>Numéro de téléphone</li>
                <li>Adresse email</li>
                <li>
                  Mot de passe (stocké de manière sécurisée, selon les bonnes
                  pratiques de sécurité)
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="text-base font-semibold">3.2 Données Client</h3>
              <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-foreground">
                <li>Historique des réservations et demandes de services</li>
                <li>Notes et avis laissés aux PRO</li>
                <li>Signalements (reports) et échanges liés à la modération</li>
                <li>
                  Ville et, lorsque nécessaire pour l&apos;intervention, adresse
                  précise ou informations de localisation communiquées lors d&apos;une
                  réservation
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="text-base font-semibold">3.3 Données PRO</h3>
              <p className="text-sm leading-6 text-foreground">
                En tant que PRO, vous pouvez être amené à fournir des données
                supplémentaires pour créer et gérer votre profil, proposer des
                services, et renforcer la confiance via la vérification
                d&apos;identité.
              </p>
              <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-foreground">
                <li>
                  Vérification d&apos;identité (KYC) : photos de la CIN (recto/verso)
                </li>
                <li>
                  Numéro de CIN : haché (SHA-256) avant stockage, à des fins de
                  sécurité
                </li>
                <li>Ville d&apos;exercice</li>
                <li>Services proposés et informations de tarification</li>
                <li>Bio et informations de profil</li>
                <li>Numéro WhatsApp (pour la communication après réservation)</li>
                <li>
                  Portfolio : contenus et liens ou images que vous choisissez de
                  publier
                </li>
                <li>
                  Abonnements et monétisation : informations liées aux offres
                  (Premium/Boost) et références de commandes associées lorsque
                  vous initiez une demande de paiement
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="text-base font-semibold">3.4 Données techniques</h3>
              <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-foreground">
                <li>Adresse IP et informations de sécurité liées aux connexions</li>
                <li>
                  Journaux techniques (logs) nécessaires à la sécurité, au
                  diagnostic et à la prévention de la fraude
                </li>
                <li>
                  Journaux d&apos;accès liés aux documents KYC (audit des accès)
                </li>
                <li>
                  Identifiants techniques nécessaires aux notifications sur
                  terminaux (le cas échéant)
                </li>
              </ul>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">
              4. Finalités du traitement (utilisation des données)
            </h2>
            <p className="text-sm leading-6 text-foreground">
              Nous utilisons vos données personnelles pour les finalités
              suivantes :
            </p>
            <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-foreground">
              <li>Créer et gérer votre compte utilisateur</li>
              <li>
                Permettre la mise en relation et la réservation de services entre
                Clients et PRO
              </li>
              <li>
                Faciliter la communication entre Clients et PRO après la
                confirmation d&apos;une réservation (ex. communication via WhatsApp)
              </li>
              <li>
                Assurer la sécurité et la confiance sur la plateforme (KYC,
                prévention de la fraude, modération, gestion des abus)
              </li>
              <li>
                Gérer la monétisation et les offres PRO (Premium/Boost), et le
                suivi des demandes de paiement (y compris dans un flux manuel)
              </li>
              <li>
                Améliorer l&apos;expérience utilisateur et la qualité du service
                (analyses et statistiques agrégées)
              </li>
              <li>
                Vous adresser des communications marketing (newsletter, offres)
                uniquement si vous avez donné votre consentement lorsque cela est
                requis
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">5. Bases légales</h2>
            <p className="text-sm leading-6 text-foreground">
              Nous traitons vos données en nous appuyant sur des bases légales
              adaptées aux finalités, notamment :
            </p>
            <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-foreground">
              <li>
                L&apos;exécution du service demandé (mise en relation et gestion des
                réservations)
              </li>
              <li>
                Le respect d&apos;obligations légales et réglementaires lorsque cela
                s&apos;applique
              </li>
              <li>
                Notre intérêt légitime à assurer la sécurité, prévenir la fraude
                et améliorer le service
              </li>
              <li>
                Votre consentement, notamment pour certaines communications
                marketing (newsletter)
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">
              6. Partage des données et visibilité
            </h2>
            <p className="text-sm leading-6 text-foreground">
              Khadamat applique un principe de confidentialité et de minimisation
              des données partagées.
            </p>
            <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-foreground">
              <li>
                Les profils PRO (sans données sensibles) peuvent être visibles
                publiquement afin de permettre aux utilisateurs de choisir un
                professionnel.
              </li>
              <li>
                Les données sensibles et de contact (notamment les numéros de
                téléphone) sont masquées et ne deviennent visibles qu&apos;à partir
                du moment où une réservation est confirmée (statut CONFIRMED).
              </li>
              <li>
                L&apos;accès aux documents KYC est strictement restreint et fait
                l&apos;objet d&apos;un suivi via des journaux d&apos;accès (audit des accès).
              </li>
            </ul>
            <p className="text-sm leading-6 text-foreground">
              Nous ne vendons pas vos données personnelles.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">
              7. Conservation et suppression des données
            </h2>
            <p className="text-sm leading-6 text-foreground">
              Nous conservons les données personnelles pendant une durée limitée,
              proportionnée aux finalités du traitement et aux obligations
              applicables.
            </p>
            <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-foreground">
              <li>
                Données de compte : conservées tant que votre compte est actif,
                puis traitées selon nos obligations et nécessités de gestion.
              </li>
              <li>
                Réservations et historique : conservés afin de permettre la
                gestion du service, le support, les statistiques et la gestion
                d&apos;éventuels litiges.
              </li>
              <li>
                Documents KYC : conservés le temps nécessaire à la vérification
                et au respect des obligations applicables ; en cas de suppression
                de compte, les données sont traitées selon les exigences légales
                et de sécurité.
              </li>
              <li>
                Logs et données techniques : conservés pour une durée limitée, à
                des fins de sécurité et de diagnostic.
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">8. Sécurité des données</h2>
            <p className="text-sm leading-6 text-foreground">
              Khadamat met en œuvre des mesures techniques et organisationnelles
              destinées à protéger vos données contre l&apos;accès non autorisé, la
              perte, l&apos;altération et la divulgation.
            </p>
            <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-foreground">
              <li>
                Contrôles de type fichier (ex. validation par « magic bytes »)
                lors des uploads KYC
              </li>
              <li>Re-encodage des images KYC côté serveur</li>
              <li>Hachage SHA-256 du numéro de CIN avant stockage</li>
              <li>
                Accès restreint aux documents KYC et journalisation des accès
                (audit des accès)
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">
              9. Droits des utilisateurs
            </h2>
            <p className="text-sm leading-6 text-foreground">
              Conformément à la Loi 09-08 et aux principes de protection des
              données, vous disposez de droits concernant vos données personnelles,
              notamment :
            </p>
            <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-foreground">
              <li>Droit d&apos;accès</li>
              <li>Droit de rectification</li>
              <li>Droit d&apos;opposition</li>
              <li>Droit de suppression, dans les limites des obligations applicables</li>
              <li>
                Droit de retrait du consentement, notamment pour la newsletter,
                lorsque le traitement est fondé sur votre consentement
              </li>
            </ul>
            <p className="text-sm leading-6 text-foreground">
              Pour exercer vos droits, contactez-nous à{' '}
              <a
                href="mailto:support@khadamat.ma"
                className="font-medium text-foreground underline underline-offset-4"
              >
                support@khadamat.ma
              </a>
              . Une preuve d&apos;identité pourra être demandée en cas de doute
              raisonnable sur l&apos;identité du demandeur.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">10. Cookies et traceurs</h2>
            <p className="text-sm leading-6 text-foreground">
              Khadamat utilise des cookies et/ou technologies similaires
              principalement pour assurer le bon fonctionnement du service,
              notamment la gestion des sessions et l&apos;authentification. Des
              traceurs de mesure d&apos;audience ou d&apos;amélioration de l&apos;expérience
              peuvent être utilisés le cas échéant. Vous pouvez gérer vos
              préférences via les paramètres de votre navigateur.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">11. Mise à jour</h2>
            <p className="text-sm leading-6 text-foreground">
              Nous pouvons mettre à jour la présente Politique de Confidentialité
              afin de refléter les évolutions de nos pratiques, de nos services,
              ou des exigences légales. La date de dernière mise à jour est
              indiquée en haut de page.
            </p>
          </section>
        </section>
      </div>
    </main>
  );
}
