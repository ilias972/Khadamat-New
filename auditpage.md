# Phase 2 — Funnel Client & Booking (AUDIT E2E)

> **Date** : 2026-02-22
> **Contexte** : Audit complet du parcours client (acquisition → selection pro → reservation → paiement → suivi), incluant RBAC, securite, performance, mobile et monitoring.
> Reflete l'etat actuel du code.

## Résumé executif

- **Statut global** : ⚠️ Moyen-Bon (base solide, plusieurs gaps critiques de conversion et de robustesse)

- **Points forts** :
  - Funnel public principal fonctionnel : `/` → `/pros` → `/pro/[publicId]` → `/book/[proId]` → `/client/bookings`.
  - Contrat `GET /bookings` côté client aligné sur `{ data, meta }` (le bug bloquant historique a été corrigé sur cette page).
  - `/book/*`, `/client/bookings`, `/profile`, `/plans` protégés SSR par `middleware.ts` avec `?next=`.
  - `POST /bookings` protégé par `JwtAuthGuard + RolesGuard + @Roles('CLIENT')`.
  - Paiement backend : prix déterminé server-side (`PAYMENT_PLANS`), ownership strict, checkout protégé par `KycApprovedGuard`.
  - `RolesGuard` corrigé (`getAllAndOverride`) : metadata classe + méthode prises en compte.
  - Expiration automatique des bookings `PENDING/WAITING_FOR_CLIENT` via cron (`BookingExpirationService`) avec `BookingEvent` persisté.

- **Risques majeurs** :
  1. **CRITIQUE** — Favoris sur `/pro/[publicId]` incohérents : frontend envoie un `publicId` pro, backend `favorites` attend un `User.id` interne ; erreurs silencieuses côté UI (`catch {}`), conversion engagement dégradée.
  2. **CRITIQUE** — `/dashboard/subscription/success` rafraîchit le store auth avec la mauvaise shape (`/pro/me` casté en `PublicUser`), risque de corruption d’état client après paiement.
  3. **HIGH** — `handleRetry` de `/dashboard/subscription/success` ne relance pas réellement la vérification API ; UX de récupération en erreur est cassée.
  4. **HIGH** — Route legacy `/pro/subscription` conserve un résultat forgeable par query params (aucune vérification server-side), et `console.log` en prod.
  5. **HIGH** — `/client/bookings` filtre l’onglet historique côté client sur une page paginée, sans `scope=history` : historique incomplet, risque de support et perte de confiance.
  6. **MEDIUM** — Skeletons homepage (`HeroSkeleton`, `CategorySkeleton`, `ProCardSkeleton`) utilisent `animate-pulse` sans `motion-safe:`.
  7. **MEDIUM** — SEO acquisition incomplet : pas de metadata dédiée pour `/pros` et `/pro/[publicId]`, sitemap sans routes funnel dynamiques (`/pros`, `/pro/[publicId]`).
  8. **MEDIUM** — Paiement post-checkout incomplet côté UX : pas de chaînage natif vers `success/cancel`, pages de résultat déconnectées du flux réel modal manuel.
  9. **LOW** — Pages légales partiellement finalisées (`/legal/mentions` placeholders, variable de juridiction à compléter en CGU), impact confiance pré-paiement.

- **Recommandations** (priorisées) :
  1. Corriger immédiatement le contrat Favoris (`publicId` ↔ `internal id`) + erreurs explicites UI sur `/pro/[publicId]`.
  2. Corriger `/dashboard/subscription/success` : type API réel, refresh auth store via mapper correct, retry effectif.
  3. Supprimer ou sécuriser `/pro/subscription` (vérification server-side via `/payment/status/:oid`), retirer les logs dev.
  4. Utiliser `scope=history` sur `/client/bookings` (et/ou onglet history paginé séparé) pour cohérence données.
  5. Finaliser SEO funnel : metadata `/pros` et `/pro/[publicId]`, enrichir `sitemap.ts` avec routes funnel clés.

# 1) Audit detaille par page (Funnel)

## / (Homepage — acquisition & entrée funnel)

### Frontend

- **Fichier** :
  - `apps/web/src/app/page.tsx` (34 lignes)
  - `apps/web/src/components/home/HomeClient.tsx` (51 lignes)
  - `apps/web/src/components/home/Hero.tsx` (517 lignes)
  - `apps/web/src/components/home/Categories.tsx` (156 lignes)
  - `apps/web/src/components/home/FeaturedPros.tsx` (226 lignes)
- **Composants associés** : `Navbar`, `TrustStrip`, `Testimonials`, `HowItWorks`, `PricingSection`, `SecuritySection`, `ProCTA`, `Footer`.
- **Composants legacy/dead code** : non observés sur ce segment homepage.
- **CTA principaux** :
  - Hero submit → `/pros?cityId=...&categoryId=...` (disabled tant que ville+catégorie absentes).
  - Cards catégories → `/pros` avec `categoryId` et conservation `cityId` si sélectionné.
  - Featured pros → `/pro/{publicId}`.
- **Champs + validation client-side** :
  - Ville (select) + service (combobox autosuggest), validation minimale `isReady` (non vide).
  - Pas de validation sémantique supplémentaire côté front (normal pour page d’acquisition).
- **Etats geres** :

| Etat | Implementation | Verdict |
| --- | --- | --- |
| Loading Hero | `HeroSkeleton` | OK fonctionnel, A11y motion à corriger |
| Loading categories/pros | skeletons dédiés | OK |
| Error categories/pros | message + retry | OK |
| Empty categories/pros | `EmptyState` | OK |
| Ready | grille + cards + CTA | OK |

- **Accessibilite** :
  - Hero : pattern combobox/listbox complet (`aria-expanded`, `aria-activedescendant`, `role=listbox/option`).
  - Labels et focus clavier présents.
  - `useReducedMotion()` déjà appliqué sur les animations Framer Motion du Hero.
  - **Gap** : skeletons avec `animate-pulse` sans `motion-safe:` dans `HeroSkeleton`, `CategorySkeleton`, `ProCardSkeleton`.
- **Design tokens** : classes tokenisées (pas de hex hardcodé observé dans ces fichiers).
- **Animations** :
  - Hero animé avec fallback `shouldReduceMotion`.
  - Plusieurs `transition-*` sans préfixe motion-safe sur `Categories` / `FeaturedPros`.
- **Redirections & interruptions funnel** : pas de redirect sur homepage.
- **Sécurité côté client** :
  - Requêtes publiques via `getJSON('/public/*')` (`credentials: omit` dans `api.ts`).
  - Pas d’exposition d’ID interne côté cards (`publicId` utilisé).
- **Mobile UX** :
  - Formulaire responsive, `HeroMobileCTA` présent.
  - Tap targets majoritairement >= 44px sur boutons principaux.
  - Pas d’overflow bloquant observé.
- **SEO** :
  - Metadata `title/description` présente sur `app/page.tsx`.
  - Pas d’OpenGraph/canonical explicites au niveau de la page.
- **Performance** :
  - `HomeClient` centralise le fetch catégories (double-fetch supprimé).
  - `FeaturedPros` lit correctement `res.data` + `res.meta.total`.
  - Framer Motion dans Hero ajoute du JS client non négligeable.

### API / Backend

- **Endpoints utilisés** :
  - `GET /public/cities` (`catalog.controller.ts`)
  - `GET /public/categories`
  - `GET /public/pros/v2`
- **Guards/Roles** : endpoints publics (pas de JwtGuard).
- **Validation** : validation query côté controller (`isEntityId` pour `cityId/categoryId`, bornes `page/limit`).
- **Métier critique** : tri monetisation-first (`isPremium`, `boostActiveUntil`, `createdAt`) sur `v2`.
- **Anti-abus** : rate limiting global applicatif (Throttler global) uniquement.
- **Gestion erreurs** : erreurs côté frontend avec retry local.
- **Paiement** : non applicable sur cette page.

### DB

- **Modèles** : `City`, `Category`, `User`, `ProProfile`, `ProService`.
- **Contraintes/index** :
  - `City.publicId` / `Category.publicId` uniques.
  - `ProService @@index([categoryId])` utile aux filtres.
- **ID interne vs publicId** : sortie API publique mappe vers `publicId`.

### Performance & Core Web Vitals

- **FCP estimé** : bon (RSC shell + sections statiques rapides).
- **LCP estimé** : moyen-bon (Hero client-hydrated, animations Framer).
- **CLS** : faible (skeletons présents).
- **TTI/INP** : moyen-bon, dépendant du coût hydration Hero + testimonials.
- **Caching** : backend cache sur catalog (`cities/categories/pros v2`).

### Monitoring & Résilience

- **ErrorBoundary global frontend** : non observé (`app/error.tsx` absent).
- **Capture exceptions externe** : non observée (pas de Sentry/Datadog/LogRocket).
- **Retry réseau** : présent localement sur composants clés.
- **Logs backend** : logs Nest standards, pas de tracing funnel dédié.

### i18n / RTL readiness

- Strings majoritairement hardcodées FR.
- Format téléphone/dates orienté `fr-FR` dans plusieurs pages du funnel.
- Layout mostly LTR (`left/right` utilitaires encore présents localement).
- Préparation multi-langue/RTL partielle, non systémique.

### Problemes & recommandations

| # | Severite | Probleme | Impact metier | Effort (XS/S/M/L) | Action |
| --- | --- | --- | --- | --- | --- |
| H-01 | MEDIUM | Skeletons homepage sans `motion-safe:` | Confort réduit (prefers-reduced-motion), risque non-conformité WCAG | XS | Prefixer `animate-pulse` en `motion-safe:animate-pulse` |
| H-02 | MEDIUM | Metadata acquisition incomplète (pas OG/canonical page-level) | Moins bon CTR social/SEO top-funnel | S | Ajouter OG/Twitter/canonical sur `/` |
| H-03 | LOW | `transition-*` non motion-safe sur cards | Micro-motion non contrôlée | XS | Ajouter `motion-safe:` sur transitions de mouvement |
| H-04 | LOW | Framer Motion sur Hero alourdit bundle client | TTI mobile légèrement dégradé | M | Conserver ou migrer vers CSS motion-safe selon priorités perf |

### TODO

- [ ] Appliquer `motion-safe:` sur tous les skeletons homepage (Effort XS)
- [ ] Ajouter metadata OG/canonical complète pour `/` (Effort S)
- [ ] Standardiser transitions motion-safe des cards home (Effort XS)
- [ ] Mesurer bundle Hero/Testimonials (analyse build) et ajuster animations (Effort M)

### Score detaille — /

| Aspect | Score /5 | Justification |
| ------ | -------- | ------------- |
| Frontend structure | 4.5 | Composition claire, state partagé via `HomeClient` |
| UX & states | 4.5 | Loading/empty/error/retry bien couverts |
| Validation front | 4.0 | Validation suffisante pour acquisition (isReady) |
| Sécurité (funnel + données + anti-abus) | 4.5 | Endpoints publics propres, pas de fuite sensible |
| Backend protection | 4.0 | Validation query + cache backend, pas de garde requise |
| RBAC | 5.0 | N/A public, cohérent |
| Redirections (returnTo, guards) | 4.5 | Pas d’interruption sur home |
| DB cohérence | 4.5 | publicId cohérent, index utiles |
| Performance | 4.0 | Bon shell, coût client Hero/Framer |
| Mobile UX | 4.5 | Responsive solide, CTA mobile présent |
| Monitoring | 2.0 | Pas d’outillage de monitoring funnel |
| SEO | 3.5 | title/description ok, OG/canonical absents |

**Score global page : 4.3 / 5**

---

## /pros (Listing / recherche / tri / filtres)

### Frontend

- **Fichier** :
  - `apps/web/src/app/pros/page.tsx` (165 lignes)
  - `apps/web/src/components/pros/ProsClientPage.tsx` (375 lignes)
  - `apps/web/src/components/ProCard.tsx` (75 lignes)
  - `apps/web/src/app/pros/loading.tsx` (skeleton)
- **Composants associés** : `Navbar`, `ProCard`.
- **Composants legacy/dead code** : non observés.
- **CTA principaux** :
  - Appliquer filtres (ville/catégorie/premium/note) → refresh URL + fetch v2.
  - Pagination prev/next.
  - Card pro → `/pro/{publicId}`.
- **Champs + validation client-side** :
  - Filtres via `<select>` ; `minRating` limité à un ensemble whitelisté côté TS.
- **Etats geres** :

| Etat | Implementation | Verdict |
| --- | --- | --- |
| Loading SSR route | `app/pros/loading.tsx` | OK |
| Loading client refresh | spinner + texte | OK |
| Error | banner + retry | OK |
| Empty | état vide explicite | OK |
| Success | grille + pagination | OK |

- **Accessibilite** :
  - Breadcrumb ARIA, labels sur filtres.
  - Onglets non applicables.
  - **Gap** : `ProCard` utilise emoji `📍` sans `aria-hidden`.
- **Design tokens** : conformes (pas d’hex hardcodé dans ces fichiers).
- **Animations** : transitions présentes ; plusieurs `transition` non `motion-safe` (notamment `ProCard`).
- **Redirections & interruptions funnel** : pas de guard auth sur listing public.
- **Sécurité côté client** :
  - fetch server-side vers API publique.
  - Aucun ID interne exposé dans route de détail (lien `publicId`).
- **Mobile UX** :
  - Filtres responsive en grille.
  - Pagination boutons utilisables mobile.
  - Pas de sticky filters mobile (amélioration possible conversion).
- **SEO** :
  - Pas de `metadata` dédiée (`title/description/OG/canonical`) sur `app/pros/page.tsx`.
- **Performance** :
  - `fetchPros` server-side en `cache: 'no-store'` malgré backend déjà cache (hit route fréquent).
  - `fetchCities`/`fetchCategories` server-side `force-cache` : positif.

### API / Backend

- **Endpoints** :
  - `GET /public/pros/v2` (principal)
  - `GET /public/cities`
  - `GET /public/categories`
- **Guards/Roles** : publics.
- **Validation** : query `cityId/categoryId/page/limit/premium/minRating` validées.
- **Métier** : tri premium-first + pagination meta.
- **Anti-abus** : validation bornes `limit<=50`.
- **Paiement** : N/A.

### DB

- **Modèles** : `User`, `ProProfile`, `ProService`, `City`, `Category`.
- **Contraintes/index** : index service catégorie, recherche relationnelle sur `proProfile.services`.
- **ID** : mapping publicId correct côté sortie card.

### Performance & Core Web Vitals

- **FCP estimé** : bon (SSR initial data).
- **LCP estimé** : moyen-bon (grille cartes sans images lourdes).
- **CLS** : faible (loading skeleton dédié).
- **TTI/INP** : bon hors gros volumes ; pagination limite la taille de DOM.
- **Caching** : backend cache v2 actif, mais `no-store` côté fetch SSR de la page limite le gain E2E.

### Monitoring & Résilience

- Error state + retry front présents.
- Pas de tracing de conversion sur click card/filter apply.
- Pas d’ErrorBoundary global.

### i18n / RTL readiness

- Textes FR hardcodés.
- Formats neutres (pas de monnaie/date ici).
- Compat RTL non traitée explicitement.

### Problemes & recommandations

| # | Severite | Probleme | Impact metier | Effort (XS/S/M/L) | Action |
| --- | --- | --- | --- | --- | --- |
| PR-01 | HIGH | Metadata SEO absente sur `/pros` | Moindre indexation/clic organique sur listing principal | S | Ajouter `metadata` + OG/canonical |
| PR-02 | MEDIUM | `fetchPros` SSR en `no-store` | Charge backend plus élevée en pic trafic funnel | S | Évaluer `revalidate` court côté Next + s’appuyer sur cache backend |
| PR-03 | LOW | `ProCard` emoji sans `aria-hidden` | Pollution lecteur d’écran | XS | Marquer icônes décoratives `aria-hidden` |
| PR-04 | LOW | Transitions non `motion-safe` | Inconfort utilisateurs reduce-motion | XS | Prefix motion-safe sur transitions concernées |

### TODO

- [ ] Ajouter metadata complète sur `/pros` (Effort S)
- [ ] Revoir stratégie cache SSR de `fetchPros` (Effort S)
- [ ] Corriger A11y emoji décoratifs sur `ProCard` (Effort XS)
- [ ] Harmoniser transitions motion-safe (Effort XS)

### Score detaille — /pros

| Aspect | Score /5 | Justification |
| ------ | -------- | ------------- |
| Frontend structure | 4.0 | Séparation RSC + client page propre |
| UX & states | 4.0 | Erreur/retry/pagination présents |
| Validation front | 4.0 | Filtres bornés correctement |
| Sécurité (funnel + données + anti-abus) | 4.5 | Public endpoints propres, IDs publics |
| Backend protection | 4.0 | Validation query stricte |
| RBAC | 5.0 | Public cohérent |
| Redirections (returnTo, guards) | 5.0 | Pas d’interruption auth ici |
| DB cohérence | 4.5 | Index et mapping cohérents |
| Performance | 3.8 | no-store SSR limite le bénéfice cache backend |
| Mobile UX | 4.0 | Responsive correct, filtres utilisables |
| Monitoring | 2.0 | Pas d’instrumentation funnel |
| SEO | 2.8 | Pas de metadata dédiée listing |

**Score global page : 4.0 / 5**

---

## /pro/[publicId] (Fiche pro — détail & CTA réserver)

### Frontend

- **Fichier** :
  - `apps/web/src/app/pro/[publicId]/page.tsx` (245 lignes)
  - `apps/web/src/app/pro/[publicId]/loading.tsx` (52 lignes)
  - `apps/web/src/app/pro/[publicId]/ProDetailClient.tsx` (73 lignes)
  - `apps/web/src/components/ProBookingCTA.tsx` (102 lignes)
- **Composants associés** : `Header`, `ProBookingCTA`, favoris client.
- **Composants legacy/dead code** : non observés.
- **CTA principaux** :
  - Non-auth : `Se connecter` → `/auth/login?next=/pro/{publicId}`.
  - Client auth : `Réserver maintenant` → `/book/{proId}?categoryId=...`.
  - Pro auth : réservation bloquée côté UI.
  - Favori : toggle `/favorites/:proId`.
- **Champs + validation client-side** : pas de formulaire principal ; actions CTA + favoris.
- **Etats geres** :

| Etat | Implementation | Verdict |
| --- | --- | --- |
| Loading | `loading.tsx` skeleton | OK (`motion-safe` présent) |
| 404 | `notFound()` uniquement sur 404 réel | OK |
| Erreur réseau/500 | UI dédiée avec retry + retour pros | OK |
| Success | Profil + services + reviews + CTA | OK |

- **Accessibilite** :
  - UI erreur avec `role="alert"` et `aria-live`.
  - Bouton favori `aria-label` dynamique.
  - **Gaps** :
    - `router.push('/auth/login')` dans favoris sans param `next`.
    - erreurs favoris silencieuses (aucun feedback SR ou visuel).
- **Design tokens** : conformes (pas d’hex hardcodé observé).
- **Animations** : transitions non `motion-safe` sur plusieurs CTA.
- **Redirections & interruptions funnel** :
  - Login CTA principal conserve bien le contexte via `next`.
  - Flux favoris perd le contexte login.
- **Sécurité côté client** :
  - Détail pro fetché server-side (pas de token client requis).
  - **Risque fonctionnel** : favoris utilisent `proId` public en supposant même identifiant backend.
- **Mobile UX** :
  - Mise en page responsive colonne unique.
  - CTA réservation visible.
- **SEO** :
  - Pas de `metadata` dynamique par pro (title/description/canonical/OG non spécifiques).
- **Performance** :
  - RSC fetch serveur `no-store`.
  - Images via `<img>` (pas `next/image`).

### API / Backend

- **Endpoints** :
  - `GET /public/pros/:id` (`OptionalJwtGuard`)
  - `GET /favorites`, `POST /favorites/:proId`, `DELETE /favorites/:proId` (CLIENT uniquement)
- **Guards/Roles** :
  - Détail public en optional auth.
  - Favoris : `JwtAuthGuard + RolesGuard + @Roles('CLIENT')`.
- **Contrôles métier** :
  - Phone démasqué seulement owner ou client avec booking éligible.
- **Anti-abus** :
  - `favorites.addFavorite` vérifie PRO actif/KYC.
- **Problème critique** :
  - `FavoritesService.addFavorite` recherche `user.id = proId` (ID interne) alors que la page envoie `publicId` pro.

### DB

- **Modèles** : `User`, `ProProfile`, `Favorite`, `Review`, `Booking`.
- **Contraintes** : `Favorite @@unique([clientId, proId])` idempotent.
- **Cohérence IDs** : mismatch `publicId` front vs `id` interne backend sur favoris.

### Performance & Core Web Vitals

- **FCP estimé** : bon (RSC + rendu direct).
- **LCP estimé** : moyen (images non optimisées via `img`).
- **CLS** : faible avec skeleton.
- **TTI** : bon hors action favoris.
- **Caching** : backend data dynamique ; page force-dynamic.

### Monitoring & Résilience

- Erreur fetch profil loggée + fallback UI.
- Favoris : erreurs absorbées (`catch {}`) sans télémétrie ni signal UX.
- Pas de tracking conversion sur click `Réserver`.

### i18n / RTL readiness

- FR hardcodé.
- Dates des reviews en `fr-FR`.
- RTL non pris en charge explicitement.

### Problemes & recommandations

| # | Severite | Probleme | Impact metier | Effort (XS/S/M/L) | Action |
| --- | --- | --- | --- | --- | --- |
| PD-01 | CRITIQUE | Favoris cassés (publicId envoyé, backend attend userId interne) | Perte d’engagement et confiance (action visible mais inefficace) | S | Aligner contrat favoris sur `publicId` ou mapper côté API |
| PD-02 | HIGH | Erreurs favoris silencieuses (`catch {}`) | Support difficile, UX trompeuse | XS | Afficher toast/error state + logs structurés |
| PD-03 | MEDIUM | Favoris non-auth redirige vers `/auth/login` sans `next` | Rupture contexte, drop-off | XS | Utiliser `?next=/pro/{publicId}` |
| PD-04 | MEDIUM | Metadata SEO dynamique absente | Faible découvrabilité des fiches pros | M | Ajouter metadata dynamique par pro |
| PD-05 | LOW | Images via `<img>` sans optimization Next | LCP dégradé sur connexions lentes | M | Migrer vers `next/image` quand possible |

### TODO

- [ ] Corriger contrat IDs favoris (Effort S)
- [ ] Ajouter feedback d’erreur favoris (Effort XS)
- [ ] Propager `next` sur redirect login favoris (Effort XS)
- [ ] Ajouter metadata dynamique de fiche pro (Effort M)
- [ ] Étudier migration image optimisée (Effort M)

### Score detaille — /pro/[publicId]

| Aspect | Score /5 | Justification |
| ------ | -------- | ------------- |
| Frontend structure | 4.0 | Bonne séparation RSC/client |
| UX & states | 3.8 | Gestion 404/réseau correcte |
| Validation front | 3.5 | Peu d’actions invalidables ici |
| Sécurité (funnel + données + anti-abus) | 3.0 | Favoris ID mismatch + erreurs silencieuses |
| Backend protection | 4.0 | Guards favoris et checks profil ok |
| RBAC | 4.5 | Favoris CLIENT-only correct |
| Redirections (returnTo, guards) | 3.8 | CTA principal ok, favoris non |
| DB cohérence | 3.0 | Mismatch public/internal sur favorites |
| Performance | 3.8 | RSC bon, images non optimisées |
| Mobile UX | 4.2 | Mise en page responsive |
| Monitoring | 2.0 | Pas de tracking action favoris/CTA |
| SEO | 2.5 | Metadata dynamique absente |

**Score global page : 3.6 / 5**

---

## /book/[proId] (Booking flow client)

### Frontend

- **Fichier** : `apps/web/src/app/book/[proId]/page.tsx` (531 lignes).
- **Composants associés** : `Header`, états success/slots/errors intégrés.
- **Composants legacy/dead code** : non observés.
- **CTA principaux** :
  - `Valider la réservation` (disabled pendant submit).
  - `Voir mes réservations` post-success.
  - `Discuter sur WhatsApp` si phone disponible.
- **Champs + validation client-side** :
  - `categoryId` requis via query.
  - Date (`type=date`) bornée `[today, today+30j]`.
  - Sélection créneau obligatoire.
- **Etats geres** :

| Etat | Implementation | Verdict |
| --- | --- | --- |
| Hydration | écran de chargement (plus de `null`) | OK |
| Non-auth | redirect vers login avec `next` | OK |
| Non-client | blocage + logout | OK |
| categoryId manquant | erreur explicite | OK |
| Pro loading/error | spinners + fallback | OK |
| Slots loading/empty | gérés | OK |
| Booking error | `aria-live` + message | OK |
| Booking success | écran succès + CTA WhatsApp | OK |

- **Accessibilite** :
  - Label date (`htmlFor`/`id`) corrigé.
  - Slots avec rôles ARIA (`listbox`/`option`) + `aria-selected`/`aria-pressed`.
  - Erreurs booking dans zone `role=alert` et `aria-live`.
  - **Gap** : plusieurs `transition` sans `motion-safe`.
- **Design tokens** : conformité globale.
- **Animations** : spinners `motion-safe:animate-spin`; transitions mixtes.
- **Redirections & interruptions funnel** :
  - middleware protège `/book/*` SSR.
  - fallback client `router.replace('/auth/login?next=...')` aligné.
- **Sécurité côté client** :
  - fetch pro via `credentials: 'include'` (nécessaire pour phone conditionnel).
  - post booking via helper CSRF (`postJSON`).
- **Mobile UX** :
  - Inputs natifs (date) + grille slots responsive.
  - CTA principal full width.
- **SEO** :
  - Page privée/utilitaire, pas de metadata `noindex` explicite.
- **Performance** :
  - Gros composant client unique (531 lignes).
  - multiphase states bien gérés, mais lourdeur d’hydratation potentielle.

### API / Backend

- **Endpoints** :
  - `GET /public/pros/:id`
  - `GET /public/slots?proId&date&categoryId`
  - `POST /bookings`
- **Guards/Roles** :
  - `POST /bookings`: `JwtAuthGuard + RolesGuard + @Roles('CLIENT')`.
- **Validation** : Zod (`CreateBookingSchema`) + contrôles métier transactionnels.
- **Contrôles métier** :
  - city/address requis client, city match pro, pro KYC approved, service actif, disponibilité, futur, collision confirmed.
- **Anti-fraude/anti-abus** :
  - prix non concerné.
  - ownership et rôle stricts.
  - **Gap** : pas d’idempotency token serveur sur `createBooking` (double submit HTTP concurrent possible).
- **Gestion erreurs** :
  - `SLOT_TAKEN` utilisé pour plusieurs causes (`service inactif`, `hors dispo`, `past slot`, `conflict`) => message générique côté UI.

### DB

- **Modèles** : `Booking`, `BookingEvent`, `WeeklyAvailability`, `ProService`.
- **Contraintes/index** :
  - index `@@index([proId, status, timeSlot])` utile.
  - pas de `@@unique([proId,timeSlot])` (cohérence garantie applicative/transactionnelle seulement).
- **ID interne/publicId** : résolution publicId → interne côté service (`resolveProUserId`).

### Performance & Core Web Vitals

- **FCP estimé** : moyen (page client + auth gating).
- **LCP estimé** : moyen (header + blocs success/formulaires).
- **CLS** : faible à moyen selon transitions d’états.
- **TTI/INP** : moyen, dépendant de fetch pro + slots + hydratation.
- **Caching** : slots recalculés à chaque date/changement.

### Monitoring & Résilience

- Logs `console.error` côté front sur fetch/refresh pro.
- Retry explicite partiel (revenir pros, relancer date).
- Pas de tracing conversion par étape (submit, fail reason, abandon).

### i18n / RTL readiness

- FR hardcodé.
- Dates affichées sans locale centralisée.
- Format WhatsApp message fixe FR.
- RTL non traité explicitement.

### Problemes & recommandations

| # | Severite | Probleme | Impact metier | Effort (XS/S/M/L) | Action |
| --- | --- | --- | --- | --- | --- |
| BK-01 | HIGH | `SLOT_TAKEN` couvre plusieurs erreurs métier | Feedback flou, baisse conversion en confirmation | S | Différencier codes backend (`SERVICE_INACTIVE`, `OUT_OF_HOURS`, `PAST_SLOT`, etc.) |
| BK-02 | MEDIUM | Pas d’idempotency serveur sur création booking | Risque doublons en cas de retries réseau | M | Ajouter garde idempotence courte fenêtre |
| BK-03 | MEDIUM | Pas de `noindex` explicite pages privées utilitaires | Indexation accidentelle potentielle | XS | Ajouter `robots: { index: false }` sur pages privées |
| BK-04 | LOW | Transitions non `motion-safe` dans plusieurs boutons | Accessibilité motion incomplète | XS | Harmoniser classes motion-safe |
| BK-05 | LOW | Type frontend `pro.city` attendu objet mais contrat public est string | Bugs d’affichage ville post-success | XS | Aligner type `ProData` avec contrat réel |

### TODO

- [ ] Détailler codes d’erreurs slots côté backend + mapping frontend (Effort S)
- [ ] Ajouter idempotence createBooking (Effort M)
- [ ] Poser `noindex` sur pages privées (`/book`, `/client/bookings`, etc.) (Effort XS)
- [ ] Corriger type `ProData.city` (Effort XS)
- [ ] Standardiser motion-safe transitions (Effort XS)

### Score detaille — /book/[proId]

| Aspect | Score /5 | Justification |
| ------ | -------- | ------------- |
| Frontend structure | 4.0 | Flux complet avec états explicites |
| UX & states | 4.3 | Beaucoup de cas couverts, success clair |
| Validation front | 4.0 | Date/slot/category contrôlés |
| Sécurité (funnel + données + anti-abus) | 4.0 | Guards solides, gaps idempotence |
| Backend protection | 4.5 | Contrôles transactionnels robustes |
| RBAC | 5.0 | `POST /bookings` CLIENT-only |
| Redirections (returnTo, guards) | 4.5 | middleware + `next` alignés |
| DB cohérence | 4.0 | bons index, unicité slot non DB |
| Performance | 3.6 | gros composant client |
| Mobile UX | 4.2 | Responsive et CTA clairs |
| Monitoring | 2.2 | pas de tracking funnel |
| SEO | 2.5 | noindex privé absent |

**Score global page : 4.0 / 5**

---

## /client/bookings (Suivi réservations client)

### Frontend

- **Fichier** : `apps/web/src/app/client/bookings/page.tsx` (529 lignes).
- **Composants associés** : `Header`, `BookingStatusBadge`, `ConfirmDialog`.
- **Composants legacy/dead code** : non observés.
- **CTA principaux** :
  - Annuler réservation confirmée.
  - Répondre modification de durée (accepter/refuser).
  - Pagination prev/next.
- **Champs + validation client-side** : pas de formulaire lourd ; actions mutation via boutons.
- **Etats geres** :

| Etat | Implementation | Verdict |
| --- | --- | --- |
| Hydration | `if (!mounted) return null` | Fonctionnel mais flash/blanc possible |
| Redirect auth/role | spinner + push route | OK |
| Loading data | spinner | OK |
| Error | banner + retry | OK |
| Empty | message par onglet | OK |
| Success | tabs + cartes + actions | OK |

- **Accessibilite** :
  - Tabs ARIA (`tablist/tab/tabpanel`) + clavier flèches/Home/End.
  - `aria-label` contextuels sur actions.
  - Emoji partiellement marqués `aria-hidden`.
  - **Gap** : transitions non `motion-safe` sur nombreux boutons.
- **Design tokens** : globalement conformes.
- **Animations** : spinners motion-safe, transitions partiellement non-safe.
- **Redirections & interruptions funnel** :
  - middleware protège SSR.
  - guard client redirige non-auth vers `/auth/login` sans `next`.
- **Sécurité côté client** : mutations via `patchJSON` (CSRF + cookies).
- **Mobile UX** :
  - Layout cartes responsive.
  - Tabs full-width pratique mobile.
- **SEO** : page privée sans noindex explicite.
- **Performance** : pagination côté API utilisée (`page/limit=20`).

### API / Backend

- **Endpoints** :
  - `GET /bookings?page&limit`
  - `PATCH /bookings/:id/cancel`
  - `PATCH /bookings/:id/respond`
- **Guards/Roles** :
  - `GET /bookings`: `JwtAuthGuard` (multi-rôle, filtrage service par rôle).
  - `cancel/respond`: `JwtAuthGuard` (ownership en service).
- **Validation** : Zod/ValidationPipe sur mutations.
- **Contrôles métier** : transitions strictes (WAITING_FOR_CLIENT, CONFIRMED, etc.).
- **Gap** : frontend history n’utilise pas `scope=history` pourtant supporté côté backend.

### DB

- **Modèles** : `Booking`, `BookingEvent`.
- **Cohérence** : statut riche, meta pagination.
- **Risque métier** : filtrage history local sur une page paginée peut masquer des bookings historiques existants.

### Performance & Core Web Vitals

- **FCP estimé** : moyen (page client + auth store init).
- **LCP estimé** : moyen.
- **CLS** : faible à moyen (retours conditionnels).
- **INP** : bon sur actions ponctuelles.
- **Pagination** : correcte mais UX historique incomplète sans scope dédié.

### Monitoring & Résilience

- Erreurs réseau visibles utilisateur + retry.
- Pas de métrique des actions critiques (cancel/refuse/accept).
- Pas de centralisation exception frontend.

### i18n / RTL readiness

- FR hardcodé.
- Dates formatées `fr-FR`.
- RTL non explicite.

### Problemes & recommandations

| # | Severite | Probleme | Impact metier | Effort (XS/S/M/L) | Action |
| --- | --- | --- | --- | --- | --- |
| CB-01 | HIGH | Onglet history filtré côté client sur dataset paginé | Historique incomplet, incompréhension client, charge support | S | Consommer `scope=history` + pagination dédiée |
| CB-02 | MEDIUM | Redirect non-auth sans `next` côté guard client | Rupture contexte en cas de navigation client-side | XS | Push `/auth/login?next=/client/bookings` |
| CB-03 | MEDIUM | `return null` avant mount | Flash blanc / perception lenteur | XS | Afficher skeleton minimal hydratation |
| CB-04 | LOW | Transitions non motion-safe | Accessibilité motion partielle | XS | Uniformiser classes |
| CB-05 | LOW | noindex explicite absent sur page privée | Indexation accidentelle potentielle | XS | Metadata robots noindex |

### TODO

- [ ] Passer l’historique en `scope=history` (Effort S)
- [ ] Ajouter `next` au redirect client non-auth (Effort XS)
- [ ] Remplacer `return null` par skeleton (Effort XS)
- [ ] Harmoniser `motion-safe` transitions (Effort XS)
- [ ] Ajouter noindex pages privées (Effort XS)

### Score detaille — /client/bookings

| Aspect | Score /5 | Justification |
| ------ | -------- | ------------- |
| Frontend structure | 4.0 | Contrat data/meta corrigé, structure claire |
| UX & states | 3.8 | Bon coverage, history imparfait |
| Validation front | 3.8 | Actions bien contraintes côté UI |
| Sécurité (funnel + données + anti-abus) | 4.2 | Ownership backend robuste |
| Backend protection | 4.2 | transitions strictes |
| RBAC | 4.0 | GET multi-rôle volontaire, côté page client filtré |
| Redirections (returnTo, guards) | 3.5 | middleware OK, guard client sans `next` |
| DB cohérence | 4.2 | statuts/index cohérents |
| Performance | 3.8 | pagination en place |
| Mobile UX | 4.0 | tabs/cartes adaptées |
| Monitoring | 2.3 | pas d’analytics actionnelle |
| SEO | 2.5 | noindex absent |

**Score global page : 3.8 / 5**

---

## /plans (Upsell / checkout initiation)

### Frontend

- **Fichier** :
  - `apps/web/src/app/plans/page.tsx` (415 lignes)
  - `apps/web/src/components/payment/PaymentButton.tsx` (349 lignes)
- **Composants associés** : `PaymentButton` modal instructions.
- **Composants legacy/dead code** : non observés.
- **CTA principaux** :
  - `Devenir Premium` / `Activer le Boost`.
  - Ouverture modal avec référence et contact.
- **Champs + validation client-side** :
  - Toggle premium mensuel/annuel (`aria-pressed`).
  - Boost exige `cityId + categoryId` avant submit.
  - Protection double-submit front : `isLoading + inFlightRef + cooldown 3s`.
- **Etats geres** :

