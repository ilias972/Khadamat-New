// Blog posts data - single source of truth
export type City = 'Casablanca' | 'Marrakech' | 'Rabat' | 'Maroc';

export interface ContentSection {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  contentSections: ContentSection[];
  city: City;
  category: string;
  publishedAt: string;
  updatedAt?: string;
  readingTimeMin: number;
  keywords: string[];
  ogImage?: string;
}

export const POSTS: BlogPost[] = [
  {
    slug: 'humidite-etancheite-casablanca',
    title: "Problemes d'etancheite et humidite a Casablanca : Comment reagir ?",
    city: 'Casablanca',
    category: 'Plomberie',
    excerpt: "A Casablanca, le climat marin favorise l'humidite et les infiltrations. Voici comment reperer une fuite invisible et quand contacter un plombier verifie.",
    publishedAt: '2026-02-03T10:00:00Z',
    readingTimeMin: 6,
    keywords: ['plombier Casablanca', "fuite d'eau Casa", 'etancheite terrasse Maroc'],
    contentSections: [
      {
        heading: "Le climat de Casablanca et l'humidite",
        paragraphs: [
          "Le climat marin de Casablanca augmente les risques d'humidite dans les murs et terrasses. L'air sale charge en humidite accelere la corrosion et favorise les infiltrations.",
          "Les signes a surveiller : taches brunes sur les murs, odeur de moisi, peinture qui cloque, condensation excessive sur les vitres.",
        ],
      },
      {
        heading: 'Detecter une fuite invisible',
        paragraphs: [
          "Une fuite invisible peut causer des degats importants avant d'etre detectee. Surveillez votre compteur d'eau : s'il tourne sans utilisation, vous avez une fuite.",
          "Verifiez regulierement les joints de salle de bain, la base des toilettes, et les raccords sous l'evier. Une petite fuite peut gaspiller des centaines de litres par mois.",
        ],
      },
      {
        heading: "Quand appeler un plombier ?",
        paragraphs: [
          "Face a une fuite active, coupez l'arrivee d'eau et appelez immediatement un plombier verifie. Les reparations rapides evitent l'aggravation et les couts supplementaires.",
          "Pour les problemes d'etancheite de terrasse, faites intervenir un professionnel avant la saison des pluies. Un diagnostic precis permet de traiter la cause, pas seulement les symptomes.",
        ],
      },
    ],
  },
  {
    slug: 'entretien-climatisation-marrakech',
    title: "Climatisation a Marrakech : Guide d'entretien avant les pics de chaleur",
    city: 'Marrakech',
    category: 'Climatisation',
    excerpt: "Avant juillet, un entretien simple peut eviter une panne en pleine chaleur : filtres, unite exterieure, gaz et signes d'alerte.",
    publishedAt: '2026-02-05T10:00:00Z',
    readingTimeMin: 5,
    keywords: ['clim Marrakech', 'depannage climatisation', 'installateur clim Marrakech'],
    contentSections: [
      {
        heading: "Pourquoi anticiper l'entretien avant l'ete ?",
        paragraphs: [
          "A Marrakech, les temperatures depassent regulierement 40°C en juillet-aout. Une climatisation mal entretenue perd jusqu'a 30% d'efficacite et consomme plus d'electricite.",
          "Un entretien preventif avant l'ete garantit une performance optimale pendant toute la saison chaude et reduit les risques de panne quand vous en avez le plus besoin.",
        ],
      },
      {
        heading: 'Nettoyage des filtres',
        paragraphs: [
          "Les filtres encrasses reduisent le debit d'air et forcent le compresseur a travailler plus dur. Nettoyez-les tous les 2-3 mois avec de l'eau savonneuse.",
          "Des filtres propres ameliorent la qualite de l'air interieur et reduisent la consommation electrique. C'est la maintenance la plus simple et la plus efficace.",
        ],
      },
      {
        heading: "Verification de l'unite exterieure",
        paragraphs: [
          "L'unite exterieure doit etre degagee : pas de feuilles, poussiere ou debris qui bloquent la ventilation. Un nettoyage annuel prolonge la duree de vie de l'appareil.",
          "Verifiez que le condenseur n'est pas oxyde et que les grilles de protection sont intactes. Une ventilation adequate est essentielle pour evacuer la chaleur.",
        ],
      },
    ],
  },
  {
    slug: 'installation-electrique-rabat-signes',
    title: "5 signes que l'installation electrique de votre appartement a Rabat doit etre renovee",
    city: 'Rabat',
    category: 'Electricite',
    excerpt: "Prises qui chauffent, disjoncteur capricieux, odeur de brule : ces signaux doivent declencher un audit par un electricien agree.",
    publishedAt: '2026-02-07T10:00:00Z',
    readingTimeMin: 7,
    keywords: ['electricien Rabat', 'installation electrique Maroc', 'electricien agree Rabat'],
    contentSections: [
      {
        heading: 'Prises qui chauffent : danger immediat',
        paragraphs: [
          "Une prise qui chauffe indique une mauvaise connexion ou une surcharge. C'est un risque d'incendie serieux qui necessite une intervention immediate.",
          "Ne branchez plus rien sur cette prise et faites appel a un electricien agree. Le probleme peut venir du cablage interne, de la prise elle-meme ou du tableau electrique.",
        ],
      },
      {
        heading: 'Disjoncteur qui saute frequemment',
        paragraphs: [
          "Un disjoncteur qui saute regulierement signale une surcharge chronique ou un court-circuit. C'est un mecanisme de protection, pas un dysfonctionnement a ignorer.",
          "Identifiez les appareils qui causent le declenchement. Si le probleme persiste meme sans charge importante, le circuit doit etre inspecte et eventuellement redimensionne.",
        ],
      },
      {
        heading: "Absence de mise a la terre",
        paragraphs: [
          "Les installations anciennes a Rabat manquent souvent de mise a la terre. C'est obligatoire pour la securite : elle protege contre les chocs electriques et les surtensions.",
          "Un electricien peut ajouter une mise a la terre conforme aux normes marocaines. C'est un investissement essentiel pour proteger les personnes et les equipements.",
        ],
      },
    ],
  },
  {
    slug: 'prix-peinture-maroc-tendances',
    title: 'Prix au m² et tendances peinture au Maroc : Vinyle, Khayal ou Stucco ?',
    city: 'Maroc',
    category: 'Peinture',
    excerpt: 'Vinyle, Khayal, Stucco : quelles differences, quels rendus, et comment estimer un budget realiste au m² ?',
    publishedAt: '2026-02-09T10:00:00Z',
    readingTimeMin: 6,
    keywords: ['peintre batiment Casablanca', 'prix peinture Maroc', 'travaux renovation'],
    contentSections: [
      {
        heading: 'Peinture vinyle : le choix polyvalent',
        paragraphs: [
          "La peinture vinyle est la plus courante au Maroc. Facile a appliquer, lavable, disponible en nombreuses couleurs. Budget : 15-35 MAD/m² (fourniture + main d'oeuvre).",
          "Ideale pour chambres, salons, couloirs. Deux couches suffisent sur un mur bien prepare. Temps de sechage rapide (4-6h entre couches).",
        ],
      },
      {
        heading: 'Khayal : effet decoratif haut de gamme',
        paragraphs: [
          "Le Khayal (ou stucco venitien) offre un rendu lisse et brillant avec des reflets subtils. Technique artisanale qui demande du savoir-faire.",
          "Budget : 60-120 MAD/m² selon la complexite. Parfait pour un salon, une entree ou une chambre principale. Entretien facile avec un chiffon humide.",
        ],
      },
      {
        heading: 'Facteurs qui influencent le prix',
        paragraphs: [
          "La preparation des murs represente 40% du travail : rebouchage, ponçage, sous-couche. Un mur abime augmente le cout.",
          "Hauteur sous plafond, acces difficile, nombre de couleurs, delai d'execution : tous ces elements impactent le devis. Demandez toujours un devis detaille avec quantites et finitions specifiees.",
        ],
      },
    ],
  },
  {
    slug: 'grand-nettoyage-marrakech',
    title: 'Nettoyage en profondeur : Pourquoi deleguer le menage de votre maison a Marrakech ?',
    city: 'Marrakech',
    category: 'Menage',
    excerpt: 'Apres travaux, avant un evenement ou a chaque changement de saison : le menage profond demande du materiel et du temps.',
    publishedAt: '2026-02-11T10:00:00Z',
    readingTimeMin: 5,
    keywords: ['femme de menage Marrakech', 'nettoyage appartement Maroc', 'service de menage'],
    contentSections: [
      {
        heading: 'Nettoyage apres travaux',
        paragraphs: [
          "Apres des travaux de renovation, la poussiere de platre, ciment et peinture s'incruste partout. Un nettoyage professionnel evite d'endommager les nouvelles finitions.",
          "Les equipes specialisees disposent d'aspirateurs industriels, produits adaptes et techniques pour nettoyer sans rayer. Un gain de temps considerable.",
        ],
      },
      {
        heading: 'Nettoyage de vitres et terrasses',
        paragraphs: [
          "Les grandes baies vitrees et terrasses de Marrakech accumulent poussiere saharienne et traces de pluie. Un nettoyage regulier preserve la clarte et l'esthetique.",
          "Materiel professionnel : perche telescopique, raclette, produits sans traces. Resultat impeccable sans risque de chute pour les etages eleves.",
        ],
      },
      {
        heading: 'Avant un evenement important',
        paragraphs: [
          "Mariage, reception, fete familiale : deleguer le grand menage permet de se concentrer sur l'organisation et d'accueillir les invites dans une maison impeccable.",
          "Service complet : sols, vitres, sanitaires, cuisine, depoussierage meubles. Intervention rapide (1-2 jours) pour une maison prete a temps.",
        ],
      },
    ],
  },
  {
    slug: 'serrurier-casablanca-anti-arnaques',
    title: 'Cle perdue ou serrure bloquee a Casablanca ? Les bons reflexes pour eviter les arnaques',
    city: 'Casablanca',
    category: 'Serrurerie',
    excerpt: 'Urgence serrurerie : comment eviter les arnaques, demander un prix clair et privilegier un artisan verifie (KYC) via plateforme.',
    publishedAt: '2026-02-13T10:00:00Z',
    readingTimeMin: 6,
    keywords: ['serrurier Casablanca', 'ouverture de porte Casa', 'serrurier urgence'],
    contentSections: [
      {
        heading: 'Les arnaques courantes en serrurerie',
        paragraphs: [
          "Prix annonces bas au telephone (150 MAD) qui explosent sur place (1500 MAD ou plus). Remplacement systematique de la serrure meme quand une ouverture simple suffit.",
          "Fausses urgences creees par le serrurier pour justifier un tarif exorbitant. Absence de devis ecrit avant intervention.",
        ],
      },
      {
        heading: 'Les bons reflexes avant d\'appeler',
        paragraphs: [
          "Demandez un prix ferme au telephone pour une ouverture simple. Un professionnel serieux peut estimer le cout en fonction du type de porte et serrure.",
          "Privilegiez les serruriers avec identite verifiee (KYC) sur une plateforme de confiance. Historique d'interventions et avis clients sont des gages de serieux.",
        ],
      },
      {
        heading: 'Deroulement d\'une intervention honnete',
        paragraphs: [
          "Le serrurier examine la serrure et propose d'abord une ouverture non destructive. Le remplacement n'est necessaire qu'en cas de serrure endommagee ou obsolete.",
          "Devis ecrit avant intervention, facture detaillee apres. Delai d'intervention annonce et respecte. Paiement apres verification que la porte ferme correctement.",
        ],
      },
    ],
  },
  {
    slug: 'bricoleur-rabat-petits-travaux',
    title: 'Monter un meuble ou fixer une tele : Pourquoi appeler un bricoleur a Rabat ?',
    city: 'Rabat',
    category: 'Bricolage',
    excerpt: 'Sans perceuse, niveau ou chevilles adaptees, un petit travail devient vite un stress. Voici quand deleguer a un pro.',
    publishedAt: '2026-02-15T10:00:00Z',
    readingTimeMin: 5,
    keywords: ['bricolage a domicile Rabat', 'montage meuble Maroc', 'handyman Rabat'],
    contentSections: [
      {
        heading: 'Montage de meubles IKEA et autres',
        paragraphs: [
          "Les meubles en kit demandent du temps, de la patience et les bons outils. Un bricoleur experimente monte un meuble 3x plus vite et sans risque d'erreur.",
          "Verification du nivelage, serrage correct des vis, stabilite finale : autant de details qui assurent la durabilite du meuble.",
        ],
      },
      {
        heading: 'Fixation TV au mur',
        paragraphs: [
          "Fixer une TV necessite de trouver les points d'ancrage solides (poutre, brique pleine) et d'utiliser des chevilles adaptees au poids.",
          "Une mauvaise fixation peut causer la chute de la TV et endommager le mur. Un bricoleur verifie la charge admissible et pose un support securise.",
        ],
      },
      {
        heading: 'Quand faire appel a un pro ?',
        paragraphs: [
          "Si vous n'avez pas les outils (perceuse, niveau, mètre), si le travail implique de l'electricite (luminaires, prises), ou si vous manquez de temps.",
          "Un bricoleur qualifie intervient rapidement, apporte son materiel et garantit un resultat propre. Budget moyen : 150-300 MAD selon la complexite.",
        ],
      },
    ],
  },
  {
    slug: 'pros-badge-verifie-khadamat',
    title: 'Artisans marocains : Comment le badge "Verifie" Khadamat multiplie vos demandes',
    city: 'Maroc',
    category: 'Pro - Business',
    excerpt: 'Le KYC rassure, les avis construisent la preuve sociale, et le badge verifie ameliore votre visibilite dans le classement.',
    publishedAt: '2026-02-17T10:00:00Z',
    readingTimeMin: 7,
    keywords: ['devenir pro Khadamat', 'trouver chantiers Maroc', 'marketing artisan'],
    contentSections: [
      {
        heading: 'Le processus KYC : transparence et confiance',
        paragraphs: [
          "La verification d'identite (CIN + selfie + validation manuelle) filtre les faux profils et rassure les clients. C'est un gage de serieux qui vous differencie.",
          "Les clients preferent un artisan verifie, meme si son tarif est legerement superieur. La confiance reduit les hesitations et accelere la prise de decision.",
        ],
      },
      {
        heading: 'Les avis clients : votre meilleur argument commercial',
        paragraphs: [
          "Chaque avis positif renforce votre credibilite et ameliore votre position dans les resultats de recherche. Un profil avec 10+ avis genere 5x plus de demandes qu'un profil sans avis.",
          "Demandez systematiquement un avis apres chaque intervention reussie. Repondez aux avis (positifs et negatifs) pour montrer votre professionnalisme.",
        ],
      },
      {
        heading: 'Optimiser votre profil pour plus de demandes',
        paragraphs: [
          "Photo de profil professionnelle, description claire de vos services, exemples de realisations, disponibilites a jour : chaque element compte.",
          "Repondez rapidement aux demandes (moins de 2h). Un temps de reponse court classe votre profil en priorite et augmente vos chances d'etre choisi.",
        ],
      },
    ],
  },
  {
    slug: 'jardin-terrasse-marrakech-plantes',
    title: 'Creer un jardin de terrasse a Marrakech : Quelles plantes choisir pour resister au soleil ?',
    city: 'Marrakech',
    category: 'Jardinage',
    excerpt: 'Plantes grasses, aromatiques resistantes, arrosage automatique : transformer une terrasse en oasis meme en plein ete.',
    publishedAt: '2026-02-19T10:00:00Z',
    readingTimeMin: 6,
    keywords: ['jardinier Marrakech', 'entretien jardin Maroc', 'paysagiste Marrakech'],
    contentSections: [
      {
        heading: 'Plantes resistantes au soleil marocain',
        paragraphs: [
          "Bougainvillier, laurier-rose, agave, aloe vera : ces plantes supportent le soleil intense et la secheresse. Floraison genereuse avec peu d'entretien.",
          "Les plantes grasses (cactus, crassulas) stockent l'eau et survivent facilement aux etes chauds. Parfaites pour une terrasse exposee plein sud.",
        ],
      },
      {
        heading: 'Arrosage et substrat adaptes',
        paragraphs: [
          "Un substrat drainant (terreau + sable + perlite) evite le pourrissement des racines. Les pots en terre cuite favorisent l'evaporation et maintiennent les racines a temperature moderee.",
          "Installez un systeme d'arrosage goutte-a-goutte avec programmateur. Arrosage le soir ou tot le matin pour minimiser l'evaporation.",
        ],
      },
      {
        heading: 'Amenagement esthetique et fonctionnel',
        paragraphs: [
          "Jouez sur les hauteurs : arbustes en fond, plantes moyennes au milieu, couvre-sol devant. Utilisez des pots de differentes tailles pour creer du relief.",
          "Ajoutez un coin ombrage (pergola, voile) pour profiter de la terrasse meme en plein ete. Les plantes aromatiques (menthe, romarin) parfument l'espace.",
        ],
      },
    ],
  },
];

export function getPostBySlug(slug: string): BlogPost | undefined {
  return POSTS.find((post) => post.slug === slug);
}

export function getAllSlugs(): string[] {
  return POSTS.map((post) => post.slug);
}

export function getAllPosts(): BlogPost[] {
  return POSTS;
}
