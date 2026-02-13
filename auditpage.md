# Audit Fullstack par pages

## Table des matières
- [/auth/login — Auth Login](#authlogin--auth-login)
- [/auth/register — Auth Register](#authregister--auth-register)
- [/profile — User Profile (global)](#profile--user-profile-global)
- [/auth/forgot-password — Forgot Password](#authforgot-password--forgot-password)
- [Synthèse Phase 1 — Auth & Profil](#synthèse-phase-1--auth--profil)

---

# [/auth/login] — Auth Login

## 1) Résumé exécutif
- **Rôle(s)**: Public (non authentifié)
- **Objectif métier**: Authentifier un utilisateur (CLIENT ou PRO) via email/téléphone + mot de passe, puis rediriger vers le bon espace.
- **Statut global**: ⚠️ Fragile
- **Scores (0–5)**: Front: 3 ; Back: 4 ; DB: 4 ; Intégration: 3 ; Sécurité: 3 ; Perf: 4 ; Tests/Obs: 1
- **Fichiers clés**:
  - `apps/web/src/app/auth/login/page.tsx`
  - `apps/web/src/lib/api.ts` (postJSON)
  - `apps/web/src/store/authStore.ts` (setAuth)
  - `apps/api/src/auth/auth.controller.ts` (login)
  - `apps/api/src/auth/auth.service.ts` (login)
  - `apps/api/src/auth/dto/login.dto.ts` (LoginDto)
  - `apps/api/src/auth/failed-login.service.ts` (bruteforce)
  - `packages/contracts/src/schemas/auth.ts` (LoginInput, PublicUser)
  - `packages/database/prisma/schema.prisma` (User, RefreshToken)

## 2) Cartographie technique (fichiers)
### Frontend
- `apps/web/src/app/auth/login/page.tsx` — Page login, composant client-side
- `apps/web/src/lib/api.ts` — Helper `postJSON` avec auto-refresh 401
- `apps/web/src/store/authStore.ts` — Zustand store, `setAuth(user)`

### Backend
- `apps/api/src/auth/auth.controller.ts:235-252` — `POST /api/auth/login`
- `apps/api/src/auth/auth.service.ts:173-224` — `login()` logique métier
- `apps/api/src/auth/dto/login.dto.ts` — DTO validation (class-validator)
- `apps/api/src/auth/failed-login.service.ts` — Anti-bruteforce in-memory

### DB
- `schema.prisma` — `User` (l.127-164), `RefreshToken` (l.496-508)
- Index `phone` (unique), `email` (unique)

## 3) Frontend — État attendu vs état actuel
### Attendu (référentiel)
- Routing propre + guard (rediriger si déjà connecté)
- Form solide (validation client, disabled/loading, anti double submit)
- UI states complets (loading/error/success)
- A11y complète (labels, focus, keyboard, aria)
- Design system tokens

### Actuel (constaté)
- **UI/Composants**: Split layout (sidebar orange + formulaire beige). Design cohérent mais utilise des hex en dur (`#F08C1B`, `#F2F0EF`, `#D97213`, `#C56510`, `text-slate-*`) au lieu des design tokens CLAUDE.md.
- **Data fetching / submit**: `postJSON('/auth/login', formData)` via lib/api.ts. Gestion 401 avec auto-refresh. `setAuth(response.user)` met à jour le store Zustand. Redirect via `router.push()` selon rôle.
- **Validations**: Seulement `required` HTML natif sur les inputs. Aucune validation regex client-side (contrairement à register). Le front accepte n'importe quel format.
- **Erreurs & UX**: Message d'erreur affiché dans un bandeau rouge avec icône. `APIError.message` affiché tel quel, sinon fallback "Identifiants invalides". Pas de retry.
- **A11y**:
  - ❌ `<label>` sans `htmlFor` — aucun `id` sur les inputs (violation CLAUDE.md)
  - ❌ Pas de `aria-invalid`, `aria-describedby` sur le champ erreur
  - ❌ Pas de `aria-live` sur le container d'erreur
  - ❌ Spinner SVG sans `aria-label`/`role`
  - ✅ Navigation clavier fonctionne (form natif)
- **Perf**: OK. Composant léger, pas de dépendances lourdes.
- **Sécurité front**: ✅ Token jamais stocké côté client (cookies httpOnly). Store Zustand ne contient que `PublicUser`.
- **NON TROUVÉ**:
  - Pas de guard "déjà connecté" — un user authentifié peut revenir sur /auth/login sans redirection.
  - Pas de `prefers-reduced-motion` conditionnant l'animation du spinner SVG.

## 4) Backend — État attendu vs état actuel
### Endpoints utilisés par la page
- **[POST] /api/auth/login** → `AuthController.login()` → `AuthService.login()` → Guard: aucun (public)
  - Request DTO: `LoginDto { login: string (min 1, max 120), password: string (min 10, max 128) }`
  - Response: `{ user: PublicUser }` + cookies `accessToken` (15min) + `refreshToken` (7j)
  - Errors: 401 "Identifiants invalides", 401 "Trop de tentatives. Réessayez plus tard.", 429 Throttle
  - Sécurité: `@Throttle({ default: { limit: 5, ttl: 60_000 } })` + `FailedLoginService` lockout 15min après 5 échecs

### Attendu (référentiel)
- AuthN robuste, timing-safe, anti-enumeration
- Rate limit + lockout
- Tokens sécurisés (httpOnly, secure, sameSite)
- Validation serveur complète
- Logs sans secrets, erreurs standardisées
- Tests unitaires + intégration

### Actuel (constaté)
- **Auth/AuthZ**: ✅ Timing-safe: `bcrypt.compare` contre DUMMY_HASH si user non trouvé (empêche timing attack). ✅ Anti-enumération: même message "Identifiants invalides" quel que soit le cas.
- **Validations serveur**: ✅ class-validator sur LoginDto. ⚠️ `password: @MinLength(10)` — refuse les anciens mots de passe < 10 chars (pourrait bloquer des comptes existants si la politique a changé).
- **Erreurs**: ✅ Message uniforme "Identifiants invalides". ✅ Pas de fuite d'infos. ⚠️ Le message lockout "Trop de tentatives" confirme implicitement l'existence du compte.
- **Perf**: ✅ `findFirst` avec `OR [email, phone]` — OK. Les deux champs sont indexés (unique).
- **Observabilité**: ✅ `Logger.warn` sur tentatives échouées et lockout. ✅ Hash de l'identifiant dans les logs (pas de PII). ❌ Pas de `requestId` tracé.
- **Tests**: ❌ **Aucun fichier .spec.ts trouvé dans apps/api/src/**. Zéro test unitaire, zéro test d'intégration.
- **Sécurité**:
  - ✅ Rate limit `@Throttle` au niveau contrôleur (5 req/min)
  - ✅ `FailedLoginService` lockout in-memory (5 échecs → 15min)
  - ⚠️ Lockout **in-memory** — perdu au redémarrage du serveur. Non distribué (multi-instance = contournable).
  - ✅ Cookies: `httpOnly: true`, `sameSite: 'strict'`, `secure` en prod
  - ✅ Refresh token rotation avec détection de replay
  - ⚠️ Pas de CSRF check sur le login (le controller a `requireCsrf()` mais ne l'appelle PAS sur login/register)
  - ✅ `whitelist: true, forbidNonWhitelisted: true` sur le DTO (anti mass assignment)

## 5) Base de données — État attendu vs état actuel
- **Tables**: `User`, `RefreshToken`
- **Contraintes/index**: ✅ `phone @unique`, `email @unique`, `RefreshToken.tokenHash @unique`, `RefreshToken(userId)` index, `RefreshToken(expiresAt)` index
- **Migrations**: NON TROUVÉ — pas de dossier migrations vérifié (à vérifier dans `packages/database/prisma/migrations/`)
- **Requêtes observées**: `user.findFirst` avec OR [email, phone] → OK (index unique couvre les deux cas). `refreshToken.create` pour stocker le hash.
- **Risques cohérence/perf**:
  - ⚠️ Les refresh tokens expirés ne sont jamais nettoyés (pas de cron/job visible). La table `RefreshToken` grossira indéfiniment.
  - ✅ Le hash SHA-256 est indexé (@unique), lookup rapide.

## 6) Intégration Front ↔ Back ↔ DB
- **Mapping champs**:
  - UI: `{ login, password }` → DTO: `LoginDto { login, password }` → DB: `findFirst(OR: [email, phone])` ✅ Aligné
  - Response: Back retourne `{ user: PublicUser }` + cookies → Front: `setAuth(response.user)` ✅ Aligné
- **Incohérences**:
  - ⚠️ Le contrat Zod `LoginSchema` (packages/contracts) n'impose pas `min(10)` sur password, mais le `LoginDto` (class-validator) impose `@MinLength(10)`. **Désalignement**: le front ne valide pas la longueur, le back rejettera des mdp < 10 avec une erreur 400 peu claire.
  - ⚠️ Le front envoie via `postJSON` (Content-Type: application/json + credentials: include + X-CSRF-PROTECTION: 1), mais le back **n'appelle pas `requireCsrf()`** sur login. Le header est envoyé inutilement.
- **Gestion erreurs bout-en-bout**: ✅ APIError côté front attrape le `message` du back. Le message est affiché dans le bandeau rouge.
- **Permissions backend autoritatif**: ✅ Le back est le seul à décider (login, lockout, token).

## 7) Problèmes & recommandations
### CRITIQUES
- **[C1] Aucun test (back)**: Zéro test unitaire/intégration pour le flux auth le plus critique du système. Un changement accidentel pourrait casser le login sans détection.
- **[C2] Lockout in-memory**: Le `FailedLoginService` stocke tout en `Map<>` RAM. Perdu au redémarrage, non partagé entre instances. Un attaquant peut reset le lockout en provoquant un redémarrage, ou cibler des instances différentes.
- **[C3] Lien "Mot de passe oublié" → page 404**: Le front a un `<Link href="/auth/forgot-password">` mais aucune page n'existe (ni front, ni back). UX cassée + impression d'application non finie.

### IMPORTANTS
- **[I1] A11y labels manquants**: Labels sans `htmlFor`/`id`, pas d'`aria-live` sur erreurs. Non conforme WCAG AA.
- **[I2] Hex en dur**: Couleurs `#F08C1B`, `#F2F0EF` etc. au lieu des design tokens (violation CLAUDE.md).
- **[I3] Pas de guard "déjà connecté"**: Un user authentifié peut accéder à /auth/login sans redirection.
- **[I4] Désalignement validation password**: Contrat Zod = min 6, DTO class-validator = min 10. Risque de confusion.
- **[I5] Refresh tokens jamais purgés**: Pas de cron de nettoyage → croissance infinie de la table RefreshToken.

### NICE-TO-HAVE
- **[N1]** Ajouter `requestId` dans les logs pour traçabilité.
- **[N2]** Migrer le lockout vers Redis pour persistance et distribution.
- **[N3]** Ajouter `prefers-reduced-motion` sur les animations.
- **[N4]** Feedback "X tentatives restantes" avant lockout.

## 8) Plan "Amélioration Backend" (spécifique /auth/login)
### Quick wins (≤2h)
- [ ] Ajouter un cron job ou script de nettoyage des RefreshToken expirés (`WHERE expiresAt < NOW() AND revoked = true`)
- [ ] Aligner le contrat Zod `LoginSchema` avec le DTO (password min 10)
- [ ] Ajouter `requestId` dans les logs auth

### Moyen (½–2 jours)
- [ ] Écrire tests unitaires pour `AuthService.login()` (happy path, wrong password, lockout, timing-safe, user not found)
- [ ] Écrire tests d'intégration pour `POST /auth/login` (rate limit, cookies, lockout reset)
- [ ] Migrer `FailedLoginService` vers Redis (ou solution persistante)

### Structurant (>2 jours)
- [ ] Implémenter le flux "Mot de passe oublié" complet (front + back + email)
- [ ] Ajouter CSRF validation sur login si architecture le requiert

### Dépendances / risques
- La migration Redis nécessite l'ajout de Redis à l'infra (Docker, config, env vars)
- Le flux "forgot password" nécessite un service d'envoi d'emails (SMTP/SendGrid/etc.)

---

# [/auth/register] — Auth Register

## 1) Résumé exécutif
- **Rôle(s)**: Public (non authentifié)
- **Objectif métier**: Inscrire un CLIENT (avec adresse) ou un PRO (avec KYC CIN) de manière atomique, puis auto-login.
- **Statut global**: ⚠️ Fragile
- **Scores (0–5)**: Front: 4 ; Back: 4 ; DB: 4 ; Intégration: 3 ; Sécurité: 4 ; Perf: 4 ; Tests/Obs: 1
- **Fichiers clés**:
  - `apps/web/src/app/auth/register/page.tsx`
  - `apps/web/src/components/shared/CitySelect.tsx`
  - `apps/web/src/lib/api.ts` (fetch direct, pas postFormData)
  - `apps/web/src/store/authStore.ts`
  - `apps/api/src/auth/auth.controller.ts:91-228` (register)
  - `apps/api/src/auth/auth.service.ts:42-167` (register)
  - `apps/api/src/auth/dto/register.dto.ts` (RegisterDto)
  - `apps/api/src/kyc/multer.config.ts` (config upload)
  - `packages/contracts/src/schemas/auth.ts` (RegisterSchema)
  - `packages/database/prisma/schema.prisma` (User, ProProfile)

## 2) Cartographie technique (fichiers)
### Frontend
- `apps/web/src/app/auth/register/page.tsx` — Page multi-étapes (rôle → formulaire)
- `apps/web/src/components/shared/CitySelect.tsx` — Composant sélection ville

### Backend
- `apps/api/src/auth/auth.controller.ts:91-228` — `POST /api/auth/register` avec FileFieldsInterceptor
- `apps/api/src/auth/auth.service.ts:42-167` — `register()` logique atomique
- `apps/api/src/auth/dto/register.dto.ts` — DTO validation class-validator
- `apps/api/src/kyc/multer.config.ts` — Configuration Multer uploads

### DB
- `User` (l.127-164) — Création avec email, phone, password hash, role, city, address
- `ProProfile` (l.166-209) — Création si PRO avec cinNumber, kycUrls, kycStatus=PENDING
- Transaction Prisma atomique (`$transaction`)

## 3) Frontend — État attendu vs état actuel
### Attendu (référentiel)
- Multi-step form solide avec validation à chaque étape
- File upload avec preview, validation type/taille
- Anti double submit
- A11y complète
- Design tokens

### Actuel (constaté)
- **UI/Composants**: Excellent UX multi-étapes. Step 1 = sélection rôle avec cartes interactives. Step 2 = formulaire adaptatif selon rôle (CLIENT: +adresse, PRO: +CIN+photos). Design soigné mais hex en dur (`#F08C1B` etc.).
- **Data fetching / submit**:
  - ⚠️ Le front utilise `fetch()` directement (l.247) au lieu de `postFormData()` de lib/api.ts. Duplication de logique (construction URL, headers CSRF, credentials).
  - FormData envoyé en multipart/form-data.
  - Auto-login après register via `setAuth(data.user)`.
- **Validations**:
  - ✅ Validation inline complète : email regex, phone regex marocain, password strength (4 critères visuels), CIN regex, confirmation mot de passe
  - ✅ Validation fichiers côté client (type MIME, taille 5Mo)
  - ✅ Feedback visuel en temps réel (bordures rouges, messages d'erreur par champ)
  - ⚠️ Pas de validation `firstName`/`lastName` minimum length côté front (le back exige min 2)
- **Erreurs & UX**: ✅ `mapBackendError()` traduit les erreurs backend en messages UX français. ✅ `aria-live="assertive"` sur le container d'erreur global. ✅ Role `"alert"` sur les erreurs.
- **A11y**:
  - ✅ `htmlFor`/`id` présents sur tous les inputs du step 2
  - ✅ `aria-describedby`, `aria-invalid` sur email, phone, password, CIN, confirm
  - ✅ `role="alert"` et `aria-live` sur les erreurs
  - ✅ Indicateurs visuels de critères mot de passe avec `aria-label`
  - ⚠️ Input file CIN dans un `<label>` wrapper — le `<span>` de titre n'a pas de `htmlFor`
  - ⚠️ `autoComplete` bien utilisé (`given-name`, `family-name`, `email`, `tel`, `new-password`)
- **Perf**: OK. `Suspense` wrapping pour useSearchParams. Pas de lazy loading des fichiers (acceptable pour le MVP).
- **Sécurité front**: ✅ `X-CSRF-PROTECTION: '1'` envoyé. ✅ Pas de secrets côté client. ⚠️ `process.env.NEXT_PUBLIC_API_URL` exposé côté client (normal pour Next.js mais à noter).

## 4) Backend — État attendu vs état actuel
### Endpoints utilisés par la page
- **[POST] /api/auth/register** → `AuthController.register()` → `AuthService.register()` → Guard: aucun (public)
  - Request: `multipart/form-data` avec RegisterDto + fichiers cinFront/cinBack
  - Response: `{ user: PublicUser }` + cookies accessToken + refreshToken
  - Errors: 409 "Données en conflit" (email/phone/CIN dupliqué), 400 validations multiples, 429 Throttle
  - Sécurité: `@Throttle({ default: { limit: 5, ttl: 60_000 } })` rate limit

### Attendu (référentiel)
- Inscription atomique (transaction)
- Validation robuste de tous les champs + fichiers
- Protection contre les fichiers malveillants
- Anti mass assignment
- Unicité vérifiée avant insert

### Actuel (constaté)
- **Auth/AuthZ**: ✅ Route publique, pas de guard nécessaire. ✅ Auto-login après inscription (cookies httpOnly).
- **Validations serveur**:
  - ✅ RegisterDto: class-validator avec @IsEmail, phone regex marocain, password min 10/max 128 + complexité (maj+min+chiffre), firstName/lastName min 2, cityId regex `city_[a-z]+_\d{3}`, CIN regex
  - ✅ Whitelist + forbidNonWhitelisted (anti mass assignment)
  - ✅ Double validation dans controller + service (belt-and-suspenders)
  - ⚠️ Le DTO `addressLine` est `@IsOptional()` mais le service valide "obligatoire pour CLIENT" manuellement. Le DTO ne peut pas exprimer une validation conditionnelle facilement avec class-validator.
- **Fichiers (sécurité)**:
  - ✅ Validation magic bytes (JPEG, PNG, WebP header check)
  - ✅ Re-encoding via `sharp` → jpeg (neutralise les payloads cachés)
  - ✅ Scan de contenu suspect (PHP, script, shebang, MZ/PE, ZIP)
  - ✅ Vérification taille (max 5Mo) et fichier vide
  - ✅ MIME type whitelist
  - ✅ Rollback fichiers si transaction DB échoue
- **Erreurs**: ⚠️ Message "Données en conflit" volontairement générique pour anti-enumération — mais le front `mapBackendError` essaie de distinguer email/phone/CIN, ce qui ne fonctionnera PAS car le back ne précise pas quel champ est en conflit. Le mapping côté front ne peut que tomber sur le fallback générique.
- **Perf**: ✅ Vérifications d'unicité (email, phone, CIN) AVANT le hash bcrypt (évite travail inutile). ✅ Transaction atomique.
- **Observabilité**: ⚠️ Pas de log explicite dans le flux register (ni succès ni échec, sauf les exceptions non catchées).
- **Tests**: ❌ Aucun test.
- **Sécurité**:
  - ✅ Rate limit @Throttle 5 req/min
  - ✅ Sharp re-encode les images (défense en profondeur)
  - ✅ Scan anti-malware basique
  - ⚠️ Fichiers stockés sur disque local (`uploads/kyc/`) — pas de CDN/S3, pas de cleanup automatique des fichiers orphelins
  - ⚠️ Pas de limite sur le nombre total d'inscriptions (un attaquant pourrait créer des milliers de comptes)

## 5) Base de données — État attendu vs état actuel
- **Tables**: `User`, `ProProfile` (via $transaction)
- **Contraintes/index**:
  - ✅ `User.phone @unique`, `User.email @unique`
  - ✅ `ProProfile.cinNumber @unique`
  - ✅ `ProProfile.userId @id` (1:1 avec User)
  - ✅ `City.publicId @unique` (lookup par publicId)
- **Migrations**: NON TROUVÉ — à vérifier dans `packages/database/prisma/migrations/`
- **Requêtes observées**:
  1. `user.findUnique(email)` — unicité email
  2. `user.findUnique(phone)` — unicité phone
  3. `city.findUnique(publicId)` — validation ville
  4. `proProfile.findUnique(cinNumber)` — unicité CIN (si PRO)
  5. `$transaction` → `user.create` + `proProfile.create`
  - Total: 4-5 queries avant l'insert. Acceptable pour un register.
- **Risques cohérence/perf**:
  - ⚠️ Race condition: entre les checks d'unicité et le `$transaction`, un autre register pourrait insérer le même email/phone. Protégé par les contraintes @unique en DB (P2002 catch), mais le message d'erreur sera générique.
  - ✅ Transaction atomique — pas de User orphelin sans ProProfile.

## 6) Intégration Front ↔ Back ↔ DB
- **Mapping champs**:
  - UI form → FormData (multipart) → RegisterDto (class-validator) → AuthService.register() → DB User + ProProfile
  - ✅ Champs alignés : firstName, lastName, email, phone, password, role, cityId, addressLine, cinNumber, cinFront, cinBack
- **Incohérences**:
  - ⚠️ **Contrat Zod vs DTO**: `RegisterSchema` (contracts) exige `password.min(6)`, `RegisterDto` (API) exige `@MinLength(10)` + complexité. Le front valide min 10. **Le contrat Zod est désaligné** — il ne reflète pas les règles réelles.
  - ⚠️ **cityId format**: Le front envoie le `publicId` (format `city_xxx_000`). Le DTO valide avec regex `city_[a-z]+_\d{3}`. Le service fait un `findUnique(publicId)` puis utilise l'`id` interne (cuid). ✅ Correct mais la couche d'indirection est fragile.
  - ⚠️ **Error mapping**: Le front tente de distinguer les erreurs par sous-chaîne ("email", "phone", "cin") mais le back retourne systématiquement "Données en conflit" sans préciser le champ. Le mapping ne fonctionne donc que sur les erreurs de validation (400), pas sur les conflits (409).
- **Gestion erreurs bout-en-bout**: ⚠️ Partiellement fonctionnelle — voir point ci-dessus.
- **Risques sécurité**: ✅ Le back est autoritatif. Les validations front sont un confort UX, pas une sécurité.

## 7) Problèmes & recommandations
### CRITIQUES
- **[C1] Aucun test backend**: Flux d'inscription critique sans aucune couverture de test.
- **[C2] Contrat Zod désaligné**: `RegisterSchema.password.min(6)` vs réalité `min(10) + maj + min + chiffre`. Risque de confusion pour les consommateurs du contrat.

### IMPORTANTS
- **[I1] Fetch direct au lieu de lib/api.ts**: Le register utilise `fetch()` directement (l.247) au lieu de `postFormData()`. Duplication de logique, pas de retry/refresh automatique.
- **[I2] Error mapping 409 inefficace**: Le back retourne "Données en conflit" sans préciser email/phone/CIN. Le front ne peut pas afficher un message spécifique au champ en conflit.
- **[I3] Hex en dur**: Même problème que login — violation CLAUDE.md.
- **[I4] Pas de guard "déjà connecté"**: Un user authentifié peut accéder à /auth/register.
- **[I5] Fichiers sur disque local**: Les photos CIN sont stockées localement, pas sur un service de stockage cloud. Risque de perte en cas de redéploiement.
- **[I6] Pas de log sur inscription réussie**: Aucun log traçable pour auditer les inscriptions.

### NICE-TO-HAVE
- **[N1]** Ajouter un CAPTCHA ou challenge (honeypot minimum) contre les inscriptions automatisées.
- **[N2]** Vérification email par lien de confirmation.
- **[N3]** Preview des photos CIN avant upload.
- **[N4]** Progress indicator visuel (step 1/2).

## 8) Plan "Amélioration Backend" (spécifique /auth/register)
### Quick wins (≤2h)
- [ ] Aligner le contrat Zod `RegisterSchema` avec les règles réelles (password min 10 + complexité)
- [ ] Ajouter un log `Logger.log` sur inscription réussie (rôle, ville, timestamp, sans PII)
- [ ] Améliorer le message 409 pour inclure un hint du champ en conflit (ex: `{ field: 'email' }`)

### Moyen (½–2 jours)
- [ ] Écrire tests unitaires pour `AuthService.register()` (CLIENT happy, PRO happy, duplicates, transaction rollback)
- [ ] Écrire tests d'intégration pour `POST /api/auth/register` (multipart, validation, 409, fichiers)
- [ ] Refactorer le front pour utiliser `postFormData()` de lib/api.ts

### Structurant (>2 jours)
- [ ] Migrer le stockage fichiers KYC vers S3/MinIO/Cloudflare R2
- [ ] Implémenter la vérification email (envoi lien + confirmation)
- [ ] Ajouter un CAPTCHA sur l'inscription

### Dépendances / risques
- Le stockage cloud nécessite un service (S3, R2) + configuration + migration des fichiers existants
- La vérification email nécessite un service SMTP
- Le CAPTCHA nécessite une intégration (hCaptcha, Turnstile)

---

# [/profile] — User Profile (global)

## 1) Résumé exécutif
- **Rôle(s)**: CLIENT + PRO (authentification requise)
- **Objectif métier**: Permettre à l'utilisateur connecté de consulter et modifier ses informations personnelles (nom, prénom, ville, adresse).
- **Statut global**: ⚠️ Fragile
- **Scores (0–5)**: Front: 3 ; Back: 3 ; DB: 3 ; Intégration: 2 ; Sécurité: 3 ; Perf: 3 ; Tests/Obs: 0
- **Fichiers clés**:
  - `apps/web/src/app/profile/page.tsx`
  - `apps/web/src/lib/api.ts` (getJSON, patchJSON)
  - `apps/web/src/store/authStore.ts`
  - `apps/web/src/components/Header.tsx`
  - `apps/api/src/users/users.controller.ts`
  - `apps/api/src/users/users.service.ts` (UpdateProfileDto, updateProfile)
  - `apps/api/src/auth/jwt-auth.guard.ts`

## 2) Cartographie technique (fichiers)
### Frontend
- `apps/web/src/app/profile/page.tsx` — Page profil avec mode lecture/édition
- `apps/web/src/components/Header.tsx` — Header avec navigation
- `apps/web/src/store/authStore.ts` — Source de vérité user côté client

### Backend
- `apps/api/src/users/users.controller.ts` — `PATCH /api/users/me`
- `apps/api/src/users/users.service.ts` — `updateProfile()` + `UpdateProfileDto`
- `apps/api/src/auth/jwt-auth.guard.ts` — Guard JWT

### DB
- `User` — Mise à jour firstName, lastName, cityId, addressLine

## 3) Frontend — État attendu vs état actuel
### Attendu (référentiel)
- Auth guard client fiable
- Mode lecture/édition avec validation
- Gestion des 3 états (loading, ready, error)
- A11y complète
- Design tokens

### Actuel (constaté)
- **UI/Composants**: Mode dual lecture/édition. Affichage des infos + bouton "Modifier" → formulaire inline. Carte dédiée par rôle (PRO → dashboard, CLIENT → réservations). Section "Zone de danger" avec déconnexion. Design utilise `zinc-*` + `dark:` (design system différent de login/register !).
- **Data fetching / submit**:
  - Fetch villes: `getJSON('/public/cities')` dans un useEffect
  - Save: `patchJSON('/users/me', data)` puis `setUser(updatedUser)` pour mettre à jour le store
  - ⚠️ Pas de re-fetch du user complet après update — le front trust la réponse du PATCH
- **Validations**:
  - ❌ **Aucune validation côté front** — pas de regex, pas de min length, seul `required` HTML
  - Le back valide (class-validator) mais le front ne donne pas de feedback inline
- **Erreurs & UX**:
  - ❌ Utilise `alert()` pour afficher les erreurs (l.100) — UX très pauvre
  - ✅ Message succès avec bandeau vert + auto-dismiss 3s
  - ⚠️ `catch (error: any)` — pas de typage d'erreur
- **A11y**:
  - ❌ `<label>` sans `htmlFor`/`id` sur TOUS les inputs du mode édition (violation CLAUDE.md)
  - ❌ Pas d'`aria-live` sur le message succès
  - ❌ Emojis utilisés comme icônes (👤📊📅⚠️) — non interprétables par les lecteurs d'écran, pas de `aria-hidden`
  - ⚠️ Le `<select>` ville utilise `disabled={loadingCities}` mais pas de skeleton/spinner visible
- **Perf**:
  - ⚠️ Le fetch villes est fait à chaque visite de la page (pas de cache côté composant). Mais `getJSON` utilise le cache mémoire pour `/public/cities` (10min TTL) → OK en pratique.
  - ⚠️ `mounted` state anti-hydration: retourne `null` au premier render → flash blanc potentiel.
- **Sécurité front**: ✅ Guard client-side redirige vers login si non authentifié. ⚠️ Le guard utilise le store Zustand (client-side) — si le store est désynchronisé, le user voit un flash avant redirection. ✅ Logout appelle `/auth/logout` côté back.
- **Incohérence design**: Cette page utilise `zinc-*` + `dark:` classes alors que login/register utilisent `slate-*` + `#F08C1B`. Pas de cohérence visuelle avec le reste du site.

## 4) Backend — État attendu vs état actuel
### Endpoints utilisés par la page
- **[PATCH] /api/users/me** → `UsersController.updateProfile()` → `UsersService.updateProfile()` → Guard: `JwtAuthGuard`
  - Request DTO: `UpdateProfileDto { cityId?: UUID, firstName?: string(2-50, alpha), lastName?: string(2-50, alpha), addressLine?: string(5-200) }`
  - Response: User avec city + proProfile sélects
  - Errors: 404 "Utilisateur introuvable", 400 validation
  - Sécurité: JwtAuthGuard (authentification requise)

- **[GET] /api/public/cities** — Liste des villes (public, pas de guard)

### Attendu (référentiel)
- AuthZ: seul l'owner peut modifier son profil
- Validation serveur complète
- Pas de mass assignment
- Réponse formatée comme PublicUser

### Actuel (constaté)
- **Auth/AuthZ**: ✅ `JwtAuthGuard` protège la route. ✅ `req.user.id` utilisé comme userId — un user ne peut modifier que son propre profil (ownership implicite).
- **Validations serveur**:
  - ✅ `UpdateProfileDto`: class-validator avec whitelist + forbidNonWhitelisted
  - ✅ `cityId`: `@IsUUID('4')` — valide un UUID v4
  - ⚠️ **Incohérence cityId**: Le register utilise `publicId` (format `city_xxx_000`) mais le profile update attend un UUID v4 interne. **Le front envoie `user.cityId`** qui est le `publicId` retourné par `toPublicUser()`. Si le front envoie le publicId, le back essaiera de faire un `user.update({ cityId: publicId })` — **cela échouera silencieusement ou causera une erreur FK** car `cityId` en DB est le cuid interne, pas le publicId.
  - ✅ firstName/lastName: regex alpha accentuée, length 2-50
  - ✅ addressLine: length 5-200
- **Erreurs**: ⚠️ Le service retourne directement le résultat Prisma — pas de mapping vers `PublicUser`. Le front reçoit un objet avec `city.id` (cuid interne) au lieu de `city.publicId`.
- **Perf**: ✅ Une seule query Prisma pour le findUnique + update. Pas de N+1.
- **Observabilité**: ❌ Aucun log dans le controller ni le service.
- **Tests**: ❌ Aucun test.
- **Sécurité**: ✅ Whitelist DTO. ✅ JwtAuthGuard. ❌ Pas de rate limit sur cette route.

## 5) Base de données — État attendu vs état actuel
- **Tables**: `User` — update direct
- **Contraintes/index**: ✅ `User.id @id` (PK). ✅ `cityId` est une FK vers `City.id`.
- **Requêtes observées**: `user.findUnique(id)` + `user.update(id, data)` — 2 queries. Le findUnique est probablement superflu (l'update avec WHERE id ferait la même chose et renverrait une erreur si non trouvé).
- **Risques cohérence/perf**:
  - ❌ **cityId mismatch critique**: Le front stocke `publicId` (ex: `city_casa_001`), le back attend un UUID. L'update Prisma va tenter de mettre un publicId dans la colonne `cityId` qui est une FK vers `City.id` (cuid). **Cela provoquera une erreur FK Prisma non gérée**.
  - ⚠️ Le `dataToUpdate` est typé `any` — pas de sécurité de type TypeScript.

## 6) Intégration Front ↔ Back ↔ DB
- **Mapping champs**:
  - UI → PATCH body: `{ firstName, lastName, cityId, addressLine }` → DTO `UpdateProfileDto` → DB `User.update`
  - ❌ **cityId**: Le front envoie `user.cityId` qui est le **publicId** (`city_xxx_000` via `toPublicUser()`). Le DTO attend un `@IsUUID('4')`. **Le PATCH échouera à la validation** avec une erreur 400 sur cityId.
- **Incohérences**:
  - ❌ **Bug critique cityId**: Le register utilise publicId, le profil utilise un UUID. Le `toPublicUser()` retourne `city?.publicId ?? user.cityId` comme `cityId`. Le front stocke ce publicId. Quand le front renvoie ce publicId pour update, le DTO `@IsUUID('4')` le rejettera.
  - ⚠️ **Réponse non formatée**: Le PATCH retourne un objet Prisma brut (avec `city.id` interne) au lieu de `PublicUser`. Le `setUser(updatedUser)` écrasera le store avec un format différent de ce que `toPublicUser()` produit.
- **Gestion erreurs bout-en-bout**: ❌ Erreurs affichées via `alert()`, pas de mapping.
- **Risques sécurité**: ⚠️ Le front utilise `patchJSON` qui envoie `X-CSRF-PROTECTION: '1'` mais le controller **n'appelle pas `requireCsrf()`**. Pas de protection CSRF explicite.

## 7) Problèmes & recommandations
### CRITIQUES
- **[C1] Bug cityId mismatch**: Le front envoie un publicId (`city_xxx_000`), le DTO attend un UUID v4. Le PATCH de ville est **cassé**. L'update ville ne peut pas fonctionner.
- **[C2] Réponse non formatée**: Le PATCH retourne un objet Prisma brut, pas un `PublicUser`. Le store Zustand sera corrompu avec un format incohérent (city.id vs city.publicId, pas de isPremium, pas de kycStatus).
- **[C3] Aucun test**: Flux profil sans couverture.

### IMPORTANTS
- **[I1] alert() pour les erreurs**: UX inacceptable en production.
- **[I2] A11y critique**: Labels sans htmlFor/id, emojis comme icônes sans aria-hidden.
- **[I3] Pas de validation front**: Aucun feedback inline avant soumission.
- **[I4] Design incohérent**: `zinc-*` + `dark:` mode ici vs `slate-*` + orange sur login/register.
- **[I5] Pas de rate limit**: Aucune protection rate limit sur PATCH /users/me.

### NICE-TO-HAVE
- **[N1]** Squelette loading au lieu de flash blanc.
- **[N2]** Confirmation avant déconnexion.
- **[N3]** Modifier email/phone avec vérification.

## 8) Plan "Amélioration Backend" (spécifique /profile)
### Quick wins (≤2h)
- [ ] **FIX CRITIQUE**: Changer `UpdateProfileDto.cityId` de `@IsUUID('4')` vers `@Matches(/^city_[a-z]+_\d{3}$/)` OU résoudre le publicId → id dans le service avant l'update
- [ ] **FIX CRITIQUE**: Formater la réponse PATCH via `toPublicUser()` pour retourner un `PublicUser` cohérent
- [ ] Ajouter `@Throttle` sur PATCH /users/me
- [ ] Ajouter un log sur modification de profil

### Moyen (½–2 jours)
- [ ] Écrire tests unitaires pour `UsersService.updateProfile()` (happy path, cityId validation, user not found)
- [ ] Refactorer le front : remplacer `alert()` par un bandeau d'erreur inline
- [ ] Ajouter validation front (firstName/lastName min 2, addressLine min 5)

### Structurant (>2 jours)
- [ ] Unifier le format cityId dans toute l'application (convention unique publicId vs cuid)
- [ ] Ajouter modification email/phone avec vérification (OTP ou lien)

### Dépendances / risques
- Le fix cityId doit être cohérent avec le register et tous les autres endpoints qui utilisent cityId
- Le changement de format de réponse du PATCH pourrait impacter d'autres consommateurs

---

# [/auth/forgot-password] — Forgot Password

## 1) Résumé exécutif
- **Rôle(s)**: Public
- **Objectif métier**: Permettre à un utilisateur ayant oublié son mot de passe de le réinitialiser.
- **Statut global**: ❌ Risque — **FONCTIONNALITE INEXISTANTE**
- **Scores (0–5)**: Front: 0 ; Back: 0 ; DB: 0 ; Intégration: 0 ; Sécurité: 0 ; Perf: N/A ; Tests/Obs: 0
- **Fichiers clés**: AUCUN

## 2) Cartographie technique (fichiers)
### Frontend
- ❌ **AUCUNE PAGE** — `apps/web/src/app/auth/forgot-password/page.tsx` **n'existe pas**
- Le lien existe dans `apps/web/src/app/auth/login/page.tsx:179` : `<Link href="/auth/forgot-password">`

### Backend
- ❌ **AUCUN ENDPOINT** — Recherche de `forgot-password`, `reset-password`, `resetPassword`, `forgotPassword` dans `apps/api/src/` : **0 résultat**
- Pas de controller, pas de service, pas de DTO

### DB
- ❌ **PAS DE TABLE** — Pas de modèle `PasswordReset` ou `ResetToken` dans le schema Prisma
- Pas de champ `resetToken`/`resetExpires` sur le modèle `User`

## 3) Frontend — État attendu vs état actuel
### Attendu (référentiel)
- Page avec formulaire email/téléphone
- Message de confirmation (même si compte n'existe pas — anti-enumération)
- Page de reset avec nouveau mot de passe (via token dans l'URL)

### Actuel (constaté)
- ❌ **PAGE 404** : Le lien `<Link href="/auth/forgot-password">` depuis la page login mène vers une page inexistante (404 Next.js). UX complètement cassée.
- ❌ Aucune alternative de récupération de compte n'est proposée (pas de SMS, pas de support link pour ce cas).

## 4) Backend — État attendu vs état actuel
### Endpoints attendus (non existants)
- `POST /api/auth/forgot-password` — Envoyer un email/SMS de reset
- `POST /api/auth/reset-password` — Réinitialiser le mot de passe avec un token

### Actuel (constaté)
- ❌ **AUCUN endpoint** de reset password dans le backend
- ❌ Pas de service d'envoi d'email configuré (pas de module mail visible dans l'API)
- ❌ Pas de table/modèle pour stocker les tokens de reset

## 5) Base de données — État attendu vs état actuel
- ❌ Aucune table pour les tokens de réinitialisation
- ❌ Pas de champ `resetToken`/`resetExpires` sur User

## 6) Intégration Front ↔ Back ↔ DB
- ❌ **Intégration inexistante** — lien mort côté front, aucun backend.

## 7) Problèmes & recommandations
### CRITIQUES
- **[C1] Lien 404 en production**: Le lien "Mot de passe oublié" sur la page login mène à une 404. Utilisateur bloqué sans recours. **Impact direct sur la rétention utilisateur et le support**.
- **[C2] Aucune récupération de compte**: Un utilisateur qui oublie son mot de passe n'a aucun moyen de récupérer son compte. C'est une dette critique de sécurité ET d'UX.
- **[C3] Non-conformité sécurité**: L'absence de reset password est considérée comme une faille par les standards OWASP (A07:2021 — Identification and Authentication Failures).

### IMPORTANTS
- **[I1]** En attendant l'implémentation, retirer ou désactiver le lien "Mot de passe oublié" pour éviter la 404.
- **[I2]** Proposer une alternative temporaire (ex: lien `mailto:support@khadamat.ma` avec sujet pré-rempli).

### NICE-TO-HAVE
- N/A — tout est critique pour cette fonctionnalité.

## 8) Plan "Amélioration Backend" (spécifique /auth/forgot-password)
### Quick wins (≤2h)
- [ ] **IMMEDIAT**: Remplacer le `<Link href="/auth/forgot-password">` par un `<a href="mailto:support@khadamat.ma?subject=Réinitialisation mot de passe">` temporaire
- [ ] Ou supprimer le lien et afficher "Contactez le support" en attendant

### Moyen (½–2 jours)
- [ ] Créer le modèle DB `PasswordResetToken` (userId, tokenHash, expiresAt, used)
- [ ] Créer `POST /api/auth/forgot-password` — génère un token, envoie par email
- [ ] Créer `POST /api/auth/reset-password` — vérifie token, met à jour le password
- [ ] Créer la page front `/auth/forgot-password` avec formulaire email
- [ ] Créer la page front `/auth/reset-password?token=xxx` avec nouveau mot de passe

### Structurant (>2 jours)
- [ ] Configurer un service email (SendGrid, AWS SES, Resend)
- [ ] Templates email de reset en français
- [ ] Rate limit spécifique (1 email reset / 5 min par email)
- [ ] Logs d'audit pour les demandes de reset (compliance)
- [ ] Tests e2e du flux complet

### Dépendances / risques
- **Dépendance bloquante**: Nécessite un service d'envoi d'emails (SMTP/API)
- Risque d'enumération: le endpoint doit retourner le même message que le compte existe ou non
- Token doit être à usage unique, expirant (1h max), et stocké hashé en DB

---

# Synthèse Phase 1 — Auth & Profil

## Problèmes transverses

### Sécurité
- **Aucune récupération de mot de passe** (lien 404, aucun backend) — dette critique
- **Lockout in-memory** — non persistant, non distribué, contournable
- **Pas de CSRF check** sur login/register (le header est envoyé par le front mais jamais vérifié côté back)
- **Pas de vérification email** — les comptes sont créés avec des emails non vérifiés
- **Fichiers KYC sur disque local** — risque de perte, pas de CDN

### Contrats API
- **Désalignement Zod <-> class-validator**: `RegisterSchema.password.min(6)` vs `RegisterDto.@MinLength(10)`. Le contrat partagé ne reflète pas les règles réelles du backend.
- **cityId dual format**: `publicId` (`city_xxx_000`) utilisé partout côté front/contrats, mais `UpdateProfileDto` attend un `@IsUUID('4')` interne — **bug cassant** sur la modification de ville.
- **Réponse PATCH /users/me** non formatée en `PublicUser` — corrompt le store client.

### Cohérence rôles/redirections
- **Pas de guard "déjà connecté"** sur login/register — un user authentifié peut y accéder
- **Doublon page profil**: `/profile` (tous users) et `/dashboard/profile` (PRO only) — confusion UX et maintenance
- Redirections post-auth correctes (PRO → dashboard, CLIENT → home)

### Dette technique
- **Design incohérent**: login/register utilisent `slate-*` + `#F08C1B` (hex en dur), profile utilise `zinc-*` + `dark:` mode. Aucun ne suit les design tokens CLAUDE.md.
- **Register n'utilise pas `postFormData()`** de lib/api.ts — fetch direct avec duplication
- **`alert()` pour les erreurs** dans /profile — UX non professionnelle
- **A11y** non conforme sur login et profile (labels sans htmlFor, pas d'aria-live)

### Manques tests/observabilité
- ❌ **ZERO fichier .spec.ts** dans tout `apps/api/src/` — aucun test unitaire ni d'intégration sur aucune fonctionnalité
- ❌ Pas de `requestId` dans les logs
- ❌ Pas de log sur inscription réussie, modification de profil, ou logout
- ❌ Pas de monitoring/alerting visible

## Risques majeurs (Top 5)

1. **Mot de passe oublié inexistant** — Lien 404 visible en prod. Perte d'utilisateurs, surcharge support, non-conformité sécurité OWASP. **Impact: critique UX + sécurité.**

2. **Bug cityId sur /profile** — Le PATCH /users/me est cassé pour la modification de ville. `@IsUUID('4')` rejette le publicId envoyé par le front. **Impact: fonctionnalité cassée.**

3. **Zéro tests** — Aucun test sur l'ensemble du backend. Un changement accidentel sur auth (hash, validation, cookies) cassera le système sans détection. **Impact: stabilité critique.**

4. **Contrats Zod désalignés** — Le contrat partagé (`packages/contracts`) ne reflète pas les règles réelles du backend. Toute nouvelle application (mobile, partenaire) se basant sur ces contrats échouera. **Impact: scalabilité du monorepo.**

5. **Lockout in-memory + pas de CSRF** — Protection bruteforce perdue au redémarrage. Pas de CSRF vérifié côté back malgré le header envoyé. **Impact: sécurité.**

## Plan backend priorisé (Phase 2 — améliorations)

### Priorité 0 (immédiat — avant toute feature)
- [ ] **FIX** Bug cityId: aligner `UpdateProfileDto.cityId` avec le format publicId OU résoudre dans le service
- [ ] **FIX** Réponse PATCH /users/me: formater via `toPublicUser()` pour retourner un `PublicUser` cohérent
- [ ] **FIX** Lien "Mot de passe oublié": remplacer par `mailto:support@` temporaire ou supprimer
- [ ] **ALIGN** Contrat Zod `RegisterSchema.password` -> min 10 + complexité (aligner avec RegisterDto)
- [ ] Ajouter `@Throttle` sur PATCH /users/me

### Priorité 1 (semaine prochaine)
- [ ] Écrire les premiers tests unitaires: `AuthService.login()`, `AuthService.register()`, `UsersService.updateProfile()`
- [ ] Écrire les tests d'intégration: `POST /auth/login`, `POST /auth/register`, `PATCH /users/me`
- [ ] Ajouter un cron de nettoyage des RefreshToken expirés
- [ ] Ajouter des logs structurés (register success, profile update, logout) avec requestId
- [ ] Migrer `FailedLoginService` vers Redis (ou au minimum persister en DB)

### Priorité 2 (sprint suivant)
- [ ] Implémenter le flux complet "Mot de passe oublié" (modèle DB, endpoints, pages front, service email)
- [ ] Configurer un service d'envoi d'emails (SendGrid/SES/Resend)
- [ ] Implémenter la vérification email post-inscription
- [ ] Migrer le stockage KYC vers S3/R2
- [ ] Unifier le format `cityId` dans toute l'application (convention unique)
- [ ] Ajouter CAPTCHA/honeypot sur register
- [ ] Harmoniser le design system (tokens CSS au lieu de hex en dur)

---
---

# PHASE 2 — Parcours CLIENT (Discovery → Booking → Suivi)

---

# [/] — Homepage

## 1) Résumé exécutif
- **Rôle(s)**: Public + CLIENT/PRO si connecté
- **Objectif métier**: Point d'entrée principal. Permettre la recherche par ville + catégorie, présenter la plateforme, convertir visiteurs en utilisateurs.
- **Statut global**: ✅ OK (composant le mieux structuré du site)
- **Scores (0–5)**: Front: 5 ; Back: 4 ; DB: 4 ; Intégration: 4 ; Sécurité: 4 ; Perf: 4 ; Tests/Obs: 1
- **Fichiers clés**:
  - `apps/web/src/app/page.tsx`
  - `apps/web/src/components/home/Hero.tsx`
  - `apps/web/src/components/home/Categories.tsx`
  - `apps/web/src/components/home/FeaturedPros.tsx`
  - `apps/web/src/components/home/Footer.tsx`
  - `apps/web/src/components/Navbar.tsx`
  - `apps/api/src/catalog/catalog.controller.ts`
  - `apps/api/src/catalog/catalog.service.ts`

## 2) Cartographie technique (fichiers)
### Frontend
- `apps/web/src/app/page.tsx` — Server component, composition de sections
- `apps/web/src/components/home/Hero.tsx` — Formulaire recherche ville+catégorie (client component)
- `apps/web/src/components/home/Categories.tsx` — Grille catégories dynamiques
- `apps/web/src/components/home/FeaturedPros.tsx` — Pros mis en avant
- `apps/web/src/components/Navbar.tsx` — Navigation globale
- `apps/web/src/components/home/Footer.tsx` — Pied de page

### Backend
- `apps/api/src/catalog/catalog.controller.ts` — `GET /public/cities`, `GET /public/categories`, `GET /public/pros`
- `apps/api/src/catalog/catalog.service.ts` — `getCities()`, `getCategories()`, `getPros()`

### DB
- `City`, `Category`, `User+ProProfile` (lecture seule)

## 3) Frontend — État attendu vs état actuel
### Attendu (référentiel)
- SEO: metadata, balises structurées
- Routing: recherche → /pros?cityId=X&categoryId=Y
- A11y complète (hero form, keyboard, aria)
- Design tokens
- Loading states (skeleton)
- Performance (lazy, Suspense)

### Actuel (constaté)
- **UI/Composants**: Page composée de 9 sections. Layout propre. Design tokens utilisés (`bg-background`, `text-text-primary`). Hero est le composant le mieux structuré du projet.
- **Data fetching**: `Promise.all` pour cities + categories dans Hero. `Suspense` + `HeroSkeleton` pour le loading.
- **Validations**: Hero requiert ville + catégorie sélectionnées avant soumission. Bouton `disabled` + `title` tooltip si incomplet. ✅ Conforme CLAUDE.md.
- **Erreurs & UX**: ✅ Gestion erreur fetch avec retry button. ✅ État vide ("Aucun résultat"). ✅ Fuzzy search sur catégories.
- **A11y**:
  - ✅ Labels avec `htmlFor`/`id`
  - ✅ ARIA `combobox`, `listbox`, `option`, `aria-expanded`, `aria-controls`, `aria-activedescendant`
  - ✅ Navigation clavier (ArrowUp/Down, Enter, Escape)
  - ✅ `prefers-reduced-motion` respecté
  - ✅ Focus management
- **Perf / SEO**:
  - ✅ `export const metadata: Metadata` — titre + description SEO
  - ✅ Server component au niveau page, client component uniquement pour Hero
  - ✅ `Suspense` avec fallback skeleton
  - ⚠️ Les sections Categories, FeaturedPros ne sont pas lazy-loadées (pas de `dynamic()` ou `Suspense` individuel)
- **NON TROUVÉ**: Pas de `sitemap.xml` ni `robots.txt` configurés.

## 4) Backend — État attendu vs état actuel
### Endpoints utilisés par la page
- **[GET] /api/public/cities** → `CatalogController.getCities()` → `CatalogService.getCities()` → Auth: aucun
  - Response: `PublicCity[]` — `{ id: publicId, name, slug }`
  - Cache: 10 min (cache-manager)
- **[GET] /api/public/categories** → `CatalogController.getCategories()` → `CatalogService.getCategories()` → Auth: aucun
  - Response: `PublicCategory[]` — `{ id: publicId, name, slug }`
  - Cache: 10 min

### Attendu (référentiel)
- Endpoints publics performants, cache
- Pas de données sensibles exposées
- Rate limit basique

### Actuel (constaté)
- **Auth/AuthZ**: ✅ Endpoints publics, pas de guard. Correct.
- **Validations serveur**: N/A (lecture seule, pas d'input).
- **Erreurs**: ✅ Standard NestJS exceptions.
- **Perf**: ✅ Cache server-side via `cache-manager` (10min cities, 10min categories). ✅ Cache client-side via `lib/api.ts` (10min TTL).
- **Observabilité**: ⚠️ Pas de log sur les requêtes publiques (acceptable pour les reads).
- **Tests**: ❌ Aucun test.
- **Sécurité**: ⚠️ Pas de `@Throttle` sur les endpoints publics. Risque de scraping/DoS.

## 5) Base de données — État attendu vs état actuel
- **Tables**: `City` (lecture), `Category` (lecture)
- **Contraintes/index**: ✅ `City.publicId @unique`, `City.name @unique`, `City.slug @unique`. Idem pour Category.
- **Requêtes observées**: `city.findMany(orderBy: name)`, `category.findMany(orderBy: name)` — Full table scan mais tables petites (< 100 rows).
- **Risques**: Aucun risque significatif. Tables statiques.

## 6) Intégration Front ↔ Back ↔ DB
- **Mapping**: ✅ `City.publicId` → API `id` → Front `cityId`. Cohérent.
- **Incohérences**: Aucune.
- **Gestion erreurs**: ✅ Hero gère erreur fetch + retry.
- **Risques sécurité**: ✅ Aucune donnée sensible exposée.

## 7) Problèmes & recommandations
### CRITIQUES
- Aucun problème critique.

### IMPORTANTS
- **[I1] Pas de rate limit** sur les endpoints publics — scraping possible.
- **[I2] Aucun test backend** pour les endpoints catalog.
- **[I3] Pas de sitemap.xml/robots.txt** — impact SEO.

### NICE-TO-HAVE
- **[N1]** Lazy-load les sections sous le fold (Categories, FeaturedPros, etc.).
- **[N2]** Ajouter des données structurées JSON-LD (LocalBusiness, Service).
- **[N3]** Ajouter Open Graph / Twitter Card meta.

## 8) Plan "Amélioration Backend" (spécifique /)
### Quick wins (≤2h)
- [ ] Ajouter `@Throttle` sur `/public/cities` et `/public/categories` (ex: 30 req/min)
- [ ] Ajouter `sitemap.xml` et `robots.txt`

### Moyen (½–2 jours)
- [ ] Écrire tests unitaires pour `CatalogService.getCities()`, `getCategories()`
- [ ] Ajouter Open Graph et JSON-LD structured data

### Structurant (>2 jours)
- [ ] Implémenter ISR (Incremental Static Regeneration) pour la homepage

### Dépendances / risques
- Aucune dépendance bloquante.

---

# [/pros] — Liste des professionnels

## 1) Résumé exécutif
- **Rôle(s)**: Public + CLIENT/PRO si connecté
- **Objectif métier**: Afficher la liste filtrée des professionnels disponibles par ville et catégorie.
- **Statut global**: ⚠️ Fragile
- **Scores (0–5)**: Front: 2 ; Back: 4 ; DB: 3 ; Intégration: 3 ; Sécurité: 3 ; Perf: 2 ; Tests/Obs: 1
- **Fichiers clés**:
  - `apps/web/src/app/pros/page.tsx`
  - `apps/web/src/components/ProCard.tsx`
  - `apps/web/src/components/Header.tsx`
  - `apps/api/src/catalog/catalog.controller.ts` (getPros)
  - `apps/api/src/catalog/catalog.service.ts` (getPros, getProsV2)
  - `packages/contracts/src/schemas/public.ts` (PublicProCard)

## 2) Cartographie technique (fichiers)
### Frontend
- `apps/web/src/app/pros/page.tsx` — Server component, SSR fetch
- `apps/web/src/components/ProCard.tsx` — Card individuelle

### Backend
- `apps/api/src/catalog/catalog.controller.ts:37-73` — `GET /public/pros` (v1)
- `apps/api/src/catalog/catalog.service.ts:62-85` — `getPros()` (v1)
- `apps/api/src/catalog/catalog.service.ts:88-132` — `getProsV2()` (v2 avec pagination + tri monétisation)

### DB
- `User` + `ProProfile` + `ProService` + `City` + `Category` (joins)

## 3) Frontend — État attendu vs état actuel
### Attendu (référentiel)
- Pagination / scroll infini
- Filtres visibles (ville, catégorie)
- SEO (metadata dynamique)
- Loading skeleton
- État vide / erreur

### Actuel (constaté)
- **UI/Composants**: Layout basique. Titre + compteur + grille 3 colonnes. ProCard montre nom, ville, services, badge "Vérifié".
- **Data fetching**: ✅ Server-side fetch (`cache: 'no-store'`). ⚠️ Utilise la V1 de l'API (`/public/pros`) qui ne retourne PAS de total ni de pagination.
- **Validations**: N/A (pas de formulaire).
- **Erreurs & UX**: ✅ État erreur affiché. ✅ État vide ("Aucun professionnel trouvé").
- **A11y**:
  - ⚠️ Design `zinc-*` + `dark:` au lieu des design tokens
  - ⚠️ Pas de skip-to-content link
  - ✅ Grille responsive
- **Perf / SEO**:
  - ❌ **PAS DE PAGINATION** — charge TOUS les pros en une seule requête. Si 10 000 pros, la page charge tout.
  - ❌ Pas de metadata dynamique (pas de `generateMetadata` basé sur les filtres)
  - ❌ `cache: 'no-store'` — pas de cache SSR, chaque visite = nouvelle requête.
  - ❌ Pas de skeleton / loading state (SSR, mais lent si beaucoup de pros)
- **NON TROUVÉ**:
  - Pas de tri (par prix, par note, par proximité)
  - Pas de filtres UI visibles (les filtres viennent uniquement des query params du Hero)
  - Pas de bouton "retour aux filtres"

## 4) Backend — État attendu vs état actuel
### Endpoints utilisés par la page
- **[GET] /api/public/pros?cityId=X&categoryId=Y** → `CatalogController.getPros()` → `CatalogService.getPros()` → Auth: aucun
  - Request: Query params `cityId` (optional), `categoryId` (optional), `page` (default 1), `limit` (default 20)
  - Response V1: `PublicProCard[]` (array sans total)
  - Response V2: `{ data: PublicProCard[], total, page, limit }`
  - Errors: 400 si cityId/categoryId invalide

### Attendu (référentiel)
- Pagination avec total
- Tri (monétisation + pertinence)
- Cache serveur
- Index DB optimisés
- Rate limit

### Actuel (constaté)
- **Auth/AuthZ**: ✅ Endpoint public, correct.
- **Validations serveur**: ✅ Page >= 1, limit 1-100. ✅ cityId/categoryId regex validé.
- **Logique métier**: ✅ V2 trie par `isPremium desc, boostActiveUntil desc, createdAt desc` (monétisation-first). ✅ V2 retourne `total` pour pagination.
- **Erreurs**: ✅ 400 si IDs invalides.
- **Perf**: ✅ V2 a un cache de 2min. ✅ `Promise.all([findMany, count])` parallélisé. ⚠️ Le front n'utilise PAS V2.
- **Observabilité**: ✅ `Logger.log` avec compteur de résultats.
- **Tests**: ❌ Aucun test.
- **Sécurité**: ⚠️ Pas de `@Throttle`. ⚠️ Le phone est sélectionné dans `proSelectFields()` (l.225) mais masqué dans `mapToPublicProCard()` (non retourné dans la card). OK mais fragile.

## 5) Base de données — État attendu vs état actuel
- **Tables**: `User` JOIN `ProProfile` JOIN `ProService` JOIN `City` JOIN `Category`
- **Contraintes/index**:
  - ✅ `ProService.@@index([categoryId])` — index sur le filtre catégorie
  - ✅ `ProService.@@unique([proUserId, categoryId])` — unicité service par pro
  - ⚠️ **Pas d'index composite** `ProProfile(cityId, isPremium)` pour optimiser le tri monétisation + filtre ville
  - ⚠️ **Pas d'index** sur `ProProfile.isPremium` ni `ProProfile.boostActiveUntil` (utilisés dans l'ORDER BY)
- **Requêtes observées**: `user.findMany` avec WHERE multi-join + ORDER BY multi-champ. Potentiellement lent sans index composites.
- **Risques**: ⚠️ N+1 potentiel si Prisma ne batch pas les relations (services, city). Prisma fait du batching automatique en général, mais à surveiller avec EXPLAIN.

## 6) Intégration Front ↔ Back ↔ DB
- **Mapping**: ✅ API retourne `PublicProCard { id, firstName, lastName (masqué), city, isVerified, services }`. Front consomme directement.
- **Incohérences**:
  - ❌ **Le front utilise V1** (`/public/pros`) mais **V2 existe** avec pagination + cache + tri. Le front ne bénéficie pas de la pagination.
  - ⚠️ Le `lastName` est masqué côté API (`B.`) mais le contrat Zod `PublicProCardSchema` ne l'impose pas au niveau du type.
- **Gestion erreurs**: ✅ Catch fetch error → affichage bandeau.
- **Risques sécurité**: ✅ Pas de PII exposée dans la liste. Le phone n'est pas dans la réponse.

## 7) Problèmes & recommandations
### CRITIQUES
- **[C1] Pas de pagination côté front**: Charge TOUS les pros. Avec la croissance, la page sera inutilisable (DOM explosion, temps de réponse).
- **[C2] Front utilise V1 au lieu de V2**: V2 existe avec pagination, total, cache, tri monétisation — mais n'est pas consommée.

### IMPORTANTS
- **[I1] Pas d'index DB** pour le tri `isPremium + boostActiveUntil`. Perf dégradée avec le volume.
- **[I2] Pas de rate limit** sur `/public/pros`.
- **[I3] Pas de filtres UI** visibles — l'utilisateur ne peut pas changer ville/catégorie sans retourner au Hero.
- **[I4] Hex en dur** + `dark:` mode incohérent avec le reste.
- **[I5] Pas de metadata SEO** dynamique.

### NICE-TO-HAVE
- **[N1]** Ajouter un tri (prix, note, distance).
- **[N2]** Infinite scroll ou "Load more".
- **[N3]** Carte géographique.

## 8) Plan "Amélioration Backend" (spécifique /pros)
### Quick wins (≤2h)
- [ ] Migrer le front vers `/public/pros/v2` avec pagination
- [ ] Ajouter `@Throttle` sur `/public/pros` et `/public/pros/v2`
- [ ] Ajouter index composite `ProProfile(cityId, isPremium)` dans le schema Prisma

### Moyen (½–2 jours)
- [ ] Ajouter pagination UI (boutons page précédente/suivante ou infinite scroll)
- [ ] Ajouter filtres UI (ville, catégorie) persistants sur la page
- [ ] Écrire tests pour `CatalogService.getPros()` et `getProsV2()`

### Structurant (>2 jours)
- [ ] Implémenter la recherche full-text (Elasticsearch/MeiliSearch) si le volume de pros croît
- [ ] Ajouter `generateMetadata` dynamique pour SEO

### Dépendances / risques
- L'ajout d'index nécessite une migration Prisma.
- La migration V1→V2 côté front est simple (ajuster le fetch + ajouter le rendu pagination).

---

# [/pro/[id]] — Profil public du pro

## 1) Résumé exécutif
- **Rôle(s)**: Public + CLIENT/PRO si connecté (phone démasqué si booking existant)
- **Objectif métier**: Afficher le profil public d'un professionnel avec ses services et un CTA de réservation.
- **Statut global**: ⚠️ Fragile
- **Scores (0–5)**: Front: 3 ; Back: 4 ; DB: 4 ; Intégration: 3 ; Sécurité: 3 ; Perf: 2 ; Tests/Obs: 1
- **Fichiers clés**:
  - `apps/web/src/app/pro/[id]/page.tsx`
  - `apps/web/src/components/ProBookingCTA.tsx`
  - `apps/api/src/catalog/catalog.controller.ts:85-100` (getProDetail)
  - `apps/api/src/catalog/catalog.service.ts:134-187` (getProDetail)
  - `packages/contracts/src/schemas/public.ts` (PublicProProfile)

## 2) Cartographie technique (fichiers)
### Frontend
- `apps/web/src/app/pro/[id]/page.tsx` — Server component, SSR fetch
- `apps/web/src/components/ProBookingCTA.tsx` — CTA réservation (client component)

### Backend
- `apps/api/src/catalog/catalog.controller.ts` — `GET /public/pros/:id` avec OptionalJwtGuard
- `apps/api/src/catalog/catalog.service.ts:134-187` — `getProDetail()` avec logique phone masqué/démasqué

### DB
- `User` + `ProProfile` + `ProService` + `City` + `Category` + `Booking` (pour vérifier éligibilité phone)

## 3) Frontend — État attendu vs état actuel
### Attendu (référentiel)
- Profil complet (avatar, nom, ville, services, prix)
- CTA réservation contextuel (auth-aware)
- SEO (metadata dynamique)
- Pas de PII exposée publiquement

### Actuel (constaté)
- **UI/Composants**: Layout propre. Avatar initiale, nom complet, badge vérifié, ville, liste services avec prix formaté, CTA réservation.
- **Data fetching**: Server-side fetch (`cache: 'no-store'`). `notFound()` si 404 ou erreur.
- **Erreurs & UX**: ✅ 404 Next.js si pro non trouvé. ⚠️ Les erreurs réseau → `notFound()` aussi (masque les erreurs serveur).
- **A11y**: ⚠️ `zinc-*` + `dark:`, emojis comme icônes (📍, ✓). ⚠️ Pas d'aria-hidden sur les emojis.
- **Perf / SEO**:
  - ❌ `export const dynamic = 'force-dynamic'` + `revalidate = 0` — **aucun cache SSR**. Chaque visite = requête au backend.
  - ❌ Pas de `generateMetadata()` — titre/description génériques.
  - ❌ Pas de données structurées (JSON-LD Service/Person).
- **Sécurité front**:
  - ⚠️ Le SSR fetch n'envoie PAS de cookie d'authentification → le backend ne peut pas identifier le user → le phone sera TOUJOURS masqué en SSR. Le `ProBookingCTA` est un client component qui pourrait re-fetch, mais ne le fait pas.
  - ⚠️ L'id dans l'URL est le cuid interne de la DB, pas un publicId. Enumeration possible.

## 4) Backend — État attendu vs état actuel
### Endpoints utilisés par la page
- **[GET] /api/public/pros/:id** → `CatalogController.getProDetail()` → `CatalogService.getProDetail()` → Guard: `OptionalJwtGuard`
  - Request: path param `id` (cuid)
  - Response: `PublicProProfile { id, firstName, lastName (masqué), city, isVerified, services[], phone? }`
  - Phone: démasqué si `currentUserId === proId` OU si le user a un booking PENDING/CONFIRMED/WAITING/COMPLETED avec ce pro
  - Errors: 404 "Pro introuvable"

### Attendu (référentiel)
- Données publiques uniquement (pas d'email)
- Phone conditionnel (après booking)
- Cache (profil quasi-statique)
- SEO friendly

### Actuel (constaté)
- **Auth/AuthZ**: ✅ `OptionalJwtGuard` — pas d'erreur si non connecté, user = null. ✅ Phone conditionnel basé sur ownership ou booking éligible.
- **Validations serveur**: ⚠️ Pas de validation du format de `id` (le controller passe directement à `findUnique`). Un id invalide retournera 404 (acceptable mais pas optimal).
- **Logique métier**:
  - ✅ Phone masqué par défaut, démasqué uniquement pour owner ou client avec booking actif
  - ✅ Filtre `status: ACTIVE` + `role: PRO`
  - ⚠️ Le `lastName` est masqué en initiale (`B.`) dans `mapToPublicProCard` mais le schéma ne l'impose pas
  - ⚠️ Le `phone` est sélectionné dans la requête DB même quand non nécessaire
- **Erreurs**: ✅ 404 si pro non trouvé.
- **Perf**: ⚠️ Pas de cache serveur (contrairement à getPros). ⚠️ La vérification phone fait une requête supplémentaire `booking.count()` si user authentifié.
- **Observabilité**: ⚠️ Pas de log spécifique.
- **Tests**: ❌ Aucun test.
- **Sécurité**:
  - ⚠️ **Email non sélectionné** — correct, pas d'exposition.
  - ⚠️ **Phone sélectionné mais conditionnel** — le masquage est en code, pas en requête DB. Si un bug apparaît dans la logique, le phone fuiterait.
  - ⚠️ `id` = cuid DB interne exposé dans l'URL. Pas de publicId pour les pros.

## 5) Base de données — État attendu vs état actuel
- **Tables**: `User` + `ProProfile` + `ProService` + `Category` + `Booking`
- **Contraintes/index**: ✅ `User.id @id` — lookup rapide. ✅ `Booking.@@index([proId])` pour le count.
- **Requêtes**:
  1. `user.findUnique(id, role: PRO, status: ACTIVE)` + joins — 1 query
  2. `booking.count(proId, clientId, status IN [...])` — 1 query (si authentifié)
  - Total: 1-2 queries. Acceptable.
- **Risques**: Aucun risque majeur.

## 6) Intégration Front ↔ Back ↔ DB
- **Mapping**: API retourne `PublicProProfile` → Front affiche directement. ProBookingCTA reçoit `proId` + `services[]`.
- **Incohérences**:
  - ⚠️ **Phone jamais visible en SSR**: Le fetch server-side ne passe pas de cookies → `currentUserId = null` → phone toujours masqué. Le CTA client-side ne re-fetch pas le profil.
  - ⚠️ **Le CTA utilise `services[0].categoryId`** pour le lien booking. Si le pro a plusieurs services, seul le premier est pré-sélectionné.
  - ⚠️ Le booking CTA propose un `<select>` pour choisir le service, mais le lien ne contient qu'un seul `categoryId`.
- **Risques sécurité**: ✅ Pas de PII exposée dans le cas normal.

## 7) Problèmes & recommandations
### CRITIQUES
- Aucun problème critique bloquant.

### IMPORTANTS
- **[I1] Pas de cache SSR** — `force-dynamic` désactive tout cache. Chaque visite = requête backend. Impact perf avec trafic.
- **[I2] Pas de SEO dynamique** — Pas de `generateMetadata()`. Les pages pro ne sont pas optimisées pour les moteurs de recherche.
- **[I3] Phone jamais visible en SSR** — La logique de démasquage ne fonctionne qu'en contexte authentifié côté serveur, ce qui n'arrive jamais vu que le fetch SSR n'envoie pas de cookies.
- **[I4] cuid exposé dans l'URL** — Pas de publicId pour les pros. Enumeration possible.
- **[I5] Aucun test**.

### NICE-TO-HAVE
- **[N1]** Ajouter `generateMetadata()` avec nom du pro + ville + services.
- **[N2]** Ajouter cache court (revalidate: 60) au lieu de force-dynamic.
- **[N3]** Ajouter avis / reviews sur le profil.

## 8) Plan "Amélioration Backend" (spécifique /pro/[id])
### Quick wins (≤2h)
- [ ] Ajouter cache court sur `getProDetail()` (2-5 min)
- [ ] Valider le format `id` dans le controller (regex cuid)
- [ ] Ne sélectionner `phone` dans la requête DB que si `currentUserId` est présent

### Moyen (½–2 jours)
- [ ] Ajouter `generateMetadata()` pour SEO dynamique
- [ ] Introduire un `publicId` pour les pros (slug ou ID public)
- [ ] Écrire tests pour `getProDetail()` (public, avec auth, phone masqué/démasqué)

### Structurant (>2 jours)
- [ ] Implémenter ISR ou revalidate pour les profils pro
- [ ] Ajouter un système d'avis/reviews

### Dépendances / risques
- Le publicId nécessite une migration de schema + update de tous les liens/routes.

---

# [/book/[proId]] — Réservation (client)

## 1) Résumé exécutif
- **Rôle(s)**: CLIENT uniquement (auth requis)
- **Objectif métier**: Permettre au client de choisir une date/créneau et créer une réservation avec un professionnel.
- **Statut global**: ⚠️ Fragile
- **Scores (0–5)**: Front: 3 ; Back: 4 ; DB: 4 ; Intégration: 3 ; Sécurité: 3 ; Perf: 3 ; Tests/Obs: 1
- **Fichiers clés**:
  - `apps/web/src/app/book/[proId]/page.tsx`
  - `apps/web/src/lib/api.ts` (getJSON, postJSON)
  - `apps/web/src/store/authStore.ts`
  - `apps/api/src/booking/booking.controller.ts`
  - `apps/api/src/booking/booking.service.ts` (getAvailableSlots, createBooking)
  - `packages/contracts/src/schemas/booking.ts` (GetSlotsSchema, CreateBookingSchema)

## 2) Cartographie technique (fichiers)
### Frontend
- `apps/web/src/app/book/[proId]/page.tsx` — Client component, flow complet

### Backend
- `apps/api/src/booking/booking.controller.ts` — `GET /public/slots`, `POST /bookings`
- `apps/api/src/booking/booking.service.ts:34-135` — `getAvailableSlots()`
- `apps/api/src/booking/booking.service.ts:155-249` — `createBooking()`

### DB
- `ProService`, `WeeklyAvailability`, `Booking`, `User`, `ProProfile`, `Category`

## 3) Frontend — État attendu vs état actuel
### Attendu (référentiel)
- Auth guard CLIENT strict
- Sélection date → fetch slots → sélection slot → confirmation
- Anti double submit
- Gestion erreurs (conflit, ville mismatch, etc.)
- A11y

### Actuel (constaté)
- **UI/Composants**: Flow linéaire: date picker → grille de slots → confirmation → écran succès WhatsApp. Design `zinc-*` + `dark:`.
- **Data fetching**:
  - Fetch pro: `getJSON('/public/pros/{proId}')` au mount
  - Fetch slots: `getJSON('/public/slots?proId=X&date=Y&categoryId=Z')` à chaque changement de date
  - Submit: `postJSON('/bookings', { proId, categoryId, date, time })`
- **Validations**:
  - ✅ `categoryId` requis (vient des query params)
  - ✅ Date min=aujourd'hui, max=+30 jours
  - ✅ Slot requis avant soumission
  - ✅ `disabled={submitting}` sur le bouton — anti double submit
- **Erreurs & UX**:
  - ✅ Gestion spécifique: 409 (créneau pris), CITY_REQUIRED, CITY_MISMATCH, ADDRESS_REQUIRED
  - ⚠️ `alert()` utilisé pour CITY_REQUIRED et ADDRESS_REQUIRED — UX pauvre
  - ✅ Redirection vers `/profile` si info manquante
  - ✅ Écran succès avec lien WhatsApp
- **A11y**:
  - ⚠️ `<label>` date sans `id` sur l'input (pas de `htmlFor`)
  - ⚠️ Emojis (✅❌⚠️📅📍💬) comme icônes sans `aria-hidden`
  - ⚠️ Boutons slot sans `aria-pressed` ou `aria-selected`
  - ⚠️ Pas d'annonce screen reader quand les slots changent
- **Perf**: ✅ Slots re-fetchés automatiquement au changement de date. Pas de debounce nécessaire (date picker = événement discret).
- **Sécurité front**:
  - ✅ Guard CLIENT côté front (rôle vérifié)
  - ⚠️ Le `proId` vient de l'URL (user-controlled). Le back doit valider.
  - ⚠️ **Phone du pro exposé** dans l'écran succès via `pro.phone` (l.326). Ce phone vient de `getJSON('/public/pros/{proId}')` qui est un endpoint PUBLIC non authentifié. **Le phone ne devrait pas être dans cette réponse pour les visiteurs non auth.**

## 4) Backend — État attendu vs état actuel
### Endpoints utilisés par la page
- **[GET] /api/public/slots?proId=X&date=Y&categoryId=Z** → `BookingController.getSlots()` → `BookingService.getAvailableSlots()` → Auth: aucun
  - Request: Query params validés par `GetSlotsSchema` (Zod)
  - Response: `string[]` (ex: `["09:00", "10:00", "14:00"]`)
  - Logique: WeeklyAvailability → filtrer par CONFIRMED bookings → exclure passés

- **[POST] /api/bookings** → `BookingController.createBooking()` → `BookingService.createBooking()` → Guard: `JwtAuthGuard`
  - Request DTO: `CreateBookingSchema` — `{ proId, categoryId, date, time }`
  - Response: Booking créé avec relations
  - Errors: 403 (pas CLIENT), 400 (CITY_REQUIRED, ADDRESS_REQUIRED, CITY_MISMATCH), 409 (créneau pris), 404 (pro non trouvé)

### Attendu (référentiel)
- Double-check disponibilité avant création (anti double booking)
- Transaction si écriture
- Ownership: seul le CLIENT crée ses bookings
- Validation géographique (même ville)
- Idempotence si possible

### Actuel (constaté)
- **Auth/AuthZ**:
  - ✅ `JwtAuthGuard` sur `POST /bookings`
  - ✅ Rôle CLIENT vérifié dans le service
  - ✅ `clientUserId` extrait de `req.user.id` (pas du body — pas de spoofing)
- **Validations serveur**:
  - ✅ Zod validation: proId (cuid), date (YYYY-MM-DD), time (HH:MM), categoryId (regex)
  - ✅ Service actif vérifié pour le pro/catégorie
  - ✅ Ville du client == ville du pro
  - ✅ Adresse client requise
  - ✅ **Double-check**: `getAvailableSlots()` rappelé avant création pour confirmer la dispo
- **Logique métier**:
  - ✅ Slots: seuls les CONFIRMED bloquent (PENDING ne bloque pas)
  - ✅ Durée multi-heures gérée dans le calcul des slots
  - ✅ Slots passés exclus (comparaison avec `now`)
  - ✅ Booking créé avec `status: PENDING`, `expiresAt: +24h`
  - ✅ Événement émis après création
  - ⚠️ **PAS DE TRANSACTION** pour `createBooking()` — race condition possible entre le double-check et le create. Deux clients pourraient théoriquement booker le même slot simultanément.
  - ⚠️ **Pas d'idempotence** — un même client peut créer plusieurs PENDING pour le même pro/date/time.
- **Erreurs**: ✅ Messages spécifiques (CITY_REQUIRED, CITY_MISMATCH, etc.). ✅ 409 pour conflit.
- **Perf**: ✅ 3-4 queries pour la création (user, proProfile, availableSlots, create). Acceptable.
- **Observabilité**: ⚠️ Pas de log explicite dans `createBooking()`.
- **Tests**: ❌ Aucun test.
- **Sécurité**:
  - ✅ Anti mass assignment: Zod whitelist
  - ⚠️ Pas de rate limit sur `POST /bookings` — un client pourrait spammer des réservations
  - ⚠️ Pas de `@Throttle` sur `GET /public/slots` — scraping des disponibilités

## 5) Base de données — État attendu vs état actuel
- **Tables**: `Booking` (écriture), `ProService`, `WeeklyAvailability`, `User`, `ProProfile` (lecture)
- **Contraintes/index**:
  - ✅ `Booking.@@index([proId, timeSlot])` — optimal pour la recherche de conflits
  - ✅ `Booking.@@index([clientId])` — pour `getMyBookings`
  - ✅ `WeeklyAvailability.@@unique([proUserId, dayOfWeek])` — lookup rapide
  - ✅ `ProService.@@unique([proUserId, categoryId])` — validation service
- **Requêtes observées**:
  - `getAvailableSlots`: 3 queries (proService, weeklyAvailability, bookings)
  - `createBooking`: 4-5 queries (user, proProfile, availableSlots, create)
- **Risques**:
  - ⚠️ **Race condition**: `createBooking` n'est PAS dans une transaction. Le double-check (`getAvailableSlots`) peut passer pour deux requêtes simultanées, et les deux créeront un PENDING. Ce n'est pas bloquant car seul le CONFIRMED bloque les slots, mais cela crée des PENDING fantômes.
  - ⚠️ Pas de contrainte `@@unique([proId, timeSlot, status])` — rien n'empêche en DB d'avoir 2 bookings CONFIRMED au même créneau (la logique est applicative, pas en DB).

## 6) Intégration Front ↔ Back ↔ DB
- **Mapping**:
  - Front: `{ proId, categoryId, date, time }` → Back Zod: `CreateBookingSchema` → DB: `Booking.create()`
  - ✅ Champs alignés
- **Incohérences**:
  - ⚠️ Le `proId` dans l'URL front est le cuid DB (`params.proId`). Le back fait `findUnique(userId: dto.proId)` sur ProProfile. ✅ Cohérent (ProProfile.userId = User.id).
  - ⚠️ **Phone dans l'écran succès**: Le front fetch `/public/pros/{proId}` sans auth. Si le backend masque le phone sans auth, le lien WhatsApp sera cassé. Si le backend expose le phone publiquement, c'est un problème de PII.
- **Gestion erreurs**: ✅ Mapping spécifique (409, CITY_REQUIRED, etc.) → messages UX en français. ⚠️ `alert()` pour certains cas.
- **Risques sécurité**: ⚠️ Phone potentiellement exposé publiquement.

## 7) Problèmes & recommandations
### CRITIQUES
- **[C1] Race condition booking**: `createBooking()` n'est pas dans une transaction. Deux clients simultanés pourraient créer des PENDING identiques. Bien que seuls les CONFIRMED bloquent, cela crée de la confusion.
- **[C2] Phone exposé publiquement**: Le front fetch le profil pro via un endpoint PUBLIC pour afficher le lien WhatsApp post-booking. Le phone ne devrait être visible qu'après création du booking (re-fetch authentifié).

### IMPORTANTS
- **[I1] Pas de rate limit** sur `POST /bookings` ni `GET /public/slots`.
- **[I2] Pas d'idempotence** — même client, même créneau, même pro = multiples PENDING.
- **[I3] `alert()` pour CITY_REQUIRED/ADDRESS_REQUIRED** — UX pauvre.
- **[I4] A11y**: labels, aria, emojis.
- **[I5] Aucun test**.

### NICE-TO-HAVE
- **[N1]** Ajouter contrainte DB `@@unique([proId, clientId, timeSlot, status])` pour anti-doublon.
- **[N2]** Ajouter un mécanisme d'idempotence (idempotency key).
- **[N3]** Ajouter une confirmation modale avant soumission.

## 8) Plan "Amélioration Backend" (spécifique /book/[proId])
### Quick wins (≤2h)
- [ ] Ajouter `@Throttle` sur `POST /bookings` (ex: 5/min) et `GET /public/slots` (ex: 30/min)
- [ ] Ajouter un log sur chaque booking créé (proId, clientId, date, time)
- [ ] Retourner le phone du pro dans la réponse de `POST /bookings` (au lieu de le chercher publiquement)

### Moyen (½–2 jours)
- [ ] Wrapper `createBooking()` dans une `$transaction` avec double-check intégré
- [ ] Ajouter une contrainte d'unicité applicative (ex: max 1 PENDING par client/pro/timeSlot)
- [ ] Écrire tests unitaires pour `getAvailableSlots()` et `createBooking()`
- [ ] Écrire tests d'intégration pour `POST /bookings` (happy path, conflit, mauvaise ville, etc.)

### Structurant (>2 jours)
- [ ] Implémenter un mécanisme d'idempotence (header `Idempotency-Key`)
- [ ] Ajouter contrainte DB `@@unique` ou `@@index` pour prévenir les doublons en DB

### Dépendances / risques
- La transaction nécessite de repenser l'ordre des opérations (lock optimiste ou pessimiste).
- L'unicité DB nécessite une migration.

---

# [/client/bookings] — Mes réservations (client)

## 1) Résumé exécutif
- **Rôle(s)**: CLIENT uniquement (auth requis)
- **Objectif métier**: Afficher et gérer les réservations du client avec onglets par statut + actions sur les modifications proposées par le pro.
- **Statut global**: ⚠️ Fragile
- **Scores (0–5)**: Front: 3 ; Back: 4 ; DB: 4 ; Intégration: 3 ; Sécurité: 4 ; Perf: 2 ; Tests/Obs: 1
- **Fichiers clés**:
  - `apps/web/src/app/client/bookings/page.tsx`
  - `apps/web/src/components/BookingStatusBadge.tsx`
  - `apps/web/src/lib/api.ts` (getJSON, patchJSON)
  - `apps/api/src/booking/booking.controller.ts` (getMyBookings, respondToModification)
  - `apps/api/src/booking/booking.service.ts` (getMyBookings, respondToModification)

## 2) Cartographie technique (fichiers)
### Frontend
- `apps/web/src/app/client/bookings/page.tsx` — Client component, dashboard par onglets
- `apps/web/src/components/BookingStatusBadge.tsx` — Badge statut

### Backend
- `apps/api/src/booking/booking.controller.ts` — `GET /bookings`, `PATCH /bookings/:id/respond`
- `apps/api/src/booking/booking.service.ts:262-328` — `getMyBookings()`
- `apps/api/src/booking/booking.service.ts:634-782` — `respondToModification()`

### DB
- `Booking` + relations (Category, City, ProProfile+User, Client)

## 3) Frontend — État attendu vs état actuel
### Attendu (référentiel)
- Auth guard CLIENT strict
- Onglets par statut
- Pagination
- Actions contextuelles (accepter/refuser modification)
- Anti double submit

### Actuel (constaté)
- **UI/Composants**: Dashboard avec 4 onglets: "En attente" (PENDING), "À valider" (WAITING_FOR_CLIENT), "Confirmé" (CONFIRMED), "Historique" (multi-statuts). Badges de compteur dynamiques. Actions accepter/refuser pour WAITING_FOR_CLIENT.
- **Data fetching**:
  - `getJSON('/bookings')` au mount — charge TOUS les bookings
  - Après action: re-fetch complet `getJSON('/bookings')`
- **Validations**: N/A (pas de formulaire de saisie).
- **Erreurs & UX**:
  - ❌ `alert()` pour toutes les erreurs ET les succès (l.78-86) — UX très pauvre
  - ✅ `disabled` sur les boutons pendant l'action
  - ✅ `updatingBooking` state empêche le double click
- **A11y**:
  - ⚠️ Onglets: pas de `role="tablist"`, `role="tab"`, `role="tabpanel"`, `aria-selected`
  - ⚠️ Emojis (📅👤⏱️✅❌) sans `aria-hidden`
  - ⚠️ `zinc-*` + `dark:` au lieu des design tokens
- **Perf**:
  - ❌ **PAS DE PAGINATION** — charge TOUS les bookings. Filtrage client-side. Si un client a 500 bookings, tout est chargé en mémoire.
  - ❌ Re-fetch complet après chaque action (au lieu de mettre à jour localement).
  - ⚠️ Calcul des compteurs d'onglets fait sur chaque render (`.filter()` x4 sur tous les bookings x2 : une fois pour les badges, une fois pour le filtrage).

## 4) Backend — État attendu vs état actuel
### Endpoints utilisés par la page
- **[GET] /api/bookings?page=1&limit=20** → `BookingController.getMyBookings()` → `BookingService.getMyBookings()` → Guard: `JwtAuthGuard`
  - Request: page/limit query params
  - Response: `BookingDashboardItem[]` — bookings avec catégorie, ville, pro (firstName, lastName, phone, city)
  - Ownership: `WHERE clientId = userId` (backend autoritatif)
  - Pagination: supportée côté back (skip/take) mais **non utilisée côté front**

- **[PATCH] /api/bookings/:id/respond** → `BookingController.respondToModification()` → `BookingService.respondToModification()` → Guard: `JwtAuthGuard`
  - Request DTO: `RespondDto { accept: boolean }`
  - Response: Booking mis à jour
  - Ownership: `booking.clientId === userId` vérifié dans le service
  - Logique: accept → CONFIRMED (avec vérification conflits + transaction), refuse → DECLINED

### Attendu (référentiel)
- Ownership serveur strict (seuls les bookings du client)
- Pagination
- Transactions pour les confirmations
- Anti double booking

### Actuel (constaté)
- **Auth/AuthZ**:
  - ✅ `JwtAuthGuard` sur les deux endpoints
  - ✅ `getMyBookings`: filtre `clientId = userId` — ownership serveur. Le client ne voit QUE ses bookings.
  - ✅ `respondToModification`: vérifie `booking.clientId === userId` — ownership stricte
  - ✅ Role check: `userRole !== 'CLIENT'` → 403
- **Validations serveur**:
  - ✅ `accept` validé comme boolean (class-validator)
  - ✅ Statut `WAITING_FOR_CLIENT` vérifié avant action
- **Logique métier**:
  - ✅ Si accept: transaction atomique avec vérification conflits + nettoyage bookings concurrents + auto-complete back-to-back
  - ✅ Si refuse: simple update en DECLINED + événement émis
  - ✅ Bonne machine à états booking
- **Erreurs**: ✅ Messages appropriés (404, 403, 400).
- **Perf**:
  - ✅ Pagination supportée côté back (`skip/take`)
  - ⚠️ Le front n'utilise PAS la pagination (fetch all)
  - ⚠️ Les bookings retournent `pro.user.phone` — PII exposée dans le listing (le client voit le phone du pro pour TOUS les bookings, pas seulement les CONFIRMED)
- **Observabilité**: ⚠️ Pas de log explicite.
- **Tests**: ❌ Aucun test.
- **Sécurité**:
  - ✅ Ownership stricte serveur
  - ⚠️ Phone du pro exposé dans TOUS les bookings (même PENDING) — devrait être masqué sauf CONFIRMED/COMPLETED

## 5) Base de données — État attendu vs état actuel
- **Tables**: `Booking` + joins (Category, City, ProProfile, User)
- **Contraintes/index**:
  - ✅ `Booking.@@index([clientId])` — optimal pour le filtre ownership
  - ✅ `Booking.@@index([clientId, cityId, categoryId, timeSlot])` — index composite
  - ✅ `Booking.@@index([proId, timeSlot])` — pour vérification conflits
- **Requêtes**: `booking.findMany(clientId, skip, take, orderBy: timeSlot desc)` + joins. 1 query Prisma (batching).
- **Risques**: ⚠️ Sans pagination côté front, le back retourne potentiellement beaucoup de données.

## 6) Intégration Front ↔ Back ↔ DB
- **Mapping**: ✅ `BookingDashboardItem` (contracts) → Front affiche directement.
- **Incohérences**:
  - ❌ **Pagination inutilisée**: Le back supporte `page/limit` mais le front ne les envoie pas → default = page 1, limit 20. Donc le front ne charge que les 20 premiers bookings, mais l'UI n'a pas de "page suivante". **Les anciens bookings au-delà de 20 ne sont jamais visibles.**
  - ⚠️ **Statut `CANCELLED_AUTO_OVERLAP`** géré dans l'onglet historique côté front mais le back ne le crée pas via `respondToModification` — il est créé indirectement par le processus de confirmation (nettoyage des concurrents). Cohérent mais implicite.
  - ⚠️ **Phone du pro** visible pour tous les statuts.
- **Gestion erreurs**: ❌ `alert()` pour tout.
- **Risques sécurité**: ⚠️ PII phone dans le listing.

## 7) Problèmes & recommandations
### CRITIQUES
- **[C1] Pagination cassée**: Le front ne passe PAS `page/limit` → le back retourne les 20 premiers. Il n'y a pas de pagination UI. **Les bookings au-delà de 20 sont invisibles pour le client.**
- **[C2] Phone du pro exposé pour tous les statuts**: Dans `getMyBookings`, le `pro.user.phone` est retourné pour TOUS les bookings, y compris PENDING et DECLINED. Le phone ne devrait être visible que pour CONFIRMED/COMPLETED.

### IMPORTANTS
- **[I1] `alert()` partout**: Erreurs et succès via `alert()`. UX non professionnelle.
- **[I2] Pas de tabs ARIA**: Les onglets n'ont pas de rôles ARIA (`tablist`, `tab`, `tabpanel`).
- **[I3] Re-fetch complet après chaque action**: Devrait utiliser un update local optimiste.
- **[I4] Aucun test**.
- **[I5] Pas d'annulation CLIENT**: Le client ne peut pas annuler une réservation PENDING (pas de bouton).

### NICE-TO-HAVE
- **[N1]** Ajouter un bouton "Annuler" pour les bookings PENDING côté client.
- **[N2]** Ajouter polling ou WebSocket pour les mises à jour en temps réel.
- **[N3]** Ajouter une modale de confirmation avant accepter/refuser.

## 8) Plan "Amélioration Backend" (spécifique /client/bookings)
### Quick wins (≤2h)
- [ ] **FIX CRITIQUE**: Masquer `pro.user.phone` dans `getMyBookings` sauf pour les statuts CONFIRMED/COMPLETED
- [ ] Ajouter un log sur les réponses aux modifications (accept/refuse)

### Moyen (½–2 jours)
- [ ] Implémenter la pagination côté front (boutons page ou infinite scroll) en utilisant le `page/limit` existant côté back
- [ ] Ajouter un endpoint `PATCH /bookings/:id/cancel` pour annulation client PENDING
- [ ] Écrire tests unitaires pour `getMyBookings()` et `respondToModification()`
- [ ] Refactorer le front: remplacer `alert()` par des bandeaux d'erreur/succès inline

### Structurant (>2 jours)
- [ ] Retourner le `total` dans `getMyBookings` (comme getProsV2) pour permettre la pagination complète
- [ ] Ajouter WebSocket/SSE pour les mises à jour en temps réel des statuts

### Dépendances / risques
- Le masquage du phone nécessite un ajustement dans le select Prisma de `getMyBookings`.
- L'annulation client nécessite une logique métier (pénalités, délai minimum).

---

# Synthèse Phase 2 — Parcours CLIENT (Discovery → Booking → Suivi)

## Problèmes transverses

### Contrats API (search/list/detail/booking)
- **V1 vs V2**: Le front utilise encore V1 `/public/pros` (sans pagination) alors que V2 existe avec pagination, total, et cache. Migration nécessaire.
- **Inconsistance validation**: Certains endpoints utilisent Zod (booking), d'autres class-validator (auth, users). Devrait être unifié.
- **Phone conditionnellement exposé**: La logique de masquage du phone est fragmentée entre `getProDetail` (conditionnel) et `getMyBookings` (toujours exposé).

### Cohérence des statuts booking
- ✅ Machine à états bien définie: PENDING → CONFIRMED/DECLINED/EXPIRED/WAITING_FOR_CLIENT → COMPLETED/CANCELLED_*
- ✅ Logique Winner-Takes-All correcte (confirmation annule les concurrents)
- ✅ Auto-complete back-to-back implémenté
- ⚠️ Pas d'expiration automatique des PENDING (le `expiresAt` est stocké mais aucun cron ne le traite)
- ⚠️ Pas d'annulation client PENDING

### Sécurité (PII, ownership, auth)
- ✅ Ownership vérifiée côté serveur pour toutes les opérations d'écriture (booking creation, status update, respond)
- ✅ Rôles vérifiés côté service (CLIENT pour créer/répondre, PRO pour confirmer/modifier)
- ⚠️ **Phone exposé publiquement** dans certains flux (booking page fetch public + listing bookings)
- ⚠️ **Pas de rate limit** sur aucun endpoint Phase 2 (public slots, booking creation, listing)
- ⚠️ **cuid DB exposé** dans les URLs (pas de publicId pour les pros ni les bookings)

### Performance (index, pagination, N+1)
- ❌ **Pagination non utilisée côté front** — ni /pros ni /client/bookings n'utilisent la pagination
- ⚠️ **Pas d'index** `ProProfile(cityId, isPremium)` pour le tri monétisation
- ✅ Index principaux présents sur Booking (proId, clientId, timeSlot)
- ✅ Cache serveur sur cities, categories, pros v2

### Tests/observabilité
- ❌ **ZERO test** dans tout le backend — aucun fichier .spec.ts trouvé
- ⚠️ Logs minimaux (compteurs dans catalog, rien dans booking)
- ❌ Pas de requestId, pas de métriques, pas de traces

## Risques majeurs (Top 5)

1. **Pagination absente côté front** — /pros charge TOUS les pros, /client/bookings n'affiche que les 20 premiers sans navigation. Avec la croissance, le site sera inutilisable. **Impact: scalabilité critique.**

2. **Race condition booking** — `createBooking()` n'est pas dans une transaction. Deux requêtes simultanées peuvent créer des PENDING identiques. Pas de contrainte DB anti-doublon. **Impact: intégrité données.**

3. **Phone du pro exposé indûment** — Visible publiquement via le profil pro (pour le lien WhatsApp) et dans le listing bookings (tous statuts). Devrait être conditionnel au statut CONFIRMED/COMPLETED. **Impact: vie privée / PII.**

4. **Zéro tests** — Aucun test sur le flow booking le plus critique de la plateforme. Le moteur de disponibilité, la création de booking, et la machine à états sont non testés. **Impact: stabilité.**

5. **Pas d'expiration automatique des PENDING** — `expiresAt` est stocké en DB mais aucun cron/scheduler n'existe pour expirer les bookings PENDING. Les pros reçoivent des demandes fantômes. **Impact: UX pro + intégrité données.**

## Plan backend priorisé (Phase suivante — améliorations)

### Priorité 0 (immédiat)
- [ ] **FIX** Masquer `pro.user.phone` dans `getMyBookings` sauf CONFIRMED/COMPLETED
- [ ] **FIX** Retourner le phone du pro dans la réponse de `POST /bookings` (au lieu du fetch public)
- [ ] **FIX** Implémenter pagination côté front pour /pros (migrer vers V2) et /client/bookings
- [ ] Ajouter `@Throttle` sur `POST /bookings` (5/min), `GET /public/slots` (30/min), `GET /public/pros` (30/min)

### Priorité 1
- [ ] Wrapper `createBooking()` dans une `$transaction` avec double-check atomique
- [ ] Écrire les premiers tests: `getAvailableSlots()`, `createBooking()`, `getMyBookings()`, `respondToModification()`
- [ ] Implémenter un cron d'expiration des PENDING (`expiresAt < NOW()` → status = EXPIRED)
- [ ] Ajouter index composite `ProProfile(cityId, isPremium)` pour le tri monétisation
- [ ] Ajouter endpoint `PATCH /bookings/:id/cancel` pour annulation client PENDING
- [ ] Ajouter `total` dans la réponse de `getMyBookings` pour pagination complète

### Priorité 2
- [ ] Introduire un `publicId` pour les pros (slug ou UUID public) au lieu du cuid DB
- [ ] Ajouter `generateMetadata()` dynamique pour /pro/[id] (SEO)
- [ ] Implémenter ISR ou cache court sur les profils pro
- [ ] Ajouter mécanisme d'idempotence sur `POST /bookings`
- [ ] Unifier la stratégie de validation (tout Zod OU tout class-validator)
- [ ] Ajouter WebSocket/SSE pour les mises à jour temps réel des bookings

---

# PHASE 3 — Dashboard PRO (hors paiement)

- [/dashboard/bookings — Réservations pro](#dashboardbookings--réservations-pro)
- [/dashboard/history — Historique pro](#dashboardhistory--historique-pro)
- [/dashboard/availability — Disponibilités pro](#dashboardavailability--disponibilités-pro)
- [/dashboard/services — Gestion services pro](#dashboardservices--gestion-services-pro)
- [/dashboard/profile — Profil pro (dashboard)](#dashboardprofile--profil-pro-dashboard)
- [/dashboard/kyc — Vérification KYC](#dashboardkyc--vérification-kyc)

---

# [/dashboard/bookings] — Réservations pro

## 1) Résumé exécutif
- **Rôle(s)**: PRO uniquement (auth requis)
- **Objectif métier**: Permettre au PRO de gérer ses réservations entrantes : accepter, refuser, modifier la durée, et marquer comme terminées.
- **Statut global**: ⚠️ Fragile
- **Scores (0–5)**: Front: 3 ; Back: 4 ; DB: 4 ; Intégration: 3 ; Sécurité: 4 ; Perf: 2 ; Tests/Obs: 1
- **Fichiers clés**:
  - `apps/web/src/app/dashboard/bookings/page.tsx`
  - `apps/web/src/components/dashboard/DashboardLayout.tsx`
  - `apps/web/src/components/BookingStatusBadge.tsx`
  - `apps/web/src/lib/api.ts` (getJSON, patchJSON)
  - `apps/api/src/booking/booking.controller.ts`
  - `apps/api/src/booking/booking.service.ts`
  - `packages/contracts/src/schemas/booking.ts`
  - `packages/database/prisma/schema.prisma` (Booking)

## 2) Cartographie technique (fichiers)
### Frontend
- `apps/web/src/app/dashboard/bookings/page.tsx` — Page complète PRO bookings, client-side
- `apps/web/src/components/dashboard/DashboardLayout.tsx` — Layout partagé avec auth guard + prison UX
- `apps/web/src/components/BookingStatusBadge.tsx` — Badge de statut réutilisable

### Backend
- `apps/api/src/booking/booking.controller.ts:108-121` — `GET /api/bookings` → `getMyBookings()`
- `apps/api/src/booking/booking.controller.ts:140-148` — `PATCH /api/bookings/:id/status` → `updateBookingStatus()`
- `apps/api/src/booking/booking.controller.ts:168-177` — `PATCH /api/bookings/:id/duration` → `updateBooking()`
- `apps/api/src/booking/booking.controller.ts:220-227` — `PATCH /api/bookings/:id/complete` → `completeBooking()`
- `apps/api/src/booking/booking.service.ts:262-328` — `getMyBookings()` avec pagination back
- `apps/api/src/booking/booking.service.ts:345-492` — `updateBookingStatus()` avec transaction Winner-Takes-All
- `apps/api/src/booking/booking.service.ts:512-616` — `updateBooking()` (modification durée)
- `apps/api/src/booking/booking.service.ts:800-857` — `completeBooking()`

### DB
- `schema.prisma` — `Booking` (l.233-283), index `[proId, timeSlot]`, `[proId]`
- `BookingStatus` enum : PENDING, CONFIRMED, DECLINED, CANCELLED_BY_CLIENT, CANCELLED_BY_CLIENT_LATE, CANCELLED_BY_PRO, CANCELLED_AUTO_OVERLAP, EXPIRED, COMPLETED, WAITING_FOR_CLIENT

## 3) Frontend — État attendu vs état actuel
### Attendu (référentiel)
- Auth guard PRO strict avec redirection
- Tabs fonctionnels (PENDING, CONFIRMED, CANCELLED*)
- Actions : Accept/Refuse sur PENDING, Modifier Durée, Terminer sur CONFIRMED passés
- Pagination pour listes longues
- Loading/empty/error states
- A11y complète (labels, focus, keyboard)

### Actuel (constaté)
- **UI/Composants** : 3 onglets (En attente / Confirmé / Annulé). Boutons Accept/Refuse sur PENDING. Modale "Modifier Durée" avec select 1-8h. Bouton "Terminer" visible seulement si `timeSlot < now`. BookingStatusBadge pour les statuts. Design zinc-*.
- **Data fetching** : `getJSON('/bookings')` — charge TOUS les bookings d'un coup sans pagination front (le backend supporte page/limit, mais le front ne passe aucun paramètre → default 20). Pas de retry. Pas d'abort controller.
- **Validations** : Pas de validation côté client avant submit. Le bouton disabled pendant l'opération est correct.
- **Erreurs & UX** : Utilise `alert()` pour toutes les erreurs et succès — pas de toast/banner inline. `confirm()` natif pour complétion.
- **A11y** : ❌ Aucun `aria-label` sur les boutons d'action. La modale n'a pas de `role="dialog"` ni `aria-modal`. Le label de la modale n'a pas de `htmlFor`/`id`. Les onglets n'utilisent pas `role="tablist"`/`role="tab"`. Pas de focus trap dans la modale.
- **Perf** : Tout chargé côté client. Re-fetch complet après chaque action. Pas de cache, pas d'optimistic update. Le statut WAITING_FOR_CLIENT n'est pas affiché dans les onglets (bookings dans ce statut sont invisibles).
- **NON TROUVÉ** : Pas de gestion du statut `EXPIRED` côté front (pas de tab, pas d'affichage). Pas de bouton de rafraîchissement manuel. Client phone affiché sans masquage.

## 4) Backend — État attendu vs état actuel
### Endpoints utilisés par la page
- **[GET] /api/bookings** → `BookingController.getMyBookings()` → `BookingService.getMyBookings()` → auth: JwtAuthGuard
  - Request DTO : query `page` (opt, default 1), `limit` (opt, default 20)
  - Response DTO : `BookingDashboardItem[]` (pas de total/meta pagination renvoyé)
  - Errors : 400 (pagination invalide)
  - Pagination : Supportée back mais pas de `total` renvoyé → front ne peut pas paginer
  - Sécurité : ownership via `where: { proId: userId }` — OK

- **[PATCH] /api/bookings/:id/status** → `BookingController.updateBookingStatus()` → `BookingService.updateBookingStatus()` → auth: JwtAuthGuard
  - Request DTO : `{ status: 'CONFIRMED' | 'DECLINED' }` (Zod via UpdateBookingStatusSchema)
  - Response DTO : `{ id, status, timeSlot, proId }`
  - Errors : 403 (ownership), 400 (statut invalide), 404 (not found), 400 (créneau indisponible)
  - Sécurité : ownership `booking.proId !== userId` — OK. Winner-Takes-All en transaction.

- **[PATCH] /api/bookings/:id/duration** → `BookingController.updateBookingDuration()` → `BookingService.updateBooking()` → auth: JwtAuthGuard
  - Request DTO : `{ duration: 1-8 }` (class-validator DTO)
  - Response DTO : `{ id, status, timeSlot, duration, isModifiedByPro }`
  - Errors : 403 (role/ownership), 400 (statut/déjà modifié), 409 (conflit créneaux)
  - Sécurité : ownership check OK. `isModifiedByPro` flag = une seule modif.

- **[PATCH] /api/bookings/:id/complete** → `BookingController.completeBooking()` → `BookingService.completeBooking()` → auth: JwtAuthGuard
  - Request DTO : aucun body
  - Response DTO : `{ id, status, timeSlot, completedAt }`
  - Errors : 403 (role/ownership), 400 (statut/créneau futur), 404
  - Sécurité : ownership + vérification timeSlot passé — OK

### Attendu (référentiel)
- Pagination avec total pour UI
- Ownership strict sur toutes les mutations
- Transactions pour les confirmations
- Logs d'audit pour les changements de statut

### Actuel (constaté)
- **Auth/AuthZ** : JwtAuthGuard sur tous les endpoints. Role check dans le service (pas via guard pour bookings, mais vérifié manuellement). Ownership vérifié systématiquement.
- **Validations serveur** : Zod pour status, class-validator pour duration. Mélange de stratégie de validation.
- **Logique métier** : CONFIRMED utilise `$transaction` avec Winner-Takes-All (annule les PENDING/WAITING concurrents). DECLINED = update simple. Duration modification = vérification créneaux consécutifs + flag `isModifiedByPro`.
- **Erreurs** : Messages génériques français. Pas de codes d'erreur structurés.
- **Perf** : `getMyBookings` renvoie bookings avec joins (category, city, client). Pagination back OK (skip/take) mais pas de count total renvoyé. Index `[proId, timeSlot]` et `[proId]` existent — couvrent les requêtes principales.
- **Observabilité** : EventEmitter pour CREATED/CONFIRMED/CANCELLED/MODIFIED. Pas de requestId. `console.error` dans `autoCompletePreviousBooking`.
- **Tests** : ❌ ZÉRO test pour BookingService ou BookingController.
- **Sécurité** : Pas de rate limiting sur les PATCH (un PRO pourrait spam accept/refuse). Le `bookingId` est un cuid exposé directement (pas de publicId).

## 5) Base de données — État attendu vs état actuel
- **Tables** : Booking (233-283), BookingEvent (285-299)
- **Contraintes/index** : `@@index([proId, timeSlot])`, `@@index([proId])`, `@@index([clientId])` — adéquats pour les requêtes PRO.
- **Migrations** : NON TROUVÉ — vérifier `packages/database/prisma/migrations/`.
- **Requêtes observées** : `findMany` avec `skip/take/orderBy` pour listing, `findUnique` + `update` dans transaction pour confirmation, `findMany` pour conflits.
- **Risques** : Pas de `@@index([status, proId])` pour filtrer par statut (le front filtre en mémoire). `autoCompletePreviousBooking` fait un `findMany` + N updates hors transaction.

## 6) Intégration Front ↔ Back ↔ DB
- **Mapping** : Front → `GET /bookings` (aucun param) → Back (default page=1, limit=20) → DB `findMany({where: {proId}, skip: 0, take: 20})`. Le type `BookingDashboardItem` du contrat est utilisé côté front.
- **Incohérences** :
  - Le back renvoie max 20 bookings mais le front affiche comme si c'était exhaustif (pas de "charger plus").
  - Le statut `WAITING_FOR_CLIENT` n'apparaît dans aucun onglet front → bookings invisibles.
  - `CANCELLED_AUTO_OVERLAP` n'est pas dans la liste du filtre "cancelled" front → bookings invisibles.
  - Client phone exposé en clair dans la réponse API et affiché sans masquage.
- **Gestion erreurs** : APIError → `alert()`. Erreurs réseau = `console.error` + `setBookings([])`.
- **Risques sécurité** : Phone PII du client affiché sans condition de statut. Pas de CSRF protection spécifique sur les PATCH (mais les cookies sont httpOnly + X-CSRF-PROTECTION header via api.ts).

## 7) Problèmes & recommandations
### CRITIQUES
- **C1** : Statut `WAITING_FOR_CLIENT` invisible dans les onglets → le PRO ne voit pas les bookings en attente de réponse client après modification de durée
- **C2** : `CANCELLED_AUTO_OVERLAP` non listé dans le filtre "cancelled" → bookings disparus de l'UI
- **C3** : Pas de pagination front : si un PRO a >20 bookings, les anciens sont tronqués sans indication

### IMPORTANTS
- **I1** : `alert()` / `confirm()` natifs → UX pauvre, pas accessible, bloquant
- **I2** : Phone client affiché en clair sur tous les statuts → devrait être masqué sauf CONFIRMED
- **I3** : Aucun test backend pour le flux booking (accept/refuse/duration/complete)
- **I4** : Pas de `total` dans la réponse paginée → impossible d'implémenter pagination front
- **I5** : Mélange Zod (status) / class-validator (duration) sur le même controller

### NICE-TO-HAVE
- Optimistic updates pour les actions Accept/Refuse
- Polling ou SSE pour les nouveaux bookings
- `role="tablist"` / `role="tab"` pour les onglets
- Focus trap dans la modale de durée

## 8) Plan "Amélioration Backend" (spécifique /dashboard/bookings)
### Quick wins (≤2h)
- [ ] Renvoyer `{ data: bookings[], total: number, page, limit }` depuis `getMyBookings`
- [ ] Ajouter `WAITING_FOR_CLIENT` et `CANCELLED_AUTO_OVERLAP` dans les filtres front
- [ ] Masquer le phone client sauf si statut CONFIRMED ou COMPLETED
- [ ] Ajouter `@Throttle` sur les PATCH bookings (rate limit mutations)

### Moyen (½–2 jours)
- [ ] Tests unitaires pour BookingService (accept, refuse, duration, complete, ownership)
- [ ] Implémenter pagination front avec "charger plus" ou navigation par page
- [ ] Remplacer `alert()`/`confirm()` par des composants inline (toast/modal)
- [ ] Unifier la validation : tout Zod ou tout class-validator dans booking controller

### Structurant (>2 jours)
- [ ] Ajouter index composite `@@index([proId, status])` pour filtrage par statut côté DB
- [ ] Cron job pour expiration automatique des PENDING (expiresAt dépassé)
- [ ] Tests e2e pour le flux complet booking PRO
- [ ] WebSocket/SSE pour les notifications temps réel de nouveaux bookings

### Dépendances / risques
- La pagination front dépend du `total` dans la réponse back
- Le cron d'expiration nécessite un scheduler (NestJS @Cron)
- L'ajout du statut `WAITING_FOR_CLIENT` dans les onglets nécessite un 4e tab ou un sous-filtre

---

# [/dashboard/history] — Historique pro

## 1) Résumé exécutif
- **Rôle(s)**: PRO uniquement (auth requis)
- **Objectif métier**: Afficher l'historique des réservations terminées/annulées/expirées du PRO.
- **Statut global**: ⚠️ Fragile
- **Scores (0–5)**: Front: 2 ; Back: 3 ; DB: 4 ; Intégration: 2 ; Sécurité: 4 ; Perf: 2 ; Tests/Obs: 1
- **Fichiers clés**:
  - `apps/web/src/app/dashboard/history/page.tsx`
  - `apps/web/src/components/dashboard/DashboardLayout.tsx`
  - `apps/web/src/components/BookingStatusBadge.tsx`
  - `apps/api/src/booking/booking.controller.ts` (GET /bookings)
  - `apps/api/src/booking/booking.service.ts` (getMyBookings)

## 2) Cartographie technique (fichiers)
### Frontend
- `apps/web/src/app/dashboard/history/page.tsx` — Page historique, client-side
- Réutilise les mêmes composants que /dashboard/bookings (DashboardLayout, BookingStatusBadge)

### Backend
- **Même endpoint** que /dashboard/bookings : `GET /api/bookings` → `getMyBookings()`
- Pas d'endpoint dédié pour l'historique — le filtrage est fait côté client

### DB
- Même table `Booking` — même indexes

## 3) Frontend — État attendu vs état actuel
### Attendu (référentiel)
- Liste paginée des réservations passées
- Filtrage par statut terminal (COMPLETED, DECLINED, CANCELLED*, EXPIRED)
- Tri par date décroissant
- Recherche/filtrage

### Actuel (constaté)
- **UI/Composants** : Liste simple sans onglets. Filtre côté client sur les statuts terminaux. Affiche catégorie + date + statut + client name. Durée affichée si >1h.
- **Data fetching** : `getJSON('/bookings')` — charge TOUT via le même endpoint que bookings actifs. Filtre en mémoire : `COMPLETED, DECLINED, CANCELLED_BY_CLIENT, CANCELLED_BY_CLIENT_LATE, CANCELLED_BY_PRO, CANCELLED_AUTO_FIRST_CONFIRMED, EXPIRED`.
- **Validations** : Aucune (lecture seule).
- **Erreurs & UX** : `console.error` + `setBookings([])` en cas d'erreur. Pas de message d'erreur visible pour l'utilisateur.
- **A11y** : Pas de `role="list"` sémantique. Emojis dans le contenu (📅, 👤, ⏱️) sans `aria-hidden`.
- **Perf** : Même problème que bookings — charge tout (max 20) puis filtre. Si le PRO a 20 bookings actifs, l'historique peut être vide car les 20 premiers sont des actifs.
- **NON TROUVÉ** :
  - `CANCELLED_AUTO_OVERLAP` n'est PAS dans le filtre (même problème que bookings)
  - `CANCELLED_AUTO_FIRST_CONFIRMED` est listé mais ce statut n'existe PAS dans l'enum DB → code mort potentiel
  - Pas de filtre par période / recherche
  - Pas de phone client affiché (bien — contrairement à /dashboard/bookings)

## 4) Backend — État attendu vs état actuel
### Endpoints utilisés par la page
- **[GET] /api/bookings** — Même endpoint que bookings actifs
  - Pas de filtre `status` côté backend → renvoie TOUS les statuts mélangés
  - Pagination default (page=1, limit=20) → l'historique peut être incomplet

### Attendu (référentiel)
- Endpoint dédié ou filtre `status` en query param pour ne charger que l'historique
- Pagination avec total
- Tri par date décroissant (déjà le cas)

### Actuel (constaté)
- **Auth/AuthZ** : OK (JwtAuthGuard, ownership implicite via `proId = userId`)
- **Validations** : Pas de filtre status → le client filtre en mémoire
- **Logique métier** : Aucune logique spécifique — simple lecture
- **Erreurs** : Pas d'erreur spécifique à l'historique
- **Perf** : Le back renvoie max 20 bookings tous statuts confondus. Si 15 sont PENDING/CONFIRMED, seulement 5 apparaissent dans l'historique. Pas de filtre DB optimisé.
- **Observabilité** : Aucune
- **Tests** : ❌ ZÉRO
- **Sécurité** : OK — lecture seule, ownership implicite

## 5) Base de données — État attendu vs état actuel
- Identique à /dashboard/bookings
- **Risque perf** : Pas d'index sur `status` → le filtre DB (s'il existait) ferait un scan partiel. `@@index([proId, status])` serait bénéfique.

## 6) Intégration Front ↔ Back ↔ DB
- **Mapping** : Front → `GET /bookings` → Back (all statuses, max 20) → Front filtre en JS → Affiche uniquement les terminaux.
- **Incohérences** :
  - Front liste `CANCELLED_AUTO_FIRST_CONFIRMED` qui n'existe pas dans l'enum Prisma. L'enum contient `CANCELLED_AUTO_OVERLAP`.
  - Front filtre post-fetch → l'historique peut être vide même si des bookings historiques existent au-delà de la page 1
  - Pas de `total` → impossible de savoir s'il y a plus de données

## 7) Problèmes & recommandations
### CRITIQUES
- **C1** : L'historique partage les mêmes 20 bookings paginés avec la page active → un PRO actif avec beaucoup de PENDING ne voit rien dans l'historique
- **C2** : Statut `CANCELLED_AUTO_FIRST_CONFIRMED` n'existe pas dans l'enum DB → code mort, confusion

### IMPORTANTS
- **I1** : Pas de filtre `status` côté backend → gaspillage réseau et pagination incorrecte
- **I2** : Aucun message d'erreur visible pour l'utilisateur en cas d'échec de chargement
- **I3** : Pas de filtre par période (mois/année) pour un historique long

### NICE-TO-HAVE
- Export CSV de l'historique
- Statistiques résumées (taux de complétion, revenus estimés)
- Recherche par nom de client

## 8) Plan "Amélioration Backend" (spécifique /dashboard/history)
### Quick wins (≤2h)
- [ ] Ajouter query param `status` (ou `statusIn`) à `GET /bookings` pour filtrer côté DB
- [ ] Corriger le front : `CANCELLED_AUTO_FIRST_CONFIRMED` → `CANCELLED_AUTO_OVERLAP`
- [ ] Ajouter un message d'erreur visible en cas d'échec de chargement
- [ ] Renvoyer `{ data, total, page, limit }` pour la pagination

### Moyen (½–2 jours)
- [ ] Créer un endpoint dédié `GET /bookings/history` avec filtres période/statut
- [ ] Ajouter index composite `@@index([proId, status])` en Prisma
- [ ] Implémenter pagination front (infinite scroll ou pages)

### Structurant (>2 jours)
- [ ] Ajouter filtres avancés (par période, catégorie, ville)
- [ ] Stats résumées côté backend (agrégations)

### Dépendances / risques
- Le filtre `statusIn` nécessite une mise à jour du controller et du Zod schema
- L'index composite nécessite une migration Prisma

---

# [/dashboard/availability] — Disponibilités pro

## 1) Résumé exécutif
- **Rôle(s)**: PRO uniquement (auth requis)
- **Objectif métier**: Permettre au PRO de définir ses horaires de travail hebdomadaires (jours actifs + heures début/fin par jour).
- **Statut global**: ⚠️ Fragile
- **Scores (0–5)**: Front: 3 ; Back: 4 ; DB: 4 ; Intégration: 3 ; Sécurité: 4 ; Perf: 4 ; Tests/Obs: 1
- **Fichiers clés**:
  - `apps/web/src/app/dashboard/availability/page.tsx`
  - `apps/web/src/lib/timeHelpers.ts` (timeToMinutes, minutesToTime, DAYS_OF_WEEK)
  - `apps/api/src/pro/pro.controller.ts:109-116` (PUT /pro/availability)
  - `apps/api/src/pro/pro.service.ts:354-396` (updateAvailability)
  - `packages/contracts/src/schemas/pro.ts` (AvailabilitySlotSchema, UpdateAvailabilitySchema)
  - `packages/database/prisma/schema.prisma` (WeeklyAvailability l.316-335)

## 2) Cartographie technique (fichiers)
### Frontend
- `apps/web/src/app/dashboard/availability/page.tsx` — Page disponibilités, client-side
- `apps/web/src/lib/timeHelpers.ts` — Conversion HH:MM ↔ minutes

### Backend
- `apps/api/src/pro/pro.controller.ts:109-116` — `PUT /api/pro/availability`
- `apps/api/src/pro/pro.service.ts:354-396` — `updateAvailability()` (REPLACE ALL strategy)
- `packages/contracts/src/schemas/pro.ts:111-134` — `AvailabilitySlotSchema` + `UpdateAvailabilitySchema`

### DB
- `WeeklyAvailability` (l.316-335) — `@@unique([proUserId, dayOfWeek])`

## 3) Frontend — État attendu vs état actuel
### Attendu (référentiel)
- 7 jours affichés avec toggle actif/inactif
- Sélecteur heure début/fin (format HH:MM)
- Validation : début < fin, pas de chevauchements
- Sauvegarde avec feedback clair

### Actuel (constaté)
- **UI/Composants** : 7 jours affichés via `DAYS_OF_WEEK`. Toggle checkbox avec style custom. Champs `<input type="time">` pour début/fin (affichés si jour actif). Valeurs par défaut 09:00-18:00 pour les jours non configurés.
- **Data fetching** : `getJSON('/pro/me')` → extrait `availability` du dashboard. Après save, re-fetch `/pro/me` pour confirmer. `putJSON('/pro/availability', payload)` pour sauvegarder.
- **Validations** : ❌ Aucune validation front que `startTime < endTime`. Le Zod schema backend valide `startMin < endMin` via refine, mais le front ne prévient pas l'utilisateur avant submit. ❌ Pas de validation que les heures sont dans des plages raisonnables (ex: un PRO pourrait mettre 00:00-01:00).
- **Erreurs & UX** : Messages inline error/success (pas d'alert() — mieux que bookings). Bouton disabled pendant save.
- **A11y** : Les labels des inputs time n'ont pas de `htmlFor`/`id`. Le toggle checkbox est `sr-only` (bien) mais le label parent n'a pas de `for`. Le toggle fonctionne au clavier (peer-focus visible).
- **Perf** : Seuls les jours actifs sont envoyés → payload léger. Re-fetch complet du dashboard après save (lourd pour juste confirmer les dispos).
- **NON TROUVÉ** : Pas de guard auth dans la page elle-même (délégué à `DashboardLayout`). Pas de gestion des exceptions de disponibilité (jours fériés, vacances).

## 4) Backend — État attendu vs état actuel
### Endpoints utilisés par la page
- **[GET] /api/pro/me** → `ProController.getMyDashboard()` → `ProService.getMyDashboard()` → auth: JwtAuthGuard + RolesGuard('PRO')
  - Renvoie tout le dashboard dont `availability: WeeklyAvailability[]`

- **[PUT] /api/pro/availability** → `ProController.updateAvailability()` → `ProService.updateAvailability()` → auth: JwtAuthGuard + RolesGuard('PRO')
  - Request DTO : `AvailabilitySlotInput[]` (Zod : dayOfWeek 0-6, startMin 0-1439, endMin 0-1439, isActive boolean)
  - Response DTO : `WeeklyAvailability[]` créés
  - Errors : 404 (profil non trouvé)
  - Sécurité : `req.user.id` utilisé directement → ownership implicite

### Attendu (référentiel)
- Validation chevauchements interdits
- Transaction pour REPLACE ALL
- Cohérence avec le slot generator (getAvailableSlots)

### Actuel (constaté)
- **Auth/AuthZ** : JwtAuthGuard + RolesGuard('PRO') au niveau controller. Ownership implicite via `req.user.id`.
- **Validations serveur** : Zod valide chaque slot individuellement (dayOfWeek range, startMin < endMin). ❌ Pas de validation inter-slots : un PRO pourrait envoyer deux slots pour le même jour (un second slot écraserait via REPLACE ALL mais le premier deleteMany les supprime tous, puis createMany les recrée — pas de conflit unique si 2 slots même jour puisque le unique constraint est `[proUserId, dayOfWeek]` → Prisma lèverait une erreur P2002 si duplicate dayOfWeek dans le payload).
- **Logique métier** : Stratégie REPLACE ALL dans une transaction : 1) deleteMany, 2) createMany, 3) findMany pour retourner les nouvelles données. Correct et atomique.
- **Erreurs** : 404 si profil non trouvé. L'erreur P2002 pour dayOfWeek dupliqué dans le payload n'est pas catchée → erreur 500.
- **Perf** : Transaction légère (max 7 slots par PRO). Pas de N+1.
- **Observabilité** : Aucun log. Pas d'événement émis.
- **Tests** : ❌ ZÉRO test pour updateAvailability.
- **Sécurité** : OK — ownership strict via userId du JWT.

## 5) Base de données — État attendu vs état actuel
- **Table** : `WeeklyAvailability` — id, proUserId, dayOfWeek, startMin, endMin, isActive, timestamps
- **Contraintes** : `@@unique([proUserId, dayOfWeek])` — un seul slot par jour par PRO
- **Index** : Unique constraint sert d'index. Pas d'index additionnel nécessaire (max 7 rows par PRO).
- **Requêtes** : deleteMany + createMany dans transaction — efficace.
- **Risques** : Pas de validation DB que `startMin < endMin` (dépend de Zod). ❌ Pas de check DB pour `0 ≤ dayOfWeek ≤ 6`.

## 6) Intégration Front ↔ Back ↔ DB
- **Mapping** : Front `HH:MM` → `timeToMinutes()` → API `startMin/endMin` (int) → DB `Int`. Reconversion `minutesToTime()` au fetch.
- **Incohérences** :
  - Front envoie seulement les jours actifs (`filter(slot => slot.isActive)`) → les jours inactifs sont supprimés de la DB (deleteMany supprime tout, createMany ne recrée que les actifs). C'est voulu mais un toggle ON→OFF→ON perd la config précédente (restaure les defaults 09:00-18:00).
  - La cohérence avec `getAvailableSlots()` est assurée : le slot generator lit WeeklyAvailability pour le même dayOfWeek.
- **Risques** : Si un PRO sauvegarde des dispos vides (tout inactif), tous les créneaux sont supprimés. Pas de confirmation "Aucun jour actif — êtes-vous sûr ?"

## 7) Problèmes & recommandations
### CRITIQUES
- **C1** : Aucune validation front `startTime < endTime` → le PRO peut sauvegarder 18:00-09:00, qui sera rejeté par Zod mais avec un message d'erreur non explicite

### IMPORTANTS
- **I1** : Pas de gestion des dayOfWeek dupliqués dans le payload → erreur 500 non catchée
- **I2** : Labels sans htmlFor/id sur les inputs time
- **I3** : Toggle ON→OFF→ON perd la configuration horaire précédente
- **I4** : Pas de confirmation quand toutes les dispos sont désactivées
- **I5** : Zéro test backend

### NICE-TO-HAVE
- Exceptions ponctuelles (jours fériés, vacances) — modèle `AvailabilityException` existe en DB mais pas d'UI
- Prévisualisation des slots résultants ("un client verra ces créneaux")
- Undo/rollback des changements

## 8) Plan "Amélioration Backend" (spécifique /dashboard/availability)
### Quick wins (≤2h)
- [ ] Ajouter validation front `startTime < endTime` avant submit
- [ ] Catch l'erreur P2002 pour dayOfWeek dupliqué → message clair
- [ ] Ajouter htmlFor/id sur les labels time
- [ ] Ajouter confirmation quand 0 jours actifs

### Moyen (½–2 jours)
- [ ] Dé-dupliquer les dayOfWeek dans le service avant createMany (prendre le dernier)
- [ ] Tests unitaires pour updateAvailability
- [ ] Conserver la config horaire des jours désactivés (champ séparé ou envoi de tous les jours)
- [ ] Log d'audit des changements de disponibilité

### Structurant (>2 jours)
- [ ] UI pour les `AvailabilityException` (jours fériés, vacances)
- [ ] Prévisualisation des slots disponibles après modification
- [ ] Timezone-awareness (Morocco DST) — actuellement assumé UTC+1

### Dépendances / risques
- Les AvailabilityException nécessitent un nouveau controller/service
- La gestion des timezones est un chantier transverse qui affecte aussi booking

---

# [/dashboard/services] — Gestion services pro

## 1) Résumé exécutif
- **Rôle(s)**: PRO uniquement (auth requis)
- **Objectif métier**: Permettre au PRO de sélectionner les catégories de services qu'il propose, définir le type de tarification (fixe ou fourchette) et les prix.
- **Statut global**: ⚠️ Fragile
- **Scores (0–5)**: Front: 3 ; Back: 4 ; DB: 4 ; Intégration: 3 ; Sécurité: 4 ; Perf: 3 ; Tests/Obs: 1
- **Fichiers clés**:
  - `apps/web/src/app/dashboard/services/page.tsx`
  - `apps/api/src/pro/pro.controller.ts:87-94` (PUT /pro/services)
  - `apps/api/src/pro/pro.service.ts:261-342` (updateServices)
  - `packages/contracts/src/schemas/pro.ts` (ProServiceSchema, UpdateServicesSchema)
  - `packages/database/prisma/schema.prisma` (ProService l.211-231)

## 2) Cartographie technique (fichiers)
### Frontend
- `apps/web/src/app/dashboard/services/page.tsx` — Page services, client-side

### Backend
- `apps/api/src/pro/pro.controller.ts:87-94` — `PUT /api/pro/services`
- `apps/api/src/pro/pro.service.ts:261-342` — `updateServices()` (REPLACE ALL strategy)
- `packages/contracts/src/schemas/pro.ts:44-100` — `ProServiceSchema` + `UpdateServicesSchema`

### DB
- `ProService` (l.211-231) — `@@unique([proUserId, categoryId])`, `@@index([categoryId])`

## 3) Frontend — État attendu vs état actuel
### Attendu (référentiel)
- Liste de toutes les catégories disponibles
- Toggle actif/inactif par catégorie
- Saisie prix (fixe ou fourchette) par service actif
- Validation : prix positifs, min < max pour RANGE
- Règle métier gratuit : max 1 service si non premium

### Actuel (constaté)
- **UI/Composants** : Toutes les catégories affichées avec toggle. Sélecteur FIXED/RANGE. Inputs prix avec `type="number"` min=0. Design cohérent avec le reste du dashboard.
- **Data fetching** : `Promise.all([getJSON('/public/categories'), getJSON('/pro/me')])` — bon parallélisme. `putJSON('/pro/services', payload)` pour save. Re-fetch après save pour confirmation.
- **Validations** : ❌ Pas de validation front que `minPriceMad < maxPriceMad`. ❌ Pas de validation que le prix est raisonnable (un PRO pourrait mettre 0 ou 999999). Les inputs ont `min="0"` mais `required` est set uniquement sur les champs visibles. ❌ Pas d'avertissement si le PRO (gratuit) active plus d'un service — l'erreur viendrait du back.
- **Erreurs & UX** : Messages inline error/success. Bouton disabled pendant save.
- **A11y** : Labels sans `htmlFor`/`id`. Le toggle est identique à la page availability (sr-only checkbox, peer styles). Le select `pricingType` n'a pas d'id lié au label.
- **Perf** : `parseInt` pour convertir les prix string → int. Pas de debounce. Re-fetch dashboard complet après save.
- **NON TROUVÉ** : Pas d'indication UI de la limite gratuit (1 service max).

## 4) Backend — État attendu vs état actuel
### Endpoints utilisés par la page
- **[GET] /api/public/categories** → `CatalogController.getCategories()` → cached, public
- **[GET] /api/pro/me** → `ProController.getMyDashboard()` → inclut `services: ProService[]`
- **[PUT] /api/pro/services** → `ProController.updateServices()` → `ProService.updateServices()`
  - Request DTO : `ProServiceInput[]` (Zod : categoryId regex, pricingType enum, prices, isActive)
  - Response DTO : `ProService[]` avec category includes
  - Errors : 404 (profil non trouvé / catégories invalides), 400 (limite gratuit dépassée)
  - Sécurité : JwtAuthGuard + RolesGuard('PRO') + ownership implicite via userId

### Attendu (référentiel)
- Validation complète des prix
- Règle métier : limite services gratuits
- Transaction REPLACE ALL
- Cohérence avec /pro/[id] (profil public)

### Actuel (constaté)
- **Auth/AuthZ** : JwtAuthGuard + RolesGuard('PRO'). Ownership implicite.
- **Validations serveur** : Zod `refine` valide : FIXED → fixedPriceMad requis ; RANGE → min+max requis + min < max. ✅ Règle métier : `!isPremium && categoryPublicIds.length > 1` → 400. ✅ Vérifie que toutes les catégories existent. ✅ Map publicId → internalId.
- **Logique métier** : Transaction REPLACE ALL : deleteMany + createMany + findMany. Correct et atomique. Déduplique les categoryIds avec `[...new Set()]`.
- **Erreurs** : Messages en français. L'erreur "limité à 1 service" est claire.
- **Perf** : Transaction simple. `findMany` avec includes pour le retour. Pas de N+1.
- **Observabilité** : Aucun log. Pas d'événement émis.
- **Tests** : ❌ ZÉRO.
- **Sécurité** : Les prix ne sont pas bornés côté Zod (juste `positive()`) — un PRO pourrait mettre fixedPriceMad = 999999999.

## 5) Base de données — État attendu vs état actuel
- **Table** : `ProService` — id, proUserId, categoryId, isActive, pricingType, minPriceMad, maxPriceMad, fixedPriceMad, timestamps
- **Contraintes** : `@@unique([proUserId, categoryId])` — un seul service par catégorie par PRO
- **Index** : `@@index([categoryId])` — pour les requêtes de recherche par catégorie
- **Requêtes** : deleteMany + createMany dans transaction
- **Risques** : `pricingType` est `String?` en DB (pas d'enum) → possibilité de valeurs incohérentes si un autre chemin écrit en DB. `fixedPriceMad`, `minPriceMad`, `maxPriceMad` sont `Int?` → pas de CHECK constraint.

## 6) Intégration Front ↔ Back ↔ DB
- **Mapping** : Front `ServiceFormData` (string prices) → `parseInt` → API `ProServiceInput` (int prices) → DB `Int?`. CategoryId = publicId format `cat_xxx_000` → résolu en internalId côté service.
- **Incohérences** :
  - Front envoie `undefined` pour les prix non pertinents (fixedPriceMad si RANGE) → Zod les passe en `undefined` → Prisma les stocke comme `null`. OK.
  - ❌ Si le PRO switch de RANGE à FIXED, les anciens min/maxPriceMad ne sont pas nettoyés côté DB (le REPLACE ALL recrée tout, donc c'est OK via deleteMany).
  - La cohérence avec `/pro/[id]` (profil public) est assurée : les deux lisent les mêmes ProService rows.

## 7) Problèmes & recommandations
### CRITIQUES
- Aucun problème critique identifié (le flux fonctionne correctement)

### IMPORTANTS
- **I1** : Pas de validation front `minPriceMad < maxPriceMad` → erreur Zod non explicite
- **I2** : Pas d'indication UI de la limite gratuit (1 service) avant submit
- **I3** : Labels sans htmlFor/id
- **I4** : Prix non borné en haut (Zod permet des valeurs irréalistes)
- **I5** : Zéro test backend
- **I6** : `pricingType` est un `String?` en DB au lieu d'un enum Prisma

### NICE-TO-HAVE
- Drag-and-drop pour réordonner les services
- Prévisualisation du profil public
- Historique des changements de prix

## 8) Plan "Amélioration Backend" (spécifique /dashboard/services)
### Quick wins (≤2h)
- [ ] Validation front `min < max` pour RANGE avant submit
- [ ] Afficher la limite "1 service max (compte gratuit)" dans l'UI
- [ ] Ajouter htmlFor/id sur labels
- [ ] Borner les prix Zod : `.max(100000)` pour éviter les valeurs aberrantes

### Moyen (½–2 jours)
- [ ] Tests unitaires pour updateServices (limite gratuit, catégories invalides, prix)
- [ ] Migrer `pricingType` vers un enum Prisma
- [ ] Log d'audit des changements de services

### Structurant (>2 jours)
- [ ] Historique des prix (table dédiée)
- [ ] Modération des prix (alerter si prix anormalement élevé/bas)

### Dépendances / risques
- La migration de `pricingType` String → enum nécessite une migration Prisma avec transformation de données
- La borne de prix max devrait être alignée avec le business (quel est le prix max raisonnable pour un service au Maroc ?)

---

# [/dashboard/profile] — Profil pro (dashboard)

## 1) Résumé exécutif
- **Rôle(s)**: PRO uniquement (auth requis)
- **Objectif métier**: Permettre au PRO de modifier son téléphone de contact et sa ville depuis le dashboard.
- **Statut global**: ⚠️ Fragile
- **Scores (0–5)**: Front: 3 ; Back: 4 ; DB: 4 ; Intégration: 3 ; Sécurité: 3 ; Perf: 4 ; Tests/Obs: 1
- **Fichiers clés**:
  - `apps/web/src/app/dashboard/profile/page.tsx`
  - `apps/api/src/pro/pro.controller.ts:63-70` (PATCH /pro/profile)
  - `apps/api/src/pro/pro.service.ts:143-249` (updateProfile)
  - `packages/contracts/src/schemas/pro.ts` (UpdateProProfileSchema)
  - `apps/web/src/store/authStore.ts` (setUser)

## 2) Cartographie technique (fichiers)
### Frontend
- `apps/web/src/app/dashboard/profile/page.tsx` — Page profil dashboard, client-side

### Backend
- `apps/api/src/pro/pro.controller.ts:63-70` — `PATCH /api/pro/profile`
- `apps/api/src/pro/pro.service.ts:143-249` — `updateProfile()` (transaction User + ProProfile)
- `packages/contracts/src/schemas/pro.ts:15-27` — `UpdateProProfileSchema`

### DB
- `User` (phone, cityId), `ProProfile` (cityId, whatsapp) — synchronisation duale

## 3) Frontend — État attendu vs état actuel
### Attendu (référentiel)
- Formulaire pour modifier téléphone et ville
- Validation phone format marocain
- Dropdown ville depuis l'API
- Synchronisation avec le store global

### Actuel (constaté)
- **UI/Composants** : Formulaire simple : téléphone (input tel) + ville (select dropdown). Affichage "Ville actuelle" sous le select. Bouton submit disabled pendant save.
- **Data fetching** : `Promise.all([getJSON('/pro/me'), getJSON('/public/cities')])`. `patchJSON('/pro/profile', formData)` pour save. Après save, met à jour le store authStore via `setUser()`.
- **Validations** : Pattern HTML `^(06|07)\d{8}$` sur le téléphone (validation navigateur). `required` sur les deux champs. ❌ Pas de validation JS côté client — dépend du pattern HTML. Le pattern front (`06|07`) est différent du pattern back Zod (`06|07` aussi, OK) mais différent du RegisterDto qui accepte aussi `05` et `+212` → incohérence.
- **Erreurs & UX** : Messages inline error/success. Bon pattern UX.
- **A11y** : ✅ `htmlFor` + `id` présents sur les deux champs (phone, cityId). Bon.
- **Perf** : Deux appels parallèles au chargement. Un seul PATCH au save. Store global mis à jour → synchronisé.
- **NON TROUVÉ** :
  - Pas de champs firstName/lastName/email dans ce formulaire — non modifiables depuis le dashboard.
  - La page `/profile` (globale) et `/dashboard/profile` sont deux pages différentes. Doublon partiel.
  - Les villes dans le dropdown utilisent `city.id` (publicId retourné par `/public/cities`). Le formData envoie `cityId` = publicId → le back résout via `city.findUnique({ where: { publicId } })` → OK.

## 4) Backend — État attendu vs état actuel
### Endpoints utilisés par la page
- **[GET] /api/pro/me** → Dashboard complet
- **[GET] /api/public/cities** → Liste des villes (cached)
- **[PATCH] /api/pro/profile** → `ProService.updateProfile()`
  - Request DTO : `{ phone?: string, cityId?: string, whatsapp?: string }` (Zod UpdateProProfileSchema)
  - Response DTO : `{ user: {...}, profile: {...} }` avec city resolved
  - Errors : 404 (profil non trouvé), 400 (ville invalide / données invalides)
  - Sécurité : JwtAuthGuard + RolesGuard('PRO') + ownership implicite

### Attendu (référentiel)
- Transaction pour synchroniser User + ProProfile
- Vérification unicité phone
- Résolution publicId → internalId pour cityId

### Actuel (constaté)
- **Auth/AuthZ** : JwtAuthGuard + RolesGuard('PRO'). Ownership via `req.user.id`.
- **Validations serveur** : Zod valide phone regex `(06|07)\d{8}`, cityId regex `city_[a-z]+_\d{3}`. Vérification unicité phone en DB (exclut l'utilisateur courant). Vérification existence ville.
- **Logique métier** : ✅ Transaction atomique met à jour User (cityId, phone) ET ProProfile (cityId, whatsapp) simultanément. Résolution publicId → internalId correcte.
- **Erreurs** : Messages génériques "Données invalides" (pas de leak d'info sur qui a déjà le phone).
- **Perf** : Transaction simple. Pas de N+1.
- **Observabilité** : Aucun log.
- **Tests** : ❌ ZÉRO.
- **Sécurité** : ❌ Le champ `whatsapp` est dans le DTO (rétrocompatibilité) mais le front ne l'envoie pas. Si quelqu'un envoie manuellement un whatsapp via Postman, il serait mis à jour sans validation supplémentaire.

## 5) Base de données — État attendu vs état actuel
- **Tables** : `User` (phone unique, cityId FK), `ProProfile` (cityId FK, whatsapp)
- **Contraintes** : phone unique sur User, cityId FK vers City
- **Synchronisation** : La transaction met à jour les deux tables — cohérent.
- **Risques** : Si la transaction échoue après update User mais avant update ProProfile → rollback OK ($transaction).

## 6) Intégration Front ↔ Back ↔ DB
- **Mapping** : Front `formData.cityId` (publicId string) → Back résout via `city.findUnique({ where: { publicId } })` → DB `User.cityId` et `ProProfile.cityId` (internalId).
- **Incohérences** :
  - ❌ Le dashboard profile modifie `phone` et `cityId`. La page `/profile` (globale) modifie `firstName`, `lastName`, `cityId` via un endpoint DIFFÉRENT (`PATCH /users/me` avec un DTO qui attend `@IsUUID('4')` pour cityId). Le PRO a deux pages qui modifient des champs qui se chevauchent (cityId) avec des validations différentes.
  - Le phone pattern du dashboard (`06|07`) exclut le `05` et le `+212` qui sont acceptés à l'inscription → un PRO inscrit avec 05xxx ou +212xxx ne peut pas re-sauvegarder sans changer de numéro.
- **Risques sécurité** : Le champ `whatsapp` deprecated est toujours accepté par le backend.

## 7) Problèmes & recommandations
### CRITIQUES
- **C1** : Doublon partiel avec `/profile` (page globale) — même champ `cityId` modifiable avec des validations DIFFÉRENTES (publicId regex ici vs @IsUUID('4') dans users controller)
- **C2** : Phone pattern `(06|07)` exclut les numéros `05` et `+212` valides à l'inscription → PRO bloqué si inscrit avec ces formats

### IMPORTANTS
- **I1** : Champ `whatsapp` deprecated toujours accepté par le backend → surface d'attaque inutile
- **I2** : Zéro test backend pour updateProfile
- **I3** : Pas de modification firstName/lastName/email depuis le dashboard

### NICE-TO-HAVE
- Unifier `/profile` et `/dashboard/profile` en une seule page
- Historique des modifications de profil
- Vérification par SMS du nouveau numéro

## 8) Plan "Amélioration Backend" (spécifique /dashboard/profile)
### Quick wins (≤2h)
- [ ] Supprimer le champ `whatsapp` du UpdateProProfileSchema (breaking: vérifier qu'aucun client ne l'utilise)
- [ ] Aligner le regex phone : accepter `05` et `+212` comme à l'inscription
- [ ] Documenter la différence entre `/profile` et `/dashboard/profile`

### Moyen (½–2 jours)
- [ ] Tests unitaires pour updateProfile (phone unicité, city résolution, transaction)
- [ ] Unifier les endpoints `/users/me` et `/pro/profile` ou clarifier les responsabilités
- [ ] Corriger `/users/me` pour accepter publicId au lieu de UUID pour cityId

### Structurant (>2 jours)
- [ ] Unifier les deux pages profil en une seule avec un formulaire complet
- [ ] Ajouter vérification SMS pour changement de numéro
- [ ] Log d'audit pour toute modification de profil

### Dépendances / risques
- Supprimer `whatsapp` du schema est un breaking change pour les éventuels clients API externes
- L'unification des pages profil nécessite une refonte UX

---

# [/dashboard/kyc] — Vérification KYC

## 1) Résumé exécutif
- **Rôle(s)**: PRO uniquement (auth requis)
- **Objectif métier**: Permettre au PRO de soumettre son dossier KYC (CIN recto/verso + numéro) pour vérification d'identité. Gérer les re-soumissions après rejet.
- **Statut global**: ⚠️ Fragile
- **Scores (0–5)**: Front: 3 ; Back: 4 ; DB: 4 ; Intégration: 3 ; Sécurité: 3 ; Perf: 4 ; Tests/Obs: 2
- **Fichiers clés**:
  - `apps/web/src/app/dashboard/kyc/page.tsx`
  - `apps/api/src/kyc/kyc.controller.ts`
  - `apps/api/src/kyc/kyc.service.ts`
  - `apps/api/src/kyc/kyc.dto.ts` (SubmitKycSchema)
  - `apps/api/src/kyc/multer.config.ts`
  - `packages/database/prisma/schema.prisma` (ProProfile.kyc*, KycAccessLog)

## 2) Cartographie technique (fichiers)
### Frontend
- `apps/web/src/app/dashboard/kyc/page.tsx` — Page KYC, client-side

### Backend
- `apps/api/src/kyc/kyc.controller.ts` — 4 endpoints : upload, submit, resubmit, status, getFile
- `apps/api/src/kyc/kyc.service.ts` — Logique KYC (submit, resubmit, status, file access)
- `apps/api/src/kyc/kyc.dto.ts` — Zod schema SubmitKycSchema
- `apps/api/src/kyc/multer.config.ts` — Config upload (5MB, jpg/png/webp, UUID naming)

### DB
- `ProProfile` — champs KYC : cinNumber (unique), kycStatus (enum), kycCinFrontUrl, kycCinBackUrl, kycSelfieUrl, kycRejectionReason
- `KycAccessLog` — table d'audit (userId, filename, result, ip)

## 3) Frontend — État attendu vs état actuel
### Attendu (référentiel)
- Affichage du statut KYC actuel (NOT_SUBMITTED, PENDING, APPROVED, REJECTED)
- Formulaire de soumission (cinNumber + 2 fichiers)
- Gestion re-soumission après rejet
- Upload sécurisé (taille, format)
- PII protégé

### Actuel (constaté)
- **UI/Composants** :
  - Badge statut contextuel (4 états visuels distincts).
  - Alerte rouge proéminente si REJECTED avec motif de rejet.
  - Waiting room si PENDING (spinner + message "sous 24-48h").
  - Formulaire visible uniquement si NOT_SUBMITTED ou REJECTED.
  - File inputs avec preview nom + taille.
  - Info box avec formats/taille acceptés.
- **Data fetching** :
  - `getJSON('/kyc/status')` pour le statut.
  - Submit via `fetch()` direct (pas via `postFormData` de lib/api.ts) avec FormData multipart.
  - ❌ Le front envoie `cinNumber` + `cinFront` (file) + `cinBack` (file) dans un FormData directement à `/kyc/submit` ou `/kyc/resubmit`. Mais le backend `/kyc/submit` attend un JSON body avec `cinNumber`, `frontUrl`, `backUrl` (des URLs, pas des fichiers). Le front utilise `/kyc/resubmit` avec des fichiers quand status=REJECTED, mais pour la première soumission, le workflow attendu par le backend est : upload séparé via `/kyc/upload` → récupérer l'URL → envoyer les URLs à `/kyc/submit`. **Le front bypasse ce workflow et envoie directement les fichiers à `/kyc/submit`** → cela devrait échouer puisque `/kyc/submit` n'a pas de FileInterceptor.
  - CEPENDANT : en relisant, le front envoie un FormData à `/kyc/submit` mais l'endpoint attend un JSON body validé par Zod (cinNumber, frontUrl, backUrl). Le FormData contiendrait `cinNumber` comme texte et `cinFront`/`cinBack` comme fichiers → le Zod schema ne recevrait pas les URLs → **BUG potentiel sur la première soumission**.
  - Pour la re-soumission (REJECTED), l'endpoint `/kyc/resubmit` a bien un `FileFieldsInterceptor` → le multipart est géré. OK.
- **Validations** : `required` sur les inputs. CIN auto-uppercase via `onChange`. File accept `image/jpeg,image/jpg,image/png,image/webp`.
- **Erreurs & UX** : Messages inline error/success. Bouton disabled quand `submitting` ou fichiers manquants.
- **A11y** : ✅ `htmlFor`/`id` présents sur cinNumber, frontFile, backFile. Bonne accessibilité sur cette page.
- **Perf** : Uploads en multipart — OK. Pas de compression front des images avant upload.
- **NON TROUVÉ** : Pas de prévisualisation des images uploadées (juste nom+taille). Pas de progress bar pour l'upload.

## 4) Backend — État attendu vs état actuel
### Endpoints utilisés par la page
- **[GET] /api/kyc/status** → `KycController.getMyKycStatus()` → `KycService.getMyKycStatus()` → auth: JwtAuthGuard + RolesGuard('PRO')
  - Response : `{ kycStatus, kycRejectionReason, hasCinNumber }`

- **[POST] /api/kyc/submit** → `KycController.submitKyc()` → `KycService.submitKyc()` → auth: JwtAuthGuard + RolesGuard('PRO')
  - Request DTO : `{ cinNumber, frontUrl, backUrl }` (Zod : cinNumber string + trim + uppercase, URLs valides)
  - ❌ Pas de FileInterceptor → attend des URLs, pas des fichiers
  - Response : ProProfile avec champs KYC sélectionnés
  - Errors : 404 (profil), 409 (CIN dupliqué)

- **[POST] /api/kyc/resubmit** → `KycController.resubmitKyc()` → `KycService.resubmitKyc()` → auth: JwtAuthGuard + RolesGuard('PRO')
  - Request : multipart/form-data avec `cinFront`, `cinBack` (fichiers), `cinNumber` (texte)
  - Response : ProProfile mis à jour
  - Errors : 403 (statut != REJECTED), 409 (CIN dupliqué)

- **[POST] /api/kyc/upload** → `KycController.uploadImage()` → auth: JwtAuthGuard + RolesGuard('PRO')
  - Request : multipart/form-data avec `file`
  - Response : `{ url, filename }`
  - Sécurité : multer config (5MB, jpg/png/webp, UUID rename)

- **[GET] /api/kyc/file/:filename** → `KycController.getKycFile()` → `KycService.getKycFile()` → auth: JwtAuthGuard + Roles('PRO','ADMIN')
  - Sécurité : path traversal prevention, extension whitelist, ownership check, audit log
  - Response : file stream avec headers sécurisés (no-cache, no-sniff, CSP none)

### Attendu (référentiel)
- Upload sécurisé (taille, format, antivirus)
- Stockage sécurisé des PII (chiffrement, accès restreint)
- Audit trail complet
- Workflow statut clair (NOT_SUBMITTED → PENDING → APPROVED/REJECTED)
- Accès fichiers restreint (ownership)

### Actuel (constaté)
- **Auth/AuthZ** : JwtAuthGuard + RolesGuard('PRO') sur tous les endpoints. getKycFile autorise aussi ADMIN. Ownership vérifié dans getKycFile (compare `profile.userId !== requestingUserId`).
- **Validations serveur** : Zod valide cinNumber (trim+uppercase) et URLs. Multer config : 5MB max, extensions jpg/png/webp.
- **Logique métier** : submitKyc met à jour le profil existant (pas de création). resubmitKyc vérifie le statut REJECTED. Unicité CIN gérée par Prisma P2002 catch.
- **Erreurs** : Messages génériques "Données en conflit" pour CIN dupliqué.
- **Perf** : Upload local sur disque. Stream pour la lecture fichier avec timeout 15s.
- **Observabilité** : ✅ `KycAccessLog` table d'audit pour chaque accès fichier (userId, filename, result ALLOW/DENY, ip). Logger NestJS pour les erreurs. C'est la meilleure observabilité de tout le projet.
- **Tests** : ❌ ZÉRO test pour KycService ou KycController.
- **Sécurité** :
  - ✅ Path traversal prevention (`path.basename`, interdiction de `..`)
  - ✅ Extension whitelist sur le streaming
  - ✅ Headers sécurisés sur le streaming (no-sniff, no-cache, CSP none)
  - ✅ Audit log sur chaque accès fichier
  - ❌ Pas d'antivirus/scanning sur les fichiers uploadés (multer accepte tout fichier qui passe le filtre extension)
  - ❌ Pas de validation du contenu réel du fichier (magic bytes) — un fichier malveillant renommé en .jpg passerait
  - ❌ Les URLs KYC (kycCinFrontUrl, kycCinBackUrl) sont des URLs publiques non signées → accessible sans auth si on connaît l'URL (ex: `http://localhost:3001/uploads/kyc/uuid.jpg`)
  - ❌ Le répertoire `uploads/kyc/` est probablement servi statiquement → les fichiers CIN sont accessibles publiquement

## 5) Base de données — État attendu vs état actuel
- **Tables** :
  - `ProProfile` — cinNumber (String? @unique), kycStatus (KycStatus enum), kycCinFrontUrl (String?), kycCinBackUrl (String?), kycSelfieUrl (String?), kycRejectionReason (String?)
  - `KycAccessLog` — table d'audit pour les accès fichiers
- **Contraintes** : cinNumber unique, kycStatus enum (NOT_SUBMITTED, PENDING, APPROVED, REJECTED)
- **Index** : Unique sur cinNumber.
- **Requêtes** : `findUnique` pour le profil, `update` pour les modifications, `findFirst` avec `OR` pour la résolution de fichier.
- **Risques** :
  - Les URLs KYC stockent des URLs complètes (`http://...`) → si le PUBLIC_URL change, toutes les URLs sont cassées.
  - kycSelfieUrl est défini dans le schema mais jamais utilisé dans le code.
  - Pas de chiffrement des données KYC en DB.

## 6) Intégration Front ↔ Back ↔ DB
- **Mapping** :
  - Front (première soumission) : FormData(`cinNumber`, `cinFront` file, `cinBack` file) → **POST /kyc/submit** qui attend JSON(`cinNumber`, `frontUrl`, `backUrl`) → **MISMATCH**
  - Front (re-soumission) : FormData(`cinNumber`, `cinFront` file, `cinBack` file) → **POST /kyc/resubmit** avec FileFieldsInterceptor → OK
- **Incohérences** :
  - **BUG CRITIQUE** : La première soumission KYC depuis le front envoie des fichiers à un endpoint qui attend des URLs. Le workflow correct serait : upload les 2 fichiers via `/kyc/upload`, récupérer les URLs, puis soumettre via `/kyc/submit`. Le front ne fait pas ce workflow en 2 étapes.
  - Le `/kyc/resubmit` gère correctement les fichiers en multipart.
  - Si le PRO s'est inscrit avec CIN via le formulaire d'inscription (auth.service register), le kycStatus est PENDING et des URLs existent déjà → la page KYC affiche "En cours de vérification".
- **Risques sécurité** : URLs KYC potentiellement publiques sans signature.

## 7) Problèmes & recommandations
### CRITIQUES
- **C1** : **BUG** — La première soumission KYC depuis le dashboard envoie des fichiers multipart à `/kyc/submit` qui attend un JSON body avec des URLs → la soumission échoue probablement (ou Zod rejette car les champs frontUrl/backUrl ne sont pas des URLs valides)
- **C2** : Les fichiers KYC (photos CIN) sont stockés dans `uploads/kyc/` avec des URLs publiques non signées → un attaquant connaissant le UUID du fichier peut accéder aux photos CIN sans authentification
- **C3** : Pas de validation magic bytes des fichiers uploadés → un fichier malveillant renommé en .jpg est accepté

### IMPORTANTS
- **I1** : Pas de compression/redimensionnement des images avant stockage → un fichier 5MB reste 5MB
- **I2** : Les URLs KYC sont des URLs absolues → si PUBLIC_URL change, toutes les URLs cassent
- **I3** : Zéro test backend pour KYC (service critique avec PII)
- **I4** : `kycSelfieUrl` existe en DB mais n'est pas utilisé → champ orphelin
- **I5** : Pas de notification au PRO quand le KYC est approuvé/rejeté (seulement visible au refresh)

### NICE-TO-HAVE
- Progress bar pour l'upload
- Prévisualisation des images uploadées
- Chiffrement at-rest des fichiers KYC
- Stockage sur un service cloud (S3) avec URLs pré-signées

## 8) Plan "Amélioration Backend" (spécifique /dashboard/kyc)
### Quick wins (≤2h)
- [ ] **URGENT** : Corriger le front pour utiliser le workflow 2 étapes (upload → submit) OU ajouter FileFieldsInterceptor à `/kyc/submit`
- [ ] Ajouter validation magic bytes (vérifier que le contenu est réellement une image)
- [ ] Protéger le dossier `uploads/kyc/` : ne PAS le servir statiquement, forcer le passage par `/kyc/file/:filename`
- [ ] Stocker des chemins relatifs au lieu d'URLs absolues dans kycCinFrontUrl/kycCinBackUrl

### Moyen (½–2 jours)
- [ ] Tests unitaires pour KycService (submit, resubmit, status, file access)
- [ ] Ajouter compression/redimensionnement des images (sharp) dans le pipeline upload
- [ ] Ajouter notification (event) quand le statut KYC change
- [ ] Supprimer le champ `kycSelfieUrl` orphelin (migration)

### Structurant (>2 jours)
- [ ] Migrer le stockage vers S3 avec URLs pré-signées (time-limited)
- [ ] Ajouter chiffrement at-rest pour les fichiers KYC
- [ ] Tests e2e pour le flux KYC complet (upload, submit, approve, reject, resubmit)
- [ ] Intégrer un scanner antivirus sur les uploads (ClamAV ou service cloud)

### Dépendances / risques
- La protection du dossier uploads nécessite une configuration NestJS/Express (supprimer `ServeStaticModule` pour ce path)
- La migration S3 est un changement d'infrastructure
- L'ajout de sharp pour la compression peut nécessiter une dépendance native

---

# Synthèse Phase 3 — Dashboard PRO (hors paiement)

## Problèmes transverses

### Contrats API (bookings/history/availability/services/profile/kyc)
- Mélange Zod (pro, booking status, kyc) et class-validator (booking duration) dans le même projet — aucune stratégie unifiée
- Pas de `total` dans les réponses paginées → pagination front impossible
- Pas de codes d'erreur structurés (ex: `PHONE_ALREADY_USED`, `CATEGORY_NOT_FOUND`) — messages texte uniquement

### Cohérence des statuts (bookings, KYC)
- `WAITING_FOR_CLIENT` et `CANCELLED_AUTO_OVERLAP` invisibles dans les onglets front des bookings
- `CANCELLED_AUTO_FIRST_CONFIRMED` référencé dans le front n'existe pas dans l'enum DB
- Le workflow KYC front (submit) ne match pas le backend (attend URLs, reçoit fichiers)

### Sécurité (ownership, PII KYC, permissions)
- Ownership correctement vérifié sur TOUTES les mutations (via userId du JWT)
- ❌ Fichiers KYC (photos CIN) potentiellement accessibles publiquement sans auth
- ❌ Phone client exposé sans masquage dans les bookings PRO
- ❌ Champ `whatsapp` deprecated toujours accepté par le backend
- ✅ Audit log existant pour les accès fichiers KYC (meilleure observabilité du projet)
- ✅ Path traversal prevention sur le file streaming

### Performance (index, pagination, N+1)
- Indexes existants couvrent les requêtes principales (`[proId, timeSlot]`, `[proId]`, `[categoryId]`)
- ❌ Pas d'index `[proId, status]` pour le filtrage par statut
- ❌ Le front charge tous les bookings (max 20) et filtre en mémoire → historique potentiellement vide
- Les transactions sont utilisées correctement pour les écritures (availability, services, booking confirmation)

### Tests/observabilité
- ❌ **ZÉRO test** sur l'ensemble des 6 pages/endpoints audités
- Observabilité : EventEmitter pour les bookings (CREATED/CONFIRMED/CANCELLED/MODIFIED), KycAccessLog pour les accès fichiers. Pas de requestId, pas de métriques, `console.error` dans certains services.

## Risques majeurs (Top 5)

1) **BUG KYC Submit** : La première soumission KYC depuis le dashboard est probablement cassée (front envoie des fichiers, back attend des URLs). Impact : un PRO qui n'a pas soumis son KYC à l'inscription ne peut pas le faire depuis le dashboard.

2) **Fichiers KYC publiquement accessibles** : Les photos CIN sont stockées dans `uploads/kyc/` et potentiellement servies statiquement. Un attaquant connaissant le UUID du fichier peut accéder aux documents d'identité sans authentification. Impact : fuite massive de PII.

3) **Bookings invisibles** : Les statuts `WAITING_FOR_CLIENT` et `CANCELLED_AUTO_OVERLAP` ne sont dans aucun onglet front → le PRO perd la visibilité sur ces bookings. L'historique est tronqué par la pagination partagée.

4) **Doublon profil** : Deux pages (`/profile` et `/dashboard/profile`) modifient le même champ `cityId` avec des validations différentes (UUID vs publicId). La page `/profile` utilise un DTO avec `@IsUUID('4')` qui échoue avec les publicId.

5) **Zéro test** : Aucun test unitaire ou d'intégration sur l'ensemble du dashboard PRO. Les flux critiques (booking confirmation avec Winner-Takes-All, KYC avec PII, availability avec impact sur les slots) ne sont pas couverts.

## Plan backend priorisé (Phase suivante — améliorations)

### Priorité 0 (immédiat)
- [ ] **FIX** : Corriger le workflow KYC submit front (2 étapes upload→submit) OU ajouter FileFieldsInterceptor au backend `/kyc/submit`
- [ ] **FIX** : Protéger `uploads/kyc/` — ne pas servir statiquement, forcer le passage par `/kyc/file/:filename` avec auth
- [ ] **FIX** : Ajouter `WAITING_FOR_CLIENT` et `CANCELLED_AUTO_OVERLAP` dans les onglets front des bookings
- [ ] **FIX** : Corriger le statut fantôme `CANCELLED_AUTO_FIRST_CONFIRMED` dans le front → `CANCELLED_AUTO_OVERLAP`
- [ ] **FIX** : Aligner le phone regex entre inscription (`+212|05|06|07`) et dashboard profile (`06|07` seulement)

### Priorité 1
- [ ] Ajouter query param `statusIn` à `GET /bookings` pour filtrer côté DB (+ total dans la réponse)
- [ ] Masquer le phone client sauf si booking CONFIRMED/COMPLETED
- [ ] Validation magic bytes sur les uploads KYC
- [ ] Supprimer le champ `whatsapp` du UpdateProProfileSchema
- [ ] Ajouter validation front `startTime < endTime` (availability) et `min < max` (services)
- [ ] Borner les prix dans le Zod schema (max raisonnable)
- [ ] Catch P2002 pour dayOfWeek dupliqué dans updateAvailability

### Priorité 2
- [ ] Tests unitaires pour : BookingService (5 méthodes), ProService (4 méthodes), KycService (4 méthodes)
- [ ] Unifier la stratégie de validation (tout Zod ou tout class-validator)
- [ ] Pagination front avec total pour bookings et historique
- [ ] Migrer `pricingType` String → enum Prisma
- [ ] Ajouter index composite `@@index([proId, status])` sur Booking
- [ ] Stocker des paths relatifs pour les URLs KYC (pas d'URLs absolues)
- [ ] Résoudre le doublon `/profile` vs `/dashboard/profile` (unifier ou clarifier)
- [ ] Remplacer `alert()`/`confirm()` par des composants UI accessibles
- [ ] Ajouter `@Throttle` sur les mutations booking
- [ ] Cron job pour expiration PENDING bookings (expiresAt dépassé)

---

# PHASE 4 — Abonnements & Paiements + Premium Overview

- [/plans — Plans (abonnements PRO)](#plans--plans-abonnements-pro)
- [/pro/subscription — Résultat paiement abonnement](#prosubscription--résultat-paiement-abonnement)
- [/dashboard/subscription/success — Paiement réussi](#dashboardsubscriptionsuccess--paiement-réussi)
- [/dashboard/subscription/cancel — Paiement annulé](#dashboardsubscriptioncancel--paiement-annulé)
- [/dashboard — Dashboard Overview Premium](#dashboard--dashboard-overview-premium)

---

# [/plans] — Plans (abonnements PRO)

## 1) Résumé exécutif
- **Rôle(s)**: PRO uniquement (auth requis)
- **Objectif métier**: Présenter les offres Premium (mensuel/annuel) et Boost (sponsorisé 7 jours par ville×service), permettre au PRO de lancer une demande de paiement manuel.
- **Statut global**: ⚠️ Fragile
- **Scores (0–5)**: Front: 3 ; Back: 4 ; DB: 4 ; Intégration: 3 ; Sécurité: 3 ; Perf: 4 ; Tests/Obs: 1
- **Fichiers clés**:
  - `apps/web/src/app/plans/page.tsx`
  - `apps/web/src/components/payment/PaymentButton.tsx`
  - `apps/web/src/lib/api.ts` (postJSON)
  - `apps/web/src/store/toastStore.ts`
  - `apps/api/src/payment/payment.controller.ts`
  - `apps/api/src/payment/payment.service.ts`
  - `apps/api/src/payment/dto/initiate-payment.dto.ts`
  - `apps/api/src/payment/utils/payment.constants.ts`
  - `packages/database/prisma/schema.prisma` (PaymentOrder, ProSubscription, ProBoost)

## 2) Cartographie technique (fichiers)
### Frontend
- `apps/web/src/app/plans/page.tsx` — Page pricing, client-side
- `apps/web/src/components/payment/PaymentButton.tsx` — Composant bouton paiement + modale instructions

### Backend
- `apps/api/src/payment/payment.controller.ts:44-56` — `POST /api/payment/checkout`
- `apps/api/src/payment/payment.service.ts:41-145` — `initiatePayment()`
- `apps/api/src/payment/dto/initiate-payment.dto.ts` — DTO class-validator
- `apps/api/src/payment/utils/payment.constants.ts` — Prix et constantes plans

### DB
- `PaymentOrder` (l.510-536) — commandes de paiement
- `ProSubscription` (l.439-464) — abonnements actifs
- `ProBoost` (l.466-494) — boosts actifs

## 3) Frontend — État attendu vs état actuel
### Attendu (référentiel)
- Auth guard PRO strict
- Affichage des plans avec prix, durées, features
- Toggle mensuel/annuel pour Premium
- Sélecteurs ville+catégorie pour Boost
- Bouton de paiement avec feedback clair
- Indication si déjà abonné

### Actuel (constaté)
- **UI/Composants** : Deux cartes — Premium (mensuel 350 MAD / annuel 3000 MAD, badge "Recommandé") et Boost (200 MAD/7j). Toggle mensuel/annuel pour Premium. Selects ville+catégorie pour Boost (chargés via `/public/cities` et `/public/categories`). `PaymentButton` composant réutilisable. Section "Réassurance" en bas (paiement manuel, activation sous 24-48h, sans engagement).
- **Data fetching** : `Promise.all([cities, categories])` au mount. `PaymentButton` appelle `postJSON('/payment/checkout', payload)` au clic. Réponse affichée dans une modale avec instructions de paiement (référence, méthodes, contact).
- **Validations** : Boost disabled si `!selectedCityId || !selectedCategoryId` — OK. Validation supplémentaire dans PaymentButton (vérifie cityId/categoryId pour BOOST avant l'appel API).
- **Erreurs & UX** : ✅ Utilise `useToastStore` au lieu de `alert()` — meilleur pattern que le dashboard. Modale avec référence copiable (clipboard). Loader pendant la requête.
- **A11y** : ✅ `htmlFor`/`id` sur les selects Boost (boost-city, boost-category). ❌ La modale n'a pas `role="dialog"`, `aria-modal`, ni focus trap. Les boutons toggle mensuel/annuel n'ont pas d'`aria-pressed`.
- **Perf** : Chargement léger (2 appels publics cachés). Recharts non importé ici → pas d'impact bundle.
- **NON TROUVÉ** :
  - Pas d'indication si le PRO est déjà Premium → il peut re-souscrire
  - Pas d'indication si le PRO a un Boost actif ou en cooldown → l'erreur viendrait du backend
  - Hex hardcodé `#F08C1B`, `#D97213` dans PaymentButton modal header → viole la règle CLAUDE.md (design tokens uniquement)
  - `slate-*` dans PaymentButton modal → incohérent avec `zinc-*` du reste du dashboard

## 4) Backend — État attendu vs état actuel
### Endpoints utilisés par la page
- **[POST] /api/payment/checkout** → `PaymentController.initiatePayment()` → `PaymentService.initiatePayment()` → auth: JwtAuthGuard + RolesGuard('PRO')
  - Request DTO : `{ planType: 'PREMIUM_MONTHLY'|'PREMIUM_ANNUAL'|'BOOST', cityId?: string, categoryId?: string }` (class-validator)
  - Response DTO : `{ success, order: { id, reference, planType, amount, currency, status }, message, paymentInstructions: { reference, amount, methods, contact, note } }`
  - Errors : 400 (plan invalide, cityId/categoryId manquant pour BOOST, exclusivité Premium/Boost, cooldown Boost), 404 (profil non trouvé)
  - Sécurité : ownership via `req.user.id`

### Attendu (référentiel)
- Validation complète des plans et des contraintes métier
- Idempotence sur les demandes de paiement
- Transaction atomique pour l'activation
- Pas de confiance front pour le montant

### Actuel (constaté)
- **Auth/AuthZ** : JwtAuthGuard + RolesGuard('PRO'). Le prix est calculé côté serveur via `PAYMENT_PLANS[dto.planType].priceMad` — ✅ le front envoie le `amount` mais le back l'ignore et utilise sa constante.
- **Validations serveur** : class-validator pour le DTO (planType enum, cityId/categoryId regex optionnels). Logique métier : exclusivité Premium/Boost (ne peut pas avoir les deux actifs), cooldown Boost (21 jours : 7 actif + 14 repos), cityId/categoryId obligatoires pour BOOST.
- **Logique métier** : Génère un OID unique (`KHD-{timestamp}-{entropy}` avec 16 bytes random). Crée un `PaymentOrder` en statut PENDING. Ne fait PAS de paiement réel — le paiement est manuel (virement, cash, mobile money). Un admin confirmera via `POST /payment/admin/confirm/:oid`.
- **Erreurs** : Messages français explicites. Pas de codes d'erreur structurés.
- **Perf** : Requête simple (findUnique profil + create order). Résolution publicId → internalId pour city/category.
- **Observabilité** : ✅ `Logger.log()` pour chaque demande créée.
- **Tests** : ❌ ZÉRO test pour PaymentService ou PaymentController.
- **Sécurité** :
  - ❌ Pas d'idempotence : un PRO peut créer N demandes PENDING sans limite → risque de spam.
  - ❌ Pas de rate limiting sur `/payment/checkout` (un PRO pourrait créer des centaines de PaymentOrders).
  - ❌ Le statut `PaymentOrder.status` est un `String` en DB (pas d'enum Prisma) → possibilité de valeurs incohérentes.
  - ❌ `PaymentOrder` n'a pas de relation FK vers `User` ou `ProProfile` → pas de `onDelete: Cascade`.
  - ✅ Le montant est déterminé côté serveur (pas de confiance front).

## 5) Base de données — État attendu vs état actuel
- **Tables** : `PaymentOrder` (l.510-536)
- **Contraintes** : `oid` unique. `@@index([proUserId, status])`, `@@index([oid])`.
- **Risques** :
  - `planType` est `String` (pas d'enum) → pas de validation DB.
  - `status` est `String` (pas d'enum) → pas de validation DB.
  - `proUserId` n'a pas de `@relation` vers User/ProProfile → pas de FK constraint, pas de cascade delete.
  - `cityId`/`categoryId` dans PaymentOrder n'ont pas de FK → intégrité référentielle non garantie.
  - Pas de `endDate` prévue dans ProSubscription → le champ `endedAt` est optionnel mais `endDate` est écrit par `activatePlan`.

## 6) Intégration Front ↔ Back ↔ DB
- **Mapping** : Front `PaymentButton` → `postJSON('/payment/checkout', { planType, cityId?, categoryId? })` → Back crée `PaymentOrder(PENDING)` → retourne instructions.
- **Incohérences** :
  - Le front envoie `amount` dans les props du bouton mais ce n'est qu'affichage — le backend calcule le prix. OK.
  - ❌ Le front affiche le prix dans le bouton (`350 MAD`) puis l'API retourne le prix dans `paymentInstructions.amount` — si les prix sont désynchronisés (front hardcodé vs back constant), l'utilisateur voit un prix différent dans la modale.
  - ❌ Pas d'indication du statut actuel de l'abonnement (déjà Premium ? Boost actif ? Cooldown ?). L'erreur arrive seulement après le clic.
  - La modale PaymentButton utilise des couleurs hardcodées (`#F08C1B`, `slate-*`) incohérentes avec le design system.

## 7) Problèmes & recommandations
### CRITIQUES
- **C1** : Pas d'idempotence ni de rate limiting sur `POST /payment/checkout` → un PRO peut créer des centaines de PaymentOrders PENDING (spam, DoS admin)
- **C2** : `PaymentOrder.proUserId` n'a pas de FK constraint → données orphelines possibles si le user est supprimé

### IMPORTANTS
- **I1** : Pas d'indication front si déjà Premium/Boost actif/cooldown → l'erreur arrive après le clic
- **I2** : `planType` et `status` sont des Strings en DB au lieu d'enums → pas de validation DB
- **I3** : Couleurs hardcodées dans PaymentButton modal (`#F08C1B`, `slate-*`) → violation CLAUDE.md
- **I4** : Zéro test backend
- **I5** : Modale sans focus trap ni `role="dialog"`

### NICE-TO-HAVE
- Afficher un comparatif gratuit vs Premium
- Prévisualisation de la date d'expiration
- Historique des paiements du PRO

## 8) Plan "Amélioration Backend" (spécifique /plans)
### Quick wins (≤2h)
- [ ] Ajouter `@Throttle(3, 60)` sur `POST /payment/checkout` pour limiter le spam
- [ ] Vérifier s'il existe déjà un PaymentOrder PENDING pour le même plan avant d'en créer un nouveau (idempotence)
- [ ] Ajouter FK relation sur `PaymentOrder.proUserId` → `ProProfile.userId`
- [ ] Remplacer les hex hardcodés dans PaymentButton par des design tokens

### Moyen (½–2 jours)
- [ ] Migrer `planType` et `status` vers des enums Prisma
- [ ] Endpoint `GET /payment/my-status` pour que le front sache si le PRO est déjà Premium/Boost/cooldown
- [ ] Tests unitaires pour initiatePayment (plans valides, exclusivité, cooldown, idempotence)
- [ ] Ajouter `role="dialog"` et focus trap à la modale PaymentButton

### Structurant (>2 jours)
- [ ] Intégration PSP réel (Stripe, CMI) pour paiement en ligne
- [ ] Webhook system pour les confirmations automatiques
- [ ] Cron pour expirer les PaymentOrders PENDING après 7 jours

### Dépendances / risques
- L'ajout de FK sur PaymentOrder nécessite que tous les proUserId existants soient valides
- La migration vers des enums Prisma nécessite une transformation de données

---

# [/pro/subscription] — Résultat paiement abonnement

## 1) Résumé exécutif
- **Rôle(s)**: Public (pas de guard auth) — accessible à tous
- **Objectif métier**: Afficher le résultat d'une demande de paiement (success/pending/failed/error) après redirection depuis le flux de paiement.
- **Statut global**: ❌ Risque
- **Scores (0–5)**: Front: 2 ; Back: 0 ; DB: N/A ; Intégration: 1 ; Sécurité: 1 ; Perf: 4 ; Tests/Obs: 0
- **Fichiers clés**:
  - `apps/web/src/app/pro/subscription/page.tsx`

## 2) Cartographie technique (fichiers)
### Frontend
- `apps/web/src/app/pro/subscription/page.tsx` — Page résultat paiement, client-side

### Backend
- **AUCUN endpoint backend** appelé par cette page. Le statut vient uniquement des query params URL.

### DB
- N/A — aucune interaction DB

## 3) Frontend — État attendu vs état actuel
### Attendu (référentiel)
- Auth guard PRO
- Vérification du statut réel via un appel backend (pas confiance aux query params)
- Affichage conditionnel success/pending/failed/error
- Redirection ou CTA adaptés

### Actuel (constaté)
- **UI/Composants** : 4 états visuels basés sur `?status=` query param : success (vert, CheckCircle), pending (orange, Clock, instructions de paiement), failed (rouge, XCircle), error (jaune, AlertTriangle). Sans status → message "Aucun résultat". Liens vers /dashboard et /plans.
- **Data fetching** : ❌ **AUCUN appel backend**. Le statut affiché est entièrement basé sur le query param `?status=success|pending|failed|error`. Le `oid` est affiché en clair comme "Référence".
- **Validations** : Aucune validation du query param.
- **Erreurs & UX** : Affiche le param `error` du query string comme message d'erreur. Wrappé dans `<Suspense>` pour Next.js.
- **A11y** : Lucide icons avec rôle décoratif (OK). Liens bien stylés.
- **Perf** : Page statique côté client. Très léger.
- **NON TROUVÉ** :
  - ❌ Aucun guard auth → un utilisateur non connecté peut accéder à cette page
  - ❌ Aucune vérification backend du statut → un utilisateur peut manuellement naviguer vers `?status=success` et voir "Paiement validé" sans avoir payé
  - ❌ Le `oid` (référence de commande) est exposé dans l'URL — pas critique mais information leak potentiel
  - ❌ `console.log` en production (`console.log('📥 Statut paiement:', ...)`)
  - Cette page fait doublon avec `/dashboard/subscription/success` et `/dashboard/subscription/cancel`

## 4) Backend — État attendu vs état actuel
### Endpoints utilisés par la page
- **AUCUN**

### Attendu (référentiel)
- Un endpoint `GET /payment/status/:oid` devrait être appelé pour vérifier le statut réel
- Le frontend ne devrait JAMAIS faire confiance à un query param pour afficher "Paiement validé"

### Actuel (constaté)
- L'endpoint `GET /api/payment/status/:oid` existe dans le backend mais **n'est PAS appelé** par cette page.
- Le statut affiché est entièrement côté client, basé sur des query params manipulables.

## 5) Base de données — État attendu vs état actuel
- N/A — aucune interaction

## 6) Intégration Front ↔ Back ↔ DB
- **Mapping** : Query params `?status=X&oid=Y&error=Z` → UI. Aucun appel backend.
- **Incohérences** :
  - ❌ **FAILLE CRITIQUE** : Le statut "success" affiché dépend uniquement du query param. N'importe qui peut forger une URL `?status=success&oid=fake` et voir "Paiement validé avec succès !". Cela n'active pas réellement le plan (qui dépend de la confirmation admin), mais c'est trompeur et potentiellement exploitable en social engineering.
  - Le backend a un endpoint de vérification (`GET /payment/status/:oid`) qui n'est pas utilisé.
  - Doublon fonctionnel avec `/dashboard/subscription/success` et `/dashboard/subscription/cancel`.

## 7) Problèmes & recommandations
### CRITIQUES
- **C1** : **FAILLE** — Le statut de paiement affiché est basé sur un query param manipulable, sans vérification backend. Un PRO pourrait croire que son paiement est validé alors qu'il ne l'est pas (ou un attaquant pourrait forger un lien).
- **C2** : Aucun auth guard — page accessible sans connexion
- **C3** : Doublon avec `/dashboard/subscription/success` et `/dashboard/subscription/cancel` — confusion potentielle, maintenance doublée

### IMPORTANTS
- **I1** : `console.log` en production avec les params de paiement
- **I2** : Le `oid` est exposé en clair dans l'URL
- **I3** : Aucun test

### NICE-TO-HAVE
- Supprimer cette page et unifier vers `/dashboard/subscription/success` et `/dashboard/subscription/cancel`

## 8) Plan "Amélioration Backend" (spécifique /pro/subscription)
### Quick wins (≤2h)
- [ ] **URGENT** : Ajouter un appel à `GET /payment/status/:oid` pour vérifier le statut réel côté backend avant d'afficher "success"
- [ ] Ajouter un auth guard PRO (redirection si non connecté)
- [ ] Supprimer le `console.log` en production

### Moyen (½–2 jours)
- [ ] Décider : garder cette page OU rediriger vers `/dashboard/subscription/success|cancel`
- [ ] Si gardée : appeler le backend systématiquement et ignorer le query param `status`

### Structurant (>2 jours)
- [ ] Supprimer la page et unifier le flux post-paiement

### Dépendances / risques
- Le choix de garder ou supprimer cette page impacte le flux de redirection du PaymentButton

---

# [/dashboard/subscription/success] — Paiement réussi

## 1) Résumé exécutif
- **Rôle(s)**: PRO uniquement (via DashboardLayout parent) — mais cette page n'utilise PAS DashboardLayout
- **Objectif métier**: Afficher une page de confirmation de paiement réussi avec confettis et liens vers le dashboard.
- **Statut global**: ❌ Risque
- **Scores (0–5)**: Front: 2 ; Back: 0 ; DB: N/A ; Intégration: 0 ; Sécurité: 1 ; Perf: 3 ; Tests/Obs: 0
- **Fichiers clés**:
  - `apps/web/src/app/dashboard/subscription/success/page.tsx`

## 2) Cartographie technique (fichiers)
### Frontend
- `apps/web/src/app/dashboard/subscription/success/page.tsx` — Page success statique, client-side

### Backend
- **AUCUN endpoint backend** appelé

### DB
- N/A

## 3) Frontend — État attendu vs état actuel
### Attendu (référentiel)
- Auth guard PRO
- Vérification backend du statut de paiement
- Affichage conditionnel basé sur la réalité DB
- Animation de célébration

### Actuel (constaté)
- **UI/Composants** : Page plein écran verte. Icône CheckCircle animée (bounce). Titre "Paiement validé !". Liste de features activées. Boutons "Accéder au Dashboard" et "Voir les offres". Note "Un email de confirmation vous a été envoyé".
- **Data fetching** : ❌ **AUCUN appel backend**. La page affiche inconditionnellement "Paiement validé" et "Votre abonnement a été activé".
- **Validations** : Aucune.
- **Erreurs & UX** : Confettis animés (30 emojis DOM-manipulés avec `document.createElement` + `animate()`). Cleanup après 5s.
- **A11y** : ❌ Les confettis sont créés via DOM manipulation directe, pas de `aria-hidden`. L'animation `animate-bounce` ne respecte pas `prefers-reduced-motion`. Le texte "Un email de confirmation vous a été envoyé" est trompeur si aucun email n'est réellement envoyé.
- **Perf** : 30 éléments DOM créés puis supprimés → OK pour un one-shot. `recharts` n'est pas importé ici.
- **NON TROUVÉ** :
  - ❌ **Aucun auth guard** — pas de DashboardLayout, pas de useAuthStore, pas de useEffect redirect
  - ❌ **Aucune vérification backend** — n'importe qui peut naviguer vers cette URL et voir "Paiement validé"
  - ❌ "Un email de confirmation vous a été envoyé" → NON TROUVÉ de système d'envoi d'email dans le codebase (vérifier `apps/api/src/notifications/`)
  - Doublon fonctionnel partiel avec `/pro/subscription?status=success`

## 4) Backend — État attendu vs état actuel
### Endpoints utilisés par la page
- **AUCUN**

### Attendu (référentiel)
- La page devrait vérifier auprès du backend que le paiement est réellement confirmé avant d'afficher "activé"

### Actuel (constaté)
- Aucune interaction backend. Page purement statique.

## 5) Base de données — État attendu vs état actuel
- N/A

## 6) Intégration Front ↔ Back ↔ DB
- **Mapping** : Aucun. Page affiche "success" inconditionnellement.
- **Incohérences** :
  - ❌ **FAILLE** : La page affiche "Votre abonnement a été activé avec succès" sans vérifier. N'importe qui peut accéder à cette URL.
  - ❌ "Un email de confirmation vous a été envoyé" est probablement faux — pas de système d'email identifié.

## 7) Problèmes & recommandations
### CRITIQUES
- **C1** : **FAILLE** — Page accessible sans auth, affiche "Paiement validé" sans aucune vérification backend
- **C2** : Mention "email de confirmation envoyé" probablement mensongère — aucun système d'email identifié
- **C3** : Confettis ne respectent pas `prefers-reduced-motion`

### IMPORTANTS
- **I1** : Aucun auth guard
- **I2** : Doublon avec `/pro/subscription?status=success`
- **I3** : DOM manipulation directe pour les confettis (pas React-idiomatic)

### NICE-TO-HAVE
- Remplacer les confettis DOM par une lib React (react-confetti, canvas-confetti)

## 8) Plan "Amélioration Backend" (spécifique /dashboard/subscription/success)
### Quick wins (≤2h)
- [ ] **URGENT** : Ajouter auth guard PRO (redirect si non connecté)
- [ ] **URGENT** : Appeler `GET /payment/status/:oid` ou `GET /pro/me` pour vérifier le statut Premium avant d'afficher "activé"
- [ ] Supprimer ou conditionner le texte "email de confirmation envoyé"
- [ ] Ajouter `prefers-reduced-motion` pour désactiver les confettis

### Moyen (½–2 jours)
- [ ] Passer le `oid` en query param et vérifier le statut réel
- [ ] Décider : garder cette page OU unifier avec `/pro/subscription`
- [ ] Ajouter un vrai système d'envoi d'email de confirmation

### Structurant (>2 jours)
- [ ] Unifier les pages de résultat de paiement en une seule route

### Dépendances / risques
- L'ajout de la vérification backend nécessite de passer le `oid` dans l'URL ou en state

---

# [/dashboard/subscription/cancel] — Paiement annulé

## 1) Résumé exécutif
- **Rôle(s)**: PRO uniquement (via route /dashboard/*) — mais AUCUN auth guard
- **Objectif métier**: Informer le PRO que le paiement a été annulé, proposer de réessayer.
- **Statut global**: ⚠️ Fragile
- **Scores (0–5)**: Front: 3 ; Back: 0 ; DB: N/A ; Intégration: 0 ; Sécurité: 2 ; Perf: 5 ; Tests/Obs: 0
- **Fichiers clés**:
  - `apps/web/src/app/dashboard/subscription/cancel/page.tsx`

## 2) Cartographie technique (fichiers)
### Frontend
- `apps/web/src/app/dashboard/subscription/cancel/page.tsx` — Page cancel statique, client-side

### Backend
- **AUCUN**

### DB
- N/A

## 3) Frontend — État attendu vs état actuel
### Attendu (référentiel)
- Auth guard PRO
- Message clair "aucun montant débité"
- CTAs : Réessayer → /plans, Retour Dashboard

### Actuel (constaté)
- **UI/Composants** : Page plein écran zinc. Icône XCircle. Titre "Paiement annulé". Message "Aucun montant n'a été débité". Info box avec suggestion de réessayer. Boutons "Réessayer" → /plans et "Retour au Dashboard" → /dashboard. Support email.
- **Data fetching** : Aucun.
- **Validations** : N/A.
- **Erreurs & UX** : Page statique informative. Aucun état dynamic.
- **A11y** : OK — boutons avec texte clair, icônes décoratives.
- **Perf** : Page statique — excellent.
- **NON TROUVÉ** :
  - ❌ Aucun auth guard
  - Cette page est moins critique que /success car elle n'affirme rien de faux, mais elle ne devrait pas être accessible sans auth.
  - Doublon partiel avec `/pro/subscription?status=failed`

## 4) Backend — État attendu vs état actuel
### Endpoints utilisés par la page
- **AUCUN**

### Attendu (référentiel)
- Pas de backend nécessaire pour une page cancel (elle ne donne pas d'info sensible)

### Actuel (constaté)
- Correct pour le cas "cancel" — pas besoin de vérification backend car la page ne prétend rien.

## 5) Base de données — État attendu vs état actuel
- N/A

## 6) Intégration Front ↔ Back ↔ DB
- **Mapping** : Aucun.
- **Incohérences** : Doublon avec `/pro/subscription?status=failed`.

## 7) Problèmes & recommandations
### CRITIQUES
- Aucun problème critique (la page ne prétend rien de faux)

### IMPORTANTS
- **I1** : Aucun auth guard — un utilisateur non connecté peut voir cette page
- **I2** : Doublon avec `/pro/subscription?status=failed`

### NICE-TO-HAVE
- Unifier les pages de résultat de paiement

## 8) Plan "Amélioration Backend" (spécifique /dashboard/subscription/cancel)
### Quick wins (≤2h)
- [ ] Ajouter auth guard PRO (redirect si non connecté)

### Moyen (½–2 jours)
- [ ] Décider : garder cette page OU unifier avec `/pro/subscription`

### Structurant (>2 jours)
- [ ] Unifier toutes les pages post-paiement

### Dépendances / risques
- Impact faible — page statique informative

---

# [/dashboard] — Dashboard Overview Premium

## 1) Résumé exécutif
- **Rôle(s)**: PRO uniquement (auth requis) + Premium requis (redirection si non Premium)
- **Objectif métier**: Afficher les KPIs du PRO Premium : demandes par jour (7j), taux de conversion, prochaine réservation.
- **Statut global**: ⚠️ Fragile
- **Scores (0–5)**: Front: 3 ; Back: 3 ; DB: 4 ; Intégration: 3 ; Sécurité: 3 ; Perf: 3 ; Tests/Obs: 1
- **Fichiers clés**:
  - `apps/web/src/app/dashboard/page.tsx`
  - `apps/web/src/components/dashboard/DashboardLayout.tsx`
  - `apps/api/src/dashboard/dashboard.controller.ts`
  - `apps/api/src/dashboard/dashboard.service.ts`
  - `apps/api/src/pro/pro.controller.ts` (GET /pro/me)

## 2) Cartographie technique (fichiers)
### Frontend
- `apps/web/src/app/dashboard/page.tsx` — Page overview, client-side (recharts)
- `apps/web/src/components/dashboard/DashboardLayout.tsx` — Layout avec auth guard + menu conditionnel

### Backend
- `apps/api/src/dashboard/dashboard.controller.ts:23-27` — `GET /api/dashboard/stats`
- `apps/api/src/dashboard/dashboard.service.ts:35-140` — `getStats()`
- `apps/api/src/pro/pro.controller.ts:51-54` — `GET /api/pro/me` (pour le isPremium check)

### DB
- `Booking` — requêtes d'agrégation (count, findMany, findFirst)

## 3) Frontend — État attendu vs état actuel
### Attendu (référentiel)
- Auth guard PRO + Premium gating (redirect si non Premium)
- Graphiques (demandes/jour, taux conversion)
- KPIs cards (pending, confirmed, declined)
- Prochaine réservation
- Loading/error states

### Actuel (constaté)
- **UI/Composants** : 3 KPI cards (pending, confirmés, refusés). Graphique ligne (recharts LineChart) — demandes 7 derniers jours. Graphique donut (PieChart) — taux conversion. Prochaine réservation avec détails client.
- **Data fetching** :
  1. `getJSON('/pro/me')` → vérifier `isPremium` → si non Premium, `router.replace('/dashboard/bookings')`
  2. Si Premium : `getJSON('/dashboard/stats')` → KPIs
- **Validations** : Gating front : `if (!data.profile.isPremium) router.replace('/dashboard/bookings')`. Le menu sidebar dans DashboardLayout conditionne aussi le lien "Vue d'ensemble" sur `isPremium`.
- **Erreurs & UX** : Error message inline. Loading spinners pour les graphiques. "..." pendant le chargement des KPIs.
- **A11y** : ❌ Les graphiques recharts n'ont pas de `role="img"` ni d'`aria-label` descriptif. Les emojis (⏳, ✅, ❌) dans les KPI cards ne sont pas wrappés en `aria-hidden`. ❌ Hex hardcodés dans les couleurs des graphiques (`#10b981`, `#ef4444`, `#3b82f6`).
- **Perf** : `recharts` est importé dynamiquement côté client → impact bundle important (~200KB). Deux appels API séquentiels (pro/me → puis stats). Pas de cache.
- **NON TROUVÉ** :
  - Le Premium gating est côté front uniquement (le back vérifie juste le rôle PRO, pas isPremium). Un PRO non Premium pourrait appeler `GET /dashboard/stats` directement via curl.
  - Le phone du client de la prochaine réservation est affiché en clair.
  - Les hardcoded hex `#10b981`, `#ef4444`, `#3b82f6` violent la règle CLAUDE.md.

## 4) Backend — État attendu vs état actuel
### Endpoints utilisés par la page
- **[GET] /api/pro/me** → `ProController.getMyDashboard()` → auth: JwtAuthGuard + RolesGuard('PRO')
  - Pas de check Premium côté backend

- **[GET] /api/dashboard/stats** → `DashboardController.getStats()` → `DashboardService.getStats()` → auth: JwtAuthGuard (pas de RolesGuard)
  - Request : aucun body
  - Response : `{ requestsCount: [{date, count}], conversionRate: {confirmed, declined}, pendingCount, nextBooking }`
  - Errors : 403 (role != PRO)
  - Sécurité : ❌ Vérifie le rôle PRO mais PAS le statut Premium → un PRO gratuit peut accéder aux stats

### Attendu (référentiel)
- Premium gating côté backend (pas juste front)
- Agrégations efficaces (count, group by)
- Données sensibles protégées

### Actuel (constaté)
- **Auth/AuthZ** : JwtAuthGuard (pas de RolesGuard au niveau controller, le role check est dans le service). ❌ Pas de check `isPremium` — n'importe quel PRO peut accéder aux stats.
- **Validations serveur** : Juste le rôle PRO.
- **Logique métier** :
  - `requestsCount` : `findMany` des bookings des 7 derniers jours, groupage en mémoire JS (pas d'agrégation SQL). Initialise les 7 jours à 0 puis compte.
  - `conversionRate` : 2 `count` queries parallèles (CONFIRMED, DECLINED) — all-time, pas fenêtré.
  - `pendingCount` : `count` PENDING.
  - `nextBooking` : `findFirst` CONFIRMED + timeSlot >= now, orderBy timeSlot asc.
- **Erreurs** : 403 si pas PRO.
- **Perf** : ❌ Le `requestsCount` fait un `findMany` puis itère en mémoire au lieu d'utiliser `groupBy` Prisma. Pour un PRO avec beaucoup de bookings, cela charge tous les bookings des 7 jours en mémoire. Les 2 `count` + 1 `findFirst` sont efficaces (utilise les index `[proId]`). Total: 4 requêtes DB.
- **Observabilité** : Aucun log.
- **Tests** : ❌ ZÉRO test pour DashboardService.
- **Sécurité** : ❌ Phone client exposé dans `nextBooking` sans masquage. ❌ Pas de Premium gating backend.

## 5) Base de données — État attendu vs état actuel
- **Tables** : `Booking` — requêtes d'agrégation
- **Index** : `@@index([proId])` couvre les requêtes de stats. `@@index([proId, timeSlot])` pour le nextBooking.
- **Requêtes** :
  - `findMany` (bookings 7j) → potentiellement lourd si beaucoup de bookings
  - `count` × 2 (confirmed, declined) → all-time, pourrait être lent sur gros volumes
  - `findFirst` (next booking) → OK
- **Risques** : Les `count` all-time pourraient devenir lents avec le temps. Pas d'index `[proId, status]` dédié (mais `[proId]` est suffisant pour le filtre).

## 6) Intégration Front ↔ Back ↔ DB
- **Mapping** : Front → `GET /pro/me` (isPremium check) → `GET /dashboard/stats` → Back agrège les bookings → Front affiche dans recharts.
- **Incohérences** :
  - ❌ Le Premium gating est frontend-only : `if (!data.profile.isPremium) router.replace('/dashboard/bookings')`. Le backend n'a PAS de vérification Premium sur `GET /dashboard/stats`.
  - ❌ `conversionRate` est all-time (pas 7j ou 30j) → incohérent avec le graphique "7 derniers jours" affiché à côté.
  - Le type `DashboardStats` front ne correspond pas exactement au type `DashboardStatsResponse` back (phone dans nextBooking est string côté front, pas de nullabilité explicite).
- **Risques sécurité** : Phone client affiché en clair dans la prochaine réservation.

## 7) Problèmes & recommandations
### CRITIQUES
- **C1** : Premium gating frontend-only — un PRO gratuit peut appeler `GET /dashboard/stats` et accéder aux statistiques
- **C2** : Phone client exposé en clair dans la prochaine réservation (même problème que /dashboard/bookings)

### IMPORTANTS
- **I1** : `conversionRate` est all-time au lieu d'être fenêtré (30j ou 7j) → peut être trompeur
- **I2** : `requestsCount` fait un `findMany` + groupage JS au lieu d'une agrégation SQL → potentiel perf issue
- **I3** : Hex hardcodés dans les graphiques (`#10b981`, `#ef4444`, `#3b82f6`)
- **I4** : recharts (~200KB) chargé en client-side sans lazy import
- **I5** : Zéro test backend pour DashboardService

### NICE-TO-HAVE
- Lazy import de recharts (next/dynamic)
- Cache des stats (invalidation toutes les 5min)
- Widget "revenus estimés" basé sur les prix des services

## 8) Plan "Amélioration Backend" (spécifique /dashboard)
### Quick wins (≤2h)
- [ ] **URGENT** : Ajouter check `isPremium` dans `DashboardService.getStats()` (ou via guard)
- [ ] Masquer le phone client dans nextBooking (ou le conditionner au statut)
- [ ] Fenêtrer `conversionRate` sur 30 jours au lieu de all-time

### Moyen (½–2 jours)
- [ ] Remplacer le `findMany` + groupage JS par `prisma.booking.groupBy()` pour les stats 7j
- [ ] Tests unitaires pour DashboardService
- [ ] Lazy import recharts via `next/dynamic` avec `ssr: false`
- [ ] Remplacer les hex hardcodés par des variables CSS

### Structurant (>2 jours)
- [ ] Cache layer pour les stats (Redis ou in-memory avec TTL)
- [ ] Agrégations plus avancées (revenus, taux de complétion, temps moyen de réponse)
- [ ] API dédiée pour les graphiques avec paramètres de fenêtre (7j, 30j, 90j)

### Dépendances / risques
- Le check isPremium backend dépend de la fiabilité de `ProProfile.isPremium` (qui dépend du cycle d'activation/expiration)
- Le groupBy Prisma nécessite une version récente de Prisma

---

# Synthèse Phase 4 — Abonnements & Paiements + Premium Overview

## Problèmes transverses

### Contrats API subscription/billing
- Le système de paiement est 100% MANUAL (MVP) : le PRO crée une demande PENDING, un admin confirme manuellement. Pas de PSP intégré (Stripe, CMI).
- Le `PaymentOrder.status` et `planType` sont des `String` en DB au lieu d'enums Prisma → aucune validation DB.
- `PaymentOrder.proUserId` n'a pas de FK constraint → données orphelines possibles.
- Pas d'idempotence sur la création de demandes → un PRO peut spammer des PaymentOrders PENDING.

### Cohérence des statuts premium
- La source de vérité pour le statut Premium est `ProProfile.isPremium` + `premiumActiveUntil`. La mise à jour se fait dans `activatePlan()` via transaction atomique — ✅ correct.
- ❌ Il n'y a PAS de cron/job pour expirer les abonnements quand `premiumActiveUntil` est dépassé → un PRO reste Premium indéfiniment après expiration.
- ❌ Le front affiche "success" basé sur des query params ou des pages statiques, SANS vérifier le backend. Trois pages distinctes servent de "retour paiement" (`/pro/subscription`, `/dashboard/subscription/success`, `/dashboard/subscription/cancel`) → confusion et duplication.

### Sécurité paiements (webhooks, idempotence, replay)
- Pas de webhooks (paiement 100% manuel).
- ❌ Aucune idempotence sur `POST /payment/checkout`.
- ❌ Aucun rate limiting sur les endpoints paiement.
- ❌ Les pages success/cancel sont accessibles SANS auth et SANS vérification backend — un utilisateur peut voir "Paiement validé" sans avoir payé.
- ✅ Le montant est déterminé côté serveur (pas de confiance front sur le prix).
- ✅ L'activation du plan utilise une transaction atomique.

### Performance & cohérence DB
- Les index `@@index([proUserId, status])` sur PaymentOrder et ProSubscription sont adéquats.
- Le dashboard stats fait un `findMany` + groupage JS au lieu d'agrégation SQL.
- `conversionRate` est all-time → peut devenir lent avec beaucoup de bookings.

### Tests/observabilité
- ❌ **ZÉRO test** sur PaymentService, PaymentController, DashboardService.
- PaymentService utilise `Logger.log()` — meilleure observabilité que les autres services.
- DashboardService n'a aucun log.

## Risques majeurs (Top 5)

1) **Pages success sans vérification backend** : `/dashboard/subscription/success` affiche "Paiement validé" sans auth ni vérification. `/pro/subscription?status=success` fait la même chose basé sur un query param. N'importe qui peut naviguer vers ces URLs. Impact : tromperie, social engineering potentiel.

2) **Pas d'expiration automatique Premium** : Aucun cron/job pour passer `isPremium = false` quand `premiumActiveUntil` est dépassé. Impact : un PRO reste Premium gratuitement après expiration de son abonnement.

3) **Premium gating frontend-only** : `GET /dashboard/stats` ne vérifie pas `isPremium` côté backend. Un PRO gratuit peut appeler l'endpoint directement. Impact : contournement du paywall (stats seulement, pas les features mécaniques comme les 3 services).

4) **Pas d'idempotence/rate limit sur checkout** : Un PRO peut créer des centaines de PaymentOrders PENDING → spam pour l'admin, pollution DB. Impact : DoS opérationnel.

5) **Duplication pages post-paiement** : 3 routes différentes (`/pro/subscription`, `/dashboard/subscription/success`, `/dashboard/subscription/cancel`) servent le même objectif avec des implémentations différentes. Impact : confusion développeur, maintenance doublée, incohérences futures.

## Plan backend priorisé (Phase suivante — améliorations)

### Priorité 0 (immédiat)
- [ ] **FIX** : Ajouter auth guard PRO sur `/dashboard/subscription/success` et `/dashboard/subscription/cancel`
- [ ] **FIX** : Sur `/pro/subscription` et `/dashboard/subscription/success`, appeler `GET /payment/status/:oid` ou `GET /pro/me` pour vérifier le statut réel avant d'afficher "success"
- [ ] **FIX** : Ajouter check `isPremium` dans `DashboardService.getStats()` — gate backend
- [ ] **FIX** : Créer un cron job pour expirer les abonnements Premium (`premiumActiveUntil < now` → `isPremium = false`, `SubscriptionStatus = EXPIRED`)
- [ ] **FIX** : Ajouter `@Throttle(3, 60)` sur `POST /payment/checkout`

### Priorité 1
- [ ] Ajouter idempotence sur checkout (vérifier s'il existe déjà un PENDING pour le même plan)
- [ ] Unifier les pages post-paiement (1 seule route avec vérification backend)
- [ ] Ajouter FK relation sur `PaymentOrder.proUserId`
- [ ] Migrer `planType` et `status` en enums Prisma dans PaymentOrder
- [ ] Masquer le phone client dans le dashboard stats
- [ ] Fenêtrer `conversionRate` sur 30 jours
- [ ] Supprimer le `console.log` en prod dans `/pro/subscription`
- [ ] Supprimer le texte "email de confirmation envoyé" (ou implémenter l'email)

### Priorité 2
- [ ] Tests unitaires pour PaymentService (checkout, confirm, reject, activate, idempotence)
- [ ] Tests unitaires pour DashboardService (stats, Premium gating)
- [ ] Remplacer `findMany` + groupage JS par `groupBy` Prisma pour les stats
- [ ] Lazy import de recharts (next/dynamic)
- [ ] Endpoint `GET /payment/my-status` pour informer le front du statut courant
- [ ] Cron pour expirer les Boosts (`boostActiveUntil < now` → `BoostStatus = EXPIRED`)
- [ ] Cron pour expirer les PaymentOrders PENDING après 7 jours
- [ ] Remplacer les hex hardcodés dans les graphiques et PaymentButton par des design tokens

---

# PHASE 5 — Pages publiques & secondaires (Help / Blog / Legal)

---

# [/help] — Centre d'aide

## 1) Résumé exécutif
- Rôle(s): Public (aucun auth requis)
- Objectif métier: Point de contact support pour tous les utilisateurs (clients et pros)
- Statut global: ⚠️ Fragile — page minimaliste fonctionnelle mais FAQ "bientôt disponible" = contenu placeholder indexable
- Scores (0–5): Front: 3 ; Back: N/A ; DB: N/A ; Intégration: N/A ; Sécurité: 4 ; Perf: 4 ; Tests/Obs: 0
- Fichiers clés: `apps/web/src/app/help/page.tsx` (62 lignes)

## 2) Cartographie technique (fichiers)
### Frontend
- `apps/web/src/app/help/page.tsx` — Page statique, Server Component (pas de `"use client"`)
- Pas de layout dédié (`apps/web/src/app/help/layout.tsx` → NON TROUVÉ)
### Backend
- Aucun endpoint backend utilisé. Page 100% statique.
### DB
- Aucune table/collection impliquée.

## 3) Frontend — État attendu vs état actuel
### Attendu (référentiel)
- SEO : title + meta description + canonical + robots (noindex si placeholder)
- OpenGraph / Twitter cards pour le partage social
- Contenu utile : FAQ fonctionnelle, formulaire de contact, ou au minimum mailto fiable
- A11y : headings hiérarchiques, contraste, navigation clavier
- Navbar + Footer cohérents (layout partagé)
### Actuel (constaté)
- UI/Contenu :
  - 2 cartes : "Par e-mail" (mailto:support@khadamat.ma — fonctionnel) + "FAQ" (placeholder "Bientôt disponible")
  - Le bloc FAQ n'est pas cliquable, pas de lien → OK pour le moment, pas d'illusion d'interactivité
  - Pas de formulaire de contact
  - Lien "Retour à l'accueil" vers `/` → fonctionnel
- SEO :
  - `title`: "Centre d'aide — Khadamat" ✅
  - `description`: "Besoin d'aide ? Trouvez les réponses à vos questions sur Khadamat." ✅
  - `canonical`: NON TROUVÉ — aucun canonical défini
  - `robots/noindex`: NON TROUVÉ — page placeholder indexable par Google → ⚠️ Le contenu "bientôt disponible" sera indexé
  - OpenGraph/Twitter cards: NON TROUVÉ — aucune meta OG sur aucune page du site
- Navigation (liens) :
  - Lien depuis Footer (`/help`) ✅ vérifié dans `Footer.tsx:174`
  - Lien "Retour à l'accueil" (`/`) ✅
  - Pas de lien depuis Navbar (seulement `/blog` dans Navbar) → cohérent, /help est secondaire
- A11y :
  - `<h1>` "Centre d'aide" ✅
  - `<h2>` "Par e-mail" et "FAQ" ✅ — hiérarchie correcte
  - `aria-hidden="true"` sur les icônes décoratives (Mail, MessageCircle) ✅
  - Lien `<a href="mailto:...">` — accessible au clavier ✅
  - Le bloc FAQ est un `<div>` non-interactif → OK, pas de confusion
  - Contraste : utilise design tokens (`text-text-secondary`, `text-text-primary`) → conforme si tokens respectent WCAG AA
- Perf :
  - Server Component (pas de JS client) ✅
  - Pas d'images, pas de fetch → léger
  - Pas de lazy loading nécessaire
- NON TROUVÉ :
  - `robots.txt` → ni `apps/web/public/robots.txt` ni `apps/web/src/app/robots.ts` trouvé
  - `sitemap.xml` → ni `apps/web/src/app/sitemap.ts` trouvé
  - Aucun OpenGraph sur l'ensemble du site

## 4) Backend — État attendu vs état actuel
### Endpoints utilisés par la page
- Aucun. Page 100% statique, Server Component Next.js.
### Attendu (référentiel)
- Si formulaire de contact : endpoint POST avec validation, anti-spam (captcha/honeypot), rate limit, stockage/notification
- Si FAQ dynamique : endpoint GET avec cache
### Actuel (constaté)
- Endpoints : Aucun ✅ (cohérent avec le contenu statique)
- Erreurs : N/A
- Perf/cache : N/A (rendu statique Next.js)
- Observabilité : N/A
- Tests : 0 — aucun test trouvé pour cette page
- Sécurité : Aucun risque (pas d'input utilisateur, pas de fetch)

## 5) Base de données — État attendu vs état actuel
- Tables/collections : Aucune
- Contraintes/index : N/A
- Migrations : N/A
- Requêtes observées : Aucune
- Risques cohérence/perf : Aucun

## 6) Intégration Front ↔ Back ↔ DB
- Mapping champs : N/A (pas de fetch)
- Incohérences : Aucune
- Gestion erreurs bout-en-bout : N/A
- Risques de sécurité : Aucun

## 7) Problèmes & recommandations
### CRITIQUES
- Aucun
### IMPORTANTS
- **SEO placeholder indexable** : La page contient "Bientôt disponible" pour la FAQ. Sans `noindex`, Google indexera ce contenu creux. Ajouter `robots: { index: false }` dans les metadata tant que la FAQ n'est pas remplie, OU retirer le placeholder.
- **Pas de canonical** : Risque de contenu dupliqué si la page est accessible via plusieurs URLs.
### NICE-TO-HAVE
- Ajouter OpenGraph metadata pour un meilleur partage social
- Implémenter la FAQ (accordéon statique ou fetch depuis un CMS/DB)
- Ajouter un formulaire de contact avec rate limit backend + anti-spam
- Créer `robots.txt` et `sitemap.xml` pour l'ensemble du site

## 8) Plan "Amélioration Backend" (spécifique /help)
### Quick wins (≤2h)
- [ ] Ajouter `robots: { index: false }` dans metadata Next.js tant que FAQ placeholder
- [ ] Ajouter canonical URL dans metadata
### Moyen (½–2 jours)
- [ ] Créer un endpoint `GET /public/faq` retournant les questions/réponses (ou servir depuis un fichier JSON statique)
- [ ] Implémenter un formulaire de contact `POST /public/contact` avec validation (class-validator), rate limit (5/h par IP), et notification email
### Structurant (>2 jours)
- [ ] Mettre en place un mini-CMS (ou Notion/Strapi) pour gérer FAQ + articles aide dynamiquement
- [ ] Créer `robots.txt` + `sitemap.xml` dynamiques pour tout le site
### Dépendances / risques
- Le formulaire de contact nécessite un service d'envoi d'emails (non trouvé dans le projet actuel)

---

# [/blog] — Blog

## 1) Résumé exécutif
- Rôle(s): Public (aucun auth requis)
- Objectif métier: Content marketing — conseils pour clients et pros, SEO long-tail
- Statut global: ⚠️ Fragile — articles hardcodés dans le code, pas de lien "lire l'article", contenu placeholder indexable
- Scores (0–5): Front: 3 ; Back: N/A ; DB: N/A ; Intégration: N/A ; Sécurité: 4 ; Perf: 4 ; Tests/Obs: 0
- Fichiers clés: `apps/web/src/app/blog/page.tsx` (102 lignes)

## 2) Cartographie technique (fichiers)
### Frontend
- `apps/web/src/app/blog/page.tsx` — Page statique, Server Component. Articles hardcodés dans un tableau `const articles: Article[]`
- Pas de layout dédié
- Pas de route dynamique `/blog/[slug]` → NON TROUVÉ
### Backend
- Aucun endpoint backend utilisé. Articles 100% hardcodés.
### DB
- Aucune table/collection `Post`, `Article`, ou `BlogEntry` dans le schéma Prisma.

## 3) Frontend — État attendu vs état actuel
### Attendu (référentiel)
- SEO : title + meta description + canonical + robots (noindex si placeholder)
- OpenGraph / Twitter cards
- Liste d'articles avec pagination, tri, slugs
- Lien cliquable vers chaque article (`/blog/[slug]`)
- Gestion 404 article inexistant
- A11y : headings, semantic HTML (`<article>`, `<time>`)
### Actuel (constaté)
- UI/Contenu :
  - Header avec gradient, badge "Blog", titre H1 "Blog", sous-titre
  - 3 articles hardcodés dans un tableau TypeScript (l.16-35) : titres, excerpts, dates
  - Chaque article affiché dans une card `<article>` avec `<time>`, `<h2>`, et un `<span>` "Bientôt disponible" (aria-disabled="true")
  - **Aucun lien "Lire l'article"** → les articles ne sont pas cliquables → cohérent avec "Bientôt disponible"
  - Lien "Retour à l'accueil" en bas de page
- SEO :
  - `title`: "Blog — Khadamat" ✅
  - `description`: "Conseils et astuces pour mieux choisir vos professionnels et mieux travailler au Maroc." ✅
  - `canonical`: NON TROUVÉ
  - `robots/noindex`: NON TROUVÉ → ⚠️ Articles "bientôt disponible" indexés par Google
  - OpenGraph: NON TROUVÉ
  - `<time>` sans attribut `datetime` (l.68-69) → le format "Février 2026" n'est pas machine-readable → ⚠️ SEO/accessibilité
- Navigation (liens) :
  - Lien depuis Navbar (desktop l.158 + mobile l.326) ✅
  - Lien depuis Footer (l.131) ✅
  - Lien "Retour à l'accueil" (`/`) ✅
  - Pas de route `/blog/[slug]` → cohérent (articles pas encore publiés)
- A11y :
  - `<h1>` "Blog" ✅
  - `<h2>` par article ✅ — hiérarchie correcte
  - `<article>` sémantique ✅
  - `aria-hidden="true"` sur icônes décoratives ✅
  - `aria-disabled="true"` sur le span "Bientôt disponible" ✅
  - `focus-visible` sur le lien retour ✅
  - Les cards d'articles ne sont pas interactives (pas de lien) → OK, pas d'illusion
- Perf :
  - Server Component (pas de JS client) ✅
  - Pas d'images ✅
  - Articles hardcodés → pas de fetch, rendu instantané

## 4) Backend — État attendu vs état actuel
### Endpoints utilisés par la page
- Aucun.
### Attendu (référentiel)
- Si blog dynamique : `GET /public/posts` (liste paginée), `GET /public/posts/:slug` (article individuel)
- Cache HTTP (CDN/ISR) pour les pages publiques
- Anti-draft : ne pas exposer les articles non publiés
### Actuel (constaté)
- Endpoints : Aucun ✅ (articles hardcodés dans le frontend)
- Erreurs : N/A
- Perf/cache : Rendu statique Next.js → optimal pour le MVP
- Observabilité : N/A
- Tests : 0
- Sécurité : Aucun risque (pas d'input, pas de fetch)

## 5) Base de données — État attendu vs état actuel
- Tables/collections : Aucune table blog/post dans `schema.prisma`
- Contraintes/index : N/A
- Migrations : N/A
- Requêtes observées : Aucune
- Risques : Quand les articles seront dynamiques, il faudra créer un modèle `Post` avec slug unique, publishedAt, status (DRAFT/PUBLISHED), auteur, etc.

## 6) Intégration Front ↔ Back ↔ DB
- Mapping champs : N/A
- Incohérences : Aucune (tout est statique)
- Gestion erreurs : N/A
- Risques : Quand le blog deviendra dynamique, s'assurer que seuls les articles `PUBLISHED` sont exposés via l'API publique

## 7) Problèmes & recommandations
### CRITIQUES
- Aucun
### IMPORTANTS
- **SEO placeholder indexable** : 3 articles avec "Bientôt disponible" seront indexés par Google. Risque de mauvaise impression. Options : `noindex` ou retirer la page de la navbar tant que le contenu n'est pas réel.
- **`<time>` sans `datetime`** : `<time>Février 2026</time>` devrait être `<time datetime="2026-02">Février 2026</time>` pour l'accessibilité et le SEO.
- **Pas de canonical URL** : Même risque que /help.
### NICE-TO-HAVE
- Ajouter la route `/blog/[slug]` quand les articles seront prêts
- Implémenter OpenGraph metadata (image, type article)
- Ajouter un fil d'Ariane (breadcrumb) pour le SEO
- Pagination quand le nombre d'articles grandira

## 8) Plan "Amélioration Backend" (spécifique /blog)
### Quick wins (≤2h)
- [ ] Ajouter `datetime` attribut aux balises `<time>`
- [ ] Ajouter `robots: { index: false }` ou retirer de la navbar tant que articles placeholder
- [ ] Ajouter canonical URL dans metadata
### Moyen (½–2 jours)
- [ ] Créer modèle Prisma `Post` (id, slug unique, title, content, excerpt, publishedAt, status DRAFT/PUBLISHED, authorId)
- [ ] Créer endpoint `GET /public/posts` (liste paginée, filtrée status=PUBLISHED, ordonnée par publishedAt DESC)
- [ ] Créer endpoint `GET /public/posts/:slug` (article individuel, 404 si DRAFT/inexistant)
### Structurant (>2 jours)
- [ ] Créer `/blog/[slug]/page.tsx` avec ISR (Incremental Static Regeneration) ou SSG
- [ ] Intégrer un CMS headless (Strapi, Sanity, ou MDX local) pour la gestion éditoriale
- [ ] Ajouter OpenGraph images dynamiques (og:image par article)
### Dépendances / risques
- La migration vers un blog dynamique est indépendante du reste du projet
- Si CMS externe : nouvelle dépendance d'infrastructure

---

# [/legal/cgu] — Conditions Générales d'Utilisation

## 1) Résumé exécutif
- Rôle(s): Public (aucun auth requis)
- Objectif métier: Obligation légale — cadre contractuel entre Khadamat et ses utilisateurs
- Statut global: ❌ Risque — contenu vide ("en cours de rédaction") indexable, absence de CGU réelles alors que la plateforme est active (inscription, paiements, KYC)
- Scores (0–5): Front: 2 ; Back: N/A ; DB: N/A ; Intégration: N/A ; Sécurité: 2 ; Perf: 4 ; Tests/Obs: 0
- Fichiers clés: `apps/web/src/app/legal/cgu/page.tsx` (47 lignes)

## 2) Cartographie technique (fichiers)
### Frontend
- `apps/web/src/app/legal/cgu/page.tsx` — Page statique, Server Component. Contenu placeholder.
- Pas de layout partagé `/legal/layout.tsx`
### Backend
- Aucun endpoint.
### DB
- Aucune table.

## 3) Frontend — État attendu vs état actuel
### Attendu (référentiel)
- SEO : title + meta + canonical. Si placeholder : `noindex`
- Contenu légal structuré (sections numérotées : objet, inscription, obligations, responsabilités, résiliation, droit applicable, etc.)
- Versioning visible (date de dernière mise à jour)
- Langue cohérente (français)
- A11y : headings, contraste, lisibilité
### Actuel (constaté)
- UI/Contenu :
  - `<h1>` "Conditions Générales d'Utilisation" ✅
  - 1 paragraphe d'introduction ("Les présentes CGU régissent...")
  - **Placeholder** : "Cette page est en cours de rédaction. Les CGU complètes seront publiées prochainement." dans un encadré stylé
  - Lien mailto:support@khadamat.ma ✅
  - Lien "Retour à l'accueil" ✅
  - **Pas de contenu légal réel** ❌
  - **Pas de date de version** ❌
- SEO :
  - `title`: "Conditions Générales d'Utilisation — Khadamat" ✅
  - `description`: "Conditions générales d'utilisation de la plateforme Khadamat." ✅
  - `canonical`: NON TROUVÉ ❌
  - `robots/noindex`: NON TROUVÉ ❌ — page vide indexable
  - OpenGraph: NON TROUVÉ
- Navigation :
  - Footer lien `/legal/cgu` (l.182) ✅
  - Lien retour accueil ✅
- A11y :
  - Heading `<h1>` ✅
  - Prose class pour lisibilité ✅
  - Contraste via design tokens ✅
  - Lien mailto accessible ✅
- Perf :
  - Server Component, ultra-léger ✅

## 4) Backend — État attendu vs état actuel
### Endpoints utilisés par la page
- Aucun.
### Attendu (référentiel)
- Option A (statique) : CGU en tant que fichier statique ou composant React — OK si versionné dans le code
- Option B (dynamique) : Endpoint `GET /public/legal/cgu` avec versioning (date, version number)
### Actuel (constaté)
- Aucun endpoint, contenu statique ✅ pour le pattern, mais **le contenu est vide** ❌
- Tests : 0
- Sécurité : Aucun risque technique

## 5) Base de données — État attendu vs état actuel
- Tables : Aucune
- N/A pour tout le reste

## 6) Intégration Front ↔ Back ↔ DB
- N/A (page 100% statique)

## 7) Problèmes & recommandations
### CRITIQUES
- **CGU absentes alors que la plateforme est active** : Des utilisateurs s'inscrivent, fournissent des données personnelles (CIN, email, phone), effectuent des paiements, et passent des commandes de services — le tout **sans cadre contractuel**. C'est un risque juridique majeur, notamment au regard de la Loi 09-08 (protection des données) et du Code des Obligations et Contrats marocain.
### IMPORTANTS
- **Page placeholder indexable** : `noindex` obligatoire tant que le contenu n'est pas réel.
- **Pas de versioning** : Quand les CGU seront publiées, afficher la date de dernière mise à jour et conserver les versions précédentes.
### NICE-TO-HAVE
- Cross-link entre les 3 pages légales (CGU ↔ Privacy ↔ Mentions)
- Bouton "Accepter les CGU" au moment de l'inscription (case à cocher) — actuellement NON TROUVÉ dans le formulaire d'inscription (`register.dto.ts` n'a pas de champ `acceptsCgu`)

## 8) Plan "Amélioration Backend" (spécifique /legal/cgu)
### Quick wins (≤2h)
- [ ] Ajouter `robots: { index: false }` immédiatement
- [ ] Ajouter canonical URL
### Moyen (½–2 jours)
- [ ] Rédiger les CGU réelles (avec juriste) et les intégrer en tant que contenu statique
- [ ] Ajouter un champ `acceptsCgu: boolean` + `cguVersion: string` dans le RegisterDto et le modèle User
- [ ] Enregistrer la version CGU acceptée par chaque utilisateur à l'inscription
### Structurant (>2 jours)
- [ ] Système de versioning CGU : stocker les versions en DB ou fichiers datés, notifier les utilisateurs lors de mises à jour, redemander acceptation
- [ ] Layout partagé `/legal/layout.tsx` avec navigation entre les 3 pages légales
### Dépendances / risques
- **Bloqueur juridique** : sans CGU réelles, la plateforme opère sans base contractuelle. Priorité absolue.

---

# [/legal/privacy] — Politique de Confidentialité

## 1) Résumé exécutif
- Rôle(s): Public (aucun auth requis)
- Objectif métier: Obligation légale — information sur le traitement des données personnelles (Loi 09-08 marocaine)
- Statut global: ❌ Risque — contenu vide alors que la plateforme collecte des données sensibles (CIN, email, phone, localisation)
- Scores (0–5): Front: 2 ; Back: N/A ; DB: N/A ; Intégration: N/A ; Sécurité: 1 ; Perf: 4 ; Tests/Obs: 0
- Fichiers clés: `apps/web/src/app/legal/privacy/page.tsx` (47 lignes)

## 2) Cartographie technique (fichiers)
### Frontend
- `apps/web/src/app/legal/privacy/page.tsx` — Page statique, Server Component. Contenu placeholder.
### Backend
- Aucun endpoint.
### DB
- Aucune table dédiée.

## 3) Frontend — État attendu vs état actuel
### Attendu (référentiel)
- SEO : title + meta + canonical + noindex si placeholder
- Contenu structuré selon Loi 09-08 : données collectées, finalités, durée de conservation, droits des personnes, responsable du traitement, contact DPO
- Versioning (date de mise à jour)
### Actuel (constaté)
- UI/Contenu :
  - `<h1>` "Politique de Confidentialité" ✅
  - Mention de la Loi 09-08 ✅ (bonne référence juridique)
  - **Placeholder** : "Cette page est en cours de rédaction." ❌
  - Lien mailto ✅
  - **Aucune information réelle** sur : quelles données sont collectées, pourquoi, combien de temps, qui y a accès ❌
- SEO :
  - `title`: "Politique de Confidentialité — Khadamat" ✅
  - `description`: "Politique de confidentialité et protection des données personnelles de Khadamat." ✅
  - `canonical`: NON TROUVÉ ❌
  - `robots/noindex`: NON TROUVÉ ❌
  - OpenGraph: NON TROUVÉ
- Navigation :
  - Footer lien `/legal/privacy` (l.190) ✅
- A11y :
  - Heading hiérarchie correcte ✅
  - Contraste OK (design tokens) ✅
- Perf : Ultra-léger, Server Component ✅

## 4) Backend — État attendu vs état actuel
### Endpoints utilisés par la page
- Aucun.
### Attendu (référentiel)
- Même pattern que CGU : contenu statique ou dynamique avec versioning
- Point technique important : la politique de confidentialité devrait lister précisément les données collectées. Or le backend collecte : email, phone, CIN (cinNumber), firstName, lastName, cityId, addressLine, photos KYC, historique de bookings, données de paiement.
### Actuel (constaté)
- Aucun endpoint ✅
- Tests : 0
- Sécurité : **Risque légal** — la collecte de données personnelles (notamment le CIN = carte d'identité nationale) sans politique de confidentialité publiée est une infraction à la Loi 09-08.

## 5) Base de données — État attendu vs état actuel
- Tables impliquées indirectement (données personnelles collectées sans politique publiée) :
  - `User` : email, phone, firstName, lastName, cinNumber, cityId, addressLine
  - `KycDocument` : fileUrl (photos CIN/selfie)
  - `Booking` : historique client-pro
  - `PaymentOrder` : données de paiement
- Aucune table de consentement ou d'audit de consentement

## 6) Intégration Front ↔ Back ↔ DB
- N/A techniquement, mais **incohérence métier critique** : le backend collecte et stocke des données personnelles sensibles (CIN, photos) sans que la politique de confidentialité ne soit publiée.

## 7) Problèmes & recommandations
### CRITIQUES
- **Politique de confidentialité absente alors que des données sensibles sont collectées** : CIN (pièce d'identité), photos, numéros de téléphone, historique de services. Infraction probable à la Loi 09-08 marocaine relative à la protection des données personnelles. La CNDP (Commission Nationale de contrôle de la protection des Données à caractère Personnel) peut sanctionner.
- **Pas de déclaration CNDP** : NON TROUVÉ — vérifier si le traitement a été déclaré auprès de la CNDP (obligation légale au Maroc).
### IMPORTANTS
- **noindex manquant** : page vide indexable par Google
- **Pas de table de consentement** : aucun enregistrement du consentement utilisateur sur le traitement de ses données
### NICE-TO-HAVE
- Lien vers un formulaire d'exercice des droits (accès, rectification, suppression)
- Lien vers la déclaration CNDP quand elle sera faite

## 8) Plan "Amélioration Backend" (spécifique /legal/privacy)
### Quick wins (≤2h)
- [ ] Ajouter `robots: { index: false }` immédiatement
- [ ] Ajouter canonical URL
### Moyen (½–2 jours)
- [ ] Rédiger la politique de confidentialité (avec juriste) listant : données collectées, finalités, durée de conservation, destinataires, droits, responsable du traitement, contact DPO
- [ ] Ajouter un champ `privacyConsentAt: DateTime?` et `privacyVersion: String?` dans le modèle User
- [ ] Logger le consentement à l'inscription
### Structurant (>2 jours)
- [ ] Effectuer la déclaration auprès de la CNDP (obligation légale Loi 09-08)
- [ ] Implémenter un endpoint `POST /user/data-request` pour les demandes d'accès/suppression (droit des personnes)
- [ ] Créer un endpoint `GET /user/my-data` (export données personnelles)
- [ ] Audit complet des données collectées vs nécessité (principe de minimisation)
### Dépendances / risques
- **Bloqueur juridique majeur** : la collecte du CIN sans politique publiée ni déclaration CNDP expose à des sanctions.

---

# [/legal/mentions] — Mentions Légales

## 1) Résumé exécutif
- Rôle(s): Public (aucun auth requis)
- Objectif métier: Obligation légale — identification de l'éditeur, hébergeur, responsable de publication
- Statut global: ❌ Risque — contenu vide, aucune mention légale réelle
- Scores (0–5): Front: 2 ; Back: N/A ; DB: N/A ; Intégration: N/A ; Sécurité: 2 ; Perf: 4 ; Tests/Obs: 0
- Fichiers clés: `apps/web/src/app/legal/mentions/page.tsx` (47 lignes)

## 2) Cartographie technique (fichiers)
### Frontend
- `apps/web/src/app/legal/mentions/page.tsx` — Page statique, Server Component. Contenu placeholder.
### Backend
- Aucun endpoint.
### DB
- Aucune table.

## 3) Frontend — État attendu vs état actuel
### Attendu (référentiel)
- SEO : title + meta + canonical + noindex si placeholder
- Contenu obligatoire : raison sociale / nom éditeur, adresse siège, numéro RC/IF/ICE, responsable de publication, hébergeur (nom + adresse), contact
- Versioning (date)
### Actuel (constaté)
- UI/Contenu :
  - `<h1>` "Mentions Légales" ✅
  - 1 paragraphe d'introduction : "Khadamat est une plateforme de mise en relation entre particuliers et professionnels de services au Maroc." ✅
  - **Placeholder** : "Cette page est en cours de rédaction. Les mentions légales complètes seront publiées prochainement." ❌
  - Lien mailto ✅
  - **Aucune mention légale réelle** : pas de raison sociale, pas d'adresse, pas de RC/IF/ICE, pas d'hébergeur ❌
- SEO :
  - `title`: "Mentions Légales — Khadamat" ✅
  - `description`: "Mentions légales de la plateforme Khadamat." ✅
  - `canonical`: NON TROUVÉ ❌
  - `robots/noindex`: NON TROUVÉ ❌
  - OpenGraph: NON TROUVÉ
- Navigation :
  - Footer lien `/legal/mentions` (l.198) ✅
- A11y : Identique aux autres pages légales — heading correct, tokens, accessible ✅
- Perf : Server Component, ultra-léger ✅

## 4) Backend — État attendu vs état actuel
### Endpoints utilisés par la page
- Aucun.
### Attendu (référentiel)
- Contenu statique suffisant (pas besoin de dynamique)
- Les mentions légales sont rarement modifiées
### Actuel (constaté)
- Aucun endpoint ✅ (cohérent)
- Tests : 0
- Sécurité : Risque légal — l'absence de mentions légales peut entraîner des sanctions

## 5) Base de données — État attendu vs état actuel
- N/A

## 6) Intégration Front ↔ Back ↔ DB
- N/A

## 7) Problèmes & recommandations
### CRITIQUES
- **Mentions légales absentes** : Toute plateforme commerciale au Maroc doit afficher les mentions légales (identification de l'éditeur). C'est une obligation réglementaire.
### IMPORTANTS
- **noindex manquant** : page vide indexable
- **Pas d'information hébergeur** : même en placeholder, l'hébergeur devrait être identifié (ex: Vercel, AWS, OVH)
### NICE-TO-HAVE
- Cross-links entre pages légales
- Layout partagé `/legal/layout.tsx`

## 8) Plan "Amélioration Backend" (spécifique /legal/mentions)
### Quick wins (≤2h)
- [ ] Ajouter `robots: { index: false }` immédiatement
- [ ] Ajouter canonical URL
### Moyen (½–2 jours)
- [ ] Rédiger les mentions légales complètes : éditeur (raison sociale, adresse, RC, IF, ICE), responsable de publication, hébergeur, contact
- [ ] Créer un layout partagé `/legal/layout.tsx` avec navigation sidebar entre CGU/Privacy/Mentions
### Structurant (>2 jours)
- [ ] Si la société n'est pas encore formellement créée, formaliser le statut juridique (auto-entrepreneur, SARL, etc.) pour pouvoir publier des mentions légales conformes
### Dépendances / risques
- **Bloqueur juridique** : nécessite les informations d'identité de l'éditeur (personne physique ou morale)

---

# Synthèse Phase 5 — Pages publiques & secondaires (Help/Blog/Legal)

## Constat général
Les 5 pages auditées sont **100% statiques** (Server Components Next.js, aucun appel backend, aucune interaction DB). Elles sont toutes fonctionnelles techniquement (pas de crash, pas de lien cassé, design cohérent). Cependant, **4 pages sur 5 contiennent du contenu placeholder** ("bientôt disponible" / "en cours de rédaction") sans `noindex`, et les **3 pages légales sont vides** alors que la plateforme est opérationnelle et collecte des données sensibles.

## Problèmes transverses
- **SEO & contenu placeholder** :
  - 4 pages sur 5 ont du contenu placeholder indexable par Google (FAQ de /help, articles de /blog, CGU, Privacy, Mentions)
  - Aucune page du site n'a de `canonical` URL
  - Aucune page du site n'a de metadata OpenGraph/Twitter
  - `robots.txt` et `sitemap.xml` inexistants sur l'ensemble du projet
- **Liens cassés / 404** :
  - Aucun lien cassé détecté. Tous les liens du Footer/Navbar pointent vers des pages existantes ✅
  - Les articles de blog ne sont pas cliquables (cohérent avec le placeholder)
- **Endpoints publics (sécurité/rate limit/cache)** :
  - N/A — aucun endpoint backend sollicité par ces 5 pages
  - Si un formulaire de contact ou un blog dynamique est ajouté : prévoir rate limit + validation + anti-spam
- **Performance (assets/images)** :
  - Aucun problème — toutes les pages sont des Server Components ultra-légers, sans images, sans JS client
- **Tests/observabilité** :
  - 0 test pour l'ensemble des 5 pages
  - Pas de monitoring/analytics détecté

## Risques majeurs (Top 5)

1) **🔴 JURIDIQUE — Politique de confidentialité absente alors que des données sensibles sont collectées (CIN, photos KYC, téléphones)** : Infraction probable à la Loi 09-08 marocaine. La CNDP peut sanctionner. Bloqueur pour une mise en production officielle.

2) **🔴 JURIDIQUE — CGU absentes alors que la plateforme permet inscription, paiements et commandes** : Pas de cadre contractuel = pas de protection juridique pour Khadamat ni pour les utilisateurs. Responsabilité engagée en cas de litige.

3) **🔴 JURIDIQUE — Mentions légales absentes** : Obligation légale non remplie. L'éditeur du site n'est pas identifié.

4) **🟡 SEO — Contenu placeholder indexé par Google** : Les pages "en cours de rédaction" seront indexées et affichées dans les résultats de recherche, donnant une impression d'inachevé. Risque réputationnel.

5) **🟡 SEO/INFRA — Absence de robots.txt, sitemap.xml, canonical, OpenGraph sur tout le site** : Impact SEO global. Les moteurs de recherche n'ont aucune directive de crawl, pas de sitemap, et les pages manquent de metadata pour le partage social.

## Plan backend priorisé (Phase suivante — améliorations)

### Priorité 0 (immédiat — bloqueurs juridiques)
- [ ] Ajouter `robots: { index: false }` sur les 4 pages placeholder (/help FAQ section, /blog, /legal/cgu, /legal/privacy, /legal/mentions) en attendant le contenu réel
- [ ] Rédiger et publier la Politique de Confidentialité conforme Loi 09-08 (données collectées, finalités, durée, droits, responsable, contact)
- [ ] Rédiger et publier les CGU (objet, inscription, obligations, responsabilités, paiements, résiliation, droit applicable)
- [ ] Rédiger et publier les Mentions Légales (éditeur, RC/IF/ICE, adresse, hébergeur, responsable publication)
- [ ] Vérifier/effectuer la déclaration auprès de la CNDP pour le traitement des données personnelles
- [ ] Ajouter `acceptsCgu: Boolean` + `cguVersion: String` dans le modèle User et le formulaire d'inscription

### Priorité 1
- [ ] Créer `robots.txt` (via `apps/web/src/app/robots.ts`) et `sitemap.xml` (via `apps/web/src/app/sitemap.ts`) pour tout le site
- [ ] Ajouter `canonical` URL sur toutes les pages publiques
- [ ] Ajouter metadata OpenGraph/Twitter sur les pages principales (au minimum : homepage, /pros, /blog, pages légales)
- [ ] Créer un layout partagé `/legal/layout.tsx` avec navigation entre les 3 pages légales
- [ ] Ajouter `privacyConsentAt` + `privacyVersion` dans le modèle User pour tracer le consentement

### Priorité 2
- [ ] Implémenter la FAQ (/help) : soit statique (accordéon), soit dynamique (endpoint `GET /public/faq`)
- [ ] Formulaire de contact `POST /public/contact` avec validation, rate limit (5/h par IP), anti-spam (honeypot), notification email
- [ ] Blog dynamique : modèle Prisma `Post`, endpoints `GET /public/posts` + `GET /public/posts/:slug`, route `/blog/[slug]`, ISR
- [ ] Endpoint `POST /user/data-request` pour les demandes d'exercice de droits (accès, rectification, suppression — Loi 09-08)
- [ ] Tests de snapshot/smoke pour les 5 pages (vérifier que les pages rendent sans erreur)
- [ ] Attribut `datetime` sur les balises `<time>` du blog

---

# AUDIT TRANSVERSAL — Base de données, API & Intégration avec les pages

---

## 1) Vue d'ensemble du schéma Prisma

**Fichier** : `packages/database/prisma/schema.prisma` (569 lignes)
**Provider** : PostgreSQL
**Preview features** : `driverAdapters`
**Migrations** : 2 fichiers trouvés
- `20260206180000_baseline_init/migration.sql` (503 lignes — création de toutes les tables)
- `20260206200000_add_kyc_access_log/migration.sql` (ajout KycAccessLog)

### 1.1) Inventaire des modèles (21 modèles + 12 enums)

| # | Modèle | Utilisé dans le code ? | Service(s) |
|---|--------|:---:|------------|
| 1 | `User` | ✅ | auth, users, booking, pro, catalog, dashboard |
| 2 | `ProProfile` | ✅ | auth, pro, payment, catalog, kyc, booking |
| 3 | `City` | ✅ | catalog, auth, pro, payment, booking |
| 4 | `Category` | ✅ | catalog, pro, booking, payment |
| 5 | `ProService` | ✅ | pro, booking, catalog |
| 6 | `Booking` | ✅ | booking, dashboard |
| 7 | `WeeklyAvailability` | ✅ | pro (CRUD), booking (lecture slots) |
| 8 | `RefreshToken` | ✅ | auth, refresh-token-cleanup (cron) |
| 9 | `PaymentOrder` | ✅ | payment |
| 10 | `ProSubscription` | ✅ | payment (create/update dans activatePlan) |
| 11 | `ProBoost` | ✅ | payment (create dans activatePlan) |
| 12 | `KycAccessLog` | ✅ | kyc (write-only audit) |
| 13 | `NewsletterSubscriber` | ✅ | newsletter |
| 14 | **`BookingEvent`** | ❌ MORT | Events émis via EventEmitter mais **jamais persistés en DB** |
| 15 | **`SlotLock`** | ❌ MORT | Aucune référence dans aucun service |
| 16 | **`AvailabilityException`** | ❌ MORT | Aucune référence dans aucun service |
| 17 | **`PenaltyLog`** | ❌ MORT | Aucune référence dans aucun service |
| 18 | **`Report`** | ❌ MORT | Aucune référence dans aucun service |
| 19 | **`Review`** | ❌ MORT | Aucune référence dans aucun service |
| 20 | **`DeviceToken`** | ❌ MORT | Aucune référence dans aucun service |

**Constat** : 7 modèles sur 20 (35%) sont des tables fantômes — créées par migration, jamais utilisées par le code. Elles occupent de l'espace DB, ajoutent de la complexité au schéma, et créent une fausse impression de fonctionnalité.

### 1.2) Inventaire des enums

| Enum | Utilisé ? | Notes |
|------|:---------:|-------|
| `Role` | ✅ | CLIENT, PRO, ADMIN |
| `UserStatus` | ✅ | ACTIVE, SUSPENDED, BANNED |
| `KycStatus` | ✅ | NOT_SUBMITTED, PENDING, APPROVED, REJECTED |
| `BookingStatus` | ⚠️ Partiel | 11 valeurs, seulement 5 utilisées dans le code (voir ci-dessous) |
| `BookingEventType` | ❌ | Jamais persisté en DB |
| `PenaltyType` | ❌ | CLIENT_CANCEL_LATE, PRO_CANCEL_CONFIRMED — jamais utilisé |
| `SubscriptionPlan` | ✅ | PREMIUM_MONTHLY_NO_COMMIT, PREMIUM_ANNUAL_COMMIT |
| `SubscriptionStatus` | ✅ | ACTIVE, CANCELLED, EXPIRED |
| `BoostStatus` | ✅ | ACTIVE, EXPIRED |
| `EstimatedDuration` | ⚠️ | Défini mais seul H1 est utilisé (hardcodé à la création) |
| `ReportStatus` | ❌ | OPEN, IN_REVIEW, RESOLVED, REJECTED — modèle Report jamais utilisé |
| `Platform` | ❌ | IOS, ANDROID, WEB — modèle DeviceToken jamais utilisé |
| `PaymentProvider` | ✅ | MANUAL (seul utilisé) |
| `NewsletterStatus` | ✅ | PENDING, ACTIVE, UNSUBSCRIBED |

---

## 2) Champs morts dans les modèles actifs

### 2.1) BookingStatus — 6 valeurs fantômes sur 11

| Valeur | Utilisée par le backend ? | Frontend | Verdict |
|--------|:---:|:---:|---------|
| `PENDING` | ✅ createBooking | ✅ onglet | OK |
| `CONFIRMED` | ✅ updateBookingStatus | ✅ onglet | OK |
| `DECLINED` | ✅ updateBookingStatus + respondToModification | ✅ onglet | OK |
| `WAITING_FOR_CLIENT` | ✅ updateBooking (durée) | ✅ client onglet, ❌ PRO invisible | ⚠️ |
| `COMPLETED` | ✅ completeBooking + autoComplete | ✅ client historique | OK |
| `CANCELLED_AUTO_OVERLAP` | ✅ dans transaction confirm | ⚠️ badge OK, mais absent des filtres PRO | ⚠️ |
| **`CANCELLED_BY_CLIENT`** | ❌ jamais produit | ⚠️ référencé dans filtres front | ❌ MORT |
| **`CANCELLED_BY_CLIENT_LATE`** | ❌ jamais produit | ⚠️ référencé dans filtres front | ❌ MORT |
| **`CANCELLED_BY_PRO`** | ❌ jamais produit | ⚠️ référencé dans filtres front | ❌ MORT |
| **`CANCELLED_AUTO_FIRST_CONFIRMED`** | ❌ jamais produit | ⚠️ référencé dans filtres front | ❌ MORT |
| **`EXPIRED`** | ❌ pas de cron d'expiration | ⚠️ référencé dans filtres client | ❌ MORT |

### 2.2) User — champs penalty jamais utilisés

| Champ | Type | Défaut | Utilisé ? |
|-------|------|--------|:---------:|
| `clientLateCancelCount30d` | Int | 0 | ❌ jamais modifié |
| `clientSanctionTier` | Int | 0 | ❌ jamais modifié |
| `bookingCooldownUntil` | DateTime? | null | ❌ jamais modifié |
| `clientPenaltyResetAt` | DateTime? | null | ❌ jamais modifié |
| `bannedAt` | DateTime? | null | ❌ jamais modifié |
| `banReason` | String? | null | ❌ jamais modifié |

### 2.3) ProProfile — champs penalty jamais utilisés

| Champ | Type | Défaut | Utilisé ? |
|-------|------|--------|:---------:|
| `proCancelCount30d` | Int | 0 | ❌ jamais modifié |
| `proConsecutiveCancelCount` | Int | 0 | ❌ jamais modifié |

### 2.4) Booking — champs d'annulation jamais remplis

| Champ | Type | Utilisé ? | Notes |
|-------|------|:---------:|-------|
| `cancelledAt` | DateTime? | ❌ | Jamais set lors d'un DECLINE ou annulation auto |
| `cancelReason` | String? | ❌ | Commentaire schéma dit "obligatoire quand actor=PRO sur CONFIRMED" mais jamais implémenté |
| `estimatedDuration` | EstimatedDuration? | ⚠️ | Toujours H1 (hardcodé l.219 de booking.service.ts) |

---

## 3) Bugs et incohérences DB ↔ API

### 3.1) 🔴 BUG CRITIQUE — `endDate` n'existe pas dans ProSubscription

**Fichier** : `apps/api/src/payment/payment.service.ts:310`
```typescript
endDate: endsAt,  // ❌ Ce champ N'EXISTE PAS dans le schéma Prisma
```

**Schéma Prisma** (l.459) : le champ s'appelle `endedAt`, pas `endDate`.

**Impact** : L'activation Premium (`activatePlan`) va **crasher à chaque appel** avec une erreur Prisma `Unknown arg 'endDate'`. Aucune souscription Premium ne peut être activée en l'état.

**Correction** : `endDate` → `endedAt`

### 3.2) 🔴 FK manquante — PaymentOrder.proUserId

**Fichier** : `schema.prisma:514`
```prisma
model PaymentOrder {
  proUserId  String   // ← PAS de @relation, PAS de FK constraint
  // ...
}
```

**Impact** :
- On peut créer un PaymentOrder avec un `proUserId` qui n'existe pas en DB
- Pas de cascade delete — si un User est supprimé, ses PaymentOrders deviennent orphelins
- Pas de jointure Prisma possible (`include: { pro: ... }`)

**Migration SQL confirme** (l.300) : `"proUserId" TEXT NOT NULL` sans `REFERENCES`.

### 3.3) 🟡 PaymentOrder — planType et status sont des `String` au lieu d'enums

```prisma
planType  String  // "PREMIUM_MONTHLY" | "PREMIUM_ANNUAL" | "BOOST" — devrait être un enum
status    String  // "PENDING" | "PAID" | "FAILED" — devrait être un enum
```

**Impact** : Aucune contrainte DB sur les valeurs. Un bug dans le code pourrait écrire n'importe quelle valeur (ex: `"PANDING"`, `"paid"`).

### 3.4) 🟡 ProSubscription.endedAt vs PaymentOrder.paidAt — sémantique confuse

- `ProSubscription.endedAt` : date de fin de l'abonnement — mais la valeur écrite est `endsAt` (date planifiée de fin), pas la date réelle de résiliation.
- Le champ porte un nom passé (`ended`) mais contient une date future (fin prévue).
- `ProSubscription.startedAt` : date de début (correct).

### 3.5) 🟡 Booking.proId → ProProfile.userId (pas User.id)

```prisma
proId  String
pro    ProProfile  @relation(fields: [proId], references: [userId])
```

**Constat** : `proId` est en réalité le `userId` du ProProfile. C'est fonctionnellement correct (ProProfile.userId = User.id, car c'est la PK), mais sémantiquement trompeur — le frontend et l'API manipulent `proId` qui est en fait un `userId`.

### 3.6) 🟡 City.id interne exposé dans certaines réponses

**catalog.service.ts:147** :
```typescript
city: { select: { id: true, name: true } },  // ← id = cuid interne, pas publicId
```

Dans `getProDetail()`, le `city.id` retourné est le cuid interne (pas le publicId). Incohérent avec le reste de l'API qui utilise systématiquement `publicId` pour les villes.

---

## 4) Intégration Frontend ↔ API ↔ DB — Matrice par flux

### 4.1) Flux AUTH (inscription/connexion)

| Étape | Frontend | API | DB | Verdict |
|-------|----------|-----|-----|:-------:|
| Register | `register/page.tsx` → `POST /auth/register` | `auth.service.ts:register()` | `User.create + ProProfile.create` (transaction) | ✅ |
| Register CIN | FormData avec fichiers | `Multer → auth.service.ts` | `ProProfile.kycCinFrontUrl/BackUrl` | ✅ |
| Login | `login/page.tsx` → `POST /auth/login` | `auth.service.ts:login()` | `User.findFirst(email OR phone)` | ✅ |
| Refresh | `api.ts` auto-refresh 401 | `auth.service.ts:refreshTokens()` | `RefreshToken.findUnique + rotation` | ✅ |
| Logout | `authStore.logout()` | `auth.service.ts:logout()` | `RefreshToken.updateMany(revoked)` | ✅ |

**Problèmes** :
- Login : `User.findFirst` avec OR (email/phone) peut être lent sans index composite → mais `email` et `phone` ont chacun un unique index → OK
- Register PRO : `cinNumber` unique constraint vérifié avant transaction → race condition possible entre check et create (mitigé par la contrainte @unique en DB)

### 4.2) Flux CATALOG (pages publiques)

| Étape | Frontend | API | DB | Verdict |
|-------|----------|-----|-----|:-------:|
| Villes | `Hero.tsx` → `GET /public/cities` | `catalog.service.ts:getCities()` | `City.findMany(orderBy: name)` | ✅ cache 10min |
| Catégories | `Hero.tsx + Categories.tsx` → `GET /public/categories` | `catalog.service.ts:getCategories()` | `Category.findMany(orderBy: name)` | ✅ cache 10min |
| Listing Pros | `pros/page.tsx` → `GET /public/pros/v2` | `catalog.service.ts:getProsV2()` | `User.findMany + count` (parallel) | ✅ cache 2min |
| Détail Pro | `pros/[id]/page.tsx` → `GET /public/pros/:id` | `catalog.service.ts:getProDetail()` | `User.findUnique + Booking.count` | ✅ |

**Problèmes** :
- `getProsV2` tri : `isPremium DESC, boostActiveUntil DESC, createdAt DESC` → utilise les champs dénormalisés sur ProProfile ✅ (bon pattern)
- Mais `boostActiveUntil` n'est **jamais remis à null** après expiration → les pros avec un boost expiré restent triés avant les non-boostés. Pas de cron pour nettoyer.
- `getProDetail` expose `city.id` interne (cuid) au lieu de `publicId` → incohérence avec le reste

### 4.3) Flux BOOKING

| Étape | Frontend | API | DB | Verdict |
|-------|----------|-----|-----|:-------:|
| Slots | `booking/page.tsx` → `GET /public/slots` | `booking.service.ts:getAvailableSlots()` | `ProService.findUnique + WeeklyAvailability.findUnique + Booking.findMany(CONFIRMED)` | ✅ |
| Créer | `booking/page.tsx` → `POST /bookings` | `booking.service.ts:createBooking()` | `User.findUnique + ProProfile.findUnique + Booking.create` | ✅ |
| Confirm/Decline | `dashboard/bookings` → `PATCH /bookings/:id/status` | `booking.service.ts:updateBookingStatus()` | Transaction: `Booking.findUnique + update + findMany + update(overlap)` | ✅ |
| Modifier durée | `dashboard/bookings` → `PATCH /bookings/:id/duration` | `booking.service.ts:updateBooking()` | `Booking.findUnique + findMany(conflicts) + update` | ✅ |
| Répondre modif | `client/bookings` → `PATCH /bookings/:id/respond` | `booking.service.ts:respondToModification()` | Transaction: même logique que confirm | ✅ |
| Compléter | `dashboard/bookings` → `PATCH /bookings/:id/complete` | `booking.service.ts:completeBooking()` | `Booking.findUnique + update(COMPLETED)` | ✅ |

**Problèmes** :
- ❌ **Pas d'endpoint d'annulation** : `CANCELLED_BY_CLIENT`, `CANCELLED_BY_CLIENT_LATE`, `CANCELLED_BY_PRO` → 3 statuts DB sans aucun code
- ❌ **Pas de cron d'expiration** : `expiresAt` rempli mais jamais vérifié → bookings PENDING restent indéfiniment
- ⚠️ `cancelledAt` et `cancelReason` jamais remplis
- ⚠️ `BookingEvent` émis via `EventEmitter` mais jamais persisté en `BookingEvent` table
- ⚠️ `SlotLock` table jamais utilisée — la vérification de dispo utilise `getAvailableSlots()` pas de lock

### 4.4) Flux PRO DASHBOARD

| Étape | Frontend | API | DB | Verdict |
|-------|----------|-----|-----|:-------:|
| Dashboard | `dashboard/page.tsx` → `GET /pro/me` + `GET /dashboard/stats` | `pro.service.ts + dashboard.service.ts` | `ProProfile + Booking.findMany` (7d) | ✅ |
| Profile | `dashboard/profile` → `GET /pro/me` + `PATCH /pro/profile` | `pro.service.ts:updateProfile()` | Transaction: `User.update + ProProfile.update` | ✅ |
| Services | `dashboard/services` → `GET /pro/me` + `PUT /pro/services` | `pro.service.ts:updateServices()` | Transaction: `ProService.deleteMany + createMany` | ✅ |
| Availability | `dashboard/availability` → `GET /pro/me` + `PUT /pro/availability` | `pro.service.ts:updateAvailability()` | Transaction: `WeeklyAvailability.deleteMany + createMany` | ✅ |
| KYC | `dashboard/kyc` → `POST /kyc/submit` | `kyc.service.ts:submitKyc()` | `ProProfile.update(kycStatus, urls)` | ✅ |

**Problèmes** :
- Dashboard stats (`dashboard.service.ts`) : `Booking.findMany` puis groupage JS au lieu de `groupBy` Prisma → N+1 potentiel sur gros volumes
- Dashboard stats : pas de vérification `isPremium` côté backend → tout PRO peut accéder
- Services : stratégie DELETE ALL + CREATE → perte des IDs et des `createdAt` à chaque mise à jour

### 4.5) Flux PAYMENT

| Étape | Frontend | API | DB | Verdict |
|-------|----------|-----|-----|:-------:|
| Checkout | `plans/page.tsx` → `POST /payment/checkout` | `payment.service.ts:initiatePayment()` | `ProProfile.findUnique + ProBoost.findFirst + PaymentOrder.create` | ✅ |
| Status | `pro/subscription` → `GET /payment/status/:oid` | `payment.service.ts:getPaymentStatus()` | `PaymentOrder.findUnique` | ✅ |
| Confirm (admin) | Admin → `POST /payment/admin/confirm/:oid` | `payment.service.ts:confirmPayment()` | Transaction: `PaymentOrder.update + ProSubscription.create/update + ProProfile.update` | 🔴 CRASH |
| Reject (admin) | Admin → `POST /payment/admin/reject/:oid` | `payment.service.ts:rejectPayment()` | `PaymentOrder.update(FAILED)` | ✅ |

**Problèmes** :
- 🔴 `activatePlan()` utilise `endDate` (inexistant) au lieu de `endedAt` → **crash systématique à l'activation Premium**
- ❌ `PaymentOrder.proUserId` sans FK → intégrité non garantie
- ❌ Pas de cron pour expirer les Premium (`premiumActiveUntil < now` → toujours `isPremium = true`)
- ❌ Pas de cron pour expirer les Boosts (`boostActiveUntil < now` → toujours trié en premier)
- ⚠️ `planType` et `status` sont des String libres, pas des enums

---

## 5) Index et performance

### 5.1) Index existants

| Modèle | Index | Type | Adéquat ? |
|--------|-------|------|:---------:|
| `User` | `email` | unique | ✅ |
| `User` | `phone` | unique | ✅ |
| `City` | `publicId` | unique | ✅ |
| `City` | `name` | unique | ✅ |
| `City` | `slug` | unique | ✅ |
| `Category` | `publicId` | unique | ✅ |
| `Category` | `name` | unique | ✅ |
| `Category` | `slug` | unique | ✅ |
| `ProService` | `[proUserId, categoryId]` | unique composite | ✅ |
| `ProService` | `categoryId` | simple | ✅ |
| `Booking` | `[clientId, cityId, categoryId, timeSlot]` | composite | ✅ |
| `Booking` | `clientId` | simple | ✅ |
| `Booking` | `[proId, timeSlot]` | composite | ✅ |
| `Booking` | `proId` | simple | ✅ |
| `BookingEvent` | `[bookingId, createdAt]` | composite | ✅ (mais table inutilisée) |
| `SlotLock` | `[proUserId, timeSlot]` | unique composite | ✅ (mais table inutilisée) |
| `RefreshToken` | `tokenHash` | unique | ✅ |
| `RefreshToken` | `userId` | simple | ✅ |
| `RefreshToken` | `expiresAt` | simple | ✅ |
| `PaymentOrder` | `[proUserId, status]` | composite | ✅ |
| `PaymentOrder` | `oid` | unique + index | ⚠️ doublon (unique crée déjà un index) |
| `ProSubscription` | `[proUserId, status]` | composite | ✅ |
| `ProBoost` | `[cityId, categoryId, status, startsAt]` | composite | ✅ |
| `ProBoost` | `[proUserId, endsAt]` | composite | ✅ |

### 5.2) Index manquants

| Requête | Champs | Impact |
|---------|--------|--------|
| `Booking.findMany(proId, status CONFIRMED, timeSlot range)` | `[proId, status, timeSlot]` | Utilisé dans updateBookingStatus + getAvailableSlots — filtre courant |
| `ProBoost.findFirst(proUserId, orderBy createdAt DESC)` | `[proUserId, createdAt]` | Cooldown check dans initiatePayment |
| `User.findFirst(email OR phone)` | Index composite `[email, phone]` | Login — mais les index unique séparés suffisent |

### 5.3) Requêtes problématiques

1. **`dashboard.service.ts`** : `Booking.findMany` pour les 7 derniers jours, puis groupage par date en JavaScript
   - Devrait utiliser `groupBy` Prisma ou une raw query `GROUP BY DATE(timeSlot)`
   - Impact : linéaire en nombre de bookings → dégradation avec le volume

2. **`catalog.service.ts:getProsV2`** : `orderBy: [{ proProfile: { isPremium: 'desc' } }, { proProfile: { boostActiveUntil: 'desc' } }]`
   - Tri sur relation jointe → peut être lent sur gros volumes si pas d'index composite
   - Mitigé par le cache de 2 minutes

3. **`booking.service.ts:getAvailableSlots`** : 3 requêtes séquentielles (service → availability → bookings)
   - Pourrait être optimisé en 1-2 requêtes avec des includes

---

## 6) Sécurité DB

### 6.1) Points positifs
- ✅ Mots de passe hashés (bcrypt, 10 rounds) — `auth.service.ts:110`
- ✅ Refresh tokens stockés en SHA-256 (jamais le token brut) — `auth.service.ts:432`
- ✅ Tokens expirés nettoyés par cron quotidien — `refresh-token-cleanup.service.ts`
- ✅ `password` exclu de tous les `select` dans les requêtes publiques
- ✅ CIN unique constraint pour empêcher la fraude multi-comptes
- ✅ Transactions atomiques pour les opérations critiques (booking confirm, payment activate, register)

### 6.2) Points négatifs
- ❌ **KYC files** : URLs stockées comme strings simples dans ProProfile — `kycCinFrontUrl`, `kycCinBackUrl`, `kycSelfieUrl`. Si le serveur expose `/uploads/kyc/` sans auth, les CIN sont accessibles publiquement.
- ❌ **PaymentOrder sans FK** : `proUserId` non contraint → data orpheline possible
- ❌ **User.id (cuid) exposé comme Pro ID** : l'ID interne est utilisé dans les URLs publiques (`/pros/:id`) et dans les bookings. Un attaquant peut énumérer les IDs (cuids sont prévisibles dans leur préfixe).
- ⚠️ **Pas de soft delete** : les suppressions sont en cascade (`onDelete: Cascade`) → un delete User supprime tout l'historique (bookings, reviews, reports)
- ⚠️ **cinNumber stocké en clair** : le numéro CIN (pièce d'identité nationale) est stocké sans chiffrement dans ProProfile

---

## 7) Crons et jobs planifiés — État actuel

| Job | Fichier | Schedule | Fait quoi | Verdict |
|-----|---------|----------|-----------|:-------:|
| Cleanup refresh tokens | `refresh-token-cleanup.service.ts` | `@Cron(EVERY_DAY_AT_3AM)` | Supprime tokens expirés > 30j | ✅ |
| Cleanup failed logins | `failed-login.service.ts` | `setInterval(10min)` | Purge in-memory map | ✅ |

### 7.1) Crons MANQUANTS (critiques)

| Job manquant | Impact | Priorité |
|--------------|--------|:--------:|
| **Expirer bookings PENDING** (`expiresAt < now → EXPIRED`) | Bookings PENDING s'accumulent indéfiniment | 🔴 P0 |
| **Expirer Premium** (`premiumActiveUntil < now → isPremium = false`) | Pros restent Premium après expiration | 🔴 P0 |
| **Expirer Boosts** (`boostActiveUntil < now → null, BoostStatus.EXPIRED`) | Pros boostés restent en tête de liste après expiration | 🔴 P0 |
| **Expirer PaymentOrders PENDING** (> 7 jours → FAILED) | Orders PENDING s'accumulent | 🟡 P1 |
| **Reset compteurs penalty 30 jours** | Non implémenté mais champs existent | 🟡 P2 |

---

## 8) Contrats (Zod) vs DTOs (class-validator) vs DB

### 8.1) Double validation — incohérence structurelle

Le projet utilise **deux systèmes de validation** en parallèle :

| Couche | Système | Fichiers |
|--------|---------|----------|
| Contracts (partagé) | **Zod** | `packages/contracts/src/schemas/*.ts` |
| Backend DTOs | **class-validator** | `apps/api/src/**/dto/*.ts` |

**Problème** : Les mêmes champs sont validés différemment selon le système :

| Champ | Zod (contracts) | class-validator (DTO) | DB | Verdict |
|-------|-----------------|----------------------|-----|:-------:|
| `password` min | 8 chars | 10 chars | String | ❌ incohérent |
| `phone` regex | `/^(\+212\|0)[5-7]\d{8}$/` | `/^(\+212\|0)[5-7]\d{8}$/` | String | ✅ |
| `cityId` format | `.min(1)` | `/^city_[a-z]+_\d{3}$/` | String (publicId) | ⚠️ Zod plus laxiste |
| `email` | `z.string().email()` | `@IsEmail()` | String? @unique | ✅ |
| `planType` | N/A (pas dans contracts) | `@IsIn(['PREMIUM_MONTHLY', 'PREMIUM_ANNUAL', 'BOOST'])` | String | ⚠️ devrait être enum |
| `UpdateBookingStatus.status` | `z.enum(['CONFIRMED', 'DECLINED'])` | N/A (Zod pipe used) | BookingStatus enum | ✅ |

### 8.2) Mapping publicId ↔ id interne

Le pattern de résolution `publicId → id interne` est utilisé correctement dans la plupart des services :

| Service | Méthode | Pattern | Verdict |
|---------|---------|---------|:-------:|
| `catalog.service.ts` | `resolveCityId()`, `resolveCategoryId()` | publicId → id | ✅ |
| `payment.service.ts` | `resolveCityId()`, `resolveCategoryId()` | publicId → id | ✅ |
| `pro.service.ts` | inline dans `updateProfile()`, `updateServices()` | publicId → id | ✅ |
| `booking.service.ts` | `resolveCategoryId()` | publicId → id | ✅ |
| `auth.service.ts` | inline dans `register()` | publicId → id | ✅ |

**Problème** : la résolution `publicId → id` est dupliquée dans 5 services (chacun a sa propre méthode `resolveCityId`/`resolveCategoryId`). Pas de service partagé.

---

## 9) Synthèse des risques — Top 10

| # | Sévérité | Problème | Impact | Fichier(s) |
|---|:--------:|---------|--------|------------|
| 1 | 🔴 | **`endDate` inexistant** dans activatePlan → crash activation Premium | Aucun Pro ne peut activer Premium | `payment.service.ts:310` |
| 2 | 🔴 | **7 modèles DB jamais utilisés** (SlotLock, AvailabilityException, PenaltyLog, Report, Review, DeviceToken, BookingEvent) | Complexité morte, fausse impression de fonctionnalité | `schema.prisma` |
| 3 | 🔴 | **Pas de cron d'expiration** (bookings, premium, boosts) | Données obsolètes jamais nettoyées, premium/boost gratuit à vie | Backend global |
| 4 | 🔴 | **3 types d'annulation non implémentés** (CANCELLED_BY_CLIENT, BY_CLIENT_LATE, BY_PRO) | Client/Pro ne peuvent pas annuler | `booking.service.ts` |
| 5 | 🔴 | **PaymentOrder.proUserId sans FK** | Intégrité référentielle non garantie | `schema.prisma:514` |
| 6 | 🟡 | **6 statuts BookingStatus fantômes** sur 11 | Front référence des statuts jamais produits | Schema + front |
| 7 | 🟡 | **8 champs penalty** (User + ProProfile) jamais utilisés | Feature conçue en schéma mais jamais codée | `schema.prisma` |
| 8 | 🟡 | **BookingEvent émis mais jamais persisté** | Perte d'audit trail | `booking.service.ts` |
| 9 | 🟡 | **Double validation Zod/class-validator** incohérente (password 8 vs 10) | Contournement possible | Contracts vs DTOs |
| 10 | 🟡 | **CIN stocké en clair** + fichiers KYC potentiellement publics | Risque CNDP / données sensibles | `schema.prisma`, `kyc.service.ts` |

---

## 10) Plan d'action priorisé

### Priorité 0 — Bloqueurs (immédiat)
- [ ] **FIX** `payment.service.ts:310` : remplacer `endDate: endsAt` par `endedAt: endsAt`
- [ ] **CRON** : Créer `BookingExpirationService` avec `@Cron(EVERY_HOUR)` → `Booking.updateMany({ where: { status: PENDING, expiresAt: { lt: now } }, data: { status: EXPIRED } })`
- [ ] **CRON** : Créer `SubscriptionExpirationService` → `ProProfile.updateMany({ where: { isPremium: true, premiumActiveUntil: { lt: now } }, data: { isPremium: false } })` + `ProProfile.updateMany({ where: { boostActiveUntil: { lt: now } }, data: { boostActiveUntil: null } })`
- [ ] **FK** : Ajouter `@relation` sur `PaymentOrder.proUserId` → migration

### Priorité 1 — Important (semaine)
- [ ] **ANNULATION** : Implémenter `cancelBooking(bookingId, userId, role)` avec logique CANCELLED_BY_CLIENT (libre si > 24h, LATE sinon) et CANCELLED_BY_PRO (avec cancelReason obligatoire)
- [ ] **CLEAN SCHEMA** : Supprimer ou commenter les 7 modèles morts (SlotLock, AvailabilityException, PenaltyLog, Report, Review, DeviceToken, BookingEvent) — ou les conserver avec un commentaire `// TODO: Phase X`
- [ ] **ENUMS** : Convertir `PaymentOrder.planType` et `PaymentOrder.status` en enums Prisma
- [ ] **PERSIST EVENTS** : Ajouter la persistance des BookingEvent en DB (actuellement émis via EventEmitter mais jamais sauvegardés)
- [ ] **UNIFY VALIDATION** : Harmoniser password min length (8 vs 10) entre Zod et class-validator
- [ ] **RESOLVE HELPERS** : Extraire `resolveCityId`/`resolveCategoryId` dans un `CatalogResolverService` partagé

### Priorité 2 — Améliorations (mois)
- [ ] Implémenter le système de pénalités (utiliser les champs `clientLateCancelCount30d`, `clientSanctionTier`, etc.)
- [ ] Chiffrer `cinNumber` en DB (ou au minimum le hasher pour la recherche d'unicité)
- [ ] Ajouter un `publicId` sur User/ProProfile pour éviter d'exposer les cuids internes
- [ ] Implémenter Review et Report (tables existent déjà)
- [ ] Remplacer le groupage JS dans dashboard.service.ts par `groupBy` Prisma
- [ ] Ajouter un index composite `[proId, status, timeSlot]` sur Booking
- [ ] Tests unitaires pour les services critiques (booking, payment, auth)
- [ ] Sécuriser l'accès aux fichiers KYC (auth middleware sur `/uploads/kyc/`)