| Etat | Implementation | Verdict |
| --- | --- | --- |
| Loading data (cities/categories) | spinner + texte | OK |
| Redirect non-auth/non-PRO | useEffect client | Partiel |
| Checkout loading | bouton disabled + spinner | OK |
| API error | toast + console.error | OK UX, log frontend à nettoyer |
| Success | modal d’instructions | OK |

- **Accessibilite** :
  - Toggles mensuel/annuel avec `aria-pressed`.
  - Modal `role=dialog`, `aria-modal`, focus trap, Escape, restore focus.
  - `aria-busy` sur bouton paiement.
- **Design tokens** : conformes.
- **Animations** : spinner motion-safe ; transitions parfois non motion-safe.
- **Redirections & interruptions funnel** :
  - middleware protège non-auth (`/auth/login?next=/plans`).
  - **Gap** : role check PRO uniquement côté client (`return null`), pas de blocage role server-side.
- **Sécurité côté client** : helper `postJSON` (CSRF + cookie).
- **Mobile UX** : layout responsive, actions full width.
- **SEO** : pas de metadata dédiée.
- **Performance** : composant riche client-side ; pas de lazy modal extraction.

### API / Backend

- **Endpoint** : `POST /payment/checkout`.
- **Guards/Roles** : `JwtAuthGuard + RolesGuard + KycApprovedGuard + @Roles('PRO')`.
- **Validation** : `InitiatePaymentDto` (`planType`, regex `cityId/categoryId` pour boost).
- **Contrôles métier** : exclusivité premium/boost, cooldown boost, prix server-side.
- **Anti-abus** :
  - Ownership JWT strict.
  - **Gap** : pas d’idempotence checkout backend (double requêtes rapprochées possibles si bypass front).
- **Paiement** : flow manuel admin confirm/reject, pas de webhook externe.

### DB

- **Modèles** : `PaymentOrder`, `ProSubscription`, `ProBoost`, `ProProfile`.
- **Contraintes** : `oid` unique ; index `(proUserId,status)`.
- **Gap** : pas de contrainte unique applicative/DB sur pending dupliqués à courte fenêtre.

### Performance & Core Web Vitals

- **FCP estimé** : moyen (page client lourde).
- **LCP estimé** : moyen (hero + cards dense).
- **INP** : bon sur submit unique, peut dégrader sur devices faibles.
- **Hydration** : élevée (beaucoup de UI interactive).

### Monitoring & Résilience

- Toasts utilisateurs présents.
- Logs frontend via `console.error` persistants.
- Pas de métriques checkout conversion/fail reasons.

### i18n / RTL readiness

- FR hardcodé.
- Devises en MAD hardcodées côté UI (cohérentes MVP local).
- RTL non explicite.

### Problemes & recommandations

| # | Severite | Probleme | Impact metier | Effort (XS/S/M/L) | Action |
| --- | --- | --- | --- | --- | --- |
| PL-01 | HIGH | Idempotence backend absente sur checkout | Risque multi `PaymentOrder` (support, confusion paiement) | M | Réutiliser pending récent ou clé idempotence |
| PL-02 | MEDIUM | Garde role PRO uniquement client-side sur `/plans` | Flash/accès transitoire pour rôle non PRO | S | Renforcer middleware role-aware ou guard serveur via page dédiée |
| PL-03 | MEDIUM | `console.error` en prod dans `PaymentButton` | Bruit logs client, debugging non structuré | XS | Remplacer par toast + monitoring central |
| PL-04 | MEDIUM | Section “Trust Center” mentionne `Stripe` alors que flow manuel | Incohérence de confiance paiement | XS | Aligner copy UI sur capacités réelles |
| PL-05 | LOW | Metadata SEO absente | Acquisition secondaire sous-optimisée | XS | Ajouter metadata page |

### TODO

- [ ] Ajouter idempotence backend checkout (Effort M)
- [ ] Renforcer contrôle role server-side sur `/plans` (Effort S)
- [ ] Retirer `console.error` brut de `PaymentButton` (Effort XS)
- [ ] Corriger copy “Stripe” dans Trust Center (Effort XS)
- [ ] Ajouter metadata `/plans` (Effort XS)

### Score detaille — /plans

| Aspect | Score /5 | Justification |
| ------ | -------- | ------------- |
| Frontend structure | 4.0 | UI claire, modal robuste |
| UX & states | 3.8 | Bons états, redirect role encore client-side |
| Validation front | 4.2 | boost requis + anti double-submit front |
| Sécurité (funnel + données + anti-abus) | 3.8 | KYC+roles+prix OK, idempotence backend absente |
| Backend protection | 4.2 | guards complets checkout |
| RBAC | 4.0 | backend strict, page role-check tardif |
| Redirections (returnTo, guards) | 4.0 | non-auth SSR OK |
| DB cohérence | 3.8 | modèle clean, pending duplicate possible |
| Performance | 3.5 | page client dense |
| Mobile UX | 4.0 | responsive cohérent |
| Monitoring | 2.2 | absence tracking checkout |
| SEO | 2.8 | metadata absente |

**Score global page : 3.7 / 5**

---

## /dashboard/subscription/success + /dashboard/subscription/cancel (post-paiement)

### Frontend

- **Fichier** :
  - `apps/web/src/app/dashboard/subscription/success/page.tsx` (438 lignes)
  - `apps/web/src/app/dashboard/subscription/cancel/page.tsx` (67 lignes)
  - **Variante legacy liée** : `apps/web/src/app/pro/subscription/page.tsx` (route résultat query-driven)
- **CTA principaux** :
  - success : dashboard / plans / retry.
  - cancel : retry plans / retour dashboard.
- **Champs + validation** :
  - success attend `oid` via query.
- **Etats geres** (`success` page) :

| Etat | Implementation | Verdict |
| --- | --- | --- |
| OID absent | erreur dédiée | OK |
| Loading vérification | spinner | OK |
| Erreur réseau | écran erreur + bouton retry | Retry non fonctionnel |
| PENDING/FAILED/PAID | écrans distincts | OK visuel |

- **Accessibilite** :
  - cartes statut avec `role="alert"`.
  - confetti désactivé si `prefers-reduced-motion`.
  - `motion-safe:animate-bounce` appliqué.
- **Design tokens** : conformes globalement.
- **Animations** : plusieurs transitions non motion-safe restantes.
- **Redirections funnel** :
  - Aucun chemin in-app observé depuis checkout modal vers ces pages.
  - Pages semblent accessibles surtout via URL manuelle/deep-link.
- **Sécurité côté client** :
  - success vérifie `/payment/status/:oid` avant affichage final.
  - **Gaps critiques** :
    - type attendu `PaymentStatusResponse` faux (`oid` attendu, backend renvoie `reference`).
    - refresh store `setUser(await getJSON<PublicUser>('/pro/me'))` alors que `/pro/me` renvoie `{ user, profile, ... }`.
    - `handleRetry` ne relance pas effectivement le `useEffect` (dépendance sur `oid` inchangée).
- **Mobile UX** : layouts full-screen responsives.
- **SEO** : pages utilitaires privées, pas de noindex explicite.
- **Performance** : page success très lourde pour une page d’état (438 lignes + confetti DOM).

### API / Backend

- **Endpoints** :
  - `GET /payment/status/:oid` (PRO only)
- **Guards/Roles** : `JwtAuthGuard + RolesGuard + @Roles('PRO')`.
- **Validation** : ownership check `order.proUserId === userId`.
- **Paiement** : source de vérité statut côté DB (`PENDING/PAID/FAILED`).
- **Gap produit** : pas de callback/webhook public relié au front ; flow reste manuel + admin.

### DB

- **Modèles** : `PaymentOrder`, `ProSubscription`, `ProBoost`, `ProProfile`.
- **Cohérence** : activation plan transactionnelle sur confirmation admin.
- **Gap** : pas d’idempotence/évènement client de retour payment standardisé.

### Performance & Core Web Vitals

- **FCP estimé** : moyen.
- **INP** : correct, logique mostly state-driven.
- **Long tasks** : création DOM confetti potentiellement coûteuse sur mobiles faibles.

### Monitoring & Résilience

- Logs `console.error` présents.
- Pas de circuit de retry robuste (retry local incomplet).
- Pas d’alerting échec vérification paiement côté frontend.

### i18n / RTL readiness

- FR hardcodé.
- Aucun mécanisme de locale dynamique.

### Problemes & recommandations

| # | Severite | Probleme | Impact metier | Effort (XS/S/M/L) | Action |
| --- | --- | --- | --- | --- | --- |
| SUB-01 | CRITIQUE | `setUser` avec payload `/pro/me` non compatible `PublicUser` | État auth potentiellement corrompu post-paiement, UX dashboard cassée | S | Mapper explicitement `/pro/me` -> `PublicUser` attendu |
| SUB-02 | HIGH | Retry success page ne relance pas la requête | Client bloqué sur écran erreur, abandon possible | XS | Déclencher refetch explicite (clé state dédiée) |
| SUB-03 | HIGH | Route legacy `/pro/subscription` forgeable via query params | Signal faux “paiement validé”, baisse de confiance | S | Supprimer ou sécuriser via API status |
| SUB-04 | MEDIUM | Pages success/cancel non reliées explicitement au flux checkout actuel | Funnel paiement fragmenté | M | Définir redirection produit unique avec `oid` |
| SUB-05 | LOW | noindex explicite absent | indexation accidentelle potentielle | XS | Ajouter metadata robots noindex |

### TODO

- [ ] Corriger mapping auth store dans success page (Effort S)
- [ ] Corriger bouton retry pour refetch réel (Effort XS)
- [ ] Décommissionner/sécuriser `/pro/subscription` (Effort S)
- [ ] Relier checkout modal à un flux de statut unique (Effort M)
- [ ] Ajouter noindex pages subscription utilitaires (Effort XS)

### Score detaille — /dashboard/subscription/success + /dashboard/subscription/cancel

| Aspect | Score /5 | Justification |
| ------ | -------- | ------------- |
| Frontend structure | 2.8 | État géré, mais complexité et incohérences |
| UX & states | 3.0 | Bons états visuels, retry cassé |
| Validation front | 2.5 | Contrat type paiement incorrect |
| Sécurité (funnel + données + anti-abus) | 2.8 | Vérification status présente, variante legacy forgeable |
| Backend protection | 4.0 | endpoint status bien gardé |
| RBAC | 4.0 | PRO-only côté API |
| Redirections (returnTo, guards) | 2.5 | Flux non raccordé checkout -> status |
| DB cohérence | 4.0 | statut paiement robuste |
| Performance | 3.0 | page success lourde/confetti |
| Mobile UX | 3.8 | responsive correct |
| Monitoring | 2.0 | pas de stratégie recovery/alerting |
| SEO | 2.5 | noindex absent |

**Score global page : 3.0 / 5**

---

## /help (support pendant funnel)

### Frontend

- **Fichier** : `apps/web/src/app/help/page.tsx` (202 lignes, RSC).
- **Composants associés** : FAQ `<details>`, JSON-LD FAQPage.
- **CTA principaux** :
  - mailto support.
  - mini-nav vers `/pros`, `/blog`, `/legal/cgu`, `/legal/privacy`.
- **Champs + validation** : aucun formulaire.
- **Etats geres** :

| Etat | Implementation | Verdict |
| --- | --- | --- |
| Render initial | RSC statique | OK |
| FAQ interaction | `<details>/<summary>` natif | OK |
| Error runtime | non applicable (pas de fetch) | OK |
- **Accessibilite** :
  - structure heading correcte (`h1`, `h2`).
  - `<details>/<summary>` clavier natif.
  - liens focusables.
- **Design tokens** : conformes.
- **Animations** : aucune animation lourde.
- **Redirections funnel** : pas de redirection.
- **Sécurité côté client** : liens internes + mailto.
- **Mobile UX** : responsive simple.
- **SEO** : metadata riche présente (`openGraph`, `twitter`, `canonical`) + `FAQPage` JSON-LD.
- **Performance** : RSC pur, faible JS client.

### API / Backend

- Aucune API requise pour la page.

### DB

- N/A.

### Performance & Core Web Vitals

- **FCP/LCP estimés** : excellents (statique RSC).
- **TTI** : excellent (pas d’hydratation significative).

### Monitoring & Résilience

- Pas de logique runtime ; résilience intrinsèque élevée.
- Pas de tracking “contact support click”.

### i18n / RTL readiness

- FR hardcodé.
- Structure facilement localisable, mais sans système i18n.

### Problemes & recommandations

| # | Severite | Probleme | Impact metier | Effort (XS/S/M/L) | Action |
| --- | --- | --- | --- | --- | --- |
| HP-01 | LOW | Pas d’event tracking sur clic support/mailto | Pas de visibilité sur points de friction funnel | S | Ajouter analytics click support |
| HP-02 | LOW | `twitter.card='summary'` sans image dédiée | Partage social moins attractif | XS | Ajouter image OG/Twitter si asset disponible |

### TODO

- [ ] Instrumenter clic support (Effort S)
- [ ] Ajouter image OG/Twitter si disponible (Effort XS)

### Score detaille — /help

| Aspect | Score /5 | Justification |
| ------ | -------- | ------------- |
| Frontend structure | 4.8 | RSC simple et propre |
| UX & states | 4.8 | FAQ utile, contact clair |
| Validation front | 5.0 | N/A formulaire |
| Sécurité (funnel + données + anti-abus) | 5.0 | Surface d’attaque minimale |
| Backend protection | 5.0 | N/A |
| RBAC | 5.0 | Public attendu |
| Redirections (returnTo, guards) | 5.0 | N/A |
| DB cohérence | 5.0 | N/A |
| Performance | 5.0 | RSC statique |
| Mobile UX | 4.8 | Très bon responsive |
| Monitoring | 2.5 | Pas de tracking usage |
| SEO | 4.8 | Metadata + FAQ JSON-LD |

**Score global page : 4.8 / 5**

---

## /legal/* (cgu, mentions, privacy)

### Frontend

- **Fichier** :
  - `apps/web/src/app/legal/cgu/page.tsx` (170 lignes)
  - `apps/web/src/app/legal/mentions/page.tsx` (290 lignes)
  - `apps/web/src/app/legal/privacy/page.tsx` (398 lignes)
- **CTA principaux** : liens de navigation légale/support.
- **Champs + validation** : N/A.
- **Etats geres** :

| Etat | Implementation | Verdict |
| --- | --- | --- |
| Render initial | RSC statique | OK |
| Navigation interne | liens légaux/support | OK |
| Error runtime | non applicable (pas de fetch) | OK |
- **Accessibilite** : structure textuelle correcte, liens focusables.
- **Design tokens** : globalement tokenisés.
- **Animations** : faibles, principalement transitions liens.
- **Redirections** : aucune.
- **Sécurité côté client** : contenu statique.
- **Mobile UX** : lisible, sections longues.
- **SEO** : metadata OG/twitter/canonical présentes.
- **Observations de contenu** :
  - `/legal/mentions` contient encore des placeholders `[À compléter ...]`.
  - `/legal/cgu` contient encore `[À compléter : Ville]`.

### API / Backend

- N/A (contenu statique).

### DB

- N/A.

### Performance & Core Web Vitals

- **FCP/LCP estimés** : bons (RSC statique).
- **TTI** : excellent.

### Monitoring & Résilience

- Aucun point runtime spécifique.

### i18n / RTL readiness

- FR uniquement.
- Longs textes sans version alternative langue.

### Problemes & recommandations

| # | Severite | Probleme | Impact metier | Effort (XS/S/M/L) | Action |
| --- | --- | --- | --- | --- | --- |
| LG-01 | MEDIUM | Mentions légales incomplètes (placeholders) | Baisse de confiance pré-paiement + risque conformité | S | Finaliser mentions avec données juridiques réelles |
| LG-02 | MEDIUM | CGU: juridiction ville non finalisée | Fragilité contractuelle en cas litige | XS | Compléter la clause manquante |
| LG-03 | LOW | Pas de version multilingue | Friction pour utilisateurs non francophones | M | Préparer versions AR/EN |

### TODO

- [ ] Finaliser contenus placeholders `/legal/mentions` (Effort S)
- [ ] Compléter clause juridiction `/legal/cgu` (Effort XS)
- [ ] Planifier déclinaison multilingue légale (Effort M)

### Score detaille — /legal/*

| Aspect | Score /5 | Justification |
| ------ | -------- | ------------- |
| Frontend structure | 4.0 | pages statiques claires |
| UX & states | 3.5 | longform lisible |
| Validation front | 5.0 | N/A |
| Sécurité (funnel + données + anti-abus) | 5.0 | statique |
| Backend protection | 5.0 | N/A |
| RBAC | 5.0 | public |
| Redirections (returnTo, guards) | 5.0 | N/A |
| DB cohérence | 5.0 | N/A |
| Performance | 5.0 | RSC statique |
| Mobile UX | 4.2 | bonne lisibilité mobile |
| Monitoring | 2.0 | pas de suivi lecture/scroll |
| SEO | 4.2 | metadata présentes, contenu inachevé |

**Score global page : 4.0 / 5**

---

## Pages connexes impact funnel

## /auth/login (interruption funnel + return)

### Frontend

- **Fichier** : `apps/web/src/app/auth/login/page.tsx` (319 lignes).
- **Composants associés** : formulaire inline (ancienne version `components/auth/LoginForm.tsx` supprimée).
- **CTA principaux** : login submit, forgot password, register.
- **Validation client-side** : vérifie champs non vides avant submit.
- **Etats geres** :

| Etat | Implementation | Verdict |
| --- | --- | --- |
| Loading | bouton disabled + spinner | OK |
| Error | bloc `role=alert` focusable | OK |
| Success | redirect role/next | OK |

- **Accessibilite** :
  - `id="login-global-error"` aligné avec `aria-describedby`.
  - toggle mot de passe avec `aria-label` dynamique.
- **Design tokens** : conformes.
- **Animations** : majoritairement `motion-safe`.
- **Redirections funnel** :
  - lit `next` et fallback `returnTo` ; valide chemin relatif (`/` et non `//`).
- **Sécurité côté client** : `postJSON` (CSRF + cookie), anti open-redirect côté front.
- **Mobile UX** : formulaire responsive ; `type="text"` pour login (pas d’`inputMode` ciblé).
- **SEO** : pas de `noindex` explicite page auth.
- **Performance** : page client complète (illustration+form), acceptable.

### API / Backend

- **Endpoint** : `POST /auth/login`.
- **Guards** : public.
- **Rate limit** : `@Throttle(5/min)`.
- **Validation** : DTO + whitelist/forbidNonWhitelisted.
- **Sécurité** : bcrypt compare + lockout (`FailedLoginService`) + cookies httpOnly.

### DB

- **Modèles** : `User`, `RefreshToken`.
- **Cohérence** : refresh token hashé en DB.

### Performance & Core Web Vitals

- **FCP estimé** : moyen-bon.
- **TTI** : moyen (page full client).
- **Hydration** : nécessaire pour form + redirect.

### Monitoring & Résilience

- Logs backend auth présents.
- Pas de métrique front sur abandon login / retry count.

### i18n / RTL readiness

- FR hardcodé.
- Formats login email/tel combinés.

### Problemes & recommandations

| # | Severite | Probleme | Impact metier | Effort (XS/S/M/L) | Action |
| --- | --- | --- | --- | --- | --- |
| LGN-01 | MEDIUM | Pas de noindex explicite auth page | Indexation potentielle page utilitaire | XS | Ajouter metadata robots noindex |
| LGN-02 | LOW | `inputMode` non optimisé pour téléphone/email | Saisie mobile moins fluide | XS | Ajuster inputMode selon format détecté ou split champ |

### TODO

- [ ] Ajouter noindex sur `/auth/login` (Effort XS)
- [ ] Optimiser clavier mobile (`inputMode`) (Effort XS)

### Score detaille — /auth/login

| Aspect | Score /5 | Justification |
| ------ | -------- | ------------- |
| Frontend structure | 4.3 | structure claire, accessibilité correcte |
| UX & states | 4.2 | erreurs/loading bien gérés |
| Validation front | 3.8 | validation minimaliste mais suffisante |
| Sécurité (funnel + données + anti-abus) | 4.5 | open-redirect protégé, CSRF/cookies ok |
| Backend protection | 4.8 | throttle + lockout + DTO |
| RBAC | 5.0 | endpoint public attendu |
| Redirections (returnTo, guards) | 4.8 | `next` + fallback `returnTo` |
| DB cohérence | 4.8 | refresh tokens hashés |
| Performance | 3.8 | page client riche |
| Mobile UX | 3.8 | améliorable sur clavier |
| Monitoring | 2.5 | pas d’analytics d’abandon |
| SEO | 2.5 | noindex absent |

**Score global page : 4.1 / 5**

---

## /profile (pré-requis booking: ville/adresse)

### Frontend

- **Fichier** : `apps/web/src/app/profile/page.tsx` (513 lignes).
- **Composants associés** : `Header`, formulaire profil client.
- **CTA principaux** :
  - Sauvegarder profil.
  - Lien `Mes réservations`.
  - Retry chargement villes.
- **Champs + validation client-side** :
  - firstName, lastName, cityId, addressLine, avatarUrl.
  - validation simple avatar URL (`http(s)://`).
- **Etats geres** :

| Etat | Implementation | Verdict |
| --- | --- | --- |
| Hydration | `return null` avant mount | Blanc transitoire |
| Redirect non-auth/PRO | spinner + redirect | OK |
| Loading cities | disabled select | OK |
| Error cities | banner visible + retry | OK |
| Save success | message `role=status` | OK |

- **Accessibilite** : labels présents, message succès annoncé (`aria-live`).
- **Design tokens** : conformes.
- **Animations** : spinner motion-safe ; plusieurs transitions non motion-safe.
- **Redirections funnel** :
  - non-auth redirigé `/auth/login` (sans `next`).
  - PRO redirigé `/dashboard/profile`.
- **Sécurité côté client** : `patchJSON('/users/me')` avec CSRF.
- **Mobile UX** : formulaire responsive.
- **SEO** : page privée sans noindex explicite.
- **Performance** : page client longue ; fetch bookings count additionnel.

### API / Backend

- **Endpoint** : `PATCH /users/me`.
- **Guards/Roles** : `JwtAuthGuard + RolesGuard + @Roles('CLIENT')`.
- **Validation** : `UpdateProfileDto` dans `users.service.ts` avec regex `cityId` (publicId/cuid) + whitelist.
- **Cohérence** : réponse mappe `id` vers `publicId` (plus de fuite CUID interne).
- **Gap connexe** : frontend appelle `GET /bookings?status=COMPLETED&limit=1`, mais backend ignore `status` query sur cette route.

### DB

- **Modèles** : `User`, `City`.
- **Cohérence ID** : mapping publicId OK dans réponse update.

### Performance & Core Web Vitals

- **FCP estimé** : moyen.
- **INP** : bon sur interactions formulaire.
- **Hydration** : élevée (page full client).

### Monitoring & Résilience

- Erreur save via toast, erreurs villes visibles.
- Pas de logging structuré côté frontend des échecs critiques profil.

### i18n / RTL readiness

- FR hardcodé.
- Format adresse libre non localisé.

### Problemes & recommandations

| # | Severite | Probleme | Impact metier | Effort (XS/S/M/L) | Action |
| --- | --- | --- | --- | --- | --- |
| PF-01 | MEDIUM | Redirect non-auth sans `next` | Perte contexte en navigation client-side | XS | Ajouter `next=/profile` |
| PF-02 | MEDIUM | Statistique “missions terminées” basée sur `GET /bookings?status=...` non supporté | KPI profil potentiellement faux | S | Utiliser endpoint dédié stats client ou `scope` backend adapté |
| PF-03 | LOW | `return null` avant mount | Flash blanc | XS | Skeleton minimal |
| PF-04 | LOW | noindex absent | indexation page privée possible | XS | metadata robots noindex |

### TODO

- [ ] Ajouter redirect login avec `next` (Effort XS)
- [ ] Corriger source du KPI missions terminées (Effort S)
- [ ] Remplacer `return null` par skeleton (Effort XS)
- [ ] Ajouter noindex `/profile` (Effort XS)

### Score detaille — /profile

| Aspect | Score /5 | Justification |
| ------ | -------- | ------------- |
| Frontend structure | 3.8 | complet mais volumineux |
| UX & states | 3.8 | bons feedbacks + retry villes |
| Validation front | 3.8 | validation avatar simple, reste basique |
| Sécurité (funnel + données + anti-abus) | 4.0 | PATCH sécurisé, role client |
| Backend protection | 4.5 | DTO + role guard + publicId mapping |
| RBAC | 5.0 | CLIENT-only route |
| Redirections (returnTo, guards) | 3.5 | redirect sans `next` |
| DB cohérence | 4.5 | plus de fuite ID interne |
| Performance | 3.5 | page client dense |
| Mobile UX | 4.0 | formulaire utilisable |
| Monitoring | 2.3 | peu d’instrumentation |
| SEO | 2.5 | noindex absent |

**Score global page : 3.9 / 5**

---

## /dashboard/bookings (côté PRO, impact direct sur statut client)

### Frontend

- **Fichier** : `apps/web/src/app/dashboard/bookings/page.tsx` (793 lignes).
- **Composants associés** : `DashboardLayout`, `BookingStatusBadge`, `ConfirmDialog`, `CustomDialog`.
- **CTA principaux** : accepter/refuser, modifier durée, compléter, annuler.
- **Champs + validation client-side** :
  - duration modal (1..8), cancel reason pour annulation pro.
- **Etats geres** :

| Etat | Implementation | Verdict |
| --- | --- | --- |
| Loading list | spinner + skeleton textuel | OK |
| Error list | banner + retry | OK |
| Empty tab | message par onglet | OK |
| Action pending | bouton disabled par booking | OK |
| Pagination | prev/next + meta | OK |
- **Accessibilite** :
  - tabs ARIA + clavier.
  - dialogs avec focus trap basique et Escape.
  - plusieurs transitions non motion-safe.
- **Design tokens** : globalement conformes.
- **Redirections funnel** : non-auth push `/auth/login` sans `next`.
- **Mobile UX** : page dense ; action buttons nombreux.
- **SEO** : page privée, noindex non explicite.
- **Performance** : composant très large client-side.

### API / Backend

- **Endpoints** :
  - `GET /bookings?page&limit`
  - `PATCH /bookings/:id/status|duration|complete|cancel`
- **Guards** :
  - status/duration/complete: `JwtAuthGuard + KycApprovedGuard`.
  - cancel/respond: `JwtAuthGuard` (KYC check partiellement service-level pour branch PRO).
- **Contrôles métier** : winner-takes-all et overlap auto-cancel sur confirmations.

### DB

- **Modèles** : `Booking`, `BookingEvent`.
- **Statuts** : riches, cohérents avec actions PRO.

### Performance & Core Web Vitals

- **INP estimé** : sensible en mobile (beaucoup d’interactions/modals).
- **Long tasks** : probable sur devices faibles vu taille composant.

### Monitoring & Résilience

- Erreurs fetch visibles; toasts actions.
- Pas de tracing pro-action -> impact client.

### i18n / RTL readiness

- FR hardcodé.
- Dates/horaires en locale FR.

### Problemes & recommandations

| # | Severite | Probleme | Impact metier | Effort (XS/S/M/L) | Action |
| --- | --- | --- | --- | --- | --- |
| DBP-01 | MEDIUM | Redirect non-auth sans `next` | Retour workflow plus difficile | XS | Ajouter `next=/dashboard/bookings` |
| DBP-02 | MEDIUM | Cancel route non protégée par Kyc guard au niveau controller | Cohérence sécurité moins claire (dépend service) | S | Harmoniser garde `KycApprovedGuard` ou stratégie explicite |
| DBP-03 | LOW | transitions non motion-safe | Accessibilité partielle | XS | Harmoniser motion-safe |
| DBP-04 | LOW | noindex absent | indexation potentielle page privée | XS | Ajouter metadata robots noindex |

### TODO

- [ ] Ajouter `next` sur redirect login côté page pro bookings (Effort XS)
- [ ] Harmoniser politique KYC guard sur cancel (Effort S)
- [ ] Motion-safe transitions restantes (Effort XS)
- [ ] noindex page privée dashboard bookings (Effort XS)

### Score detaille — /dashboard/bookings

| Aspect | Score /5 | Justification |
| ------ | -------- | ------------- |
| Frontend structure | 3.6 | fonctionnel mais très dense |
| UX & states | 3.8 | états riches |
| Validation front | 3.8 | contrôles modals corrects |
| Sécurité (funnel + données + anti-abus) | 4.2 | ownership/service checks robustes |
| Backend protection | 4.2 | gardes solides hors cancel harmonisation |
| RBAC | 4.2 | pro workflows cohérents |
| Redirections (returnTo, guards) | 3.4 | `next` absent sur redirect client-side |
| DB cohérence | 4.3 | transitions bien cadrées |
| Performance | 3.2 | composant lourd |
| Mobile UX | 3.5 | dense mais utilisable |
| Monitoring | 2.3 | pas de tracing conversion/status |
| SEO | 2.5 | noindex absent |

**Score global page : 3.6 / 5**

---

# 2) Synthese E2E Funnel (conversion map)

## Carte du funnel (AS-IS)

1. **Homepage `/`**
   - L’utilisateur choisit ville/catégorie dans Hero.
   - Peut aussi entrer via catégories ou pros sélectionnés.
2. **Listing `/pros`**
   - Filtres (ville/catégorie/premium/note) + pagination.
   - Click card vers fiche pro.
3. **Fiche `/pro/[publicId]`**
   - CTA réserver conditionnel selon auth/role.
   - Non-auth -> login avec `next` (CTA principal).
   - Favori (client) disponible mais actuellement fragile (mismatch IDs).
4. **Booking `/book/[proId]`**
   - Middleware protège route, login gate avec `next`.
   - Choix date/slot, création booking.
   - Succès avec CTA WhatsApp + lien mes réservations.
5. **Suivi `/client/bookings`**
   - Tabs par statut, annulation/réponse modification.
   - Historique actuellement filtré localement sur page paginée.
6. **Monétisation `/plans` (PRO)**
   - Checkout manuel + modal instructions.
   - Pages `subscription/success/cancel` existent, mais chaînage produit incomplet.

### Points de drop-off potentiels observés

- Toggle favoris silencieux en échec (`/pro/[publicId]`) : action perçue “cassée”.
- Erreur booking générique `SLOT_TAKEN` : utilisateur ne comprend pas la cause réelle.
- Historique client partiel sur `/client/bookings` : confusion “réservation disparue”.
- `/plans` rôle non PRO géré tardivement côté client (écran vide transitoire).
- Flux de succès paiement non branché de façon unifiée depuis checkout modal.

---

# 3) Synthese RBAC & redirections (Funnel)

### Regles de redirection observees vs attendues

| # | Scenario | Attendu | Frontend | Backend | Match ? |
| --- | --- | --- | --- | --- | --- |
| 1 | Non-auth ouvre `/book/pro_xxx?categoryId=...` | Redirect login + retour même URL | middleware `?next=...` + fallback client identique | `POST /bookings` protégé JWT+ROLE CLIENT | OUI |
| 2 | Non-auth clique “Réserver” depuis `/pro/[publicId]` | Login + retour fiche pro | `ProBookingCTA` utilise `?next=/pro/{id}` | N/A | OUI |
| 3 | Non-auth clique “favori” depuis fiche pro | Login + retour fiche pro | `router.push('/auth/login')` sans `next` | favorites protégés côté API | NON |
| 4 | Non-auth ouvre `/client/bookings` | Redirect login + retour | middleware `?next=/client/bookings`; guard client push simple | `GET /bookings` requiert JWT | PARTIEL |
| 5 | CLIENT ouvre `/dashboard` | Refus/redirect | garde frontend (pages dashboard/layout) | routes dashboard/pro gardées PRO | PARTIEL |
| 6 | PRO ouvre `/client/bookings` | Refus page client | guard page -> `/dashboard` | `GET /bookings` autorise PRO (normal) | OUI (comportement voulu) |
| 7 | Non-auth ouvre `/plans` | Login + retour `/plans` | middleware `?next=/plans` | `POST /payment/checkout` protégé PRO+KYC | OUI |
| 8 | CLIENT auth ouvre `/plans` | Refus | redirect client-side vers `/` (null transitoire) | API checkout interdit côté rôle | PARTIEL |
| 9 | Auth ouvre `/auth/login` | Redirect `/` | middleware auth pages -> `/` | N/A | OUI |
| 10 | Retour login avec `next` invalide (`//evil`) | Bloquer open redirect | check `startsWith('/') && !startsWith('//')` | N/A | OUI |
| 11 | Accès `/dashboard/subscription/success?oid=...` par CLIENT | UX claire “non autorisé” | page appelle API et tombe en erreur générique | `/payment/status/:oid` PRO-only | PARTIEL |
| 12 | Accès `/pro/subscription?status=success` | Doit vérifier status serveur | page lit query brute | backend non appelé | NON |

### Matrice RBAC backend complete (Funnel scope)

| Route | Methode | Guards | Roles | KYC | Premium |
| --- | --- | --- | --- | --- | --- |
| `/public/cities` | GET | Aucun | Public | Non | Non |
| `/public/categories` | GET | Aucun | Public | Non | Non |
| `/public/pros` | GET | Aucun | Public | Non | Non |
| `/public/pros/v2` | GET | Aucun | Public | Non | Non |
| `/public/pros/:id` | GET | `OptionalJwtGuard` | Public/Auth optionnel | Non | Non |
| `/public/slots` | GET | Aucun | Public | Non | Non |
| `/favorites` | GET | `JwtAuthGuard + RolesGuard` | CLIENT | Non | Non |
| `/favorites/:proId` | POST | `JwtAuthGuard + RolesGuard` | CLIENT | Non | Non |
| `/favorites/:proId` | DELETE | `JwtAuthGuard + RolesGuard` | CLIENT | Non | Non |
| `/bookings` | POST | `JwtAuthGuard + RolesGuard` | CLIENT | Non | Non |
| `/bookings` | GET | `JwtAuthGuard` | CLIENT/PRO | Non | Non |
| `/bookings/:id/status` | PATCH | `JwtAuthGuard + KycApprovedGuard` | Service-level PRO | Oui (PRO) | Non |
| `/bookings/:id/duration` | PATCH | `JwtAuthGuard + KycApprovedGuard` | Service-level PRO | Oui (PRO) | Non |
| `/bookings/:id/respond` | PATCH | `JwtAuthGuard` | Service-level CLIENT | Non | Non |
| `/bookings/:id/complete` | PATCH | `JwtAuthGuard + KycApprovedGuard` | Service-level PRO | Oui (PRO) | Non |
| `/bookings/:id/cancel` | PATCH | `JwtAuthGuard` | CLIENT/PRO (service-level) | Service-level PRO | Non |
| `/payment/checkout` | POST | `JwtAuthGuard + RolesGuard + KycApprovedGuard` | PRO | Oui | Non |
| `/payment/status/:oid` | GET | `JwtAuthGuard + RolesGuard` | PRO | Non | Non |
| `/payment/admin/confirm/:oid` | POST | `JwtAuthGuard + RolesGuard` | ADMIN | Non | Non |
| `/payment/admin/reject/:oid` | POST | `JwtAuthGuard + RolesGuard` | ADMIN | Non | Non |
| `/dashboard/stats` | GET | `JwtAuthGuard + RolesGuard` | PRO | Non | Oui (service-level) |
| `/pro/me` | GET | `JwtAuthGuard + RolesGuard` | PRO | Non | Non |
| `/pro/profile` | PATCH | `JwtAuthGuard + RolesGuard` | PRO | Service-level (fields restreints) | Non |
| `/users/me` | PATCH | `JwtAuthGuard + RolesGuard` | CLIENT | Non | Non |
| `/auth/login` | POST | Public + Throttle | Tous | Non | Non |
| `/auth/me` | GET | `JwtAuthGuard` | Auth | Non | Non |

### Gaps identifies

| # | Gap | Severite | Impact metier | Effort | Action |
| --- | --- | --- | --- | --- | --- |
| G-01 | Favorites API attend ID interne, funnel envoie publicId | CRITIQUE | Fonction “favori” cassée, baisse rétention | S | Uniformiser contrat ID (`publicId` partout) |
| G-02 | `/pro/subscription` non vérifié serveur | HIGH | Faux positifs paiement, confiance affectée | S | Supprimer/forcer vérification API status |
| G-03 | `/client/bookings` history sans `scope=history` | HIGH | Données incomplètes perçues | S | Consommer endpoint history dédié |
| G-04 | Success payment store refresh typé faux | CRITIQUE | État auth incohérent, dashboard erratique | S | Mapper réponse `/pro/me` avant `setUser` |
| G-05 | Paiement sans idempotence backend | HIGH | Multiples ordres pendings, support accru | M | Ajouter fenêtre idempotence |
| G-06 | Pages privées sans noindex explicite | MEDIUM | Indexation utilitaire non désirée | XS | Metadata robots noindex |
| G-07 | Metadata SEO manquante `/pros` et `/pro/[publicId]` | MEDIUM | Acquisition organique sous-optimale | S/M | Ajouter metadata dynamiques |

---

# 4) Contrat technique Booking & Paiement (actualise)

### Booking

- **Création booking (`POST /bookings`)** :
  - Inputs : `proId`, `categoryId`, `date`, `time`.
  - Validation : Zod + guards (`CLIENT` only).
  - Résolution IDs publics vers IDs internes via `CatalogResolverService`.
  - Contrôles métier en transaction : city/address client, pro KYC, city match, service actif, disponibilité horaire, futur, collision `CONFIRMED`, création `BookingEvent`.
- **Statuts & transitions** :
  - `PENDING -> CONFIRMED/DECLINED` (PRO)
  - `PENDING -> WAITING_FOR_CLIENT` (modif durée)
  - `WAITING_FOR_CLIENT -> CONFIRMED/DECLINED` (CLIENT)
  - `CONFIRMED -> COMPLETED` (PRO)
  - `CONFIRMED -> CANCELLED_*` (CLIENT/PRO selon règles)
  - auto-cancel overlaps `CANCELLED_AUTO_OVERLAP` lors de confirmations concurrentes.
- **Annulation** :
  - CLIENT : `CANCELLED_BY_CLIENT` ou `CANCELLED_BY_CLIENT_LATE` selon seuil 24h.
  - PRO : reason obligatoire, `CANCELLED_BY_PRO`, KYC check service-level.
- **Expiration automatique** :
  - cron horaire `BookingExpirationService` passe `PENDING/WAITING_FOR_CLIENT` expirés en `EXPIRED` + `BookingEvent`.
- **Notifications** :
  - EventEmitter + listener.
  - Emails/sms/push partiellement simulés (adresses `example.com` placeholders).
- **Idempotence/double submit** :
  - frontend limite le double-click sur certains flows.
  - backend booking create n’expose pas de clé idempotence dédiée.

### Paiement / Subscription

- **Checkout** (`POST /payment/checkout`) :
  - PRO + KYC obligatoire.
  - Prix server-side constants (`350/3000/200 MAD`).
  - création `PaymentOrder` `PENDING` avec `oid` unique.
- **Confirmation** :
  - Flow manuel admin (`/payment/admin/confirm/:oid`), pas de webhook PSP externe.
  - activation plan transactionnelle (`ProSubscription`/`ProBoost` + flags `ProProfile`).
- **Protection replay/spoofing** :
  - ownership check sur `GET /payment/status/:oid`.
  - pas de signature webhook (pas de webhook).
- **Mapping subscription -> premium gate** :
  - dashboard stats vérifie `isPremium` server-side (`PREMIUM_REQUIRED`).
- **Récupération état post-paiement** :
  - page success tente vérification status mais implementation front incohérente (types/retry/store).
- **Erreurs paiement UX** :
  - modal checkout clair ; pages status inégales et non totalement raccordées.

### Sécurité

- CSRF : header `X-CSRF-PROTECTION: 1` sur endpoints privés via `api.ts`.
- Ownership : checks service-level sur bookings/payment status.
- IDOR : usage mixte publicId/internal ; principal gap observé sur favorites.
- Logs : logs backend standards, logs sécurité auth/refresh replay présents.

---

# 5) Securite supplementaire

- **Tests existants liés funnel** :
  - `apps/api/src/booking/booking.service.spec.ts` (création, transitions, cancel, durée, conflit).
  - `apps/api/src/booking/booking-expiration.service.spec.ts` (cron expiration).
  - `apps/api/src/pagination-e2e.spec.ts` (`/public/pros/v2` + `/bookings` pagination).
  - `apps/api/src/rbac-e2e.spec.ts` (RBAC/KYC sur routes clés).
  - `apps/api/src/payment/payment.service.spec.ts` (couverture minimale activation premium).

- **Ce qui manque** :
  - E2E frontend funnel complet (`/` -> `/pros` -> `/pro` -> `/book` -> `/client/bookings`).
  - Tests E2E `next`/return path pour actions secondaires (ex: favoris).
  - Tests API favoris avec `publicId` vs `internal id` (cas régression critique actuel).
  - Tests idempotence checkout/booking create.
  - Tests UI/contract sur `/dashboard/subscription/success` (shape `/pro/me`, retry).

- **Observabilité funnel** :
  - Pas d’analytics conversion events (search apply, card click, booking submit, payment intent).
  - Pas d’alerting dédié sur anomalies booking/paiement côté front.
  - Logs backend présents mais non corrélés à un pipeline observabilité unifié.

- **Scénarios non couverts** :
  - abandon step-by-step booking.
  - erreurs réseau intermittentes sur success payment.
  - incohérences status affiché vs DB en client bookings history.

---

# 6) Score global Phase 2 (actualise)

| Page | Score |
| --- | --- |
| `/` | 4.3 / 5 |
| `/pros` | 4.0 / 5 |
| `/pro/[publicId]` | 3.6 / 5 |
| `/book/[proId]` | 4.0 / 5 |
| `/client/bookings` | 3.8 / 5 |
| `/plans` | 3.7 / 5 |
| `/dashboard/subscription/success + cancel` | 3.0 / 5 |
| `/help` | 4.8 / 5 |
| `/legal/*` | 4.0 / 5 |
| `/auth/login` (connexe) | 4.1 / 5 |
| `/profile` (connexe) | 3.9 / 5 |
| `/dashboard/bookings` (connexe) | 3.6 / 5 |

### **Score moyen Phase 2 : 3.9 / 5**

- **Axes d’amélioration prioritaires (top 5)** :
  1. Corriger le contrat Favoris (`publicId`/`id`) + feedback erreur UI.
  2. Stabiliser complètement le post-paiement (`/dashboard/subscription/success`) : type API, retry, sync auth.
  3. Basculer `/client/bookings` history sur `scope=history`.
  4. Ajouter idempotence backend checkout/booking (fenêtre courte).
  5. Compléter SEO funnel (`/pros`, `/pro/[publicId]`, sitemap routes dynamiques).

- **Quick wins** :
  - `motion-safe` sur skeletons/transitions critiques.
  - `next` sur redirects manquants (favoris, pages connexes).
  - noindex explicite pages privées.
  - cleanup route legacy `/pro/subscription`.

- **Chantiers structurants** :
  - idempotence multi-flux booking/paiement.
  - instrumentation conversion/monitoring.
  - rationalisation du flux de paiement manuel vers une seule route statut fiable.

---

# 7) Annexe — Fichiers audites Phase 2

**Frontend**
- `apps/web/src/app/page.tsx`
- `apps/web/src/components/home/HomeClient.tsx`
- `apps/web/src/components/home/Hero.tsx`
- `apps/web/src/components/home/HeroSkeleton.tsx`
- `apps/web/src/components/home/Categories.tsx`
- `apps/web/src/components/home/FeaturedPros.tsx`
- `apps/web/src/app/pros/page.tsx`
- `apps/web/src/app/pros/loading.tsx`
- `apps/web/src/components/pros/ProsClientPage.tsx`
- `apps/web/src/components/ProCard.tsx`
- `apps/web/src/app/pro/[publicId]/page.tsx`
- `apps/web/src/app/pro/[publicId]/loading.tsx`
- `apps/web/src/app/pro/[publicId]/ProDetailClient.tsx`
- `apps/web/src/components/ProBookingCTA.tsx`
- `apps/web/src/app/book/[proId]/page.tsx`
- `apps/web/src/app/client/bookings/page.tsx`
- `apps/web/src/app/plans/page.tsx`
- `apps/web/src/components/payment/PaymentButton.tsx`
- `apps/web/src/app/dashboard/subscription/success/page.tsx`
- `apps/web/src/app/dashboard/subscription/cancel/page.tsx`
- `apps/web/src/app/pro/subscription/page.tsx`
- `apps/web/src/app/help/page.tsx`
- `apps/web/src/app/legal/cgu/page.tsx`
- `apps/web/src/app/legal/mentions/page.tsx`
- `apps/web/src/app/legal/privacy/page.tsx`
- `apps/web/src/app/auth/login/page.tsx`
- `apps/web/src/app/profile/page.tsx`
- `apps/web/src/app/dashboard/bookings/page.tsx`
- `apps/web/src/middleware.ts`
- `apps/web/src/lib/api.ts`
- `apps/web/src/store/authStore.ts`
- `apps/web/src/app/sitemap.ts`
- `apps/web/public/robots.txt`

**Backend**
- `apps/api/src/catalog/catalog.controller.ts`
- `apps/api/src/catalog/catalog.service.ts`
- `apps/api/src/booking/booking.controller.ts`
- `apps/api/src/booking/booking.service.ts`
- `apps/api/src/booking/booking-expiration.service.ts`
- `apps/api/src/payment/payment.controller.ts`
- `apps/api/src/payment/payment.service.ts`
- `apps/api/src/payment/dto/initiate-payment.dto.ts`
- `apps/api/src/payment/utils/payment.constants.ts`
- `apps/api/src/favorites/favorites.controller.ts`
- `apps/api/src/favorites/favorites.service.ts`
- `apps/api/src/pro/pro.controller.ts`
- `apps/api/src/pro/pro.service.ts`
- `apps/api/src/dashboard/dashboard.controller.ts`
- `apps/api/src/dashboard/dashboard.service.ts`
- `apps/api/src/users/users.controller.ts`
- `apps/api/src/users/users.service.ts`
- `apps/api/src/auth/auth.controller.ts`
- `apps/api/src/auth/auth.service.ts`
- `apps/api/src/auth/guards/roles.guard.ts`
- `apps/api/src/auth/guards/kyc-approved.guard.ts`
- `apps/api/src/auth/failed-login.service.ts`
- `apps/api/src/main.ts`
- `apps/api/src/notifications/notifications.listener.ts`
- `apps/api/src/notifications/notifications.service.ts`

**Database**
- `packages/database/prisma/schema.prisma`
- `packages/contracts/src/schemas/public.ts`
- `packages/contracts/src/schemas/booking.ts`

**Configuration**
- `apps/api/src/app.module.ts` (Schedule/Throttle/CORS/Modules)
- `apps/web/src/app/layout.tsx` (metadata globale)

---

# Phase 3 — Dashboard PRO & Operations (AUDIT COMPLET)

> **Date** : 2026-02-22
> **Contexte** : Audit complet des pages Dashboard PRO, incluant RBAC, KYC gating, premium gating, operations metier, securite, performance, mobile et monitoring.
> Reflete l'etat actuel du code.

## 1) Resume executif

- **Statut global** : ⚠️ Moyen-Bon — socle backend robuste, mais plusieurs incoherences frontend/operations restent a corriger pour un dashboard PRO fiable en production.
- **Points forts** :
  - RBAC backend corrige et solide sur les routes PRO classe-level (`RolesGuard` lit bien handler + class metadata).
  - `GET /dashboard/stats` est maintenant protege backend (`JwtAuthGuard + RolesGuard + @Roles('PRO')`) avec gate premium serveur (`PREMIUM_REQUIRED`).
  - KYC gating operationnel sur les mutations PRO critiques (`/pro/services`, `/pro/availability`, bookings status/duration/complete, payment checkout).
  - Catch-22 profile/KYC corrige : un PRO non approuve peut mettre a jour l'avatar, les champs business restent bloques serveur.
  - Expiration automatique presente : cron hourly pour `Booking -> EXPIRED` et cron hourly pour expiration Premium/Boost (`SubscriptionExpirationService`).
  - Parsing pagination frontend corrige sur dashboard bookings/history (`{ data, meta }`).
  - Validation KYC renforcee (magic bytes submit/resubmit + DTO resubmit).
- **Risques majeurs** :
  1. **CRITIQUE** : `/dashboard/subscription/success` injecte dans `authStore` la reponse brute de `/pro/me` typée `PublicUser`, ce qui peut corrompre `user` (shape mismatch) et casser la session UI.
  2. **HIGH** : route `/dashboard/subscription` absente, mais `/pro/subscription` existe en public et affiche des statuts forgeables via query params sans verification serveur.
  3. **HIGH** : `/dashboard/bookings` filtre les onglets cote client apres pagination globale serveur, ce qui masque des reservations selon l'onglet (faux "vide").
  4. **HIGH** : `scope=history` backend omet `CANCELLED_BY_CLIENT_LATE`, donc historique incomplet.
  5. **HIGH** : UX mobile dashboard fragile (sidebar fixe 64px sans mode mobile/collapse), risque d'overflow et de navigation degradee.
  6. **MEDIUM** : nombreuses transitions non `motion-safe:` dans dashboard/subscription/kyc/services/bookings/history.
  7. **MEDIUM** : observabilite funnel dashboard faible (pas de Sentry/Datadog/ErrorBoundary global, pas d'alerting metier).
- **Recommandations top 5** :
  1. Corriger `success/page.tsx` : ne plus `setUser` avec `/pro/me`; recharger `auth/me` (shape PublicUser) ou mapper explicitement.
  2. Remplacer `/pro/subscription` par une route protegee et verifiee serveur (`/payment/status/:oid`) ou supprimer la page si non utilisee.
  3. Ajouter des filtres de statut backend pour `/bookings` (ou endpoints dedies par onglet) pour supprimer le faux vide sur dashboard bookings.
  4. Corriger `scope=history` backend en incluant `CANCELLED_BY_CLIENT_LATE`.
  5. Implementer une navigation dashboard mobile (drawer/collapse) + finir la migration `motion-safe:`.

---

## 1) Audit detaille par page (Dashboard PRO)

### 0) Composants transversaux (DashboardLayout, KycPendingState, stores, hooks)

### Frontend

- **Fichiers** :
  - `apps/web/src/components/dashboard/DashboardLayout.tsx` (345 lignes)
  - `apps/web/src/components/dashboard/KycPendingState.tsx` (153 lignes)
  - `apps/web/src/store/authStore.ts` (47 lignes)
  - `apps/web/src/lib/api.ts` (212 lignes)
- **Composants lies** : `DashboardSidebar`, `DashboardLoader`, `KycPendingState`, `AuthBootstrap`.
- **Gating effectif** :
  - Non-auth/non-PRO => redirect client vers `/` dans `DashboardLayout`.
  - KYC `REJECTED` => redirect force vers `/dashboard/kyc`.
  - KYC `PENDING` => waiting room (`KycPendingState`) sauf `/dashboard/profile`.
  - Setup gate avatar obligatoire avant autres pages.
- **Accessibilite** :
  - Bons points : skip-link, `aria-label` nav/sidebar/main, loaders avec `aria-busy`, focus rings.
  - Gaps : `KycPendingState` a des boutons `transition-colors` sans `motion-safe:`.
- **Design tokens** : classes tokens conformes, pas d'hex UI hardcode. Un hex apparait dans un commentaire de design (`KycPendingState.tsx`) mais pas dans les styles executes.
- **Animations** : partiellement conformes (`motion-safe` present sur loaders/pulse), mais transitions non `motion-safe` encore presentes dans `KycPendingState`.
- **Redirections** : middleware gere auth SSR pour `/dashboard/*`; role/KYC restent surtout client-side via `DashboardLayout`.
- **Securite client** :
  - `getJSON/patchJSON/...` utilisent cookie httpOnly + header CSRF + refresh 401.
  - `postFormData` ne reutilise pas `baseFetch` (pas de refresh 401 automatique).
- **Mobile UX** :
  - **Probleme majeur** : sidebar fixe `w-64` sans variante mobile => layout dense/overflow probable sur petits ecrans.
  - Pas de menu compact mobile.
- **SEO** : pages privees, pas de metadata page-level dediees.
- **Performance** :
  - Appel `/pro/me` dans `DashboardLayout` + refetchs `/pro/me` dans plusieurs pages enfants => duplication reseau.
  - Context `DashboardContext` expose `proMe` mais n'est pas consomme par les pages (potentiel non exploite).

### API / Backend

- `RolesGuard` corrige avec `getAllAndOverride` (handler + class).
- `KycApprovedGuard` retourne `403` avec `code: 'KYC_NOT_APPROVED'`.
- Pas de guard "PRO-only" au middleware Next (uniquement presence cookie).

### DB

- Source de verite gating KYC/Premium : `ProProfile` (`kycStatus`, `isPremium`, `premiumActiveUntil`, `boostActiveUntil`).

### Performance & Core Web Vitals

- **FCP estime (qualitatif)** : bon en desktop; degrade probable en mobile du fait de la sidebar fixe.
- **TTI estime** : moyen, car dashboard pages sont client-heavy + requetes multiples au mount.
- **Hydration** : forte (tout dashboard en composants client).

### Monitoring & Resilience

- Pas de `app/error.tsx` / `global-error.tsx` detecte.
- Pas de Sentry/Datadog/LogRocket detecte.
- Logs backend presents via Nest Logger, mais pas d'alerting.

### i18n / RTL readiness

- Strings majoritairement hardcodees FR.
- Nombreux `ml-*/mr-*` en dashboard; compat RTL partielle seulement (certains toggles utilisent `start`/`rtl:`).

### Problemes & recommandations

| # | Severite | Probleme | Impact metier | Effort (XS/S/M/L) | Action |
|---|---|---|---|---|---|
| T-01 | HIGH | Sidebar dashboard non responsive mobile | Navigation PRO degradee sur mobile, drop-off dans operations | M | Implementer drawer/collapse mobile |
| T-02 | MEDIUM | Double fetch `/pro/me` (layout + pages) | Surcout reseau, latence inutile, UX plus lente | S | Reutiliser `DashboardContext` comme source unique |
| T-03 | MEDIUM | `KycPendingState` transitions sans `motion-safe:` | Non-conformite accessibility motion | XS | Prefixer transitions concernes |
| T-04 | MEDIUM | Absence d'ErrorBoundary globale | Erreurs runtime peuvent casser ecrans entiers | S | Ajouter `app/error.tsx` et `global-error.tsx` |

### TODO

- [ ] Ajouter mode mobile pour sidebar dashboard (Effort M)
- [ ] Mutualiser `/pro/me` via context/store dedie (Effort S)
- [ ] Finaliser `motion-safe:` sur composants transversaux (Effort XS)
- [ ] Ajouter error boundaries Next.js globales (Effort S)

### Score detaille — composants transversaux

| Aspect | Score /5 | Justification |
| ------ | -------- | ------------- |
| Frontend structure | 4.0 | Layout clair, skip-link, gates explicites |
| UX & states | 3.8 | Gates utiles, mais mobile non traite |
| Validation front | 3.5 | N/A direct, mais flux bien cadres |
| Securite (donnees PRO) | 4.2 | Gating fort via store + API protegee |
| Backend protection | 4.5 | Guards backend solides |
| RBAC | 4.3 | Roles/KYC guard correctement appliques |
| KYC gating | 4.4 | Waiting room + redirects fonctionnels |
| Premium gating | 4.0 | Menu et layout adaptatifs |
| DB coherence | 4.2 | Flags profile utilises comme source metier |
| Performance | 3.2 | Refetchs redondants |
| Mobile UX | 2.4 | Sidebar desktop-only |
| Monitoring | 2.0 | Peu d'outillage d'observabilite |
| Tests | 3.0 | Pas de tests frontend layout |

**Score global page : 3.7 / 5**

---

### 1) /dashboard (overview)

### Frontend

- **Fichier** : `apps/web/src/app/dashboard/page.tsx` (356 lignes)
- **Composants lies** : `DashboardLayout`, `recharts` (`LineChart`, `PieChart`).
- **Etats geres** :

| Etat | Implementation | Verdict |
|---|---|---|
| Loading dashboard | Spinner + texte | OK |
| Loading stats | Spinners cartes/charts | OK |
| Error dashboard | Alert visible | OK |
| Error stats | Alert + bouton retry | OK |
| Non-premium | Redirect frontend vers `/dashboard/bookings` | OK |

- **Accessibilite** : `aria-busy`, fallback text charts, `role="img"`, `role="alert"` presents.
- **Design tokens** : conformes (`var(--color-...)` pour charts).
- **Animations** : spinners `motion-safe`; boutons encore en `transition` simple.
- **Redirections** : redirect frontend non-premium; backend stats bloque non-premium.
- **Securite client** : appels via `getJSON` prives + CSRF.
- **Mobile UX** : charts passent en 1 colonne sur mobile (`grid-cols-1 md:grid-cols-2`) ; lisibilite correcte.
- **SEO** : pas de metadata page-level; route privee (robots disallow `/dashboard`).
- **Performance** : `recharts` alourdit JS client; `/pro/me` re-fetch redondant avec layout.

### API / Backend

- **Endpoint** : `GET /api/dashboard/stats`
- **Fichiers** :
  - `apps/api/src/dashboard/dashboard.controller.ts` (31 lignes)
  - `apps/api/src/dashboard/dashboard.service.ts` (170 lignes)
- **Guards/Roles** : `JwtAuthGuard + RolesGuard + @Roles('PRO')`.
- **Premium gate** : backend `ForbiddenException` code `PREMIUM_REQUIRED`.
- **Validation** : role re-check service-level; aucune entree client complexe.
- **Rate limiting** : throttle global app (60/min).

### DB

- Modeles : `Booking`, `ProProfile`, `Category`, `User`.
- Queries : count/aggr sur bookings + prochain booking confirme.
- Cohesion IDs : pas d'ID interne expose au frontend ici sur stats.

### Performance & Core Web Vitals

- **FCP estime** : moyen (charts client + fetchs).
- **TTI estime** : moyen a bon selon device; `recharts` penalise sur mobiles faibles.
- **Hydration** : elevee (page full client).

### Monitoring & Resilience

- Retry manuel present pour stats.
- Pas d'instrumentation conversion/perf dediee dashboard stats.

### i18n / RTL readiness

- FR hardcode (`toLocaleDateString('fr-FR')`).
- Compat RTL partielle (peu de classes directionnelles ici).

### Problemes & recommandations

| # | Severite | Probleme | Impact metier | Effort (XS/S/M/L) | Action |
|---|---|---|---|---|---|
| D-01 | MEDIUM | Dependance lourde `recharts` sur page client | TTI degrade sur mobiles faibles | M | Lazy-load charts ou simplifier visuals |
| D-02 | LOW | `transition` non `motion-safe` sur plusieurs boutons | Non-conformite a11y motion | XS | Prefix `motion-safe:transition*` |
| D-03 | LOW | Premium check backend base sur `isPremium` (pas `premiumActiveUntil`) | Fenetre d'1h possible avant cron expiration | S | Verifier aussi `premiumActiveUntil` dans `DashboardService` |

### TODO

- [ ] Ajouter verification `premiumActiveUntil` dans `dashboard.service` (Effort S)
- [ ] Optimiser chargement chart (lazy/conditional) (Effort M)
- [ ] Completer `motion-safe` sur transitions (Effort XS)

### Score detaille — /dashboard

| Aspect | Score /5 | Justification |
| ------ | -------- | ------------- |
| Frontend structure | 4.2 | Structure claire, etats explicites |
| UX & states | 4.2 | Retry stats + fallback lisible |
| Validation front | 3.5 | Peu d'entrees utilisateur |
| Securite (donnees PRO) | 4.4 | Pas d'exposition sensible directe |
| Backend protection | 4.6 | Roles + premium gate backend |
| RBAC | 4.6 | Route correctement verrouillee |
| KYC gating | 4.0 | Herite de DashboardLayout |
| Premium gating | 4.5 | Gate front + backend |
| DB coherence | 4.2 | Requetes consistantes |
| Performance | 3.3 | Charts lourds + refetch redondant |
| Mobile UX | 3.8 | Responsive correct |
| Monitoring | 2.2 | Pas d'observabilite avancee |
| Tests | 2.8 | Pas de spec dashboard service dediee |

**Score global page : 3.9 / 5**

---

### 2) /dashboard/profile

### Frontend

- **Fichier** : `apps/web/src/app/dashboard/profile/page.tsx` (468 lignes)
- **Composants lies** : `DashboardLayout`.
- **Formulaires/champs** : avatar URL, phone, city, bio, portfolio URL.
- **Validation front** : regex tel via `pattern`, `type=url` pour avatar/portfolio, `maxLength` bio.
- **Etats geres** :

| Etat | Implementation | Verdict |
|---|---|---|
| Loading | Spinner | OK |
| Error save | Banner inline | OK |
| Success save | Banner inline | OK |
| Portfolio add/delete | Updates locales + erreurs | OK |
| Error fetch initial | `setError` mais rendu incomplet si `data=null` | KO partiel |

- **Accessibilite** : labels `htmlFor` presents; messages error/success avec `role="alert"` + `aria-live="polite"`.
- **Animations** : spinner `motion-safe`, mais plusieurs `transition` non `motion-safe`.
- **Redirections** : herite `DashboardLayout`.
- **Securite client** : payload restreint si KYC non approuve (avatar uniquement).
- **Mobile UX** : form vertical correct; portfolio grid force `grid-cols-3` (petit sur mobile).
- **SEO** : page privee, pas metadata dediee.
- **Performance** : fetch parallel `/pro/me` + `/public/cities`; duplication avec layout.

### API / Backend

- **Endpoints** :
  - `GET /api/pro/me`
  - `PATCH /api/pro/profile`
  - `POST /api/pro/portfolio`
  - `DELETE /api/pro/portfolio/:id`
- **Fichiers** :
  - `apps/api/src/pro/pro.controller.ts` (94 lignes)
  - `apps/api/src/pro/pro.service.ts` (459 lignes)
  - `apps/api/src/pro/dto/update-pro-profile.dto.ts`
- **Guards/RBAC** : class-level `JwtAuthGuard + RolesGuard + @Roles('PRO')`; portfolio create/delete avec `KycApprovedGuard`.
- **Validation** : DTO profile whitelist/forbid; regex city publicId et phone; `avatarUrl` transform `"" -> null`.
- **KYC gating metier** : si non APPROVED, backend autorise avatar uniquement et bloque champs business (`KYC_NOT_APPROVED`).
- **Premium gating** : portfolio add exige premium (`PREMIUM_REQUIRED`) + max 6.
- **IDOR** : suppression portfolio protegee par `findFirst({ id, proUserId })`.

### DB

- Modeles : `ProProfile`, `User`, `City`, `ProPortfolioImage`, `Review`.
- Cohesion ID : `ProPortfolioImage.id` interne expose frontend (pas de publicId).

### Performance & Core Web Vitals

- **FCP estime** : correct (pas de dependance lourde).
- **TTI estime** : moyen, cause refetchs + images externes (avatar/portfolio).
- **Hydration** : page 100% client.

### Monitoring & Resilience

- Pas d'ErrorBoundary locale.
- Erreur fetch initiale peut mener a ecran partiellement vide (header seul).

### i18n / RTL readiness

- Strings FR hardcodees.
- Classes `ml-`/`right-` presentes, RTL incomplet.

### Problemes & recommandations

| # | Severite | Probleme | Impact metier | Effort (XS/S/M/L) | Action |
|---|---|---|---|---|---|
| DP-01 | HIGH | Fetch initial en `Promise.all` sans fallback partiel : si `/public/cities` echoue, page peu exploitable | PRO bloque pour setup profile, charge support | S | Decoupler fetch profile/cities et afficher erreur explicite + retry |
| DP-02 | MEDIUM | Portfolio grid fixe en 3 colonnes sur mobile | UX mobile degradee pour ajout/suppression images | XS | `grid-cols-2 sm:grid-cols-3` |
| DP-03 | MEDIUM | Transitions non `motion-safe` | Non-conformite prefers-reduced-motion | XS | Prefixer transitions |
| DP-04 | LOW | IDs internes portfolio exposes | Incoherence politique publicId/interne | M | Ajouter `publicId` sur `ProPortfolioImage` |

### TODO

- [ ] Rendre le chargement profile resilient (fallback + retry) (Effort S)
- [ ] Corriger responsive grid portfolio (Effort XS)
- [ ] Completer `motion-safe` transitions (Effort XS)
- [ ] Introduire `publicId` pour portfolio (Effort M)

### Score detaille — /dashboard/profile

| Aspect | Score /5 | Justification |
| ------ | -------- | ------------- |
| Frontend structure | 3.9 | Form riche et complete |
| UX & states | 3.4 | Etat erreur fetch initial incomplet |
| Validation front | 3.8 | Validation basique presente |
| Securite (donnees PRO) | 4.1 | Payload restreint selon KYC |
| Backend protection | 4.5 | DTO + controles service solides |
| RBAC | 4.5 | Route PRO verrouillee |
| KYC gating | 4.3 | Catch-22 corrige |
| Premium gating | 4.0 | Portfolio premium enforce backend |
| DB coherence | 3.7 | Portfolio sans publicId |
| Performance | 3.4 | Refetch redondant + images externes |
| Mobile UX | 3.2 | Portfolio mobile perfectible |
| Monitoring | 2.1 | Peu d'instrumentation |
| Tests | 2.7 | Pas de tests frontend/profile dedies |

**Score global page : 3.7 / 5**

---

### 3) /dashboard/kyc

### Frontend

- **Fichier** : `apps/web/src/app/dashboard/kyc/page.tsx` (428 lignes)
- **Composants lies** : `DashboardLayout`.
- **Champs** : `cinNumber`, `cinFront`, `cinBack`.
- **Validation front** :
  - CIN non vide + pattern `^[A-Z]{1,2}\d{4,8}$`.
  - fichiers requis + taille max 5MB.
  - `postFormData` utilise pour submit/resubmit.
- **Etats geres** :

| Etat | Implementation | Verdict |
|---|---|---|
| Loading | Spinner | OK |
| Rejected | Alerte rouge + raison | OK |
| Pending | Card pending | Partiellement unreachable via DashboardLayout |
| Approved | Badge + info success | OK |
| Error submit | Banner role alert | OK |
| Error fetch status | Peu visible si `kycStatus` null | KO partiel |

- **Accessibilite** : labels et `role="alert"` presents; spinner `motion-safe`.
- **Animations** : spinner `motion-safe`; boutons en `transition` non `motion-safe`.
- **Redirections** : non-PRO => `/`; KYC pending globalement intercepte par `DashboardLayout` waiting room.
- **Securite client** : pas d'ID sensible en query/body; upload multipart via helper.
- **Mobile UX** : formulaire vertical clair, mais champs file avec `file:mr-4` et boutons larges.
- **SEO** : prive.
- **Performance** : simple, sans dependance lourde.

### API / Backend

- **Endpoints** :
  - `GET /api/kyc/status`
  - `POST /api/kyc/submit`
  - `POST /api/kyc/resubmit`
- **Fichiers** :
  - `apps/api/src/kyc/kyc.controller.ts` (237 lignes)
  - `apps/api/src/kyc/kyc.service.ts` (378 lignes)
  - `apps/api/src/kyc/dto/resubmit-kyc.dto.ts`
  - `apps/api/src/kyc/multer.config.ts`
- **Guards/RBAC** : class-level `JwtAuthGuard + RolesGuard + @Roles('PRO')`.
- **Validation** : DTO resubmit + magic bytes submit/resubmit + MIME whitelist + 5MB.
- **Hashing/securite** : CIN hash SHA-256 + salt obligatoire.
- **Anti-enumeration/conflicts** : `CIN_ALREADY_USED` en conflit.
- **Point metier** : resubmit accepte fichiers optionnels (status `REJECTED` -> `PENDING` possible sans remplacer docs).

### DB

- Modeles : `ProProfile` (`kycStatus`, `cinHash`, keys), `KycAccessLog`.
- Cohesion : pas d'exposition de cin brut en DB.

### Performance & Core Web Vitals

- **FCP estime** : bon.
- **TTI estime** : bon (pas de libs lourdes).
- **Hydration** : necessaire (upload/files).

### Monitoring & Resilience

- Logs KYC access presentes (`KycAccessLog` + logger).
- Pas d'alerting automatique en cas de rejets massifs/erreurs upload.

### i18n / RTL readiness

- FR hardcode.
- Compat RTL partielle (`mr-*` utilise dans style file input).

### Problemes & recommandations

| # | Severite | Probleme | Impact metier | Effort (XS/S/M/L) | Action |
|---|---|---|---|---|---|
| DK-01 | MEDIUM | En mode `PENDING`, le contenu pending de cette page est masque par `DashboardLayout` | Code mort + confusion maintenance | XS | Supprimer branche pending locale ou ajuster gating layout |
| DK-02 | MEDIUM | Erreur `GET /kyc/status` peu visible quand `kycStatus` est null | Support inutile, utilisateur sans action claire | S | Afficher banniere erreur globale + retry |
| DK-03 | MEDIUM | Transitions non `motion-safe` sur submit/actions | Non-conformite accessibilite motion | XS | Prefix transitions |
| DK-04 | LOW | Resubmit possible sans remplacer fichiers rejectes | Risque de re-soumission de docs non corriges | S | Exiger au moins un fichier sur resubmit |

### TODO

- [ ] Rationaliser pending state (layout vs page) (Effort XS)
- [ ] Ajouter erreur fetch status visible + retry (Effort S)
- [ ] Completer `motion-safe` transitions (Effort XS)
- [ ] Renforcer regle resubmit (au moins un fichier) (Effort S)

### Score detaille — /dashboard/kyc

| Aspect | Score /5 | Justification |
| ------ | -------- | ------------- |
| Frontend structure | 3.9 | Workflow complet statuts/form |
| UX & states | 3.5 | Erreur fetch status pas assez exploitable |
| Validation front | 4.2 | CIN + taille + presence fichiers |
| Securite (donnees PRO) | 4.5 | Flux KYC securise |
| Backend protection | 4.6 | Guards + magic bytes + hash CIN |
| RBAC | 4.6 | PRO only |
| KYC gating | 4.3 | Bonne base, pending path duplique |
| Premium gating | 3.0 | N/A direct |
| DB coherence | 4.3 | Champs KYC coherents |
| Performance | 4.0 | Page legere |
| Mobile UX | 3.9 | Form mobile correct |
| Monitoring | 2.7 | Logs presents, alerting absent |
| Tests | 3.8 | `kyc-submit.spec.ts` present |

**Score global page : 4.0 / 5**

---

### 4) /dashboard/services

### Frontend

- **Fichier** : `apps/web/src/app/dashboard/services/page.tsx` (475 lignes)
- **Composants lies** : `DashboardLayout`.
- **Champs** : toggle category, pricing type, fixed/min/max price.
- **Validation front** : prix > 0, min < max, erreurs visibles.
- **Etats geres** :

| Etat | Implementation | Verdict |
|---|---|---|
| Loading | Spinner | OK |
| Error load/save | Alert + retry | OK |
| Success | Alert auto-dismiss 3s | OK |
| Saving | Bouton disabled | OK |

- **Accessibilite** : labels+ids sur toggles et inputs, `aria-label` toggles, erreurs `role="alert"`.
- **Animations** : spinner `motion-safe`, mais plusieurs transitions non `motion-safe` (`transition`, `after:transition-all`).
- **Redirections** : 403 KYC => redirect `/dashboard/kyc`.
- **Securite client** : aucune confiance front; payload minimal.
- **Mobile UX** : cards verticales; fourchette prix reste en `grid-cols-2` fixe (dense sur ecran etroit).
- **Performance** : refetch `/pro/me` apres save + duplication avec layout.

### API / Backend

- **Endpoint** : `PUT /api/pro/services`
- **Fichiers** : `pro.controller.ts`, `pro.service.ts`.
- **Guards/RBAC/KYC** : `JwtAuthGuard + RolesGuard + @Roles('PRO') + KycApprovedGuard`.
- **Validation** : Zod schema (`UpdateServicesSchema`) + service-level checks.
- **Premium gating** : limite active services free=1, premium=3 en backend.
- **IDOR** : scope `proUserId` derive du JWT seulement.
- **Point metier** : strategy delete-all + recreate dans transaction.

### DB

- Modeles : `ProService`, `Category`, `ProProfile`.
- Contraintes : `@@unique([proUserId, categoryId])` et index category.
- Risque : delete/recreate reset IDs et `createdAt` a chaque sauvegarde.

### Performance & Core Web Vitals

- **FCP estime** : correct.
- **TTI estime** : moyen (form dynamique + donnees categories/services).
- **Hydration** : page client complete.

### Monitoring & Resilience

- Retry manuel present.
- Pas de telemetry pour erreurs `SERVICE_LIMIT_REACHED`/usage limit.

### i18n / RTL readiness

- FR hardcode.
- Presence de `ml-3`, compat RTL partielle (toggle utilise `rtl:` partiellement).

### Problemes & recommandations

| # | Severite | Probleme | Impact metier | Effort (XS/S/M/L) | Action |
|---|---|---|---|---|---|
| DS-01 | MEDIUM | `deleteMany + createMany` sur update services | Perte historique IDs/createdAt, fragilise audits | M | Migrer vers upsert diff-based |
| DS-02 | MEDIUM | Transitions non `motion-safe` (boutons/switch) | Non-conformite accessibilite | XS | Prefix transitions |
| DS-03 | LOW | `grid-cols-2` fixe pour range prices mobile | Saisie prix moins confortable mobile | XS | `grid-cols-1 sm:grid-cols-2` |

### TODO

- [ ] Remplacer delete/recreate par update diff-based (Effort M)
- [ ] Finaliser motion-safe transitions (Effort XS)
- [ ] Ajuster layout mobile range prices (Effort XS)

### Score detaille — /dashboard/services

| Aspect | Score /5 | Justification |
| ------ | -------- | ------------- |
| Frontend structure | 4.0 | Form structuree et lisible |
| UX & states | 4.1 | Loading/error/retry/success bien couverts |
| Validation front | 4.0 | Validation prix utile |
| Securite (donnees PRO) | 4.2 | JWT scoped payload |
| Backend protection | 4.5 | Guard + Zod + limite premium server-side |
| RBAC | 4.5 | PRO only + guard roles |
| KYC gating | 4.6 | Guard backend + redirect front |
| Premium gating | 4.4 | Limite backend robuste |
| DB coherence | 3.4 | delete/recreate casse traçabilite |
| Performance | 3.5 | Refetch redondant |
| Mobile UX | 3.4 | Grid 2 colonnes fixe |
| Monitoring | 2.1 | Pas d'instrumentation metier |
| Tests | 2.6 | Pas de tests dedies services UI/API |

**Score global page : 3.8 / 5**

---

### 5) /dashboard/availability

### Frontend

- **Fichier** : `apps/web/src/app/dashboard/availability/page.tsx` (376 lignes)
- **Composants lies** : `DashboardLayout`.
- **Champs** : toggle jour + `startTime/endTime`.
- **Validation front** : `start < end` par jour, erreurs inline par jour.
- **Etats geres** :

| Etat | Implementation | Verdict |
|---|---|---|
| Loading | Spinner | OK |
| Error | Alert + retry | OK |
| Success | Alert | OK |
| Validation errors | Inline + global | OK |

- **Accessibilite** : `fieldset/legend`, labels+ids, `aria-invalid`, erreurs `role="alert"`.
- **Animations** : spinner `motion-safe`; switch `motion-safe:after:transition-all`; quelques boutons en `motion-safe:transition`.
- **Redirections** : 403 KYC => `/dashboard/kyc`.
- **Mobile UX** : form claire mais plage horaire reste `grid-cols-2` fixe.
- **Performance** : logique DRY correcte; refetch `/pro/me` post-save.

### API / Backend

- **Endpoint** : `PUT /api/pro/availability`
- **Guards** : `JwtAuthGuard + RolesGuard + @Roles('PRO') + KycApprovedGuard`.
- **Validation** : Zod + validation client + guard anti-doublons `dayOfWeek` service-level.
- **IDOR** : scope userId JWT.

### DB

- Modele : `WeeklyAvailability`.
- Contraintes : `@@unique([proUserId, dayOfWeek])`.
- Risque : delete/recreate reset IDs/createdAt.

### Performance & Core Web Vitals

- **FCP estime** : bon.
- **TTI estime** : bon a moyen.
- **Hydration** : necessaire (inputs/time controls).

### Monitoring & Resilience

- Retry manuel present.
- Pas de metric sur invalidation disponibilites ou collisions frequentes.

### i18n / RTL readiness

- FR hardcode.
- `ml-*` present; compat RTL partielle.

### Problemes & recommandations

| # | Severite | Probleme | Impact metier | Effort (XS/S/M/L) | Action |
|---|---|---|---|---|---|
| DA-01 | MEDIUM | delete/recreate disponibilites | Perte traçabilite modifications horaires | M | Mettre a jour diff-based |
| DA-02 | LOW | Grid horaire 2 colonnes fixe mobile | Saisie mobile moins ergonomique | XS | `grid-cols-1 sm:grid-cols-2` |
| DA-03 | LOW | Instrumentation absente (erreurs disponibilite) | Difficile d'anticiper incidents support | S | Ajouter logs metier structurés |

### TODO

- [ ] Migrer update availabilities vers upsert diff-based (Effort M)
- [ ] Corriger responsive horaire mobile (Effort XS)
- [ ] Ajouter logs metier disponibilite (Effort S)

### Score detaille — /dashboard/availability

| Aspect | Score /5 | Justification |
| ------ | -------- | ------------- |
| Frontend structure | 4.1 | Structure propre, helpers DRY |
| UX & states | 4.0 | Etats complets + retry |
| Validation front | 4.3 | start/end valide en front |
| Securite (donnees PRO) | 4.2 | Scope JWT |
| Backend protection | 4.4 | Guard + Zod + anti-doublon |
| RBAC | 4.5 | PRO only |
| KYC gating | 4.6 | Guard backend solide |
| Premium gating | 3.0 | N/A direct |
| DB coherence | 3.6 | Unicite OK, delete/recreate |
| Performance | 3.8 | Leger |
| Mobile UX | 3.6 | Quelques grilles non adaptatives |
| Monitoring | 2.2 | Peu d'observabilite |
| Tests | 2.8 | Pas de tests dedies availability |

**Score global page : 3.9 / 5**

---

### 6) /dashboard/bookings

### Frontend

- **Fichier** : `apps/web/src/app/dashboard/bookings/page.tsx` (793 lignes)
- **Composants lies** : `DashboardLayout`, `BookingStatusBadge`, `ConfirmDialog`, `CustomDialog`.
- **CTA principaux** : accepter/refuser, modifier duree, terminer mission, annuler.
- **Etats geres** :

| Etat | Implementation | Verdict |
|---|---|---|
| Loading | Spinner | OK |
| Error | Message + retry | OK |
| Empty | Message par onglet | OK |
| Success actions | Toasts + refetch | OK |
| Modals | custom + confirm dialog | OK |

- **Accessibilite** :
  - Tabs ARIA (`tablist/tab/tabpanel`) + navigation clavier fleches/home/end.
  - Dialog custom avec focus trap + Escape.
  - `aria-label` sur actions principales.
- **Animations** : nombreuses classes `transition` sans `motion-safe`.
- **Redirections** : guard client-side supplementaire (non-auth -> `/auth/login`, non-PRO -> `/client/bookings`).
- **Securite client** : IDs booking internes utilises cote client.
- **Mobile UX** : cards flex avec actions en colonne; sur ecrans etroits, densite elevee mais utilisable.
- **Performance** : page volumineuse, logique UI dense, fetch pagination 20.

### API / Backend

- **Endpoints utilises** :
  - `GET /api/bookings?page&limit`
  - `PATCH /api/bookings/:id/status`
  - `PATCH /api/bookings/:id/duration`
  - `PATCH /api/bookings/:id/complete`
  - `PATCH /api/bookings/:id/cancel`
- **Guards/Roles** :
  - `GET /bookings` : `JwtAuthGuard`
  - `status/duration/complete` : `JwtAuthGuard + KycApprovedGuard` (role check service-level)
  - `cancel` : `JwtAuthGuard` (KYC PRO check service-level)
- **Validation** : Zod/ValidationPipe selon endpoints.
- **Ownership/IDOR** : checks `proId/clientId === userId` dans service.
- **Operations** : Winner-Takes-All sur confirmations, overlap auto-cancel.

### DB

- Modeles : `Booking`, `BookingEvent`, `ProProfile`.
- Indexes pertinents : `@@index([proId,status,timeSlot])`.
- Incoherence metier : status `CANCELLED_AUTO_FIRST_CONFIRMED` jamais set dans service mais encore present dans front/filters.

### Performance & Core Web Vitals

- **FCP estime** : moyen (page 793 lignes client).
- **TTI estime** : moyen, interactions nombreuses + modals.
- **Long tasks** : probables sur devices faibles (tabs/filters/map renders).

### Monitoring & Resilience

- Erreurs fetch loggees (`console.error`) + retry UI.
- Pas d'events analytics funnel PRO (accept/decline/complete rate).

### i18n / RTL readiness

- FR hardcode.
- Utilisation frequente de `ml-*`, compat RTL partielle.

### Problemes & recommandations

| # | Severite | Probleme | Impact metier | Effort (XS/S/M/L) | Action |
|---|---|---|---|---|---|
| DBP-01 | HIGH | Filtrage onglets apres pagination globale | Fausse impression "aucune reservation", perte d'actions PRO | M | Ajouter filtres statuts cote backend |
| DBP-02 | MEDIUM | `CANCELLED_AUTO_FIRST_CONFIRMED` encore dans UI mais jamais produit | Bruit fonctionnel et maintenance confuse | XS | Retirer status mort des filtres/badges |
| DBP-03 | MEDIUM | Transitions non `motion-safe` sur actions/modals/tabs | Non-conformite accessibilite | S | Prefix transitions |
| DBP-04 | LOW | Route-level role guard absent sur endpoints status/duration/complete | Defense-in-depth inegale (service check seulement) | S | Ajouter `RolesGuard + @Roles('PRO')` sur routes PRO-only |

### TODO

- [ ] Filtrer bookings par statut cote backend (Effort M)
- [ ] Nettoyer status mort `CANCELLED_AUTO_FIRST_CONFIRMED` (Effort XS)
- [ ] Completer migration `motion-safe` (Effort S)
- [ ] Renforcer guards route-level pour mutations PRO bookings (Effort S)

### Score detaille — /dashboard/bookings

| Aspect | Score /5 | Justification |
| ------ | -------- | ------------- |
| Frontend structure | 3.6 | Fonctionnel mais fichier tres dense |
| UX & states | 3.8 | Etats complets, faux vides par onglet |
| Validation front | 3.8 | Validation raison/duree basique |
| Securite (donnees PRO) | 4.1 | Ownership backend solide |
| Backend protection | 4.3 | Verifs metier robustes |
| RBAC | 3.8 | Service-level role checks importants |
| KYC gating | 4.2 | Guard sur actions critiques |
| Premium gating | 3.0 | N/A direct |
| DB coherence | 3.8 | Index bons, status mort present |
| Performance | 3.2 | Page lourde client-side |
| Mobile UX | 3.3 | Dense mais exploitable |
| Monitoring | 2.3 | Peu d'observabilite funnel |
| Tests | 4.1 | `booking.service.spec.ts` riche sur mutations |

**Score global page : 3.6 / 5**

---

### 7) /dashboard/history

### Frontend

- **Fichier** : `apps/web/src/app/dashboard/history/page.tsx` (250 lignes)
- **Composants lies** : `DashboardLayout`, `BookingStatusBadge`.
- **Etats geres** : loading/error/empty/list + pagination.
- **Accessibilite** : `role="alert"` sur erreurs, spinner `motion-safe`, `aria-busy` sur conteneur.
- **Animations** : plusieurs `transition` non `motion-safe` (retry/pagination).
- **Redirections** : guard client-side non-auth/non-PRO -> login.
- **Securite client** : lecture seule.
- **Mobile UX** : cartes simples, bonne lisibilite.
- **Performance** : pagine via `scope=history`.

### API / Backend

- **Endpoint** : `GET /api/bookings?scope=history&page&limit`
- **Guard** : `JwtAuthGuard`.
- **Filtre metier** : applique cote backend via `scope=history`.
- **Issue backend** : liste statuts history omet `CANCELLED_BY_CLIENT_LATE`.

### DB

- Modeles : `Booking`/`BookingEvent`.
- Indexes adequats pour `proId + timeSlot`.

### Performance & Core Web Vitals

- **FCP estime** : bon.
- **TTI estime** : bon.
- **Hydration** : moderee.

### Monitoring & Resilience

- Erreurs fetch loggees console.
- **Bug UX** : bouton retry met `page=1`; si deja page 1, pas de refetch force.

### i18n / RTL readiness

- FR hardcode + `ml-*`.

### Problemes & recommandations

| # | Severite | Probleme | Impact metier | Effort (XS/S/M/L) | Action |
|---|---|---|---|---|---|
| DH-01 | HIGH | `scope=history` backend n'inclut pas `CANCELLED_BY_CLIENT_LATE` | Historique incomplet, litiges/support plus frequents | XS | Ajouter ce statut dans filtre backend |
| DH-02 | MEDIUM | Retry frontend inefficace en page 1 | Blocage UX en cas d'erreur reseau repetee | XS | Appeler explicitement `fetchBookings()` dans `handleRetry` |
| DH-03 | LOW | Transitions non `motion-safe` | Accessibilite motion incomplete | XS | Prefix transitions |

### TODO

- [ ] Corriger filtre history backend (`CANCELLED_BY_CLIENT_LATE`) (Effort XS)
- [ ] Reparer bouton retry page1 (Effort XS)
- [ ] Completer `motion-safe` transitions (Effort XS)

### Score detaille — /dashboard/history

| Aspect | Score /5 | Justification |
| ------ | -------- | ------------- |
| Frontend structure | 3.9 | Page concise et claire |
| UX & states | 3.5 | Retry defectueux sur page1 |
| Validation front | 3.0 | Lecture seule |
| Securite (donnees PRO) | 4.0 | Donnees scopees user |
| Backend protection | 4.0 | Jwt + filtre role-based service |
| RBAC | 3.8 | Role PRO enforce surtout via layout/service |
| KYC gating | 3.0 | N/A direct |
| Premium gating | 3.0 | N/A |
| DB coherence | 3.4 | Un statut historique manquant |
| Performance | 4.0 | Pagination efficace |
| Mobile UX | 3.8 | Cartes lisibles |
| Monitoring | 2.2 | Peu d'observabilite |
| Tests | 3.0 | Pas de tests specifique history UI |

**Score global page : 3.6 / 5**

---

### 8) /dashboard/subscription (route absente) + page equivalente `/pro/subscription`

### Frontend

- **Constat** : aucun fichier `apps/web/src/app/dashboard/subscription/page.tsx` (route absente).
- **Page equivalente existante** : `apps/web/src/app/pro/subscription/page.tsx` (240 lignes).
- **Comportement** : statut derive uniquement de query params (`status`, `error`, `oid`) sans verification API.
- **Accessibilite** : UI correcte globalement, mais transitions non `motion-safe`.
- **Securite client** : status forgeable par URL; `console.log` present en production.
- **Redirections** : aucune protection middleware specifique sur `/pro/subscription`.

### API / Backend

- Aucun endpoint appele depuis cette page.
- Aucune verification ownership/statut payment.

### DB

- N/A direct (aucune lecture API).

### Performance & Core Web Vitals

- Leger cote perf (page statique client).

### Monitoring & Resilience

- Pas de tracking ni verif reseau.

### i18n / RTL readiness

- FR hardcode.

### Problemes & recommandations

| # | Severite | Probleme | Impact metier | Effort (XS/S/M/L) | Action |
|---|---|---|---|---|---|
| SUB-01 | HIGH | Route dashboard subscription absente + fallback public `/pro/subscription` | Flux subscription incoherent, confusion support/utilisateur | S | Creer route unique protegee et supprimer doublon |
| SUB-02 | HIGH | Statut forgeable via query params (pas de verif serveur) | Confiance affaiblie, faux positifs de paiement | S | Appeler `/payment/status/:oid` et valider ownership |
| SUB-03 | LOW | `console.log` en prod | Bruit et fuite info debug | XS | Supprimer logs debug |

### TODO

- [ ] Ajouter une vraie route `/dashboard/subscription` ou supprimer fallback `/pro/subscription` (Effort S)
- [ ] Verifier statut payment cote serveur avant affichage (Effort S)
- [ ] Nettoyer logs debug (Effort XS)

### Score detaille — /dashboard/subscription (equivalent actuel)

| Aspect | Score /5 | Justification |
| ------ | -------- | ------------- |
| Frontend structure | 2.8 | UI lisible mais route incoherente |
| UX & states | 2.6 | Etats bases sur query forgeables |
| Validation front | 1.8 | Aucune validation serveur-consommee |
| Securite (donnees PRO) | 1.8 | Status spoofable |
| Backend protection | 1.5 | Aucun appel backend |
| RBAC | 1.5 | Route publique fallback |
| KYC gating | 1.0 | N/A / absent |
| Premium gating | 1.5 | N/A / absent |
| DB coherence | 2.0 | Pas de flux DB direct |
| Performance | 4.2 | Page legere |
| Mobile UX | 3.8 | Responsive correct |
| Monitoring | 1.5 | Aucune instrumentation |
| Tests | 1.5 | Aucun test dedie |

**Score global page : 2.3 / 5**

---

### 9) /dashboard/subscription/success

### Frontend

- **Fichier** : `apps/web/src/app/dashboard/subscription/success/page.tsx` (438 lignes)
- **Composants lies** : page client + `Suspense` wrapper.
- **Workflow** : lit `oid` query, appelle `/payment/status/:oid`, affiche etats `PAID/PENDING/FAILED`.
- **Etats geres** : oid manquant, loading, erreur reseau, pending, failed, unknown, paid.
- **Accessibilite** : loaders `motion-safe`; cards erreur avec `role="alert"`.
- **Animations** : confetti respecte reduced-motion; mais multiples transitions non `motion-safe`.
- **Redirections** : aucune verification role via `DashboardLayout`.
- **Securite client** : verification status serveur presente.
- **Bugs critiques** :
  - `setUser(await getJSON<PublicUser>('/pro/me'))` alors que `/pro/me` retourne `{ user, profile, ... }`.
  - `handleRetry` ne relance pas la verification (dependances `useEffect` n'incluent pas un trigger retry).
  - Typage reponse status faux (`oid` attendu, backend renvoie `reference`).
- **Mobile UX** : bon responsive (`sm:flex-row`, max widths).

### API / Backend

- **Endpoint** : `GET /api/payment/status/:oid`
- **Guard** : `JwtAuthGuard + RolesGuard + @Roles('PRO')`.
- **Ownership** : service verifie `order.proUserId === userId`.
- **Reponse** : `{ reference, planType, amount, currency, status, createdAt, paidAt }`.

### DB

- Modele : `PaymentOrder` (`oid`, `status`, `proUserId`, `paidAt`).
- Cohesion : ownership strict.

### Performance & Core Web Vitals

- **FCP estime** : bon.
- **TTI estime** : moyen si confetti active (manip DOM + animations).

### Monitoring & Resilience

- Console errors en production (`console.error`) sans telemetry.
- Retry UI present mais logique de retry defectueuse.

### i18n / RTL readiness

- FR hardcode.
- Quelques `group-hover:translate-x-1` non neutralises RTL (cosmetique).

### Problemes & recommandations

| # | Severite | Probleme | Impact metier | Effort (XS/S/M/L) | Action |
|---|---|---|---|---|---|
| SS-01 | CRITIQUE | `setUser` avec payload `/pro/me` incompatible `PublicUser` | Corruption store auth, redirects/badges premium incoherents | S | Rafraichir via `/auth/me` ou mapper strictement la shape |
| SS-02 | HIGH | Retry button ne relance pas la verification status | Utilisateur bloque sur ecran erreur, support accru | XS | Appeler explicitement la fonction de verif dans `handleRetry` |
| SS-03 | MEDIUM | Page hors `DashboardLayout` (pas de gate role/KYC UI) | Incoherence navigation dashboard, acces client possible a la vue | S | Integrer `DashboardLayout` ou guard role explicite |
| SS-04 | LOW | Typage status drift (`oid` vs `reference`) | Dette technique, risque regressions futures | XS | Aligner type frontend sur reponse backend |

### TODO

- [ ] Corriger refresh auth store apres paiement (`/auth/me`) (Effort S)
- [ ] Reparer `handleRetry` pour relancer verification (Effort XS)
- [ ] Integrer gate role/layout cohérent (Effort S)
- [ ] Aligner types status API (Effort XS)

### Score detaille — /dashboard/subscription/success

| Aspect | Score /5 | Justification |
| ------ | -------- | ------------- |
| Frontend structure | 3.2 | Etats complets, mais logique fragile |
| UX & states | 3.0 | Retry cassé |
| Validation front | 3.0 | Verification serveur presente |
| Securite (donnees PRO) | 4.0 | Endpoint ownership-protected |
| Backend protection | 4.4 | Roles + ownership solides |
| RBAC | 3.0 | Page elle-meme non gatee par layout |
| KYC gating | 2.5 | Non applique UI page |
| Premium gating | 3.2 | Depend status payment |
| DB coherence | 4.0 | PaymentOrder coherent |
| Performance | 3.6 | Confetti peut charger CPU |
| Mobile UX | 4.0 | Responsive correct |
| Monitoring | 2.0 | Console logs seulement |
| Tests | 2.0 | Pas de tests integration success page |

**Score global page : 3.1 / 5**

---

### 10) /dashboard/subscription/cancel

### Frontend

- **Fichier** : `apps/web/src/app/dashboard/subscription/cancel/page.tsx` (67 lignes)
- **Composants lies** : page statique client.
- **Etats geres** : page statique (pas de loading/error reseau).
- **Accessibilite** : structure simple, CTA lisibles.
- **Animations** : transitions non `motion-safe`.
- **Redirections** : aucune logique role; depend middleware auth seulement.
- **Securite client** : pas de donnees sensibles exposees.
- **Mobile UX** : bon comportement (`max-w`, `flex-col sm:flex-row`).

### API / Backend

- Aucun endpoint appele.

### DB

- N/A.

### Performance & Core Web Vitals

- Tres leger.

### Monitoring & Resilience

- Aucun tracking specifique.

### i18n / RTL readiness

- FR hardcode.

### Problemes & recommandations

| # | Severite | Probleme | Impact metier | Effort (XS/S/M/L) | Action |
|---|---|---|---|---|---|
| SC-01 | LOW | Pas de guard role PRO explicite (page sous `/dashboard` mais sans layout) | Incoherence UX (CLIENT peut voir la page si authed) | XS | Ajouter guard role UI ou wrapper layout |
| SC-02 | LOW | Transitions non `motion-safe` | Accessibilite motion incomplete | XS | Prefix transitions |

### TODO

- [ ] Ajouter guard role cohérent (Effort XS)
- [ ] Completer motion-safe transitions (Effort XS)

### Score detaille — /dashboard/subscription/cancel

| Aspect | Score /5 | Justification |
| ------ | -------- | ------------- |
| Frontend structure | 4.0 | Simple et clair |
| UX & states | 3.8 | Pas d'etat erreur car page statique |
| Validation front | 3.0 | N/A |
| Securite (donnees PRO) | 4.2 | Aucun data leak |
| Backend protection | 3.0 | N/A |
| RBAC | 2.8 | Role UI non applique |
| KYC gating | 2.5 | N/A |
| Premium gating | 2.5 | N/A |
| DB coherence | 3.0 | N/A |
| Performance | 4.8 | Tres leger |
| Mobile UX | 4.2 | Responsive propre |
| Monitoring | 1.8 | Pas de tracking |
| Tests | 1.5 | Aucun test dedie |

**Score global page : 3.3 / 5**

---

## 3) Synthese RBAC & Gating Dashboard

### Scenarios critiques a analyser

| # | Scenario | Attendu | Frontend | Backend | Match ? |
|---|---|---|---|---|---|
| 1 | CLIENT accede a `/dashboard` | Bloque/redirect | `DashboardLayout` redirect `/` | Routes PRO protegees par guards | PARTIEL (UI seulement sur certaines pages) |
| 2 | PRO PENDING tente `/dashboard/services` | Bloque + redirige KYC/waiting room | Waiting room via layout | `KycApprovedGuard` sur `PUT /pro/services` | OUI |
| 3 | PRO REJECTED tente `/dashboard/bookings` | Redirection vers `/dashboard/kyc` | Oui via layout | `KycApprovedGuard` bloque mutations | OUI |
| 4 | PRO non-premium tente `/dashboard` stats | Refus | Redirect frontend `/dashboard/bookings` | `GET /dashboard/stats` => `PREMIUM_REQUIRED` | OUI |
| 5 | Manipulation ID booking sur mutations PRO | Refuse | ID passe en URL | Service verifie `proId/clientId` ownership | OUI |
| 6 | CLIENT appelle endpoints PRO (`/pro/services`) en direct | Refuse 403 | N/A | `RolesGuard + @Roles('PRO')` | OUI |
| 7 | PRO KYC non approuve appelle `/payment/checkout` | Refuse 403 KYC | N/A | `KycApprovedGuard` sur checkout | OUI |
| 8 | CLIENT authed ouvre `/dashboard/subscription/cancel` | Devrait etre PRO-only (UX cohérente) | Accessible (pas de layout/role check) | Pas d'API sensible appelee | NON (coherence) |
| 9 | `/dashboard/subscription` | Exister ou rediriger proprement | Route absente | N/A | NON |
| 10 | `/pro/subscription?status=success` forge | Devrait verifier serveur | Statut affiche depuis query seule | Aucun endpoint appele | NON |

### Matrice RBAC backend complete (scope Dashboard)

| Route | Methode | Guards | Roles | KYC | Premium |
|---|---|---|---|---|---|
| `/pro/me` | GET | JwtAuthGuard + RolesGuard | PRO | Non | Non |
| `/pro/profile` | PATCH | JwtAuthGuard + RolesGuard | PRO | Service-level restriction (avatar-only si non APPROVED) | Non |
| `/pro/services` | PUT | JwtAuthGuard + RolesGuard + KycApprovedGuard | PRO | Oui | Limite free/premium server-side |
| `/pro/availability` | PUT | JwtAuthGuard + RolesGuard + KycApprovedGuard | PRO | Oui | Non |
| `/pro/portfolio` | GET | JwtAuthGuard + RolesGuard | PRO | Non | Non |
| `/pro/portfolio` | POST | JwtAuthGuard + RolesGuard + KycApprovedGuard | PRO | Oui | Oui (`PREMIUM_REQUIRED`) |
| `/pro/portfolio/:id` | DELETE | JwtAuthGuard + RolesGuard + KycApprovedGuard | PRO | Oui | Non |
| `/kyc/status` | GET | JwtAuthGuard + RolesGuard | PRO | Non | Non |
| `/kyc/submit` | POST | JwtAuthGuard + RolesGuard | PRO | Non | Non |
| `/kyc/resubmit` | POST | JwtAuthGuard + RolesGuard | PRO | Non | Non |
| `/dashboard/stats` | GET | JwtAuthGuard + RolesGuard | PRO | Non | Oui (`PREMIUM_REQUIRED`) |
| `/bookings` | GET | JwtAuthGuard | Tous auth | Non | Non |
| `/bookings/:id/status` | PATCH | JwtAuthGuard + KycApprovedGuard | Service-level PRO | Oui (PRO) | Non |
| `/bookings/:id/duration` | PATCH | JwtAuthGuard + KycApprovedGuard | Service-level PRO | Oui (PRO) | Non |
| `/bookings/:id/complete` | PATCH | JwtAuthGuard + KycApprovedGuard | Service-level PRO | Oui (PRO) | Non |
| `/bookings/:id/respond` | PATCH | JwtAuthGuard | Service-level CLIENT | Non | Non |
| `/bookings/:id/cancel` | PATCH | JwtAuthGuard | Service-level CLIENT/PRO | Service-level KYC pour PRO | Non |
| `/payment/checkout` | POST | JwtAuthGuard + RolesGuard + KycApprovedGuard | PRO | Oui | Non |
| `/payment/status/:oid` | GET | JwtAuthGuard + RolesGuard | PRO | Non | Non |
| `/payment/admin/confirm/:oid` | POST | JwtAuthGuard + RolesGuard | ADMIN | Non | Non |
| `/payment/admin/reject/:oid` | POST | JwtAuthGuard + RolesGuard | ADMIN | Non | Non |
| `/payment/admin/pending` | GET | JwtAuthGuard + RolesGuard | ADMIN | Non | Non |

### Gaps identifies

| # | Gap | Severite | Impact metier | Effort | Action |
|---|---|---|---|---|---|
| G-01 | `success/page.tsx` injecte mauvaise shape dans `authStore` | CRITIQUE | Session/UI dashboard instable apres paiement, perte confiance PRO | S | Rafraichir auth via `/auth/me` |
| G-02 | Route `/dashboard/subscription` absente, fallback `/pro/subscription` non securise | HIGH | Parcours abonnement confus, faux statuts affichables | S | Unifier route subscription et verification serveur |
| G-03 | Filtrage onglets bookings apres pagination globale | HIGH | Reservations masquées, actions PRO manquees | M | Ajouter filtrage backend par statut |
| G-04 | History backend omet `CANCELLED_BY_CLIENT_LATE` | HIGH | Historique incomplet, litiges support | XS | Ajouter status manquant dans `scope=history` |
| G-05 | Sidebar dashboard non mobile-friendly | HIGH | Friction mobile, baisse conversion/pro activation | M | Drawer/collapse mobile |
| G-06 | Mutations bookings PRO sans `@Roles('PRO')` route-level | MEDIUM | Defense-in-depth inegale | S | Ajouter RolesGuard/Decorator sur routes PRO-only |
| G-07 | Observabilite faible (pas APM/alerts/error boundary) | MEDIUM | MTTR eleve en incident prod | M | Ajouter monitoring minimal + error boundaries |

---

## 4) Contrat technique Dashboard PRO

### KYC

- **Statuts** : `NOT_SUBMITTED`, `PENDING`, `APPROVED`, `REJECTED`.
- **Transitions observees** :
  - submit: `NOT_SUBMITTED -> PENDING`
  - review admin externe (hors code): `PENDING -> APPROVED/REJECTED`
  - resubmit: `REJECTED -> PENDING`
- **Blocages backend** :
  - `KycApprovedGuard` sur operations PRO sensibles.
  - `PATCH /pro/profile` permet avatar meme si KYC non approuve; autres champs refuses.
- **Nettoyage fichiers rejetes** : non implemente explicitement a la re-soumission (les anciennes keys peuvent rester).

### Services & Availability

- **Validation coherence** :
  - services: validation Zod pricing + limites free/premium.
  - availability: Zod + client validation `start < end` + anti-doublon `dayOfWeek` service-level.
- **Double creneau** : DB `@@unique([proUserId, dayOfWeek])` sur disponibilites hebdo.
- **Service inexistant** : categories resolues et verifiees backend.
- **Protection manipulation prix** : prix stocke/valide backend via payload numerique et schemas.

### Bookings cote PRO

- **Modification statut** : `PENDING -> CONFIRMED/DECLINED` avec ownership strict.
- **Annulation** : PRO annule seulement `CONFIRMED` + reason obligatoire + KYC check service-level.
- **Ownership validation** : `updateMany` conditionnel et checks `booking.proId/clientId`.
- **Race conditions** :
  - Winner-Takes-All sur confirm/accept-modification avec transaction.
  - `respondToModification` chemin decline non transactionnel (plus fragile).
  - auto-complete back-to-back hors transaction (best effort).

### Subscription / Premium

- **Activation** : admin confirme `PaymentOrder` -> `activatePlan()` transaction (ProSubscription/ProBoost + ProProfile flags).
- **Expiration** : cron hourly `SubscriptionExpirationService` nettoie `isPremium/premiumActiveUntil/boostActiveUntil`.
- **Revocation** : via expiration ou admin reject pending payments.
- **Verification backend vs frontend** :
  - backend premium gate fort sur `/dashboard/stats` et portfolio add.
  - frontend success payment encore fragile (refresh auth incorrect).

---

## 5) Securite supplementaire

- **Tests existants lies dashboard/operations** :
  - `apps/api/src/rbac-e2e.spec.ts` (roles + KYC gates)
  - `apps/api/src/booking/booking.service.spec.ts` (mutations booking principales)
  - `apps/api/src/booking/booking-expiration.service.spec.ts` (cron EXPIRED)
  - `apps/api/src/pro/subscription-expiration.service.spec.ts` (cron premium/boost)
  - `apps/api/src/kyc/kyc-submit.spec.ts` (magic bytes + submit)
  - `apps/api/src/payment/payment.service.spec.ts` (couverture minimale)
- **Tests manquants prioritaires** :
  - integration frontend `/dashboard/subscription/success` (shape store + retry).
  - e2e dashboard bookings avec filtres statut/pagination reelle.
  - tests `scope=history` couvrant tous statuts (dont `CANCELLED_BY_CLIENT_LATE`).
  - tests e2e mobile/navigation dashboard (sidebar).
  - tests API role-level decorator sur routes bookings PRO-only (defense depth).
- **Observabilite** :
  - logs backend presents (Nest Logger) mais pas d'alerting/severity routing.
  - pas de capture erreurs frontend centralisee.
  - pas de metrics funnel dashboard (accept rate, cancel rate, KYC drop-offs, payment validation delay).
- **Detection abus** :
  - bonne base IDOR/ownership.
  - pas de detection comportementale avancee (annulations anormales, abuse operations) branchee a alerting.

---

## 6) Score global Phase 3

| Page | Score |
|------|-------|
| Composants transversaux Dashboard | 3.7 / 5 |
| /dashboard | 3.9 / 5 |
| /dashboard/profile | 3.7 / 5 |
| /dashboard/kyc | 4.0 / 5 |
| /dashboard/services | 3.8 / 5 |
| /dashboard/availability | 3.9 / 5 |
| /dashboard/bookings | 3.6 / 5 |
| /dashboard/history | 3.6 / 5 |
| /dashboard/subscription (equivalent actuel) | 2.3 / 5 |
| /dashboard/subscription/success | 3.1 / 5 |
| /dashboard/subscription/cancel | 3.3 / 5 |

### **Score moyen Phase 3 : 3.5 / 5**

- **Top 5 priorites** :
  1. Corriger corruption `authStore` sur success paiement.
  2. Unifier/sécuriser route subscription result (supprimer statut forgeable).
  3. Corriger filtre bookings par onglet cote backend.
  4. Completer filtre `scope=history` avec `CANCELLED_BY_CLIENT_LATE`.
  5. Rendre le dashboard réellement mobile-friendly (sidebar).

- **Quick wins** :
  - fix type/refresh/retry dans `success/page.tsx`.
  - ajouter status manquant dans `scope=history`.
  - nettoyer status mort `CANCELLED_AUTO_FIRST_CONFIRMED`.
  - appliquer `motion-safe:` aux transitions restantes.

- **Refacto lourde** :
  - redesign navigation dashboard mobile.
  - refonte backend listing bookings (filtres server-side par onglet + pagination coherente).
  - instrumentation monitoring/alerting bout-en-bout.

---

## 7) Annexe — Fichiers audites Phase 3

**Frontend**
- `apps/web/src/components/dashboard/DashboardLayout.tsx`
- `apps/web/src/components/dashboard/KycPendingState.tsx`
- `apps/web/src/app/dashboard/page.tsx`
- `apps/web/src/app/dashboard/profile/page.tsx`
- `apps/web/src/app/dashboard/kyc/page.tsx`
- `apps/web/src/app/dashboard/services/page.tsx`
- `apps/web/src/app/dashboard/availability/page.tsx`
- `apps/web/src/app/dashboard/bookings/page.tsx`
- `apps/web/src/app/dashboard/history/page.tsx`
- `apps/web/src/app/dashboard/subscription/success/page.tsx`
- `apps/web/src/app/dashboard/subscription/cancel/page.tsx`
- `apps/web/src/app/pro/subscription/page.tsx` (route equivalente observee)
- `apps/web/src/components/BookingStatusBadge.tsx`
- `apps/web/src/components/ConfirmDialog.tsx`
- `apps/web/src/store/authStore.ts`
- `apps/web/src/lib/api.ts`
- `apps/web/src/middleware.ts`

**Backend**
- `apps/api/src/auth/guards/roles.guard.ts`
- `apps/api/src/auth/guards/kyc-approved.guard.ts`
- `apps/api/src/dashboard/dashboard.controller.ts`
- `apps/api/src/dashboard/dashboard.service.ts`
- `apps/api/src/pro/pro.controller.ts`
- `apps/api/src/pro/pro.service.ts`
- `apps/api/src/pro/dto/update-pro-profile.dto.ts`
- `apps/api/src/pro/subscription-expiration.service.ts`
- `apps/api/src/kyc/kyc.controller.ts`
- `apps/api/src/kyc/kyc.service.ts`
- `apps/api/src/kyc/dto/resubmit-kyc.dto.ts`
- `apps/api/src/kyc/multer.config.ts`
- `apps/api/src/booking/booking.controller.ts`
- `apps/api/src/booking/booking.service.ts`
- `apps/api/src/booking/booking-expiration.service.ts`
- `apps/api/src/payment/payment.controller.ts`
- `apps/api/src/payment/payment.service.ts`
- `apps/api/src/payment/dto/initiate-payment.dto.ts`
- `apps/api/src/notifications/notifications.listener.ts`
- `apps/api/src/notifications/notifications.service.ts`
- `apps/api/src/app.module.ts`
- `apps/api/src/main.ts`

**Database**
- `packages/database/prisma/schema.prisma`

**Configuration & Tests**
- `apps/web/public/robots.txt`
- `apps/api/src/rbac-e2e.spec.ts`
- `apps/api/src/booking/booking.service.spec.ts`
- `apps/api/src/booking/booking-expiration.service.spec.ts`
- `apps/api/src/pro/subscription-expiration.service.spec.ts`
- `apps/api/src/kyc/kyc-submit.spec.ts`
- `apps/api/src/payment/payment.service.spec.ts`
- `apps/api/src/pagination-e2e.spec.ts`


---

# Phase 4 — Monétisation & Paiement (AUDIT COMPLET)

> **Date** : 2026-02-22
> **Contexte** : Audit complet du systeme de paiement, subscription, premium gating et robustesse business. Analyse E2E front/backend/DB/securite/performance/monitoring.
> Reflete l'etat actuel du code.

## 1) Résumé executif

- **Statut global** : ⚠️ Moyen — flux manuel fonctionnel, mais robustesse paiement incomplète pour production à risque business.
- **Points forts** :
  - Checkout PRO bien verrouillé backend : `JwtAuthGuard + RolesGuard + KycApprovedGuard` sur `POST /payment/checkout`.
  - Prix et plan déterminés côté serveur (`PAYMENT_PLANS`) : le client ne peut pas imposer `amount`.
  - Validation DTO stricte sur checkout (`planType` + regex `cityId/categoryId`).
  - Activation Premium/Boost atomique en transaction dans `activatePlan()`.
  - Expiration automatique des flags Premium/Boost via cron (`SubscriptionExpirationService`).
  - Protection ownership sur `GET /payment/status/:oid` (`order.proUserId === userId`).
  - `PaymentButton` côté front déjà renforcé : anti double-clic (in-flight + cooldown 3s), modal A11Y (focus trap, Escape, restore focus).
- **Risques majeurs** :
  1. **CRITIQUE** : aucun endpoint webhook ni validation de signature fournisseur (Stripe/CMI) — confirmation 100% manuelle admin.
  2. **CRITIQUE** : page legacy `/pro/subscription` affiche un succès/échec uniquement via query params forgeables (`?status=success`).
  3. **CRITIQUE** : `/dashboard/subscription/success` peut corrompre le store auth (`setUser` avec payload `/pro/me` incompatible `PublicUser`).
  4. **HIGH** : pas d’idempotency serveur sur checkout (`POST /payment/checkout`) — risque de multiples `PaymentOrder` PENDING sur spam API.
  5. **HIGH** : incohérence badge premium listing : tri premium backend actif, mais `PublicProCard` n’expose pas `isPremium` (badge “Abonné” non fiable côté front).
  6. **HIGH** : expiration Premium ne met pas à jour `ProSubscription.status=EXPIRED` (seuls flags `ProProfile` sont expirés).
  7. **MEDIUM** : route `/dashboard/subscription` absente alors que flow monétisation s’appuie sur `success/cancel`.
  8. **MEDIUM** : page `/dashboard/subscription/success` “Retry” ne relance pas réellement la vérification (effet dépend uniquement de `oid`).
  9. **LOW** : UX/Trust mismatch `/plans` : “Stripe/Visa/Mastercard” affichés alors que provider backend unique = `MANUAL`.
- **Recommandations top 5** :
  1. Ajouter un vrai canal de confirmation machine-to-machine (webhook signé) ou assumer explicitement le mode manuel sans références Stripe.
  2. Désactiver/remplacer `/pro/subscription` par une page vérifiant systématiquement `GET /payment/status/:oid`.
  3. Corriger `/dashboard/subscription/success` : mapper `/pro/me` vers `PublicUser` (ou appeler `/auth/me`) + corriger retry + corriger type `reference` vs `oid`.
  4. Ajouter idempotency applicative checkout (fenêtre courte par `proUserId + planType + city/category` si `PENDING`).
  5. Synchroniser l’expiration DB : passer aussi `ProSubscription.status` à `EXPIRED` quand `endedAt < now`.

## 2) Audit détaillé par page (Monétisation)

### 2.1 `/plans`

#### Frontend

- **Fichier** : `apps/web/src/app/plans/page.tsx` (415 lignes)
- **Composant clé** : `apps/web/src/components/payment/PaymentButton.tsx` (349 lignes)
- **CTA paiement** :
  - Premium mensuel/annuel : `PaymentButton` avec `planType` (`PREMIUM_MONTHLY|PREMIUM_ANNUAL`).
  - Boost : `PaymentButton` avec `planType=BOOST` + `cityId/categoryId` requis.
- **États gérés** :

| Etat | Implémentation | Verdict |
|---|---|---|
| Loading data catalog | `loadingData` + indicateur `Loader2` | OK |
| Form invalid boost | bouton désactivé si ville/catégorie manquantes | OK |
| Checkout in-flight | géré dans `PaymentButton` | OK |
| Success checkout | modal instructions | OK |
| Error fetch catalog | `console.error` seulement | Partiel |

- **Gestion double clic** : côté `PaymentButton` robuste (`inFlightRef`, `lastSubmitAtRef`, cooldown 3s, disable bouton).
- **Gestion retour Stripe/CMI** : aucune (mode manuel, pas de redirect provider).
- **Deep-linking** : non applicable pour checkout (modal locale).
- **Redirections** :
  - client-side : non-auth -> `/auth/login`, non-PRO -> `/`.
  - server-side : `/plans` est dans `middleware` (auth SSR), mais rôle PRO non géré au middleware.
- **Sécurité côté client** :
  - Montant manipulable visuellement mais sans impact métier (backend recalcule via plan).
  - `planType` manipulable côté payload mais contrôlé par DTO backend.
  - Absence de signature front : normal en mode backend-driven.
- **Mobile UX** :
  - Layout responsive (`lg:grid-cols-2`, boutons full width).
  - Pas de CTA sticky/bottom bar.
  - Erreurs catalog non visibles utilisateur.
- **SEO** : pas de `metadata` dédiée, pas de `noindex` explicite.
- **Performance** : page full client (`'use client'`), plusieurs icônes lucide ; pas de Stripe SDK chargé.

#### API / Backend

- Endpoints utilisés : `GET /public/cities`, `GET /public/categories`, `POST /payment/checkout`.
- `POST /payment/checkout` (`apps/api/src/payment/payment.controller.ts`) :
  - Guards : `JwtAuthGuard`, `RolesGuard`, `KycApprovedGuard`, `@Roles('PRO')`.
  - Validation : `InitiatePaymentDto` (planType + regex IDs boost).
  - Prix serveur : `PAYMENT_PLANS` (`350/3000/200 MAD`).
  - Contrôle exclusivité Premium/Boost + cooldown boost.
  - **Idempotency** : absente.

#### DB

- Modèle : `PaymentOrder` (`packages/database/prisma/schema.prisma`).
- Points clés : `oid @unique`, `status PENDING|PAID|FAILED`, `amountCents`, `provider=MANUAL`.
- Gap : pas de contrainte anti doublon PENDING court-terme.

#### Performance & Core Web Vitals

- Estimation qualitative (sans mesure instrumentée Lighthouse) :
  - LCP dépend du hero text + cards ; pas d’image lourde.
  - CLS faible (structure stable).
  - INP peut dégrader sur mobile modeste à cause d’un composant client volumineux unique.

#### Monitoring & Résilience

- Logs front : `console.error` sur fetch catalog et erreurs checkout.
- Pas de capture centralisée (Sentry/Datadog absent).
- Retry explicite absent pour chargement catalog.

#### i18n / RTL readiness

- Strings hardcodées FR.
- Devise hardcodée `MAD`.
- Peu de logique locale/RTL (pas d’internationalisation structurée).

#### Problèmes & recommandations

| # | Sévérité | Problème | Impact métier | Effort (XS/S/M/L) | Action |
|---|---|---|---|---|---|
| 1 | HIGH | Pas d’idempotency backend checkout | Multiples commandes PENDING, charge support, risque confusion facturation | M | Dédupliquer requêtes checkout sur fenêtre courte |
| 2 | MEDIUM | Erreur chargement villes/catégories non visible | Friction conversion (CTA Boost inutilisable sans feedback) | XS | Afficher bannière erreur + retry |
| 3 | LOW | Trust center mentionne Stripe/Visa/Mastercard en mode manuel | Perte de confiance si expérience réelle ne correspond pas | XS | Aligner le wording avec provider MANUAL |
| 4 | LOW | Pas de metadata/noindex dédiée | Indexation non maîtrisée pour page utilitaire PRO | XS | Ajouter metadata + robots approprié |

#### TODO

- [ ] Ajouter idempotency applicative checkout côté service (Effort M)
- [ ] Afficher un état erreur catalog utilisateur + bouton retry (Effort XS)
- [ ] Corriger le wording “moyens de paiement” selon flux réel manuel (Effort XS)
- [ ] Ajouter metadata page `/plans` (Effort XS)

#### Score détaillé — `/plans`

| Aspect | Score /5 | Justification |
| --- | --- | --- |
| Frontend structure | 4.0 | Structure claire, composant paiement isolé |
| UX & states | 3.8 | États principaux gérés, mais erreur catalog silencieuse utilisateur |
| Validation front | 4.0 | Validation boost UI + backend solide |
| Sécurité paiement | 4.2 | Manipulation montant neutralisée serveur |
| Backend protection | 4.5 | Guards PRO+KYC et validations présentes |
| Idempotency | 2.5 | Anti double submit seulement front |
| Webhook validation | 1.0 | Non implémenté (manuel) |
| DB cohérence | 4.0 | Schéma propre mais anti doublon absent |
| Premium gating | 3.8 | Auth SSR OK, rôle côté front/layout |
| Performance | 3.7 | Client-heavy mais sans SDK paiement lourd |
| Mobile UX | 3.7 | Responsive, pas de sticky CTA |
| Monitoring | 2.5 | Console logs uniquement |
| Tests | 2.5 | Peu de couverture e2e/front |

**Score global page : 3.4 / 5**

---

### 2.2 `/pro/subscription`

#### Frontend

- **Fichier** : `apps/web/src/app/pro/subscription/page.tsx` (240 lignes)
- **CTA paiement** : aucun checkout ; page de “résultat” basée sur query params.
- **États gérés** : `success|pending|failed|error` depuis URL.
- **Gestion double clic** : non applicable.
- **Gestion retour Stripe/CMI** : absente (pas de vérification serveur).
- **Deep-linking** : entièrement basé URL (`status`, `error`, `oid`).
- **Redirections** : pas de guard auth/rôle sur cette route.
- **Sécurité côté client** : **statut forgeable** (`?status=success`) sans preuve backend.
- **Mobile UX** : responsive cards/CTAs correctes.
- **SEO** : pas de metadata dédiée, pas de noindex.
- **Performance** : client component léger, dépendances lucide.

#### API / Backend

- Aucun appel backend dans cette page.
- Aucun contrôle serveur du statut affiché.

#### DB

- Aucun accès direct DB.

#### Performance & Core Web Vitals

- Faible coût runtime.
- Risque principal non perf, mais intégrité métier.

#### Monitoring & Résilience

- Présence `console.log` en production (`Statut paiement`).
- Pas de télémétrie de fraude statuts forgeables.

#### i18n / RTL readiness

- Strings FR hardcodées.

#### Problèmes & recommandations

| # | Sévérité | Problème | Impact métier | Effort (XS/S/M/L) | Action |
|---|---|---|---|---|---|
| 1 | CRITIQUE | Statut paiement déterminé uniquement par query string | Faux positifs “paiement validé”, perte confiance, litiges support | S | Vérifier status via `/payment/status/:oid` |
| 2 | HIGH | Route non protégée (pas de guard SSR auth/rôle) | Exposition d’une UX sensible sans contexte | S | Protéger ou supprimer route legacy |
| 3 | LOW | `console.log` en prod | Bruit logs, fuite contexte debug | XS | Supprimer logs debug |

#### TODO

- [ ] Remplacer logique query-only par vérification serveur de `oid` (Effort S)
- [ ] Protéger la route ou la retirer du flow actif (Effort S)
- [ ] Retirer le `console.log` debug (Effort XS)

#### Score détaillé — `/pro/subscription`

| Aspect | Score /5 | Justification |
| --- | --- | --- |
| Frontend structure | 3.0 | Composant lisible mais orienté status URL |
| UX & states | 2.5 | Etats visuels complets mais non fiables |
| Validation front | 1.5 | Aucune validation d’intégrité du statut |
| Sécurité paiement | 1.0 | Statut forgeable |
| Backend protection | 1.0 | Aucun appel backend |
| Idempotency | 1.0 | Non applicable, non traité |
| Webhook validation | 1.0 | Aucun mécanisme |
| DB cohérence | 2.0 | N/A côté page |
| Premium gating | 1.5 | Route publique |
| Performance | 4.0 | Page légère |
| Mobile UX | 3.5 | Responsive |
| Monitoring | 1.5 | Logs console uniquement |
| Tests | 1.0 | Pas de tests spécifiques |

**Score global page : 2.0 / 5**

---

### 2.3 `/dashboard/subscription`

#### Frontend

- **Route attendue** : `/dashboard/subscription`
- **Constat codebase** : dossier présent `apps/web/src/app/dashboard/subscription/` mais **pas de `page.tsx`** (seulement `success/` et `cancel/`).
- **Impact** : flux subscription incomplet dans l’URL cible attendue.

#### API / Backend

- Aucun endpoint directement consommé faute de page.

#### DB

- N/A

#### Performance & Core Web Vitals

- N/A (page absente).

#### Monitoring & Résilience

- N/A

#### i18n / RTL readiness

- N/A

#### Problèmes & recommandations

| # | Sévérité | Problème | Impact métier | Effort (XS/S/M/L) | Action |
|---|---|---|---|---|---|
| 1 | MEDIUM | Page `/dashboard/subscription` absente | Rupture de parcours, incohérences de navigation/QA | XS | Créer route pivot ou rediriger explicitement |

#### TODO

- [ ] Ajouter `apps/web/src/app/dashboard/subscription/page.tsx` (ou redirect server) (Effort XS)

#### Score détaillé — `/dashboard/subscription`

| Aspect | Score /5 | Justification |
| --- | --- | --- |
| Frontend structure | 1.0 | Page manquante |
| UX & states | 1.0 | N/A |
| Validation front | 1.0 | N/A |
| Sécurité paiement | 1.0 | N/A |
| Backend protection | 1.0 | N/A |
| Idempotency | 1.0 | N/A |
| Webhook validation | 1.0 | N/A |
| DB cohérence | 1.0 | N/A |
| Premium gating | 1.0 | N/A |
| Performance | 1.0 | N/A |
| Mobile UX | 1.0 | N/A |
| Monitoring | 1.0 | N/A |
| Tests | 1.0 | N/A |

**Score global page : 1.0 / 5**

---

### 2.4 `/dashboard/subscription/success`

#### Frontend

- **Fichier** : `apps/web/src/app/dashboard/subscription/success/page.tsx` (438 lignes)
- **CTA** : retour dashboard / plans selon statuts (`PENDING`, `FAILED`, `PAID`, etc.).
- **États gérés** :

| Etat | Implémentation | Verdict |
|---|---|---|
| OID manquant | écran erreur dédié | OK |
| Loading vérification | spinner + message | OK |
| Erreur réseau | écran + bouton retry | Partiel |
| PENDING/FAILED/UNKNOWN | écrans dédiés | OK |
| PAID | écran succès + confetti conditionné `prefers-reduced-motion` | OK |

- **Gestion double clic** : non applicable.
- **Gestion retour Stripe/CMI** : indirecte via `GET /payment/status/:oid` (provider agnostique).
- **Deep-linking** : oui via `?oid=`.
- **Redirections** : dépend du middleware `/dashboard/*` (auth seulement).
- **Sécurité côté client** :
  - Vérifie backend status, donc meilleure intégrité que `/pro/subscription`.
  - **Bug contrat** : type front attend `oid`, backend renvoie `reference`.
  - **Bug store** : appel `getJSON<PublicUser>('/pro/me')` puis `setUser(updatedUser)` ; `/pro/me` ne retourne pas `PublicUser` -> risque corruption authStore.
  - **Bug retry** : `handleRetry` ne retrigger pas `useEffect` (dépendance `oid` inchangée).
- **Mobile UX** : layout responsive (breakpoints `sm`/`md`), CTAs empilés mobile.
- **SEO** : pas de metadata/noindex explicites.
- **Performance** : composant client volumineux + confetti DOM manuel (30 éléments), protégé par `prefers-reduced-motion`.

#### API / Backend

- Endpoint utilisé : `GET /payment/status/:oid`.
- Guard backend : `JwtAuthGuard + RolesGuard`, `@Roles('PRO')`.
- Ownership check présent (`order.proUserId` vs JWT user).

#### DB

- Lit `PaymentOrder` + calcule montant via `amountCents`.
- Cohérence bonne côté lecture status.

#### Performance & Core Web Vitals

- TTI impacté par composant client + logique d’état multiple.
- LCP modéré (texte/cartes). Confetti peut affecter INP sur devices faibles (mais limité dans le temps).

#### Monitoring & Résilience

- Logs console sur erreurs (`verify payment`, `refresh user`).
- Pas de tracing d’échec retry.

#### i18n / RTL readiness

- Strings FR hardcodées.
- Dates non localisées finement ici (principalement texte statique).

#### Problèmes & recommandations

| # | Sévérité | Problème | Impact métier | Effort (XS/S/M/L) | Action |
|---|---|---|---|---|---|
| 1 | CRITIQUE | `setUser` avec payload `/pro/me` non compatible `PublicUser` | Session incohérente, bugs dashboard, support élevé | S | Mapper correctement `/pro/me` ou utiliser `/auth/me` |
| 2 | HIGH | Contrat API front/back mismatch (`oid` vs `reference`) | Risque bug latent lors usage référence | XS | Aligner type `PaymentStatusResponse` |
| 3 | MEDIUM | Bouton “Réessayer” n’effectue pas de nouveau fetch | Blocage UX en erreur réseau, drop conversion | XS | Exécuter explicitement `verifyPayment()` au clic |
| 4 | MEDIUM | Pas de noindex explicite pour page utilitaire privée | Indexation accidentelle potentielle | XS | Ajouter metadata robots noindex |

#### TODO

- [ ] Corriger refresh auth store post-paiement (Effort S)
- [ ] Corriger le type `PaymentStatusResponse` (`reference`) (Effort XS)
- [ ] Corriger `handleRetry` pour relancer la requête (Effort XS)
- [ ] Ajouter metadata `robots: { index: false }` (Effort XS)

#### Score détaillé — `/dashboard/subscription/success`

| Aspect | Score /5 | Justification |
| --- | --- | --- |
| Frontend structure | 3.5 | États complets mais composant surchargé |
| UX & states | 3.8 | Bonne couverture des cas, retry cassé |
| Validation front | 3.0 | OID check présent |
| Sécurité paiement | 4.0 | Vérification status serveur |
| Backend protection | 4.5 | Guards + ownership solides |
| Idempotency | 2.0 | Dépend du checkout/admin, non géré ici |
| Webhook validation | 1.0 | Pas de webhook |
| DB cohérence | 3.5 | Lecture cohérente, mais flux global manuel |
| Premium gating | 3.0 | Auth SSR seulement, role géré API |
| Performance | 3.3 | Client-heavy + confetti |
| Mobile UX | 4.0 | Responsive correct |
| Monitoring | 2.0 | Console logs uniquement |
| Tests | 1.5 | Pas de tests dédiés front |

**Score global page : 3.0 / 5**

---

### 2.5 `/dashboard/subscription/cancel`

#### Frontend

- **Fichier** : `apps/web/src/app/dashboard/subscription/cancel/page.tsx` (67 lignes)
- **CTA** : “Réessayer” -> `/plans`, “Retour au Dashboard” -> `/dashboard`.
- **États gérés** : page statique unique.
- **Gestion double clic** : N/A.
- **Retour Stripe/CMI** : aucun contrôle backend, écran purement informatif.
- **Deep-linking** : possible direct.
- **Redirections** : auth via middleware `/dashboard/*`.
- **Sécurité côté client** : message “Aucun montant n’a été débité” sans vérification transactionnelle.
- **Mobile UX** : responsive simple.
- **SEO** : pas de metadata/noindex explicite.
- **Performance** : page légère.

#### API / Backend

- Aucun appel API.

#### DB

- N/A

#### Performance & Core Web Vitals

- Très légère ; coût faible.

#### Monitoring & Résilience

- Aucun logging métier.

#### i18n / RTL readiness

- Texte FR hardcodé.

#### Problèmes & recommandations

| # | Sévérité | Problème | Impact métier | Effort (XS/S/M/L) | Action |
|---|---|---|---|---|---|
| 1 | MEDIUM | Message de non-débit non vérifié serveur | Risque de litige perception paiement | S | Ajouter vérification optionnelle par `oid` |
| 2 | LOW | Pas de metadata/noindex explicite | Indexation page utilitaire | XS | Ajouter metadata robots |

#### TODO

- [ ] Ajouter un mode avec `oid` optionnel + vérification serveur (Effort S)
- [ ] Ajouter metadata `noindex` (Effort XS)

#### Score détaillé — `/dashboard/subscription/cancel`

| Aspect | Score /5 | Justification |
| --- | --- | --- |
| Frontend structure | 4.0 | Clair, simple |
| UX & states | 3.2 | Pas d’état vérifié |
| Validation front | 2.0 | Aucun contrôle |
| Sécurité paiement | 2.5 | Message non vérifié |
| Backend protection | 1.5 | Pas d’intégration backend |
| Idempotency | 1.0 | N/A |
| Webhook validation | 1.0 | N/A |
| DB cohérence | 2.0 | N/A |
| Premium gating | 3.0 | Auth route via middleware |
| Performance | 4.5 | Très léger |
| Mobile UX | 4.0 | Correct |
| Monitoring | 1.0 | Aucun |
| Tests | 1.0 | Aucun test dédié |

**Score global page : 2.6 / 5**

---

### 2.6 CTA premium dans `/dashboard`

#### Frontend

- **Fichiers** :
  - `apps/web/src/app/dashboard/page.tsx` (356 lignes)
  - `apps/web/src/components/dashboard/DashboardLayout.tsx` (345 lignes)
  - `apps/web/src/app/dashboard/services/page.tsx` (475 lignes)
  - `apps/web/src/app/dashboard/profile/page.tsx` (468 lignes)
- **Comportement** :
  - Dashboard overview visible uniquement si `effectiveIsPremium` (sidebar + redirect `router.replace('/dashboard/bookings')` si non premium).
  - `GET /dashboard/stats` déclenche premium gate backend (`PREMIUM_REQUIRED`).
  - Upsell messages Premium visibles dans services/profile.
- **Sécurité client** : gating visuel frontend + vérification backend pour stats et portfolio.
- **Mobile UX** : dashboard desktop-first (sidebar fixe 64), ergonomie mobile limitée.
- **SEO** : pages dashboard sans metadata dédiée/noindex explicite.

#### API / Backend

- `GET /dashboard/stats` (`JwtAuthGuard + RolesGuard + @Roles('PRO')`) + check service `isPremium`.
- `POST /pro/portfolio` : premium gate backend (`ForbiddenException('PREMIUM_REQUIRED')`).

#### DB

- Source de vérité premium : `ProProfile.isPremium` + `premiumActiveUntil`.

#### Performance & Core Web Vitals

- Requêtes redondantes `/pro/me` possibles selon pages.
- Dashboard chargé en composants client.

#### Monitoring & Résilience

- Pas de métriques business (upsell->checkout->activation).

#### i18n / RTL readiness

- Textes FR hardcodés ; devise MAD dans upsell.

#### Problèmes & recommandations

| # | Sévérité | Problème | Impact métier | Effort (XS/S/M/L) | Action |
|---|---|---|---|---|---|
| 1 | MEDIUM | Gating premium hétérogène selon endpoints | UX incohérente, friction PRO free | M | Formaliser un PremiumGuard backend réutilisable |
| 2 | MEDIUM | Dashboard mobile peu optimisé (sidebar fixe) | Baisse conversion upsell mobile PRO | M | Implémenter nav mobile dashboard |
| 3 | LOW | Pas de noindex explicite pages dashboard | Risque indexation pages privées | XS | Metadata robots noindex sur segment dashboard |

#### TODO

- [ ] Introduire un guard premium backend réutilisable (Effort M)
- [ ] Améliorer la navigation mobile dashboard (Effort M)
- [ ] Ajouter metadata noindex dashboard (Effort XS)

#### Score détaillé — `CTA premium /dashboard`

| Aspect | Score /5 | Justification |
| --- | --- | --- |
| Frontend structure | 4.0 | Gating présent layout + pages |
| UX & states | 3.7 | Redirects cohérents mais UX mobile faible |
| Validation front | 3.0 | Principalement backend-driven |
| Sécurité paiement | 3.5 | Contexte upsell correct, pas de paiement direct |
| Backend protection | 4.3 | Premium check service sur stats/portfolio |
| Idempotency | 1.0 | N/A |
| Webhook validation | 1.0 | N/A |
| DB cohérence | 3.8 | Flags premium utilisés |
| Premium gating | 4.0 | Backend + frontend combinés |
| Performance | 3.3 | Plusieurs appels /pro/me possibles |
| Mobile UX | 2.8 | Sidebar desktop-first |
| Monitoring | 2.0 | Pas de funnel metrics |
| Tests | 2.5 | Peu de couverture e2e premium funnel |

**Score global page : 3.1 / 5**

---

### 2.7 Pages affichant badges Premium / Boost

#### Frontend

- **Fichiers principaux** :
  - `apps/web/src/app/pro/[publicId]/page.tsx` (245 lignes) : badge “Premium” sur détail pro.
  - `apps/web/src/components/home/FeaturedPros.tsx` (226 lignes) : badge “Abonné” conditionné `pro.isPremium`.
  - `apps/web/src/components/ProCard.tsx` (75 lignes) : pas de badge premium.
- **Constat** :
  - Backend détail pro expose `isPremium` -> badge détail cohérent.
  - Backend liste `PublicProCard` n’expose pas `isPremium` (contrat) -> badge “Abonné” de `FeaturedPros` généralement inactif.
  - Aucun badge Boost explicite côté UI publique observée.

#### API / Backend

- `GET /public/pros/v2` trie premium-first + boost recency, mais payload `PublicProCard` ne contient pas `isPremium`.
- `GET /public/pros/:id` expose `isPremium` sur détail.

#### DB

- `ProProfile.isPremium` + `premiumActiveUntil` / `boostActiveUntil`.

#### Performance & Core Web Vitals

- Pas d’impact notable direct, mais incohérence de signal visuel peut affecter conversion.

#### Monitoring & Résilience

- Aucun monitoring de cohérence badge vs statut réel.

#### i18n / RTL readiness

- Labels badges FR hardcodés.

#### Problèmes & recommandations

| # | Sévérité | Problème | Impact métier | Effort (XS/S/M/L) | Action |
|---|---|---|---|---|---|
| 1 | HIGH | Contrat `PublicProCard` sans `isPremium` alors que UI l’attend | Valeur premium non visible, perte perçue d’avantage payant | S | Étendre contrat + mapper `isPremium` côté API liste |
| 2 | MEDIUM | Pas de badge Boost explicite public | Valeur Boost peu lisible, ROI perçu réduit | S | Ajouter indicateur boost cohérent (si business validé) |

#### TODO

- [ ] Ajouter `isPremium` à `PublicProCard` + mappers frontend/backend (Effort S)
- [ ] Définir stratégie badge Boost (Effort S)

#### Score détaillé — `Badges Premium/Boost`

| Aspect | Score /5 | Justification |
| --- | --- | --- |
| Frontend structure | 3.2 | Badges présents mais incohérents selon pages |
| UX & states | 2.8 | Signal premium incomplet |
| Validation front | 2.0 | Dépend du payload backend |
| Sécurité paiement | 3.0 | Peu de risque sécurité direct |
| Backend protection | 3.5 | Tri premium/boost OK |
| Idempotency | 1.0 | N/A |
| Webhook validation | 1.0 | N/A |
| DB cohérence | 3.5 | Flags existants |
| Premium gating | 3.0 | Gating partiel, affichage incohérent |
| Performance | 4.0 | Léger |
| Mobile UX | 3.5 | Correct |
| Monitoring | 1.5 | Aucun contrôle cohérence |
| Tests | 1.5 | Pas de tests contrat badge |

**Score global page : 2.7 / 5**

---

### 2.8 Composants transversaux (PaymentButton, checkout logic, store subscription, middleware gating premium, premium guard backend)

#### Frontend

- **`PaymentButton`** (`apps/web/src/components/payment/PaymentButton.tsx`, 349 lignes) :
  - Anti double submit front solide.
  - Modal A11Y solide (dialog + trap + Escape + restore focus).
  - Erreurs en toast + `console.error`.
- **Store subscription** :
  - `useAuthStore` attend `PublicUser` (`apps/web/src/store/authStore.ts`, 47 lignes).
  - `success/page.tsx` injecte `/pro/me` non conforme -> risque fort.
- **Middleware gating premium** :
  - `apps/web/src/middleware.ts` protège auth (`/plans`, `/dashboard`, `/book`) mais **pas de gating premium**.

#### API / Backend

- Checkout logic serveur (`payment.service.ts`) :
  - Prix serveur, DTO validation, exclusivité plan, cooldown boost.
  - Activation transactionnelle.
  - Pas de webhook, pas idempotency, pas signature provider.
- Premium guard backend :
  - Pas de `PremiumGuard` central, check dispersé (ex: `DashboardService`, `ProService.addPortfolioImage`).

#### DB

- Bons modèles de base (`PaymentOrder`, `ProSubscription`, `ProBoost`).
- Gaps : pas de colonne idempotency key, pas de statut EXPIRED synchronisé sur `ProSubscription` via cron.

#### Performance & Core Web Vitals

- Aucune lib Stripe côté web => bundle paiement léger.
- Complexité surtout logique d’état et robustesse, pas poids JS provider.

#### Monitoring & Résilience

- Logger Nest présent pour create/confirm/reject/expire.
- Pas de pipeline d’alerting financier (échecs anormaux, backlog pending, écarts activation).

#### i18n / RTL readiness

- FR hardcodé généralisé.
- Montants MAD hardcodés, pas de formatting locale dynamique.

#### Problèmes & recommandations

| # | Sévérité | Problème | Impact métier | Effort (XS/S/M/L) | Action |
|---|---|---|---|---|---|
| 1 | HIGH | Pas de PremiumGuard transversal backend | Règles premium dispersées, risque incohérence future | M | Créer guard/policy premium centralisée |
| 2 | HIGH | Incompatibilité type store subscription | Bugs auth et support post-paiement | S | Standardiser endpoint de refresh user |
| 3 | MEDIUM | Logs payment sans corrélation métier | Diagnostic lent incidents paiement | S | Ajouter requestId/oid structuré dans logs |

#### TODO

- [ ] Introduire une politique premium backend centralisée (Effort M)
- [ ] Corriger stratégie de refresh user après paiement (Effort S)
- [ ] Structurer les logs payment (oid/status/actor) (Effort S)

#### Score détaillé — `Composants transversaux`

| Aspect | Score /5 | Justification |
| --- | --- | --- |
| Frontend structure | 3.8 | PaymentButton propre, store coupling fragile |
| UX & states | 3.7 | Modal/feedback bons |
| Validation front | 4.0 | Guard front anti spam efficace |
| Sécurité paiement | 3.5 | Contrôle serveur fort, mais sans webhook/signature |
| Backend protection | 4.0 | Guards checkout solides |
| Idempotency | 2.0 | Non implémentée serveur |
| Webhook validation | 1.0 | Non implémentée |
| DB cohérence | 3.2 | Modèles OK, lifecycle incomplet |
| Premium gating | 3.2 | Non centralisé |
| Performance | 4.0 | Pas de SDK lourd |
| Mobile UX | 3.5 | Correct |
| Monitoring | 2.3 | Logs sans alerting |
| Tests | 2.0 | Couverture paiement faible |

**Score global page : 3.1 / 5**

## 3) Performance & Core Web Vitals

- **Bundle Stripe** : aucune dépendance Stripe/CMI détectée côté web ; pas de lazy loading provider à gérer actuellement.
- **Temps initial `/plans`** : page client avec plusieurs blocs visuels et icônes ; coût modéré, sans média lourd.
- **Hydration** : `/plans`, `PaymentButton`, `/pro/subscription`, `success/cancel` sont client components ; la logique de vérification est surtout côté client.
- **Re-renders pricing table** : faibles (state local `isAnnual`, selects boost), pas de calcul lourd.
- **CLS** : globalement faible (cards stables, hauteurs prévisibles).
- **LCP** : dépend du hero text ; pas d’image LCP dominante.
- **Point sensible** : confetti DOM dans `success/page.tsx` peut affecter INP sur appareils faibles, mais seulement si `PAID` et motion autorisée.

## 4) Monitoring & Résilience

- **Logs erreurs checkout** : présents dans `PaymentService` (`logger.log/warn`) + console front.
- **Logs erreurs webhook** : N/A (webhook absent).
- **Alerting paiement échoué** : absent (pas de canal d’alerte opérationnel).
- **Sentry/observabilité front** : non détecté.
- **Gestion erreurs réseau** :
  - `PaymentButton` : toast erreur.
  - `success/page.tsx` : écran erreur + retry (mais retry bug).
- **Retry automatique** : pas de retry métier sur checkout/status (hors refresh auth 401 global).
- **Timeout webhook / DLQ** : N/A (webhook inexistant).

## 5) i18n

- Format devise : `MAD` hardcodé sur front et backend.
- Localisation prix : non basée sur locale utilisateur.
- Format dates expiration : partiellement localisé (`fr-FR` sur dashboard), pas standardisé.
- Strings hardcodées : majoritairement FR dans toutes pages monétisation.
- Compat RTL pricing table : pas de stratégie RTL globale ; la plupart des layouts restent LTR.

## 6) Problèmes & recommandations

| # | Sévérité | Problème | Impact métier | Effort (XS/S/M/L) | Action |
|---|---|---|---|---|---|
| 1 | CRITIQUE | Pas de webhook/signature provider | Activation non fiable, risque fraude/rejeu, perte confiance PRO | L | Implémenter webhook signé + idempotency DB |
| 2 | CRITIQUE | `/pro/subscription` forgeable par query | Faux succès/échec, litiges support et réputation | S | Remplacer par page vérifiée serveur |
| 3 | CRITIQUE | Corruption possible auth store après `PAID` | Régression UX post-achat, support élevé | S | Corriger mapping `/pro/me` vs `PublicUser` |
| 4 | HIGH | Idempotency checkout absente serveur | Multiples commandes PENDING, charge admin/support | M | Dédupe applicative courte durée |
| 5 | HIGH | Expiration incomplète (`ProSubscription.status` non expiré) | Incohérences reporting/facturation interne | M | Mettre à jour statut subscription en cron |
| 6 | HIGH | Badge premium incohérent listing | Valeur premium perçue plus faible, baisse conversion upsell | S | Harmoniser contrat `PublicProCard` |
| 7 | MEDIUM | Route `/dashboard/subscription` absente | Parcours incomplet, QA instable | XS | Ajouter route pivot/redirect |
| 8 | MEDIUM | Retry status non fonctionnel | Friction en cas panne réseau | XS | Relancer fetch explicitement |
| 9 | LOW | Messaging paiement non aligné (Stripe affiché) | Perte de confiance marketing | XS | Corriger wording selon mode MANUAL |

## 7) TODO

- [ ] Implémenter un webhook fournisseur signé + validation replay + idempotency transactionnelle (Effort L)
- [ ] Supprimer/neutraliser `/pro/subscription` non vérifiée (Effort S)
- [ ] Corriger `success/page.tsx` (type response + refresh user + retry) (Effort S)
- [ ] Ajouter déduplication checkout côté backend sur fenêtre courte (Effort M)
- [ ] Étendre cron expiration pour `ProSubscription.status=EXPIRED` (Effort M)
- [ ] Harmoniser badge premium sur toutes les listes publiques (`PublicProCard`) (Effort S)
- [ ] Créer `dashboard/subscription/page.tsx` (Effort XS)
- [ ] Ajouter metadata noindex sur pages utilitaires subscription (Effort XS)

## 8) Score détaillé par page

| Page | Score /5 |
|---|---|
| `/plans` | 3.4 |
| `/pro/subscription` | 2.0 |
| `/dashboard/subscription` (absente) | 1.0 |
| `/dashboard/subscription/success` | 3.0 |
| `/dashboard/subscription/cancel` | 2.6 |
| `CTA premium /dashboard` | 3.1 |
| `Badges Premium/Boost` | 2.7 |
| `Composants transversaux paiement` | 3.1 |

## 9) Synthèse RBAC & Premium Gating

### Scénarios critiques

| # | Scenario | Attendu | Frontend | Backend | Match ? |
|---|---|---|---|---|---|
| 1 | CLIENT tente checkout | Refus immédiat | Peut forger appel API hors UI | `@Roles('PRO')` bloque | OUI |
| 2 | PRO non KYC tente checkout | 403 `KYC_NOT_APPROVED` | UI `/plans` accessible si authed PRO | `KycApprovedGuard` bloque | OUI |
| 3 | PRO KYC non premium accède stats | refus premium | redirect frontend vers bookings | `PREMIUM_REQUIRED` backend | OUI |
| 4 | Manipulation `planType` client | Prix/plan sûrs serveur | payload modifiable | DTO + `PAYMENT_PLANS` serveur | OUI |
| 5 | Appel direct API checkout spam | 1 demande cohérente | anti spam front seulement | pas de dédup serveur | PARTIEL |
| 6 | Rejeu webhook provider | rejet replay | N/A | webhook absent | NON |
| 7 | Retour success sans paiement réel | impossible d’afficher faux succès | `/pro/subscription` forgeable | `/dashboard/subscription/success` vérifie status | PARTIEL |
| 8 | Expiration subscription appliquée partout | flags + status alignés | badges selon endpoints | flags expirés, `ProSubscription.status` pas expiré | PARTIEL |

## 10) Matrice RBAC backend complète (Paiement scope)

| Route | Méthode | Guards | Roles | KYC | Premium |
|---|---|---|---|---|---|
| `/payment/checkout` | POST | `JwtAuthGuard`, `RolesGuard`, `KycApprovedGuard` | PRO | Oui | Non |
| `/payment/status/:oid` | GET | `JwtAuthGuard`, `RolesGuard` | PRO | Non | Non |
| `/payment/admin/confirm/:oid` | POST | `JwtAuthGuard`, `RolesGuard` | ADMIN | Non | Non |
| `/payment/admin/reject/:oid` | POST | `JwtAuthGuard`, `RolesGuard` | ADMIN | Non | Non |
| `/payment/admin/pending` | GET | `JwtAuthGuard`, `RolesGuard` | ADMIN | Non | Non |
| `/dashboard/stats` | GET | `JwtAuthGuard`, `RolesGuard` | PRO | Non | Oui (service check) |
| `/pro/me` | GET | `JwtAuthGuard`, `RolesGuard` | PRO | Non | Non |
| `/pro/portfolio` | POST | `JwtAuthGuard`, `RolesGuard`, `KycApprovedGuard` | PRO | Oui | Oui (service check) |
| `/public/pros/v2` | GET | Aucun | Public | N/A | filtre premium optionnel |
| `/public/pros/:id` | GET | `OptionalJwtGuard` | Public/Authed | N/A | expose `isPremium` détail |

## 11) Gaps identifiés

| # | Gap | Sévérité | Impact métier | Effort | Action |
|---|---|---|---|---|---|
| 1 | Pas de webhook/signature/idempotency provider | CRITIQUE | Validation paiement non industrialisée, risque litige | L | Ajouter webhook signé + table d’événements idempotente |
| 2 | Route legacy `/pro/subscription` forgeable | CRITIQUE | Faux statuts affichés, perte confiance | S | Retirer ou sécuriser avec vérification backend |
| 3 | `success/page.tsx` casse potentiellement auth store | CRITIQUE | Régression post-achat, tickets support | S | Corriger endpoint/type de refresh user |
| 4 | Checkout sans idempotency serveur | HIGH | Création commandes multiples, surcharge admin | M | Dédoublonner demandes PENDING |
| 5 | Expiration DB partielle | HIGH | Données subscription incohérentes | M | Expirer aussi `ProSubscription.status` |
| 6 | `/dashboard/subscription` absent | MEDIUM | Flux incomplet/fragile | XS | Créer route pivot |
| 7 | Contrat badge premium incohérent list/detail | HIGH | Réduction valeur perçue premium | S | Harmoniser contrats + UI |

## 12) Contrat technique Paiement & Subscription

### Checkout

- **Création session** : pas de session provider externe ; création locale `PaymentOrder` PENDING (`provider=MANUAL`).
- **Validation montant serveur** : oui (`PAYMENT_PLANS` côté backend).
- **Plan mapping** : `PREMIUM_MONTHLY`, `PREMIUM_ANNUAL`, `BOOST` via DTO + constants.
- **Idempotency** : absente côté serveur.
- **Timeout gestion** : pas de timeout métier explicite sur PENDING (hors traitement admin manuel).

### Webhook

- **Signature verification** : non implémentée.
- **Rejeu protection** : non implémentée.
- **Idempotency DB** : non implémentée pour événements provider.
- **Logs** : N/A webhook.
- **Gestion erreurs** : N/A webhook.

### Subscription lifecycle

- **Activation** : lors de `confirmPayment` admin -> `activatePlan()` transactionnelle.
- **Expiration** : cron horaire expire flags `ProProfile` (`isPremium`, `premiumActiveUntil`, `boostActiveUntil`).
- **Annulation** : `rejectPayment` passe commande en `FAILED` (pas de cancel workflow provider).
- **Renouvellement** : via nouveau checkout/confirm manuel.
- **Downgrade** : implicite par expiration flags.
- **Gating backend** : premium gate présent sur `/dashboard/stats` et portfolio (service-level).

### Sécurité

- **CSRF** : header `X-CSRF-PROTECTION: 1` requis pour mutations privées + cookies httpOnly sameSite strict.
- **Protection IDOR** : ownership vérifiée sur `payment/status/:oid`.
- **Protection double paiement** : partielle (front anti spam, pas idempotency backend).
- **Protection manipulation price** : forte (prix serveur, pas trusted client amount).

## 13) Sécurité supplémentaire

- **Tests existants liés paiement/subscription** :
  - `apps/api/src/payment/payment.service.spec.ts` (couverture très limitée, 1 scénario ciblé `endedAt`).
  - `apps/api/src/pro/subscription-expiration.service.spec.ts` (expiration flags profile).
  - `apps/api/src/rbac-e2e.spec.ts` couvre surtout KYC/RBAC génériques.
- **Tests manquants critiques** :
  - webhook signature verification (absent)
  - idempotency checkout/admin confirm
  - replay attack paiement
  - plan tampering e2e (`planType`, boost target)
  - tests front `/dashboard/subscription/success` (retry, mapping store)
- **Observabilité financière** :
  - logs Nest présents mais pas de dashboard/alerting business (pending backlog, délai activation, taux rejet).
- **Alerting business** : absent.

## 14) Score global Phase 4

| Page | Score |
|---|---|
| `/plans` | 3.4 / 5 |
| `/pro/subscription` | 2.0 / 5 |
| `/dashboard/subscription` (absente) | 1.0 / 5 |
| `/dashboard/subscription/success` | 3.0 / 5 |
| `/dashboard/subscription/cancel` | 2.6 / 5 |
| `CTA premium /dashboard` | 3.1 / 5 |
| `Badges Premium/Boost` | 2.7 / 5 |
| `Composants transversaux paiement` | 3.1 / 5 |

### **Score moyen Phase 4 : 2.6 / 5**

- **Top 5 priorités business** :
  1. Webhook/signature/idempotency provider (fiabilité revenu).
  2. Correction `success/page.tsx` (intégrité session post-achat).
  3. Suppression/sécurisation `/pro/subscription` forgeable.
  4. Idempotency serveur checkout.
  5. Cohérence lifecycle subscription (`status EXPIRED`) + cohérence badges premium.

- **Quick wins** :
  - corriger types `reference/oid` et retry success page.
  - supprimer logs debug frontend.
  - créer route `/dashboard/subscription` pivot.
  - corriger wording moyens de paiement sur `/plans`.

- **Refactor lourd** :
  - architecture webhook provider signée + pipeline idempotent + alerting.
  - unification du premium gating backend (guard/policy).

## 15) Annexe — Fichiers audités Phase 4

**Frontend**
- `apps/web/src/app/plans/page.tsx`
- `apps/web/src/components/payment/PaymentButton.tsx`
- `apps/web/src/app/pro/subscription/page.tsx`
- `apps/web/src/app/dashboard/subscription/success/page.tsx`
- `apps/web/src/app/dashboard/subscription/cancel/page.tsx`
- `apps/web/src/app/dashboard/page.tsx`
- `apps/web/src/components/dashboard/DashboardLayout.tsx`
- `apps/web/src/app/dashboard/services/page.tsx`
- `apps/web/src/app/dashboard/profile/page.tsx`
- `apps/web/src/components/home/FeaturedPros.tsx`
- `apps/web/src/components/ProCard.tsx`
- `apps/web/src/app/pro/[publicId]/page.tsx`
- `apps/web/src/store/authStore.ts`
- `apps/web/src/lib/api.ts`
- `apps/web/src/middleware.ts`

**Backend**
- `apps/api/src/payment/payment.controller.ts`
- `apps/api/src/payment/payment.service.ts`
- `apps/api/src/payment/payment.module.ts`
- `apps/api/src/payment/payment.service.spec.ts`
- `apps/api/src/payment/dto/initiate-payment.dto.ts`
- `apps/api/src/payment/utils/payment.constants.ts`
- `apps/api/src/payment/types/prisma-enums.ts`
- `apps/api/src/pro/subscription-expiration.service.ts`
- `apps/api/src/pro/subscription-expiration.service.spec.ts`
- `apps/api/src/dashboard/dashboard.controller.ts`
- `apps/api/src/dashboard/dashboard.service.ts`
- `apps/api/src/pro/pro.controller.ts`
- `apps/api/src/pro/pro.service.ts`
- `apps/api/src/catalog/catalog.controller.ts`
- `apps/api/src/catalog/catalog.service.ts`
- `apps/api/src/auth/guards/roles.guard.ts`
- `apps/api/src/auth/guards/kyc-approved.guard.ts`
- `apps/api/src/main.ts`
- `apps/api/src/app.module.ts`

**Database**
- `packages/database/prisma/schema.prisma`
- `packages/contracts/src/schemas/public.ts`
- `packages/contracts/src/schemas/auth.ts`

**Configuration**
- `.env.example`

---

# Phase 5 — SEO, Pages Statiques & Conformite Production (AUDIT COMPLET)

> **Date** : 2026-02-22
> **Contexte** : Audit complet des pages statiques, SEO technique, accessibilite, performance, conformite legale et credibilite production.
> Reflete l'etat actuel du code.

## 1) Resume executif

- **Statut global** : ⚠️ Moyen — base SEO en place, mais couverture technique et conformite legale encore incomplètes.
- **Points forts** :
  - Metadata presente sur `/blog`, `/help`, `/legal/cgu`, `/legal/mentions`, `/legal/privacy` (title + description + canonical + OG/Twitter sur 5/5 pages statiques auditees ; image explicite sur 4/5).
  - `sitemap.ts` et `robots.txt` existent (amelioration nette vs etats precedents).
  - `/help` a une FAQ reelle avec JSON-LD `FAQPage` et accessibilite native via `<details>/<summary>`.
  - `/blog/[slug]` utilise `generateStaticParams` + `generateMetadata` + JSON-LD `BlogPosting`.
  - Pages legales en RSC (faible cout JS et bonne robustesse de rendu).
- **Risques majeurs** :
  1. **CRITIQUE** : Mentions legales largement en placeholders (`[À compléter ...]`) -> risque de non-conformite legale en production.
  2. **HIGH** : `sitemap.ts` incomplet (pas de `/pros`, `/pro/[publicId]`, `/blog/[slug]`, etc.) -> perte d'indexation et acquisition organique.
  3. **HIGH** : Assets OG references (`/og-image.jpg`, `/og-blog-default.jpg`, `/logo.png`) absents de `apps/web/public` -> apercus sociaux potentiellement casses.
  4. **MEDIUM** : `robots.txt` n'exclut pas `/auth`, `/profile`, `/client`, `/book` -> pages utilitaires/sensibles potentiellement indexables.
  5. **MEDIUM** : `/blog` charge tout le contenu des posts cote client (`POSTS` avec sections completes) -> bundle/hydration inutilement lourds.
- **Recommandations top 5** :
  1. Completer immediatement les placeholders juridiques de `/legal/mentions` (+ point juridiction CGU, CNDP references finales).
  2. Etendre `apps/web/src/app/sitemap.ts` aux routes publiques dynamiques (`/blog/[slug]`, `/pros`, `/pro/[publicId]`).
  3. Ajouter des assets OG reels dans `apps/web/public` et aligner toutes les metadata dessus.
  4. Ajouter politique d'indexation explicite (noindex) pour pages auth/privées, et renforcer `robots.txt`.
  5. Deplacer le filtrage blog vers RSC/serveur (ou charger un dataset “listing-only”) pour reduire le JS client.

## 2) Audit detaille par page

## 1.1) `/blog`

### Frontend

- **Fichiers** :
  - `apps/web/src/app/blog/page.tsx` (27 lignes, RSC wrapper metadata)
  - `apps/web/src/components/blog/BlogContent.tsx` (271 lignes, `use client`)
  - `apps/web/src/app/blog/[slug]/page.tsx` (259 lignes, RSC article)
- **RSC vs client** : listing `/blog` rendu via composant client ; page article `/blog/[slug]` en RSC.
- **Metadata** :
  - `/blog` : title/description + canonical + OG + Twitter.
  - `/blog/[slug]` : `generateMetadata` (canonical, OG article, Twitter, keywords, authors).
- **Structured data** : `BlogPosting` sur `/blog/[slug]` via `<script type="application/ld+json">`.
- **Noindex** : non (indexable par defaut).
- **Accessibilite** :
  - labels/aria presents sur recherche + filtres.
  - navigation clavier correcte sur liens et filtres.
  - pas d'animation `animate-*` bloquee, mais mouvement hover (`hover:-translate-y-1`) non conditionne a `motion-safe`.
- **Navigation** : liens internes cohérents (`/blog/[slug]`, retour accueil).
- **Liens externes** : aucun lien externe `target="_blank"` observe.
- **Mobile UX** : grille responsive (`md/lg`), champs filtrage empiles sur petits ecrans.
- **Performance front** :
  - le composant client importe `POSTS` complet (contenus complets) -> payload JS plus lourd que necessaire pour une page listing.
  - pas de chargement image article optimisé (placeholder icone).

### API / Backend

- Pas d'endpoint backend dedie a `/blog` ou `/blog/[slug]`.
- Pas de guard/DTO/rate-limit applicables (contenu local statique).

### DB

- Aucune lecture DB pour `/blog` (source locale : `apps/web/src/lib/blogPosts.ts`).

### SEO Technique Global

- Route indexable avec canonical stable.
- Slugs articles generes statiquement (`generateStaticParams`) mais **non exposes dans `sitemap.ts`**.
- URLs OG par defaut pointent vers assets non presents dans `apps/web/public`.

### Conformite legale

- N/A direct (contenu editorial).

### Performance & Core Web Vitals

- **LCP (estimation)** : majoritairement textuel (pas d'image hero lourde).
- **INP/TTI (estimation)** : impacte par hydration du composant client + dataset `POSTS` complet.
- **CLS** : faible (layout stable, cards fixes).
- **RSC strategy** : partielle (wrapper RSC mais listing principal client).

### Monitoring & Resilience

- Pas de capture d'erreur frontend dediee (`ErrorBoundary` route-level absente).
- Pas d'instrumentation SEO/conversion specifique sur blog.

### i18n / RTL readiness

- Textes hardcodes FR.
- Date formatee via `Intl.DateTimeFormat('fr-MA')`.
- Pas de mecanisme i18n multi-langue / RTL.

### Problemes & recommandations

| # | Sévérité | Problème | Impact métier | Effort (XS/S/M/L) | Action |
|---|---|---|---|---|---|
| 1 | HIGH | Listing `/blog` charge `POSTS` complet cote client (contenu integral) | Degradation perf mobile + risque baisse engagement SEO (UX lente) | M | Servir un dataset “listing” (titre/excerpt/meta) et conserver le contenu detail cote RSC `/blog/[slug]` |
| 2 | HIGH | Articles `/blog/[slug]` absents du sitemap | Moindre decouvrabilite Google et perte trafic organique | S | Etendre `sitemap.ts` avec `getAllSlugs()` |
| 3 | MEDIUM | `og-image.jpg` / `og-blog-default.jpg` / `logo.png` non trouves dans `public` | Partage social degrade, perte CTR social | S | Ajouter assets reels + verifier URLs OG |
| 4 | LOW | Hover translate non `motion-safe` sur cards blog | Inconfort utilisateurs sensibles au mouvement | XS | Remplacer par `motion-safe:hover:-translate-y-1` ou supprimer translation |

### TODO

- [ ] Ajouter les slugs blog dans `apps/web/src/app/sitemap.ts` (Effort S)
- [ ] Introduire un modele de donnees “listing-only” pour `/blog` (Effort M)
- [ ] Ajouter assets OG manquants dans `apps/web/public` (Effort S)
- [ ] Encadrer le hover translate en `motion-safe` (Effort XS)

### Score detaille — `/blog`

| Aspect | Score /5 | Justification |
| ------ | -------- | ------------- |
| Structure frontend | 4.0 | Architecture claire, split listing/article propre |
| Accessibilite | 4.0 | Labels et navigation OK, reste un mouvement hover non conditionne |
| SEO metadata | 4.5 | Metadata riches sur listing + article |
| SEO technique | 3.0 | Slugs non presents dans sitemap |
| Conformite legale | 4.5 | Aucun enjeu legal critique direct |
| Performance | 3.0 | Bundle client alourdi par `POSTS` complet |
| Mobile UX | 4.0 | Responsive correct, filtres utilisables |
| Monitoring | 2.0 | Pas d'observabilite dediee |
| i18n readiness | 3.0 | FR seul, pas de strategy multi-langue |
| Tests | 2.0 | Pas de tests SEO/blog dedies |

**Score global page : 3.4 / 5**

---

## 1.2) `/help`

### Frontend

- **Fichier** : `apps/web/src/app/help/page.tsx` (202 lignes, RSC).
- **Metadata** : title, description, canonical, OG (sans image), Twitter card `summary`.
- **Contenu** : section contact + FAQ reelle (8 Q/R) avec `<details>/<summary>`.
- **Structured data** : JSON-LD `FAQPage` present.
- **Accessibilite** :
  - `nav aria-label`, titres hierarchiques `h1/h2`.
  - interaction FAQ native clavier.
  - icones decoratives `aria-hidden`.
- **Animations** : pas d'`animate-*` ; transitions de couleur simples.
- **Navigation** : mini-nav interne (`/pros`, `/blog`, `/legal/cgu`, `/legal/privacy`) + retour accueil.
- **Mobile UX** : layout responsive, contenu lisible, pas d'overflow horizontal detecte.

### API / Backend

- Aucune API dediee a `/help`.

### DB

- N/A (contenu statique).

### SEO Technique Global

- Page indexable, canonical explicite.
- JSON-LD FAQPage valide structurellement.
- Pas d'image OG specifiee (choix valide mais impact social plus faible).

### Conformite legale

- Page informative/support ; pas de contrainte legale directe bloquante.

### Performance & Core Web Vitals

- **FCP/LCP (estimation)** : favorable (RSC pur, pas de JS client requis).
- **INP/TTI** : très bon (interactions natives HTML).
- **CLS** : faible.

### Monitoring & Resilience

- Pas de monitoring specifique sur interactions FAQ/support.
- Pas de boundary route-level dediee.

### i18n / RTL readiness

- Textes FR hardcodes.
- Pas de switch locale, pas de version AR/EN.
- Structure HTML compatible future i18n mais non industrialisee.

### Problemes & recommandations

| # | Sévérité | Problème | Impact métier | Effort (XS/S/M/L) | Action |
|---|---|---|---|---|---|
| 1 | MEDIUM | Metadata sociale sans image OG/Twitter | CTR social plus faible lors des partages | XS | Ajouter image OG locale et referencer dans metadata |
| 2 | LOW | FAQ non testee automatiquement | Regressions silencieuses possibles sur SEO/markup | S | Ajouter test e2e simple sur presence FAQ + JSON-LD |

### TODO

- [ ] Ajouter OG image sur `/help` (Effort XS)
- [ ] Ajouter test e2e FAQ + metadata minimale (Effort S)

### Score detaille — `/help`

| Aspect | Score /5 | Justification |
| ------ | -------- | ------------- |
| Structure frontend | 4.5 | RSC propre, FAQ claire |
| Accessibilite | 4.8 | `<details>` natif, labels/navigation coherents |
| SEO metadata | 4.0 | OG/Twitter presents mais sans image |
| SEO technique | 4.0 | Canonical + JSON-LD OK |
| Conformite legale | 4.5 | Page support conforme au role attendu |
| Performance | 4.8 | RSC statique, peu de JS |
| Mobile UX | 4.5 | Responsive et lisible |
| Monitoring | 2.0 | Pas d'observabilite dediee |
| i18n readiness | 3.0 | FR only |
| Tests | 2.0 | Pas de couverture specifique |

**Score global page : 3.8 / 5**

---

## 1.3) `/legal/cgu`

### Frontend

- **Fichier** : `apps/web/src/app/legal/cgu/page.tsx` (170 lignes, RSC).
- **Metadata** : title/description + canonical + OG + Twitter.
- **Accessibilite** :
  - sommaire interne via ancres.
  - focus-visible present sur liens.
  - `aria-label` sur main/nav.
- **Navigation** : retour accueil present.
- **Mobile UX** : sections lisibles, sommaire en grille responsive.

### API / Backend

- Aucune API dediee.

### DB

- N/A.

### SEO Technique Global

- Indexable avec canonical stable.
- Pas de structured data legal (optionnel).

### Conformite legale

- Contenu CGU substantiel publie.
- **Placeholder legal restant** : `[À compléter : Ville]` dans la clause juridiction.

### Performance & Core Web Vitals

- **FCP/LCP (estimation)** : bon (RSC, contenu texte).
- **INP/TTI** : excellent (pas de JS interactif).

### Monitoring & Resilience

- Pas de monitoring specifique.

### i18n / RTL readiness

- FR uniquement.
- Balise globale `<html lang="fr">` definie au layout.

### Problemes & recommandations

| # | Sévérité | Problème | Impact métier | Effort (XS/S/M/L) | Action |
|---|---|---|---|---|---|
| 1 | MEDIUM | Placeholder juridiction (`[À compléter : Ville]`) | Faiblesse contractuelle en cas de litige | XS | Completer la ville de juridiction competente |
| 2 | MEDIUM | OG image referencee potentiellement absente du repo | Partage social degrade | XS | Ajouter/valider asset OG reel |

### TODO

- [ ] Completer la clause juridiction (Effort XS)
- [ ] Verifier asset OG pour les pages legales (Effort XS)

### Score detaille — `/legal/cgu`

| Aspect | Score /5 | Justification |
| ------ | -------- | ------------- |
| Structure frontend | 4.2 | Document structure et sommaire propres |
| Accessibilite | 4.5 | Focus, ancres, landmarks bien poses |
| SEO metadata | 4.5 | Metadata complete |
| SEO technique | 4.0 | Canonical OK, indexable |
| Conformite legale | 3.5 | Document quasi complet, 1 placeholder critique restant |
| Performance | 4.8 | RSC texte |
| Mobile UX | 4.2 | Lecture correcte sur mobile |
| Monitoring | 2.0 | Aucun suivi specifique |
| i18n readiness | 3.0 | FR only |
| Tests | 2.0 | Pas de tests legal content |

**Score global page : 3.7 / 5**

---

## 1.4) `/legal/mentions`

### Frontend

- **Fichier** : `apps/web/src/app/legal/mentions/page.tsx` (290 lignes, RSC).
- **Metadata** : title/description + canonical + OG + Twitter.
- **Accessibilite** : structure et focus states globalement corrects.
- **Contenu** : banniere explicite indiquant placeholders administratifs en attente.

### API / Backend

- Aucune API dediee.

### DB

- N/A.

### SEO Technique Global

- Page indexable avec canonical.
- Metadata sociale presente.

### Conformite legale

- **Nombreux placeholders critiques** : raison sociale, RC, IF, ICE, contact legal, hebergeur, declaration CNDP, etc.
- La page est publiee mais juridiquement inachevee.

### Performance & Core Web Vitals

- RSC texte, performance technique bonne.

### Monitoring & Resilience

- Pas de verification automatique de complétude legale.

### i18n / RTL readiness

- FR uniquement.

### Problemes & recommandations

| # | Sévérité | Problème | Impact métier | Effort (XS/S/M/L) | Action |
|---|---|---|---|---|---|
| 1 | CRITIQUE | Placeholders legaux majeurs encore exposes | Risque de non-conformite, perte de credibilite B2B/B2C, risque contentieux | S | Finaliser toutes mentions obligatoires avant prod |
| 2 | HIGH | CNDP reference non finalisee | Risque reglementaire sur traitement de donnees | S | Ajouter numero/etat CNDP et contact officiel |
| 3 | MEDIUM | OG image potentiellement manquante | Partage social degrade | XS | Ajouter asset OG verifie |

### TODO

- [ ] Completer toutes donnees societaires obligatoires (Effort S)
- [ ] Finaliser references CNDP (Effort S)
- [ ] Verifier image OG publiee (Effort XS)

### Score detaille — `/legal/mentions`

| Aspect | Score /5 | Justification |
| ------ | -------- | ------------- |
| Structure frontend | 4.0 | Structure et navigation claires |
| Accessibilite | 4.2 | Focus states et sommaire corrects |
| SEO metadata | 4.5 | Metadata complete |
| SEO technique | 4.0 | Canonical/indexation en place |
| Conformite legale | 1.5 | Placeholders critiques non acceptables en production |
| Performance | 4.8 | RSC statique |
| Mobile UX | 4.0 | Lisibilite correcte |
| Monitoring | 1.8 | Aucune garde automatisée |
| i18n readiness | 3.0 | FR only |
| Tests | 1.5 | Aucun test de conformite contenu |

**Score global page : 3.3 / 5**

---

## 1.5) `/legal/privacy`

### Frontend

- **Fichier** : `apps/web/src/app/legal/privacy/page.tsx` (398 lignes, RSC).
- **Metadata** : title/description + canonical + OG + Twitter.
- **Accessibilite** : structure semantique correcte (titres/listes), retour accueil present.
- **Design tokens** : mix de classes `text-muted-foreground`/`text-foreground` differente du reste de l'app (incoherence de convention, pas de hex direct).
- **Contexte contenu** : politique detaillée avec sections collecte, finalites, conservation, securite, droits, cookies.

### API / Backend

- Pas d'API dediee a cette page.

### DB

- N/A direct (page statique), mais contenu fait reference aux traitements KYC/booking effectivement implementes cote backend.

### SEO Technique Global

- Indexable avec canonical stable.
- Pas de structured data legal dediee (optionnel).

### Conformite legale

- Politique fournie et substantielle.
- Point restant : autorisation CNDP annoncee comme “lorsqu'elle sera obtenue” (non finalisee).
- Section cookies generique ; pas de mecanisme explicite de consentement documente cote web.

### Performance & Core Web Vitals

- RSC texte pur, performance favorable.
- Pas d'hydration client specifique.

### Monitoring & Resilience

- Pas de monitoring de versioning legal (changement de contenu non trace dans UI).

### i18n / RTL readiness

- FR only.
- Pas de variantes AR/EN pour contenu legal.

### Problemes & recommandations

| # | Sévérité | Problème | Impact métier | Effort (XS/S/M/L) | Action |
|---|---|---|---|---|---|
| 1 | HIGH | Mention CNDP non finalisee | Risque reglementaire et perception de non-conformite | S | Publier statut CNDP exact et references officielles |
| 2 | MEDIUM | Section cookies generique sans mecanisme de consentement explicite documente | Risque juridique futur si trackers non essentiels sont ajoutes | M | Documenter politique cookies operationnelle + prevoir bandeau si tracking non essentiel |
| 3 | LOW | Incoherence de classes tokens (`*-foreground`) | Dette de design system et risque d'incoherence visuelle | XS | Harmoniser classes avec le systeme de tokens principal |

### TODO

- [ ] Finaliser references CNDP (Effort S)
- [ ] Definir politique cookies operationnelle (Effort M)
- [ ] Harmoniser tokens classes privacy (Effort XS)

### Score detaille — `/legal/privacy`

| Aspect | Score /5 | Justification |
| ------ | -------- | ------------- |
| Structure frontend | 4.2 | Document riche et bien segmenté |
| Accessibilite | 4.0 | Bonne semantique globale |
| SEO metadata | 4.5 | Metadata complete |
| SEO technique | 4.0 | Canonical/indexable |
| Conformite legale | 3.5 | Base solide, CNDP/cookies a finaliser |
| Performance | 4.8 | RSC texte |
| Mobile UX | 4.0 | Lecture mobile correcte |
| Monitoring | 1.8 | Pas de suivi de conformite/version |
| i18n readiness | 3.0 | FR only |
| Tests | 1.5 | Pas de tests legal/SEO |

**Score global page : 3.5 / 5**

---

## 1.6) `sitemap.ts` / `sitemap.xml`

### Frontend

- **Fichier** : `apps/web/src/app/sitemap.ts` (13 lignes, metadata route).
- Expose 6 URLs statiques : `/`, `/blog`, `/help`, `/legal/cgu`, `/legal/mentions`, `/legal/privacy`.
- `lastModified` base sur `new Date()` au runtime.

### API / Backend

- N/A (generation cote Next web).

### DB

- Non connecte aux donnees dynamiques (pas de lecture `ProProfile.publicId`, pas de lecture de slugs blog depuis source).

### SEO Technique Global

- **Present** mais incomplet.
- Manquent les routes publiques critiques : `/pros`, `/pro/[publicId]`, `/blog/[slug]`.
- Pas de segmentation par priorite dynamique selon freshness reelle.

### Conformite legale

- N/A direct.

### Performance & Core Web Vitals

- Impact runtime negligible.
- Impact SEO global fort si couverture incomplète.

### Monitoring & Resilience

- Pas de validation CI automatique de couverture sitemap.

### i18n / RTL readiness

- Une seule locale exposee.
- Pas d'alternates hreflang.

### Problemes & recommandations

| # | Sévérité | Problème | Impact métier | Effort (XS/S/M/L) | Action |
|---|---|---|---|---|---|
| 1 | HIGH | Sitemap ne couvre pas les routes publiques dynamiques majeures | Perte trafic SEO organique et indexation partielle | S | Ajouter generation dynamique des URLs blog/pros/profils |
| 2 | MEDIUM | Pas de validation automatique de la couverture sitemap | Regressions SEO silencieuses | S | Ajouter test/CI simple sur contenu sitemap |

### TODO

- [ ] Etendre `sitemap.ts` a `/blog/[slug]` (Effort S)
- [ ] Ajouter `/pros` et `/pro/[publicId]` (Effort M)
- [ ] Ajouter garde CI couverture sitemap (Effort S)

### Score detaille — `sitemap`

| Aspect | Score /5 | Justification |
| ------ | -------- | ------------- |
| Structure frontend | 3.5 | Metadata route simple et propre |
| Accessibilite | 5.0 | N/A UI |
| SEO metadata | 2.5 | Couverture trop limitée |
| SEO technique | 2.0 | Incomplet pour pages publiques clés |
| Conformite legale | 4.5 | Pas d'enjeu legal direct |
| Performance | 4.8 | Cout technique faible |
| Mobile UX | 5.0 | N/A UI |
| Monitoring | 1.5 | Aucun controle automatise |
| i18n readiness | 2.0 | Pas de hreflang/locales |
| Tests | 1.5 | Aucun test dedie |

**Score global page : 3.2 / 5**

---

## 1.7) `robots.txt`

### Frontend

- **Fichier** : `apps/web/public/robots.txt` (5 lignes).
- Regles actuelles : `Allow: /`, `Disallow: /dashboard`, `Disallow: /api`, `Sitemap: .../sitemap.xml`.

### API / Backend

- N/A direct.

### DB

- N/A.

### SEO Technique Global

- Robots present et valide syntaxiquement.
- Ne couvre pas certaines routes privees/utilitaires (`/auth/*`, `/profile`, `/client/bookings`, `/book/*`, `/plans`).

### Conformite legale

- N/A direct.

### Performance & Core Web Vitals

- N/A direct.

### Monitoring & Resilience

- Pas de monitoring des regressions robots en CI.

### i18n / RTL readiness

- N/A direct.

### Problemes & recommandations

| # | Sévérité | Problème | Impact métier | Effort (XS/S/M/L) | Action |
|---|---|---|---|---|---|
| 1 | MEDIUM | Robots n'exclut pas plusieurs pages privées/auth | Indexation non souhaitée de pages utilitaires, dilution SEO | XS | Ajouter `Disallow` pour `/auth`, `/profile`, `/client`, `/book`, `/plans` |
| 2 | LOW | Fichier statique sans test de conformité | Risque de regression silencieuse | XS | Ajouter check CI simple du robots |

### TODO

- [ ] Etendre `robots.txt` aux routes privées non publiques (Effort XS)
- [ ] Ajouter check CI robots (Effort XS)

### Score detaille — `robots.txt`

| Aspect | Score /5 | Justification |
| ------ | -------- | ------------- |
| Structure frontend | 4.0 | Fichier simple et valide |
| Accessibilite | 5.0 | N/A UI |
| SEO metadata | 3.5 | Lien sitemap present |
| SEO technique | 3.0 | Couverture des disallow incomplète |
| Conformite legale | 4.0 | Pas d'enjeu legal direct |
| Performance | 5.0 | N/A runtime |
| Mobile UX | 5.0 | N/A UI |
| Monitoring | 1.5 | Aucune surveillance |
| i18n readiness | 3.0 | N/A |
| Tests | 1.5 | Aucun test |

**Score global page : 3.6 / 5**

---

## 1.8) `layout.tsx` (metadata globale)

### Frontend

- **Fichier** : `apps/web/src/app/layout.tsx` (38 lignes, RSC).
- Metadata globale minimale (`title`, `description` seulement).
- `<html lang="fr">` present.
- Pas de `metadataBase`, pas de defaults OG/Twitter/canonical globaux.
- `AuthBootstrap` + `ToastContainer` injectes globalement dans le layout.

### API / Backend

- N/A direct.

### DB

- N/A.

### SEO Technique Global

- Bonne base, mais absence de strategy metadata globale standardisee.
- Les pages sans metadata locale heritent d'un title/description generiques.

### Conformite legale

- N/A direct.

### Performance & Core Web Vitals

- Client components globaux (`AuthBootstrap`, `ToastContainer`) charges sur toutes les routes, y compris statiques.
- Impact potentiel sur JS initial sitewide.

### Monitoring & Resilience

- Pas de `error.tsx` / `global-error.tsx` au niveau app.
- Pas de monitoring frontend centralise detecte.

### i18n / RTL readiness

- `lang="fr"` configure.
- Pas de `dir`, pas de strategy multi-locale.

### Problemes & recommandations

| # | Sévérité | Problème | Impact métier | Effort (XS/S/M/L) | Action |
|---|---|---|---|---|---|
| 1 | HIGH | Metadata globale trop minimale (pas OG/Twitter defaults) | Incoherence SEO selon pages et risque d'oubli metadata | S | Definir un socle metadata global (siteName, OG/Twitter de base, metadataBase) |
| 2 | MEDIUM | `AuthBootstrap` charge sur pages statiques | Surcout JS/hydration global, impact perf perçue | M | Limiter bootstrap auth aux zones qui en ont besoin (ou lazy strategy) |
| 3 | MEDIUM | Pas de `global-error.tsx`/`error.tsx` | UX dégradée en cas d'erreur de rendu | S | Ajouter surfaces d'erreur globales |

### TODO

- [ ] Ajouter defaults metadata globaux dans `layout.tsx` (Effort S)
- [ ] Revoir la portee de `AuthBootstrap` (Effort M)
- [ ] Ajouter `error.tsx` / `global-error.tsx` (Effort S)

### Score detaille — `layout.tsx`

| Aspect | Score /5 | Justification |
| ------ | -------- | ------------- |
| Structure frontend | 3.8 | Layout propre mais minimaliste SEO |
| Accessibilite | 4.0 | `lang` present |
| SEO metadata | 2.5 | Defaults incomplets |
| SEO technique | 3.0 | Pas de socle global robuste |
| Conformite legale | 4.5 | N/A direct |
| Performance | 3.0 | Hydration globale non nulle |
| Mobile UX | 4.0 | N/A direct layout |
| Monitoring | 1.5 | Pas d'error boundary global |
| i18n readiness | 3.0 | FR statique |
| Tests | 1.5 | Pas de tests metadata globaux |

**Score global page : 3.1 / 5**

---

## 1.9) `head` usage (App Router)

### Frontend

- Aucun fichier `head.tsx` detecte dans `apps/web/src/app`.
- Le projet s'appuie sur Metadata API (`metadata`, `generateMetadata`, `sitemap.ts`).

### API / Backend

- N/A.

### DB

- N/A.

### SEO Technique Global

- Choix moderne cohérent (Metadata API centralisee).
- Pas de dettes `next/head` legacy observees.

### Conformite legale

- N/A direct.

### Performance & Core Web Vitals

- Aucun cout technique additionnel lie a `head.tsx` custom.

### Monitoring & Resilience

- Pas de validation automatique de coherence metadata cross-route.

### i18n / RTL readiness

- Gestion locale/alternate non centralisee (pas de pattern `alternates.languages`).

### Problemes & recommandations

| # | Sévérité | Problème | Impact métier | Effort (XS/S/M/L) | Action |
|---|---|---|---|---|---|
| 1 | LOW | Pas de check automatique coherence metadata | Risque d'incoherences SEO au fil des evolutions | XS | Ajouter lint/test metadata minimal |

### TODO

- [ ] Ajouter verification metadata en CI (Effort XS)

### Score detaille — `head usage`

| Aspect | Score /5 | Justification |
| ------ | -------- | ------------- |
| Structure frontend | 4.5 | Usage moderne Metadata API |
| Accessibilite | 5.0 | N/A direct |
| SEO metadata | 4.0 | Bonne base, mais controle automatique absent |
| SEO technique | 4.0 | Approche App Router cohérente |
| Conformite legale | 4.5 | N/A |
| Performance | 4.8 | Pas de surcharge head custom |
| Mobile UX | 5.0 | N/A |
| Monitoring | 2.0 | Pas de checks automatiques |
| i18n readiness | 3.0 | Alternates multi-langue absents |
| Tests | 1.5 | Pas de tests dedies |

**Score global page : 3.7 / 5**

---

## 1.10) Configuration SEO globale (Next.js metadata API)

### Frontend

- **Fichier** : `apps/web/next.config.ts` (7 lignes) : config vide.
- Pas de regles de redirect SEO explicites (www/non-www, trailing slash).
- Pas de headers web specifiques (x-robots-tag route-level, etc.).

### API / Backend

- **Fichier utile audite** : `apps/api/src/main.ts` (helmet/CORS cote API).
- Les headers securite API sont solides, mais ils ne couvrent pas le rendu HTML Next (app web).

### DB

- Donnees SEO dynamiques potentielles disponibles (`City.publicId`, `Category.publicId`, `ProProfile.publicId` dans `packages/database/prisma/schema.prisma`) mais non exploitees par sitemap.

### SEO Technique Global

- Pas de strategy centralisee de canonical host (www/non-www) au niveau config.
- Pas de pipeline SEO automatisé (tests/lints sitemap/robots/metadata).

### Conformite legale

- L'absence de garde SEO peut exposer des pages utilitaires en indexation.

### Performance & Core Web Vitals

- Aucun réglage cache/revalidation SEO-specifique centralisé observe.

### Monitoring & Resilience

- Pas d'alerte monitorant l'etat indexation (sitemap/robots/check search console).

### i18n / RTL readiness

- Pas de config locale Next explicite.

### Problemes & recommandations

| # | Sévérité | Problème | Impact métier | Effort (XS/S/M/L) | Action |
|---|---|---|---|---|---|
| 1 | HIGH | Absence de strategy SEO config centrale (redirect/canonical host) | Risque de duplication URL et dilution SEO | M | Definir redirects/host canonique en infra ou next config |
| 2 | HIGH | Pas d'exploitation des routes dynamiques publiques dans sitemap | Perte d'acquisition organique | M | Brancher sitemap sur sources dynamiques (blog/pros/profils) |
| 3 | MEDIUM | Pas de tests SEO automatises | Regressions silencieuses en production | S | Ajouter checks CI sur metadata/sitemap/robots |

### TODO

- [ ] Ajouter strategy host canonique (www/non-www) (Effort M)
- [ ] Connecter sitemap aux donnees dynamiques publiques (Effort M)
- [ ] Ajouter job CI SEO baseline (Effort S)

### Score detaille — `SEO config globale`

| Aspect | Score /5 | Justification |
| ------ | -------- | ------------- |
| Structure frontend | 3.0 | Config minimale |
| Accessibilite | 5.0 | N/A direct |
| SEO metadata | 3.0 | Depend beaucoup du manuel par page |
| SEO technique | 2.5 | Peu d'automatisation/config globale |
| Conformite legale | 3.5 | Controle indirect partiel |
| Performance | 4.0 | Peu de risques config, mais pas d'optimisation explicite |
| Mobile UX | 5.0 | N/A direct |
| Monitoring | 1.5 | Absence d'observabilite SEO |
| i18n readiness | 2.5 | Pas de config locale |
| Tests | 1.5 | Pas de couverture dediee |

**Score global page : 3.2 / 5**

## 3) Performance & Core Web Vitals (synthese Phase 5)

- **LCP** :
  - `/help` et `/legal/*` : LCP principalement textuel (RSC), favorable.
  - `/blog` : LCP textuel, mais interactivite ulterieure impactee par composant client.
- **CLS** : faible globalement sur pages statiques (layout peu dynamique).
- **TTI / INP** :
  - bon sur `/help` et `/legal/*` (peu ou pas de JS client).
  - plus faible sur `/blog` car filtrage + dataset local complet hydrates.
- **Hydration** :
  - layout global injecte `AuthBootstrap` et `ToastContainer` partout -> cout commun.
- **Images** :
  - pas d'usage `next/image` sur ces pages.
  - metadata OG pointent vers assets non verifies localement.
- **Cache/revalidation** :
  - pages statiques majoritairement aptes au cache.
  - `sitemap.ts` reconstruit `lastModified` au runtime (`new Date()`).

## 4) Monitoring & Resilience (synthese Phase 5)

- `error.tsx` / `global-error.tsx` non detectes dans `apps/web/src/app`.
- Pas d'integration Sentry/Datadog/LogRocket cote web detectee.
- Pas de monitoring SEO operationnel detecte (sitemap freshness, robots regression, coverage).
- Pas de tests automatiques specifiques metadata/sitemap/robots.
- 404 personnalisee non detectee (fallback Next par defaut).

## 5) i18n (synthese Phase 5)

- `html lang="fr"` present globalement.
- Contenus statiques majoritairement FR hardcodes.
- Pas de strategy i18n multi-locale (pas de `alternates.languages`, pas de dictionnaires).
- Pas de preparation RTL explicite (`dir`, mirroring classes, etc.).
- Format date partiellement localise (`fr-MA` sur blog) mais non systematise sur toutes pages.

## 6) Problemes & recommandations (transverse Phase 5)

| # | Sévérité | Problème | Impact métier | Effort (XS/S/M/L) | Action |
|---|---|---|---|---|---|
| 1 | CRITIQUE | `/legal/mentions` contient de multiples placeholders legaux | Risque juridique, perte de confiance, blocage partenariat/production | S | Finaliser toutes mentions obligatoires et valider juridiquement |
| 2 | HIGH | Sitemap incomplet (routes publiques dynamiques absentes) | Perte acquisition organique, indexation partielle des pages business | M | Generer sitemap dynamique complet |
| 3 | HIGH | Assets OG references absents du repo public | Partages sociaux sans image, baisse CTR social | S | Ajouter et versionner assets OG |
| 4 | MEDIUM | `robots.txt` n'exclut pas toutes pages privees/utilitaires | Pollution index, experience SERP degradee | XS | Etendre Disallow routes privees |
| 5 | MEDIUM | `/blog` hydrate du contenu complet inutilement | Degradation perf mobile/UX | M | Rendre listing plus leger et server-first |
| 6 | MEDIUM | Absence de monitoring SEO/A11y automatise | Regressions non detectees en production | S | Ajouter checks CI (metadata/sitemap/robots/a11y baseline) |
| 7 | LOW | i18n/RTL non prepares | Cout futur eleve pour expansion geographique | M | Definir plan i18n minimal (locales, alternates, formats) |

## 7) TODO (Phase 5)

- [ ] Completer juridiquement `apps/web/src/app/legal/mentions/page.tsx` (Effort S)
- [ ] Completer le placeholder juridiction CGU dans `apps/web/src/app/legal/cgu/page.tsx` (Effort XS)
- [ ] Etendre `apps/web/src/app/sitemap.ts` aux routes dynamiques publiques (Effort M)
- [ ] Ajouter assets OG reels dans `apps/web/public` et aligner metadata (Effort S)
- [ ] Renforcer `apps/web/public/robots.txt` pour les pages privees (Effort XS)
- [ ] Ajouter defaults metadata globaux dans `apps/web/src/app/layout.tsx` (Effort S)
- [ ] Introduire des checks CI SEO/A11y de base (Effort S)
- [ ] Optimiser `/blog` pour reduire la charge JS client (Effort M)

## 8) Score detaille par page (recap)

| Page / Element | Score |
|---|---|
| `/blog` | 3.4 / 5 |
| `/help` | 3.8 / 5 |
| `/legal/cgu` | 3.7 / 5 |
| `/legal/mentions` | 3.3 / 5 |
| `/legal/privacy` | 3.5 / 5 |
| `sitemap.ts` | 3.2 / 5 |
| `robots.txt` | 3.6 / 5 |
| `layout.tsx` | 3.1 / 5 |
| `head usage` | 3.7 / 5 |
| `configuration SEO globale` | 3.2 / 5 |

## 9) Synthese SEO & Indexation

| Élément | Statut | Impact | Action |
|---|---|---|---|
| Sitemap | Partiel | Indexation incomplète des pages publiques clés | Couvrir `/blog/[slug]`, `/pros`, `/pro/[publicId]` |
| Robots | Présent mais incomplet | Pages utilitaires privées potentiellement crawlées | Ajouter `Disallow` routes privées/auth |
| Canonical | Présent sur pages statiques auditées | Bon signal anti-duplicate sur ces routes | Etendre coherence host global (www/non-www) |
| Structured data | Partiel (`FAQPage`, `BlogPosting`) | Rich results possibles mais couverture limitée | Ajouter schema `Organization` global + legal si utile |
| OG/Twitter | Présents sur la plupart des pages | CTR social limité si image indisponible | Ajouter assets OG vérifiés |
| Meta robots | Absent (noindex non utilisé) | Risque indexation pages non souhaitées | Ajouter noindex sur pages privées/auth |
| Indexabilité pages privées | Contrôlée par auth mais pas SEO | Dilution SEO/UX SERP | Coupler middleware + robots/noindex |
| Cohérence URLs | Canonicals en `https://khadamat.ma/...` | Stable mais non forcé globalement en config | Définir redirections host/trailing slash |
| Erreurs 404 SEO | Fallback Next par défaut | Moins de contrôle UX/SEO | Ajouter `not-found.tsx` personnalisée |

## 10) Gaps identifies

| # | Gap | Sévérité | Impact métier | Effort | Action |
|---|---|---|---|---|---|
| 1 | Mentions légales non finalisées | CRITIQUE | Risque sanctions/litiges, crédibilité B2B faible | S | Finaliser infos légales obligatoires |
| 2 | Sitemap dynamique incomplet | HIGH | Trafic organique manqué | M | Générer URLs publiques complètes |
| 3 | OG assets non vérifiés dans repo | HIGH | Partages sociaux dégradés | S | Ajouter assets et tests de présence |
| 4 | Robots incomplet pour zones privées | MEDIUM | Indexation non voulue de pages utilitaires | XS | Étendre directives `Disallow` |
| 5 | Pas de noindex explicite pages auth/profil | MEDIUM | Pollution SERP et baisse confiance | S | Définir metadata robots sur segments privés |
| 6 | Pas de monitoring SEO/A11y | MEDIUM | Régressions silencieuses en production | S | Ajouter checks CI + observabilité SEO |
| 7 | Bundle blog surchargé côté client | MEDIUM | UX lente mobile, baisse engagement | M | Architecture blog server-first |

## 11) Contrat technique SEO & Production

### SEO

- **Strategie metadata Next.js** : mix `metadata` statique + `generateMetadata` pour `/blog/[slug]`.
- **Sitemap dynamique** : present via `apps/web/src/app/sitemap.ts` mais couverture partielle.
- **Robots config** : `apps/web/public/robots.txt` present, directives minimales.
- **Structured data** :
  - `FAQPage` sur `/help`
  - `BlogPosting` sur `/blog/[slug]`
  - schema `Organization` global absent.
- **Pages dynamiques (pros)** : non integrees au sitemap actuel.

### Conformite

- **CGU** : publiees, 1 placeholder juridiction a finaliser.
- **Mentions legales** : placeholders critiques encore presents.
- **Privacy** : document riche, references CNDP/cookies a finaliser.
- **Cookies** : mention textuelle presente, pas de politique technique outillée (consent manager) detectee.
- **CNDP** : references preliminaires, pas de numero final publie dans mentions/privacy.
- **Archivage version CGU** : pas de mecanisme d'historisation/versioning visible cote front.

## 12) Securite supplementaire

- **Pages sensibles indexables** :
  - `robots.txt` n'exclut pas explicitement `/auth/*`, `/profile`, `/book/*`, `/client/*`, `/plans`.
- **Exposition donnees via meta** : pas de fuite PII detectee dans metadata auditees.
- **Headers securite** :
  - API Nest : helmet solide (`apps/api/src/main.ts`).
  - Web Next : pas de politique headers securite dediee visible dans `apps/web/next.config.ts`.
- **Tests SEO automatises** : non detectes.
- **Tests accessibilite automatises** : non detectes pour pages statiques.

## 13) Score global Phase 5

| Page | Score |
|---|---|
| `/blog` | 3.4 / 5 |
| `/help` | 3.8 / 5 |
| `/legal/cgu` | 3.7 / 5 |
| `/legal/mentions` | 3.3 / 5 |
| `/legal/privacy` | 3.5 / 5 |
| `sitemap.ts` | 3.2 / 5 |
| `robots.txt` | 3.6 / 5 |
| `layout.tsx` | 3.1 / 5 |
| `head usage` | 3.7 / 5 |
| `configuration SEO globale` | 3.2 / 5 |

### **Score moyen Phase 5 : 3.5 / 5**

- **Top 5 priorites production** :
  1. Finaliser mentions legales (placeholders) et references CNDP.
  2. Completer le sitemap avec toutes routes publiques SEO.
  3. Ajouter assets OG reels et verifier tous liens metadata.
  4. Renforcer robots + noindex pages privees/auth.
  5. Mettre en place checks CI SEO/A11y minimum.
- **Quick wins SEO** :
  - robots disallow et noindex prive.
  - OG image assets.
  - extension sitemap blog slugs.
- **Risques juridiques** :
  - mentions legales incompletes et references administratives manquantes.
  - statut CNDP non finalise dans la communication publique.

## 14) Annexe — Fichiers audites Phase 5

**Frontend**
- `apps/web/src/app/blog/page.tsx`
- `apps/web/src/components/blog/BlogContent.tsx`
- `apps/web/src/app/blog/[slug]/page.tsx`
- `apps/web/src/lib/blogPosts.ts`
- `apps/web/src/app/help/page.tsx`
- `apps/web/src/app/legal/cgu/page.tsx`
- `apps/web/src/app/legal/mentions/page.tsx`
- `apps/web/src/app/legal/privacy/page.tsx`
- `apps/web/src/app/sitemap.ts`
- `apps/web/src/app/layout.tsx`
- `apps/web/public/robots.txt`
- `apps/web/next.config.ts`
- `apps/web/src/middleware.ts`

**Backend (si metadata/securite globale impact prod)**
- `apps/api/src/main.ts`

**Database (pages dynamiques indexables, potentiel sitemap dynamique)**
- `packages/database/prisma/schema.prisma`

**Configuration**
- `apps/web/package.json`

---

# Phase 1 — Auth & Acces (RE-AUDIT COMPLET)

> **Date** : 2026-02-22
> **Contexte** : Re-audit complet du systeme d'authentification, RBAC, session management, securite, performance, mobile et monitoring.
> Reflete l'etat actuel du code.

## 1) Resume executif

- **Statut global** : ⚠️ Bon mais perfectible
- **Points forts** :
  - Auth cookie-based robuste : access/refresh en httpOnly, rotation refresh, revocation globale.
  - Open-redirect protege sur login (`next`/`returnTo` valide uniquement si URL relative safe).
  - RBAC backend renforce : `RolesGuard` handler+classe, `@Roles('CLIENT')` sur `POST /bookings`, `@Roles('PRO')` sur `GET /dashboard/stats`.
  - Premium gate backend en place sur `GET /dashboard/stats` (`PREMIUM_REQUIRED`).
  - KYC gate ajoute sur `POST /payment/checkout` via `KycApprovedGuard`.
  - Validation backend stricte (DTO + whitelist + forbidNonWhitelisted) sur routes critiques auth.
  - A11y corrigee sur auth pages (alerts relies aux inputs, toggles password, `motion-safe:animate-spin`).
- **Risques majeurs** :
  1. **MEDIUM** : Lockout login in-memory (`FailedLoginService`) non partage multi-instance, reset au restart.
  2. **MEDIUM** : Pages auth/profile indexables (pas de noindex metadata dedie, robots ne bloque pas `/auth` ni `/profile`).
  3. **MEDIUM** : `postFormData()` contourne `baseFetch` (pas d'auto-refresh 401, pas de logique publique/privée centralisee).
  4. **MEDIUM** : Risque de race frontend avec `authStore.loading` non utilise partout (ex: `/profile` peut rediriger trop tot selon timing).
  5. **LOW** : UX mobile perfectible (pas de `inputMode` sur champs hybrides login/forgot, boutons toggle password < 44px).
  6. **LOW** : Multiples tokens reset-password valides en parallele (pas d'invalidation des anciens a la demande).
- **Recommandations top 5** :
  1. Externaliser le lockout dans Redis/DB (meme logique, stockage distribue).
  2. Ajouter `robots: { index: false }` sur `/auth/*` et `/profile` + aligner `robots.txt`.
  3. Uniformiser `postFormData` sur `baseFetch` (refresh/retry/credentials policy unifiee).
  4. Forcer l'usage de `authStore.loading` dans les guards client sensibles.
  5. Ajouter tests e2e auth critiques : `next` redirect, lockout, middleware matrix, refresh rotation/replay.

## 2) Audit detaille par page

### 2.1) /auth/login

#### Frontend

- **Fichier** : `apps/web/src/app/auth/login/page.tsx` (319 lignes)
- **Composants legacy** : ancien `components/auth/LoginForm.tsx` supprime; formulaire inline unique.
- **Champs** : `login` (email/telephone), `password`.
- **Validation client-side** : check minimal (login/password non vides) + `required` HTML.
- **Etats geres** :

| Etat | Implementation | Verdict |
|---|---|---|
| Loading | bouton disabled + spinner | OK |
| Error | bloc `role="alert"`, focus management via `errorRef` | OK |
| Success | redirect (`next`/`returnTo` ou fallback role) | OK |

- **Accessibilite** :
  - labels `htmlFor` corrects, `aria-invalid` + `aria-describedby` relies a `login-global-error`.
  - zone erreur `aria-live="assertive"`, focus programmatique.
  - toggle password avec `aria-label` dynamique.
- **Design tokens** : classes tokenisees (pas de hex runtime); commentaire doc contient des hex mais pas applique au rendu.
- **Animations** : spinner + transitions avec `motion-safe`.
- **Redirections** :
  - lit `next` puis fallback `returnTo` (retro-compat).
  - validation anti-open-redirect : `startsWith('/') && !startsWith('//')`.
  - fallback role : PRO -> `/dashboard`, sinon `/`.
- **Securite cote client** :
  - `postJSON('/auth/login')` via `api.ts` (cookies + header CSRF).
  - aucun token stocke en localStorage/sessionStorage.
- **Mobile UX** :
  - layout responsive (split desktop, mono-colonne mobile).
  - champ identifiant en `type="text"` sans `inputMode` (clavier non optimise).
  - boutons principaux >44px; bouton oeil password plus petit que 44px.
- **SEO** : pas de metadata dediee, pas de noindex explicite.
- **Performance** : page 100% client, bundle modere (lucide), pas de fetch initial lourd.

#### API / Backend

- **Endpoint** : `POST /api/auth/login` (`apps/api/src/auth/auth.controller.ts`).
- **Protection** : public + throttle `5/min`.
- **Validation** : `LoginDto` + `ValidationPipe(whitelist, forbidNonWhitelisted)`.
- **Securite login** :
  - lockout avant DB/bcrypt (`FailedLoginService`).
  - comparaison constante via hash dummy.
  - reject user non `ACTIVE`.
  - cookies httpOnly set cote controller, tokens jamais renvoyes dans body.

#### DB

- **Modeles** : `User`, `RefreshToken`.
- **Cohesion IDs** : reponse publique mappee sur `publicId` (`usr_*`), pas de fuite cuid sur login payload.
- **Contraintes** : `phone @unique`, `email @unique?`, `tokenHash @unique`.

#### Performance & Core Web Vitals

- **FCP estime** : bon (UI statique immediate, pas de data preload).
- **TTI estime** : bon (logique locale legere).
- **Hydration** : necessaire (`useSearchParams`, store, submit).
- **Code splitting** : correct via route-level chunk, pas de lazy supplementaire.

#### Monitoring & Resilience

- **ErrorBoundary frontend** : non detectee (`error.tsx`/`global-error.tsx` absent).
- **Logs backend** : echecs login journalises (sans PII brute).
- **Alerting securite** : non detecte.
- **Gestion 500** : erreur utilisateur generique cote front, exceptions Nest cote API.

#### i18n / RTL readiness

- Texte hardcode FR.
- `html lang="fr"` global present.
- Classes directionnelles `left/right` majoritaires, pas de strategie RTL.
- Format phone marocain supporte cote backend; UI login reste champ libre.

#### Problemes & recommandations

| # | Severite | Probleme | Impact metier | Effort (XS/S/M/L) | Action |
|---|---|---|---|---|---|
| 1 | MEDIUM | Pas de noindex explicite sur login | Indexation de pages utilitaires, dilution SEO acquisition | XS | Ajouter metadata robots `index:false, follow:false` |
| 2 | LOW | `inputMode` absent sur identifiant hybride | Friction mobile (clavier parfois inadapté) -> baisse conversion login | XS | Ajouter `inputMode="email"` conditionnel ou helper UX |
| 3 | LOW | Bouton toggle password < 44px | Accessibilite tactile degradee | XS | Agrandir hit-area (`min-h/min-w`) |
| 4 | MEDIUM | Pas de test e2e dedie `next/returnTo` | Risque regression redirect post-login | S | Ajouter spec Playwright sur redirection safe |

#### TODO

- [ ] Ajouter metadata `noindex` sur `/auth/login` (Effort XS)
- [ ] Optimiser clavier mobile du champ identifiant (Effort XS)
- [ ] Agrandir target tactile du toggle password (Effort XS)
- [ ] Ajouter test e2e `?next=` + fallback `returnTo` (Effort S)

#### Score detaille — /auth/login

| Aspect | Score /5 | Justification |
|---|---:|---|
| Frontend structure | 4.5 | Composant clair, states lisibles, pas de dead code externe |
| UX & states | 4.5 | Loading/error/success bien geres + focus erreur |
| Validation front | 3.5 | Validation minimale (non-vide) seulement |
| Securite auth | 4.5 | CSRF header + no token storage + open redirect safe |
| Backend protection | 4.5 | Throttle + lockout + status check + cookies only |
| RBAC | 5.0 | Route publique, modele coherent |
| Redirections | 4.5 | `next` + fallback role + garde legacy `returnTo` |
| DB coherence | 4.5 | publicId expose, contraintes solides |
| Performance | 4.3 | Page legere, client-only justifie |
| Mobile UX | 3.7 | Bon layout, mais clavier/toggle perfectibles |
| Monitoring | 3.0 | Logs backend presents, pas d'alerting/error boundary |
| Tests | 3.4 | Couverture partielle, manque test redirect login |

**Score global page : 4.2 / 5**

---

### 2.2) /auth/register

#### Frontend

- **Fichier** : `apps/web/src/app/auth/register/page.tsx` (964 lignes)
- **Composants lies** : `CitySelect` (`apps/web/src/components/shared/CitySelect.tsx`).
- **Champs** :
  - communs: `firstName`, `lastName`, `email`, `phone`, `password`, `confirmPassword`, `cityId`, `acceptedCgu`
  - CLIENT: `addressLine`
  - PRO: `cinNumber`, `cinFront`, `cinBack`
- **Validation client-side** : regex email/phone/CIN, regles password, match confirm, type+taille fichiers CIN (5MB max).
- **Etats geres** :

| Etat | Implementation | Verdict |
|---|---|---|
| Step role | etape 1 CLIENT/PRO, preselection via `?role=` | OK |
| Loading | bouton disabled + spinner | OK |
| Error global | bandeau `role="alert"` focusable | OK |
| Erreurs champ | messages inline par champ | OK |
| Success | redirect automatique apres register | OK |

- **Accessibilite** :
  - labels `htmlFor` presents y compris fichiers CIN (`reg-cin-front`, `reg-cin-back`).
  - `aria-invalid`/`aria-describedby` relies sur erreurs.
  - toggle password/confirm accessibles.
- **Design tokens** : pas de hex runtime, usage token classes; gradient inline via variables CSS tokenisees.
- **Animations** : classes animees passees en `motion-safe:*`; classes custom `stagger-*` neutralisees par `prefers-reduced-motion` dans `globals.css`.
- **Redirections** : PRO -> `/dashboard/kyc`, CLIENT -> `/`.
- **Securite cote client** : `postFormData('/auth/register')`, cookies include + header CSRF.
- **Mobile UX** :
  - formulaire responsive correct.
  - phone en `type="tel"` (clavier adapte).
  - pas de `inputMode` explicite.
  - toggles password tactiles petits.
- **SEO** : pas de metadata dediee/noindex.
- **Performance** : composant tres volumineux client-only (964 lignes), hydration plus lourde que necessaire.

#### API / Backend

- **Endpoint** : `POST /api/auth/register`.
- **Rate limit** : `5/min`.
- **Validation** : `RegisterDto` + whitelist/forbid.
- **Securite** :
  - hash bcrypt cost 10.
  - validations fichiers (mime + magic bytes + re-encode sharp + signatures suspectes).
  - CIN hash SHA-256 + salt obligatoire au boot.
  - transaction atomique User + ProProfile.
  - messages conflits generiques anti-enumeration.

#### DB

- **Modeles** : `User`, `ProProfile`, `RefreshToken`.
- **Atomicite** : creation User/Pro en transaction Prisma.
- **IDs** : `publicId` genere pour User (`usr_*`) et Pro (`pro_*`).
- **Contraintes** : unicite `email/phone/publicId`, `cinHash` verifie applicativement.

#### Performance & Core Web Vitals

- **FCP estime** : correct mais parse JS plus lourd (page client massive).
- **TTI estime** : moyen sur mobile bas/moyen gamme.
- **Hydration** : forte (beaucoup d'etat local + icones).
- **Lazy loading** : absent.

#### Monitoring & Resilience

- Pas de capture frontend type Sentry.
- Backend log erreurs upload/send email de maniere basique.
- Pas d'alerting securite automatise.

#### i18n / RTL readiness

- Texte FR hardcode.
- Regex phone/CIN specifiques Maroc (coherent domaine).
- Layout pas RTL-ready (left/right predominants).

#### Problemes & recommandations

| # | Severite | Probleme | Impact metier | Effort (XS/S/M/L) | Action |
|---|---|---|---|---|---|
| 1 | MEDIUM | Page monolithique client (964 lignes) | Temps d'interaction mobile degrade + maintenance risquee | M | Extraire sections (step role, infos perso, bloc KYC) |
| 2 | MEDIUM | Pas de noindex explicite | Indexation de page utilitaire d'auth -> dilution SEO | XS | Ajouter metadata robots noindex |
| 3 | LOW | Toggles password peu tactiles | Friction mobile, erreurs de saisie | XS | Augmenter taille clickable |
| 4 | LOW | `postFormData` hors `baseFetch` | Comportement HTTP non unifie (refresh/retry) | S | Refactor `postFormData` sur `baseFetch` |

#### TODO

- [ ] Decouper `register/page.tsx` en sous-composants (Effort M)
- [ ] Ajouter noindex metadata (Effort XS)
- [ ] Augmenter touch targets toggles (Effort XS)
- [ ] Unifier `postFormData` avec `baseFetch` (Effort S)

#### Score detaille — /auth/register

| Aspect | Score /5 | Justification |
|---|---:|---|
| Frontend structure | 3.8 | Fonctionnel mais tres volumineux |
| UX & states | 4.5 | Etats complets + erreurs inline solides |
| Validation front | 4.6 | Couverture regex/password/files robuste |
| Securite auth | 4.4 | Upload durci + CSRF + cookies only |
| Backend protection | 4.7 | DTO strict + tx atomique + anti-enumeration |
| RBAC | 5.0 | Role whitelist CLIENT/PRO |
| Redirections | 4.5 | Flux post-register clair |
| DB coherence | 4.5 | publicId propre, contraintes fortes |
| Performance | 3.6 | Hydration lourde pour une page auth |
| Mobile UX | 3.9 | Responsive bon, micro-UX perfectible |
| Monitoring | 3.0 | Logs basiques, pas de monitoring avance |
| Tests | 3.6 | Peu de tests frontend register |

**Score global page : 4.1 / 5**

---

### 2.3) /auth/forgot-password

#### Frontend

- **Fichier** : `apps/web/src/app/auth/forgot-password/page.tsx` (178 lignes)
- **Champs** : `identifier` (email ou telephone).
- **Validation client-side** :
  - vide interdit
  - email regex si presence `@`
  - sinon regex phone marocain
- **Etats geres** :

| Etat | Implementation | Verdict |
|---|---|---|
| Form | formulaire + erreurs inline globales | OK |
| Loading | bouton disabled + spinner | OK |
| Submitted | ecran de confirmation anti-enumeration | OK |

- **Accessibilite** : label, `aria-invalid`, `aria-describedby` vers `forgot-password-error`, `role="alert"`.
- **Design tokens** : conforme.
- **Animations** : `motion-safe:animate-spin`, transitions `motion-safe`.
- **Redirections** : liens vers login/register.
- **Securite cote client** : `postJSON('/auth/forgot-password')`, message de succes non enumerant.
- **Mobile UX** :
  - layout simple responsive.
  - `type="text"` sans `inputMode` (clavier non optimise selon cas).
- **SEO** : pas de metadata dediee/noindex.
- **Performance** : page legere client-only.

#### API / Backend

- **Endpoint** : `POST /api/auth/forgot-password`.
- **Rate limit** : `3/h`.
- **Validation** : `ForgotPasswordDto` XOR email/phone + whitelist.
- **Securite** :
  - anti-enumeration stricte (retour 200 message generic).
  - token reset 32 bytes random, stockage hash SHA-256.
  - TTL 15 min.
  - notification email si email present.

#### DB

- **Modele** : `PasswordResetToken` (`tokenHash @unique`, `usedAt`, `expiresAt`, index `[userId, expiresAt]`).
- **Point d'attention** : nouvelles demandes n'invalident pas les anciens tokens actifs.

#### Performance & Core Web Vitals

- **FCP estime** : tres bon.
- **TTI estime** : tres bon.
- **Hydration** : faible.

#### Monitoring & Resilience

- Backend log reset requests et erreurs send email.
- Pas d'alerting securite/abus detecte.
- Pas de boundary frontend dedie.

#### i18n / RTL readiness

- FR hardcode.
- Regex telecom marocaine OK fonctionnellement.
- RTL non traite.

#### Problemes & recommandations

| # | Severite | Probleme | Impact metier | Effort (XS/S/M/L) | Action |
|---|---|---|---|---|---|
| 1 | MEDIUM | Pas de noindex explicite | Indexation inutile de page utilitaire auth | XS | Ajouter metadata noindex |
| 2 | MEDIUM | Tokens reset multiples valides en parallele | Surface d'attaque plus large en cas compromission email | S | Invalider tokens precedents lors d'une nouvelle demande |
| 3 | LOW | Pas d'`inputMode` sur identifiant | UX mobile moins fluide | XS | Ajouter guidance clavier selon pattern saisi |
| 4 | LOW | Pas de focus auto sur erreur | Accessibilite clavier/screen-reader perfectible | XS | Focus bloc erreur apres validation echouee |

#### TODO

- [ ] Ajouter noindex metadata sur `/auth/forgot-password` (Effort XS)
- [ ] Invalider anciens reset tokens a la creation d'un nouveau (Effort S)
- [ ] Optimiser clavier mobile (Effort XS)
- [ ] Ajouter focus management erreur (Effort XS)

#### Score detaille — /auth/forgot-password

| Aspect | Score /5 | Justification |
|---|---:|---|
| Frontend structure | 4.5 | Page simple et claire |
| UX & states | 4.4 | Form/submitted propre |
| Validation front | 4.1 | Bonne validation simple |
| Securite auth | 4.3 | Anti-enumeration solide |
| Backend protection | 4.6 | DTO + throttle + token hash |
| RBAC | 5.0 | Endpoint public attendu |
| Redirections | 4.2 | Liens de sortie clairs |
| DB coherence | 4.2 | Model propre, mais tokens multiples |
| Performance | 4.8 | Leger |
| Mobile UX | 4.0 | Correct mais clavier non optimise |
| Monitoring | 3.0 | Logs basiques, pas d'alerting |
| Tests | 4.3 | Service spec couvre ce flux |

**Score global page : 4.2 / 5**

---

### 2.4) /auth/reset-password

#### Frontend

- **Fichier** : `apps/web/src/app/auth/reset-password/page.tsx` (287 lignes)
- **Champs** : `newPassword`, `confirmPassword`, token via querystring.
- **Validation client-side** : longueur, minuscule/majuscule/chiffre, confirmation match.
- **Etats geres** :

| Etat | Implementation | Verdict |
|---|---|---|
| Missing token | ecran invalide + CTA nouvelle demande | OK |
| Form | formulaire + regles live | OK |
| Loading | bouton disabled + spinner | OK |
| Success | ecran succes + lien login | OK |

- **Accessibilite** :
  - `aria-describedby` du password relie aux regles (`reset-password-rules`) + erreur.
  - erreurs `role="alert"`.
  - toggles password avec labels dynamiques.
- **Design tokens** : conforme.
- **Animations** : `motion-safe` applique sur spinners/transitions.
- **Redirections** : retours explicites vers login/forgot-password.
- **Securite cote client** : `postJSON('/auth/reset-password')`, token jamais persiste hors query.
- **Mobile UX** : responsive correct; toggles password tactiles petits.
- **SEO** : pas de metadata dediee/noindex.
- **Performance** : page client legere a moyenne.

#### API / Backend

- **Endpoint** : `POST /api/auth/reset-password`.
- **Rate limit** : `5/h`.
- **Validation** : `ResetPasswordDto` strict (token hex + password policy).
- **Securite** :
  - token hash compare en DB.
  - invalid/expire/used -> message generique.
  - transaction : update password + `usedAt` + revoke all refresh tokens.

#### DB

- **Modeles** : `PasswordResetToken`, `RefreshToken`, `User`.
- **Atomicite** : transaction Prisma sur reset.
- **Contraintes** : `tokenHash @unique`, invalidation single-use via `usedAt`.

#### Performance & Core Web Vitals

- **FCP estime** : bon.
- **TTI estime** : bon.
- **Hydration** : moderee (state + query params).

#### Monitoring & Resilience

- Logs backend present sur reset complete.
- Pas de monitoring frontend avance.
- Pas de boundary globale dediee.

#### i18n / RTL readiness

- FR hardcode.
- Classes non RTL-ready.

#### Problemes & recommandations

| # | Severite | Probleme | Impact metier | Effort (XS/S/M/L) | Action |
|---|---|---|---|---|---|
| 1 | MEDIUM | Pas de noindex explicite | Page utilitaire potentiellement indexee | XS | Ajouter metadata noindex |
| 2 | LOW | Toggle password avec hit-area faible | Accessibilite tactile limitee | XS | Agrandir bouton toggle |
| 3 | LOW | Pas de focus automatique sur erreur | Feedback clavier moins efficace | XS | Focus bloc erreur apres submit invalide |

#### TODO

- [ ] Ajouter metadata noindex (Effort XS)
- [ ] Augmenter touch area des toggles (Effort XS)
- [ ] Ajouter focus management erreur (Effort XS)

#### Score detaille — /auth/reset-password

| Aspect | Score /5 | Justification |
|---|---:|---|
| Frontend structure | 4.4 | Etats explicites et lisibles |
| UX & states | 4.5 | missing/success/form bien separes |
| Validation front | 4.4 | Regles fortes et feedback live |
| Securite auth | 4.5 | Token flow strict + message generique |
| Backend protection | 4.7 | tx atomique + revoke sessions |
| RBAC | 5.0 | Endpoint public approprie |
| Redirections | 4.3 | parcours login/forgot clair |
| DB coherence | 4.5 | modele reset token propre |
| Performance | 4.4 | faible complexite runtime |
| Mobile UX | 4.0 | bon layout, micro-hit areas perfectibles |
| Monitoring | 3.0 | logs oui, alerting non |
| Tests | 4.4 | bonne couverture service reset |

**Score global page : 4.3 / 5**

---

### 2.5) /profile

#### Frontend

- **Fichier** : `apps/web/src/app/profile/page.tsx` (513 lignes)
- **Composants lies** : `Header`, `authStore`, `toastStore`.
- **Champs edition** : `avatarUrl`, `firstName`, `lastName`, `cityId`, `addressLine`.
- **Validation client-side** : avatar URL valide si commence par `http://` ou `https://`; `required` HTML sur champs principaux.
- **Etats geres** :

| Etat | Implementation | Verdict |
|---|---|---|
| Pre-hydration | render `null` | OK |
| Redirect state | spinner `motion-safe:animate-spin` | OK |
| Loading villes | select disabled + placeholder | OK |
| Erreur villes | banniere visible + bouton `Reessayer` | OK |
| Saving | boutons disabled + texte | OK |
| Success | message `role="status" aria-live="polite"` | OK |

- **Accessibilite** :
  - labels `htmlFor` sur tous les inputs/edit fields.
  - message succes annonce correctement.
  - erreurs avatar et villes en `role="alert"`.
- **Design tokens** : classes tokenisees, pas de hex.
- **Animations** : spinner motion-safe; plusieurs `transition` non prefixees (principalement hover/couleur).
- **Redirections** :
  - non-auth -> `/auth/login`
  - PRO -> `/dashboard/profile`
  - logout -> `/`
- **Securite cote client** :
  - `patchJSON('/users/me')` via helper CSRF/cookies.
  - pas d'ID interne manipule.
  - chargement d'avatar externe possible (tracking image tiers).
- **Mobile UX** :
  - layout responsive mono-colonne, boutons larges.
  - formulaires utilisables sur mobile.
  - emojis decoratifs sans `aria-hidden` explicite.
- **SEO** : page privee sans noindex explicite.
- **Performance** : page client + 2 fetchs (cities + bookings count), pas de suspense.

#### API / Backend

- **Endpoint principal** : `PATCH /api/users/me`.
- **Guards/RBAC** : `JwtAuthGuard + RolesGuard + @Roles('CLIENT')`.
- **Validation** : `UpdateProfileDto` en ValidationPipe strict.
- **Cohesion IDs** : city input accepte `publicId` ou cuid; reponse mappe `id` -> `publicId` utilisateur.
- **Observations** : frontend appelle `/bookings?status=COMPLETED&limit=1` pour stats, backend supporte `scope` et renvoie `{data, meta}` (pas `{bookings,total}`), donc compteur peut etre faux.

#### DB

- **Modeles** : `User`, `City`.
- **Contraintes** : city resolved en DB via `publicId` ou `id`, puis stock interne.
- **Fuite ID interne** : corrigee sur reponse update (publicId renvoye).

#### Performance & Core Web Vitals

- **FCP estime** : moyen (client-only + AuthBootstrap init).
- **TTI estime** : moyen (state + fetchs + logique redirect).
- **Hydration** : necessaire, mais risque de flicker redirect si store pas pret.

#### Monitoring & Resilience

- Pas de boundary front dediee.
- erreurs sauvegarde en toast, erreurs villes visibles en inline.
- pas de tracing/alerting sur echec profil.

#### i18n / RTL readiness

- FR hardcode.
- layout non prepare RTL.
- format phone non concerne ici.

#### Problemes & recommandations

| # | Severite | Probleme | Impact metier | Effort (XS/S/M/L) | Action |
|---|---|---|---|---|---|
| 1 | MEDIUM | Guard client ne tient pas compte de `authStore.loading` | Redirect premature possible -> confusion/perte session percue | S | Gate redirection sur `loading === false` |
| 2 | MEDIUM | Mismatch contrat bookings (`/bookings?status...`) | Compteur missions incorrect -> perte confiance utilisateur | S | Lire `meta.total` et utiliser `scope=history` |
| 3 | MEDIUM | Pas de noindex explicite sur page privee | Indexation potentielle d'URL compte | XS | Ajouter metadata robots noindex |
| 4 | LOW | Avatar externe libre (tracking) | Risque vie privee + support | S | Ajouter allowlist domaine ou proxy image |
| 5 | LOW | Transitions non `motion-safe` sur certains boutons | UX reduced-motion perfectible | XS | Prefixer transitions pertinentes |

#### TODO

- [ ] Utiliser `authStore.loading` avant redirection (Effort S)
- [ ] Corriger fetch stats bookings (Effort S)
- [ ] Ajouter noindex sur `/profile` (Effort XS)
- [ ] Durcir policy avatarUrl (Effort S)
- [ ] Harmoniser transitions reduced-motion (Effort XS)

#### Score detaille — /profile

| Aspect | Score /5 | Justification |
|---|---:|---|
| Frontend structure | 3.9 | Complete mais dense |
| UX & states | 4.0 | Etats bien couverts, quelques incoherences data |
| Validation front | 3.8 | Validation basique + URL avatar |
| Securite auth | 4.2 | CSRF/roles solides |
| Backend protection | 4.5 | RBAC client strict + mapping publicId |
| RBAC | 4.8 | PRO bloque backend et frontend |
| Redirections | 3.7 | Possible race sans `loading` |
| DB coherence | 4.4 | city/publicId bien gere |
| Performance | 3.7 | Client-only + fetchs additionnels |
| Mobile UX | 4.0 | Correct globalement |
| Monitoring | 3.1 | Feedback partiel, pas d'observabilite avancee |
| Tests | 3.0 | Peu de tests dedies profil |

**Score global page : 3.9 / 5**

---

### 2.6) middleware.ts

#### Frontend

- **Fichier** : `apps/web/src/middleware.ts` (64 lignes)
- **Role** : protection edge des routes privees + redirection auth pages.
- **Routes protegees** :
  - prefixes: `/dashboard`, `/book`
  - exact: `/client/bookings`, `/profile`, `/plans`
- **Etats/logique** :

| Cas | Implementation | Verdict |
|---|---|---|
| Non-auth sur route protegee | redirect `/auth/login?next=...` | OK |
| Auth sur page auth | redirect `/` | OK |
| Route publique | passthrough | OK |

- **Accessibilite** : N/A (edge middleware).
- **Redirections** : param unique `next`, construit depuis pathname+search interne.
- **Securite** : open redirect limite (destination generee serveur depuis URL interne, pas param externe libre).
- **Mobile UX / SEO** : N/A direct.

#### API / Backend

- Couche complementaire au backend (ne remplace pas guards Nest).

#### DB

- N/A.

#### Performance & Core Web Vitals

- Impact faible (edge check cookie presence).
- Evite render inutile de pages privees pour non-auth.

#### Monitoring & Resilience

- Pas de logs/telemetrie middleware.
- En cas cookie invalide mais present, route peut passer middleware puis echouer cote API.

#### i18n / RTL readiness

- N/A.

#### Problemes & recommandations

| # | Severite | Probleme | Impact metier | Effort (XS/S/M/L) | Action |
|---|---|---|---|---|---|
| 1 | LOW | `isAuthed` verifie presence cookie, pas validite token | Ping-pong possible si cookie stale | XS | Option: verifier format JWT basique ou laisser backend + UX fallback |
| 2 | LOW | `PROTECTED_EXACT` couvre uniquement `/client/bookings` exact | Risque oubli futur sous-routes client | XS | Migrer vers prefix `/client` si roadmap pages additionnelles |
| 3 | LOW | Auth pages redirigent toujours vers `/` | UX PRO suboptimale (devrait aller `/dashboard`) | XS | Rediriger selon role via `/auth/me` ou logique frontend post-auth |

#### TODO

- [ ] Evaluer protection prefix `/client` (Effort XS)
- [ ] Ajouter strategie role-aware pour auth pages authed (Effort S)
- [ ] Ajouter traces/metrics middleware (Effort S)

#### Score detaille — middleware.ts

| Aspect | Score /5 | Justification |
|---|---:|---|
| Frontend structure | 4.5 | Regles lisibles et courtes |
| UX & states | 4.1 | Bon flux global |
| Validation front | 4.0 | Contrat redirect propre |
| Securite auth | 4.4 | Hard gate non-auth cote edge |
| Backend protection | 4.0 | Doit rester complete par guards API |
| RBAC | 4.0 | Controle d'entree, pas de role check fin |
| Redirections | 4.5 | `next` unifie et stable |
| DB coherence | 5.0 | N/A impact direct |
| Performance | 4.6 | Coût edge minimal |
| Mobile UX | 4.5 | Benefice indirect (evite ecrans parasites) |
| Monitoring | 2.8 | Pas d'observabilite middleware |
| Tests | 3.0 | Pas de tests dedies middleware matrix |

**Score global page : 4.1 / 5**

---

### 2.7) authStore

#### Frontend

- **Fichier** : `apps/web/src/store/authStore.ts` (47 lignes)
- **Etat** : `user`, `isAuthenticated`, `loading`.
- **Actions** : `init`, `setAuth`, `setUser`, `logout`.
- **Validation / securite** :
  - `init()` appelle `/auth/me`.
  - aucun token stocke localement.
  - `logout()` best-effort puis reset local.
- **Etats geres** :

| Etat | Implementation | Verdict |
|---|---|---|
| Boot | `loading=true` puis `init()` | OK |
| Session active | set user + authenticated | OK |
| Session absente | user null + authenticated false | OK |
| Logout | revoke backend puis clear local | OK |

- **Accessibilite/SEO/Mobile** : N/A direct.
- **Performance** : leger, mais depend de l'usage correct de `loading` par les pages.

#### API / Backend

- Endpoints utilises : `/auth/me`, `/auth/logout`.
- Repose sur cookies httpOnly + guards backend.

#### DB

- Impact indirect via `RefreshToken` revocation au logout.

#### Performance & Core Web Vitals

- AuthBootstrap declenche `init` apres hydration globale; cout reseau constant (1 appel auth/me au boot).

#### Monitoring & Resilience

- Pas de telemetry store.
- Erreur `init` silencieuse (retour etat deconnecte), ce qui est pragmatique mais peu diagnostique.

#### i18n / RTL readiness

- N/A.

#### Problemes & recommandations

| # | Severite | Probleme | Impact metier | Effort (XS/S/M/L) | Action |
|---|---|---|---|---|---|
| 1 | MEDIUM | Certaines pages ignorent `loading` du store | Redirects races/flicker -> experience instable | S | Exiger pattern guard unique `if (loading) return ...` |
| 2 | LOW | Erreurs `init` non journalisees | Debug prod difficile | XS | Ajouter logging conditionnel dev/monitoring hook |
| 3 | LOW | Pas de sync multi-tab explicite | Etat UI possiblement stale entre onglets | S | Ecouter `storage`/BroadcastChannel (sans stocker tokens) |

#### TODO

- [ ] Standardiser guard avec `loading` dans pages protegees (Effort S)
- [ ] Ajouter trace minimal sur echec init (Effort XS)
- [ ] Evaluer sync multi-tab (Effort S)

#### Score detaille — authStore

| Aspect | Score /5 | Justification |
|---|---:|---|
| Frontend structure | 4.3 | Store minimal et clair |
| UX & states | 3.8 | Bon socle, usage incoherent selon pages |
| Validation front | 4.0 | N/A direct, logique propre |
| Securite auth | 4.6 | Aucun token expose localement |
| Backend protection | 4.2 | Intime avec `/auth/me`/logout guards |
| RBAC | 3.8 | Le store ne force pas les roles |
| Redirections | 3.7 | Depend de l'implementation page |
| DB coherence | 4.2 | Logout revocation globale cote API |
| Performance | 4.2 | faible overhead |
| Mobile UX | 4.0 | impact indirect neutre |
| Monitoring | 2.7 | peu d'observabilite |
| Tests | 3.1 | pas de tests store explicites |

**Score global page : 3.9 / 5**

---

### 2.8) api.ts

#### Frontend

- **Fichier** : `apps/web/src/lib/api.ts` (212 lignes)
- **Role** : helper HTTP global (`get/post/patch/put/delete`, `postFormData`, auto-refresh).
- **Fonctionnalites** :
  - header CSRF automatique sur endpoints non publics.
  - `credentials: include` prive / `omit` public.
  - retry unique sur 401 via `/auth/refresh` avec dedupe `refreshPromise`.
  - cache memoire sur `/public/cities` et `/public/categories`.
- **Securite cote client** : tokens jamais manipules cote JS.

#### API / Backend

- Consomme flux auth refresh/logout selon contrats backend.
- `tryRefresh()` envoie CSRF header.

#### DB

- N/A direct.

#### Performance & Core Web Vitals

- Centralisation benefique (moins de code duplique).
- cache memoire reduit appels catalog.
- pas de timeout/abort controller -> requetes pendantes possibles.

#### Monitoring & Resilience

- Pas de hook de logging global sur erreurs HTTP.
- Retry limite a un refresh (evite boucles infinies).

#### i18n / RTL readiness

- N/A.

#### Problemes & recommandations

| # | Severite | Probleme | Impact metier | Effort (XS/S/M/L) | Action |
|---|---|---|---|---|---|
| 1 | MEDIUM | `postFormData` n'utilise pas `baseFetch` | Incoherence comportement (refresh/retry/politique endpoints) | S | Refactor `postFormData` pour reutiliser `baseFetch` |
| 2 | MEDIUM | PUBLIC endpoints forces en `credentials:'omit'` | Impossible d'exploiter endpoints publics optionnellement auth (exposition phone conditionnelle) | S | Ajouter option explicite `allowCredentials` |
| 3 | LOW | Detection `isPublicUrl` par `includes()` | Risque faux positifs sur chemins similaires | XS | Matcher par pathname exact/prefix strict |
| 4 | LOW | Pas de timeout/retry reseau hors refresh | Erreurs reseau longues -> UX degradee | S | Ajouter AbortController + retry exponentiel selectif |

#### TODO

- [ ] Unifier `postFormData` avec `baseFetch` (Effort S)
- [ ] Ajouter option credentials pour endpoints publics optionnels (Effort S)
- [ ] Durcir matcher endpoints publics (Effort XS)
- [ ] Ajouter timeout global configurable (Effort S)

#### Score detaille — api.ts

| Aspect | Score /5 | Justification |
|---|---:|---|
| Frontend structure | 4.2 | Helper central utile |
| UX & states | 3.9 | Retry refresh transparent, mais timeout absent |
| Validation front | 4.0 | parse erreurs propre |
| Securite auth | 4.3 | CSRF + cookies + anti-loop |
| Backend protection | 4.0 | Respect contrats API principaux |
| RBAC | 3.8 | N/A direct, depend endpoints |
| Redirections | 4.0 | supporte refresh automatique |
| DB coherence | 4.5 | N/A direct |
| Performance | 4.1 | cache memoire utile |
| Mobile UX | 4.0 | impact indirect |
| Monitoring | 2.8 | pas de hooks telemetry |
| Tests | 3.0 | peu de tests utilitaire dedies |

**Score global page : 3.9 / 5**

## 3) Performance & Core Web Vitals

- **FCP estime (auth pages)** : bon sur login/forgot/reset; moyen sur register (bundle plus lourd).
- **TTI estime** :
  - login/forgot/reset : bon.
  - register/profile : moyen (beaucoup d'etat client et rendu conditionnel).
- **Hydration** :
  - Auth flows majoritairement client components.
  - `AuthBootstrap` force un call `/auth/me` apres hydration sur toutes pages.
- **Code splitting** : route-level par Next OK, mais gros fichier register limite lisibilite/perf.
- **Lazy loading** : pas de lazy notable sur composants auth volumineux.
- **Re-render inutiles** : risques moderees sur register/profil (beaucoup d'etats locaux).

## 4) Monitoring & Resilience

- **Frontend** : pas d'`error.tsx`/`global-error.tsx` detecte; pas de Sentry/Datadog/LogRocket.
- **Backend logs securite** :
  - lockout attempts loggues (`FailedLoginService`).
  - replay refresh token loggue avec cooldown.
  - reset-password request/completion logguees.
- **Alerting** : absent (aucun webhook/alerting securite visible).
- **Retry logic** : present sur 401 refresh (api.ts), absent pour timeout/reseau general.
- **Multi-instance readiness** : lockout in-memory non distribue (TODO prod explicite present dans le code).

## 5) i18n

- **Langue** : FR hardcodee sur les pages auditees.
- **`html lang`** : `fr` defini dans `apps/web/src/app/layout.tsx`.
- **RTL** : pas de strategie dediee (classes directionnelles physiques, pas `start/end`).
- **Format telecom** : regex marocaines coherentes en auth/register/forgot.
- **Multi-langue futur** : aucun systeme i18n (dictionnaires/locale routing) detecte.

## 6) Problemes & recommandations (cross-cutting)

| # | Severite | Probleme | Impact metier | Effort (XS/S/M/L) | Action |
|---|---|---|---|---|---|
| 1 | MEDIUM | Lockout login in-memory non distribue | Protection brute-force incoherente en prod multi-instance | M | Brancher `FailedLoginStore` sur Redis/DB |
| 2 | MEDIUM | Pages auth/profile sans noindex explicite | Pollution SEO + pages utilitaires indexables | XS | Metadata `robots: { index:false }` sur pages privees/auth |
| 3 | MEDIUM | `postFormData` hors pipeline `baseFetch` | Comportements auth/retry heterogenes, bugs subtils | S | Centraliser tout HTTP dans `baseFetch` |
| 4 | MEDIUM | Races possibles sans usage uniforme de `authStore.loading` | Redirections incoherentes, drop UX | S | Introduire guard client partage |
| 5 | MEDIUM | Couverture tests e2e auth incomplete | Regressions silencieuses sur redirect/session | M | Ajouter suite e2e auth matrix |
| 6 | LOW | Multiples reset tokens actifs simultanes | Surface d'attaque accrue en cas fuite mailbox | S | Invalider anciens tokens lors d'une nouvelle demande |
| 7 | LOW | UX mobile champs hybrides non optimisee (`inputMode`) | Friction saisie -> baisse conversion mobile | XS | Ajuster inputMode/format hints |

## 7) TODO

- [ ] Implementer store lockout distribue (Redis/DB) en reutilisant `FailedLoginStore` (Effort M)
- [ ] Ajouter noindex metadata sur `/auth/*` et `/profile` + aligner robots (Effort XS)
- [ ] Refactor `postFormData` pour reutiliser `baseFetch` (Effort S)
- [ ] Creer guard client central avec `authStore.loading` (Effort S)
- [ ] Ajouter e2e auth matrix (`next`, middleware, lockout, refresh replay) (Effort M)
- [ ] Invalider reset tokens precedents a chaque nouvelle demande (Effort S)
- [ ] Optimiser clavier mobile/touch targets auth (Effort XS)

## 8) Score detaille par page (recap)

| Page / Composant | Score |
|---|---|
| `/auth/login` | 4.2 / 5 |
| `/auth/register` | 4.1 / 5 |
| `/auth/forgot-password` | 4.2 / 5 |
| `/auth/reset-password` | 4.3 / 5 |
| `/profile` | 3.9 / 5 |
| `middleware.ts` | 4.1 / 5 |
| `authStore` | 3.9 / 5 |
| `api.ts` | 3.9 / 5 |

## 9) Synthese RBAC & Redirections

### Scenarios a analyser

| # | Scenario | Attendu | Frontend | Backend | Match ? |
|---|---|---|---|---|---|
| 1 | Non-auth -> `/dashboard` | Redirect login + contexte | middleware -> `/auth/login?next=...` | guards JWT sur APIs dashboard | OUI |
| 2 | Non-auth -> `/book/[proId]` | Redirect login + retour | middleware protege `/book` | `POST /bookings` JWT+Roles CLIENT | OUI |
| 3 | CLIENT -> pages PRO dashboard API | Refus | UI dashboard bloque role != PRO | `@Roles('PRO')` sur routes PRO critiques | OUI |
| 4 | PRO -> `/profile` client | Redirect vers dashboard profil pro | `router.replace('/dashboard/profile')` | `PATCH /users/me` `@Roles('CLIENT')` | OUI |
| 5 | PRO non KYC -> services PRO | lecture eventuelle, ecriture bloquee | gating dashboard + feedback | `KycApprovedGuard` sur services/availability + checks service-level profil | PARTIEL (profil avatar autorise volontairement) |
| 6 | PRO non premium -> stats dashboard | Acces refuse | frontend masque/redirect stats | backend 403 `PREMIUM_REQUIRED` | OUI |
| 7 | Manipulation `next` redirect | bloque URL externe | login valide `next/returnTo` relatif uniquement | N/A | OUI |
| 8 | Appel direct API sans frontend (`POST /bookings`) | CLIENT uniquement | N/A | `JwtAuthGuard + RolesGuard + @Roles('CLIENT')` | OUI |
| 9 | Appel direct `PATCH /bookings/:id/cancel` par PRO non KYC | Refus | N/A | guard JWT seul, mais service-level check KYC PRO | PARTIEL |

## 10) Matrice RBAC backend complete

| Route | Methode | Guards | Roles | KYC | Premium |
|---|---|---|---|---|---|
| `/auth/register` | POST | Aucun | Public | Non | Non |
| `/auth/login` | POST | Aucun | Public | Non | Non |
| `/auth/refresh` | POST | CSRF check (controller) | Public | Non | Non |
| `/auth/logout` | POST | CSRF check (controller) | Public | Non | Non |
| `/auth/forgot-password` | POST | Aucun | Public | Non | Non |
| `/auth/reset-password` | POST | Aucun | Public | Non | Non |
| `/auth/me` | GET | JwtAuthGuard | Auth | Non | Non |
| `/users/me` | PATCH | JwtAuthGuard + RolesGuard | CLIENT | Non | Non |
| `/pro/me` | GET | JwtAuthGuard + RolesGuard (class) | PRO | Non | Non |
| `/pro/profile` | PATCH | JwtAuthGuard + RolesGuard (class) | PRO | Service-level partiel | Non |
| `/pro/services` | PUT | JwtAuthGuard + RolesGuard + KycApprovedGuard | PRO | Oui | Limites metier |
| `/pro/availability` | PUT | JwtAuthGuard + RolesGuard + KycApprovedGuard | PRO | Oui | Non |
| `/pro/portfolio` | GET | JwtAuthGuard + RolesGuard (class) | PRO | Non | Non |
| `/pro/portfolio` | POST | JwtAuthGuard + RolesGuard + KycApprovedGuard | PRO | Oui | Service-level |
| `/pro/portfolio/:id` | DELETE | JwtAuthGuard + RolesGuard + KycApprovedGuard | PRO | Oui | Service-level |
| `/kyc/submit` | POST | JwtAuthGuard + RolesGuard (class) | PRO | Non | Non |
| `/kyc/resubmit` | POST | JwtAuthGuard + RolesGuard (class) | PRO | Non | Non |
| `/dashboard/stats` | GET | JwtAuthGuard + RolesGuard | PRO | Non | Oui (service-level) |
| `/bookings` | POST | JwtAuthGuard + RolesGuard | CLIENT | Non | Non |
| `/bookings` | GET | JwtAuthGuard | CLIENT/PRO | Non | Non |
| `/bookings/:id/status` | PATCH | JwtAuthGuard + KycApprovedGuard | Auth (service PRO) | Oui (PRO) | Non |
| `/bookings/:id/duration` | PATCH | JwtAuthGuard + KycApprovedGuard | Auth (service PRO) | Oui (PRO) | Non |
| `/bookings/:id/respond` | PATCH | JwtAuthGuard | Auth (service CLIENT) | Non | Non |
| `/bookings/:id/complete` | PATCH | JwtAuthGuard + KycApprovedGuard | Auth (service PRO) | Oui (PRO) | Non |
| `/bookings/:id/cancel` | PATCH | JwtAuthGuard | Auth (service role-based) | Service-level PRO | Non |
| `/payment/checkout` | POST | JwtAuthGuard + RolesGuard + KycApprovedGuard | PRO | Oui | Non |
| `/payment/status/:oid` | GET | JwtAuthGuard + RolesGuard | PRO | Non | Non |
| `/payment/admin/confirm/:oid` | POST | JwtAuthGuard + RolesGuard | ADMIN | Non | Non |
| `/payment/admin/reject/:oid` | POST | JwtAuthGuard + RolesGuard | ADMIN | Non | Non |
| `/payment/admin/pending` | GET | JwtAuthGuard + RolesGuard | ADMIN | Non | Non |

## 11) Gaps identifies

| # | Gap | Severite | Impact metier | Effort | Action |
|---|---|---|---|---|---|
| 1 | Lockout distribue absent (memoire locale) | MEDIUM | Protection anti-bruteforce fragile en prod scalee | M | Implementer store Redis/DB |
| 2 | Noindex auth/profile absent | MEDIUM | Indexation pages utilitaires/privees | XS | Metadata robots par page + robots.txt |
| 3 | `postFormData` hors `baseFetch` | MEDIUM | Incoherence retry/refresh et bugs transverses | S | Refactor helper |
| 4 | Race guard frontend sans `loading` uniforme | MEDIUM | Redirects intempestifs, baisse confiance utilisateur | S | Hook guard partage |
| 5 | `PATCH /bookings/:id/cancel` sans `KycApprovedGuard` | LOW | Defence-in-depth incomplet (service couvre) | XS | Ajouter guard ou documenter choix |
| 6 | Multiples reset tokens actifs | LOW | Surface risque accrue en cas compromission | S | Revoquer anciens tokens a la creation |
| 7 | Tests e2e middleware/redirect incomplets | MEDIUM | Regressions auth invisibles jusqu'en prod | M | Suite e2e dediee |

## 12) Contrat technique Auth & Session

### JWT strategy

- Access token JWT signe (`JWT_SECRET` min 32 chars, fail-fast au boot).
- Payload minimal (`sub`), validation user active via `AuthService.validateUser()`.

### Refresh rotation

- Refresh token opaque (64 bytes) stocke uniquement en hash SHA-256.
- Rotation sur `/auth/refresh` : ancien token revoque puis nouveau genere.
- Reuse token revoque -> revoke all user tokens + warning log (cooldown 60s).

### Cookies httpOnly

- `refreshToken`: `httpOnly`, `sameSite: strict`, `path: /api/auth`, TTL 7 jours.
- `accessToken`: `httpOnly`, `sameSite: strict`, `path: /`, TTL 15 minutes.
- `secure` active en production.

### CSRF header

- Header requis cote frontend sur requetes privees (`X-CSRF-PROTECTION: 1`).
- Backend enforce explicitement sur `/auth/refresh` et `/auth/logout`.

### Token TTL

- Access: `JWT_ACCESS_EXPIRES` (defaut 15m).
- Refresh: `JWT_REFRESH_EXPIRES` (defaut 7d).
- Reset password token: 15 minutes.

### Lockout policy

- 5 echecs login -> lock 15 min.
- Stockage actuel in-memory, cleanup periodique 10 min.
- Extension point production deja documente (`FailedLoginStore`).

### Password policy

- Min 10, max 128, minuscule+majuscule+chiffre (DTO register/reset).
- Hash bcrypt cost 10.

### Replay detection

- Detection reuse refresh token revoque.
- Revocation globale immediate des tokens utilisateur.
- Logging limite pour eviter flood.

### Global logout

- `/auth/logout` revoque tous refresh tokens associes au token courant.
- Reset password revoque egalement tous refresh tokens de l'utilisateur.

### Rate limiting

- Global Throttler: `60 req / 60s`.
- Login/register: `5/min`.
- Forgot password: `3/h`.
- Reset password: `5/h`.

### CORS config

- Whitelist via `CORS_ORIGINS`.
- Fail-closed si variable vide.
- `credentials: true`, preflight cache 600s.

### Helmet headers

- CSP restrictive (`default-src 'self'`, `frame-ancestors 'none'`, etc.).
- HSTS preload 1 an.
- `X-Frame-Options: DENY`, `noSniff`, `referrer-policy: no-referrer`.

## 13) Securite supplementaire

- **Tests existants** :
  - `apps/api/src/auth/password-reset.service.spec.ts`
  - `apps/api/src/auth/auth-cin-salt.spec.ts`
  - `apps/api/src/rbac-e2e.spec.ts`
  - `apps/web/e2e/auth.spec.ts`
- **Tests manquants prioritaires** :
  - e2e redirect login avec `?next=` + fallback `returnTo`.
  - e2e lockout login (5 echecs + unlock).
  - e2e replay refresh token revoque.
  - tests middleware route matrix (`/book`, `/plans`, `/profile`, `/dashboard`).
  - tests frontend reduced-motion sur formulaires auth.
- **Observabilite** : logs securite presents cote API mais pas de pipeline alerting SIEM/Sentry.
- **Multi-instance readiness** : principal gap sur lockout in-memory.

## 14) Score global Phase 1

| Page | Score |
|---|---|
| `/auth/login` | 4.2 / 5 |
| `/auth/register` | 4.1 / 5 |
| `/auth/forgot-password` | 4.2 / 5 |
| `/auth/reset-password` | 4.3 / 5 |
| `/profile` | 3.9 / 5 |
| `middleware.ts` | 4.1 / 5 |
| `authStore` | 3.9 / 5 |
| `api.ts` | 3.9 / 5 |

### **Score moyen Phase 1 : 4.1 / 5**

- **Top 5 priorites** :
  1. Lockout distribue (prod readiness).
  2. Noindex auth/profile + robots alignement.
  3. Unification `postFormData`/`baseFetch`.
  4. Guard client standard base sur `authStore.loading`.
  5. Suite e2e auth complete (redirect/lockout/refresh).
- **Quick wins** : noindex metadata, inputMode, touch targets, tests redirect.
- **Risques critiques restants** : aucun critique immediat detecte; principaux risques sont de robustesse production (multi-instance/observabilite).

## 15) Annexe — Fichiers audites Phase 1

**Frontend**
- `apps/web/src/app/auth/login/page.tsx`
- `apps/web/src/app/auth/register/page.tsx`
- `apps/web/src/app/auth/forgot-password/page.tsx`
- `apps/web/src/app/auth/reset-password/page.tsx`
- `apps/web/src/app/profile/page.tsx`
- `apps/web/src/middleware.ts`
- `apps/web/src/store/authStore.ts`
- `apps/web/src/lib/api.ts`
- `apps/web/src/components/auth/AuthBootstrap.tsx`
- `apps/web/src/components/shared/CitySelect.tsx`
- `apps/web/src/app/layout.tsx`
- `apps/web/public/robots.txt`

**Backend**
- `apps/api/src/main.ts`
- `apps/api/src/app.module.ts`
- `apps/api/src/auth/auth.module.ts`
- `apps/api/src/auth/auth.controller.ts`
- `apps/api/src/auth/auth.service.ts`
- `apps/api/src/auth/failed-login.service.ts`
- `apps/api/src/auth/refresh-token-cleanup.service.ts`
- `apps/api/src/auth/jwt.strategy.ts`
- `apps/api/src/auth/jwt-auth.guard.ts`
- `apps/api/src/auth/guards/roles.guard.ts`
- `apps/api/src/auth/guards/kyc-approved.guard.ts`
- `apps/api/src/auth/dto/register.dto.ts`
- `apps/api/src/auth/dto/login.dto.ts`
- `apps/api/src/auth/dto/forgot-password.dto.ts`
- `apps/api/src/auth/dto/reset-password.dto.ts`
- `apps/api/src/auth/dto/refresh-token.dto.ts`
- `apps/api/src/users/users.controller.ts`
- `apps/api/src/users/users.service.ts`
- `apps/api/src/pro/pro.controller.ts`
- `apps/api/src/pro/pro.service.ts`
- `apps/api/src/kyc/kyc.controller.ts`
- `apps/api/src/dashboard/dashboard.controller.ts`
- `apps/api/src/dashboard/dashboard.service.ts`
- `apps/api/src/booking/booking.controller.ts`
- `apps/api/src/booking/booking.service.ts`
- `apps/api/src/payment/payment.controller.ts`

**Database**
- `packages/database/prisma/schema.prisma`

**Configuration / Tests**
- `apps/web/e2e/auth.spec.ts`
- `apps/api/src/rbac-e2e.spec.ts`
- `apps/api/src/auth/password-reset.service.spec.ts`
- `apps/api/src/auth/auth-cin-salt.spec.ts`
- `apps/web/next.config.ts`

---

# Classement Global des Pages (Ordre Décroissant)

| Rang | Page | Score Global (/5) |
|------|------|-------------------|
| 1 | /help | 4.8 |
| 2 | / | 4.3 |
| 3 | /auth/reset-password | 4.3 |
| 4 | /auth/login | 4.2 |
| 5 | /auth/forgot-password | 4.2 |
| 6 | /auth/login | 4.1 |
| 7 | /auth/register | 4.1 |
| 8 | middleware.ts | 4.1 |
| 9 | /pros | 4.0 |
| 10 | /book/[proId] | 4.0 |
| 11 | /legal/* | 4.0 |
| 12 | /dashboard/kyc | 4.0 |
| 13 | /profile | 3.9 |
| 14 | /dashboard | 3.9 |
| 15 | /dashboard/availability | 3.9 |
| 16 | /profile | 3.9 |
| 17 | authStore | 3.9 |
| 18 | api.ts | 3.9 |
| 19 | /client/bookings | 3.8 |
| 20 | /dashboard/services | 3.8 |
| 21 | /help | 3.8 |
| 22 | /plans | 3.7 |
| 23 | composants transversaux | 3.7 |
| 24 | /dashboard/profile | 3.7 |
| 25 | /legal/cgu | 3.7 |
| 26 | head usage | 3.7 |
| 27 | /pro/[publicId] | 3.6 |
| 28 | /dashboard/bookings | 3.6 |
| 29 | /dashboard/bookings | 3.6 |
| 30 | /dashboard/history | 3.6 |
| 31 | robots.txt | 3.6 |
| 32 | /legal/privacy | 3.5 |
| 33 | /plans | 3.4 |
| 34 | /blog | 3.4 |
| 35 | /dashboard/subscription/cancel | 3.3 |
| 36 | /legal/mentions | 3.3 |
| 37 | sitemap | 3.2 |
| 38 | SEO config globale | 3.2 |
| 39 | /dashboard/subscription/success | 3.1 |
| 40 | CTA premium /dashboard | 3.1 |
| 41 | Composants transversaux | 3.1 |
| 42 | layout.tsx | 3.1 |
| 43 | /dashboard/subscription/success + /dashboard/subscription/cancel | 3.0 |
| 44 | /dashboard/subscription/success | 3.0 |
| 45 | Badges Premium/Boost | 2.7 |
| 46 | /dashboard/subscription/cancel | 2.6 |
| 47 | /dashboard/subscription (equivalent actuel) | 2.3 |
| 48 | /pro/subscription | 2.0 |
| 49 | /dashboard/subscription | 1.0 |
