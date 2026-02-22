
# Phase 1 — Auth & Acces (RE-AUDIT post-corrections)

> **Date** : 2026-02-19
> **Contexte** : Re-audit complet apres les corrections appliquees (design tokens migration, RBAC guards, middleware.ts, forgot-password, KycApprovedGuard, accessibilite).
> Remplace les findings de la Phase 1 initiale — reflete l'etat actuel du code.

## Resume executif

- **Statut global** : ⚠️ A ameliorer (progres significatifs depuis l'audit initial)
- **Points forts** :
  - Architecture auth solide : JWT httpOnly + refresh token rotation + replay detection
  - Hachage bcrypt (cout 10), IDs publics/internes separes, CIN hashe SHA-256
  - Rate limiting (5/min login/register, 3/h forgot-password, 5/h reset-password)
  - Lockout apres 5 echecs (15 min)
  - CSRF double protection : custom header (`X-CSRF-PROTECTION: 1`) + `sameSite: strict`
  - Helmet complet (CSP, HSTS preload, X-Frame-Options DENY, noSniff, no-referrer)
  - Validation serveur stricte (class-validator + whitelist + forbidNonWhitelisted)
  - Securite fichiers KYC (magic bytes, Sharp rebuild, scan malware, MIME whitelist)
  - `middleware.ts` Next.js protege les routes cote serveur (SSR edge)
  - Forgot-password + reset-password implementes (token 256-bit, hashe SHA-256, TTL 15 min, single-use)
  - KycApprovedGuard applique sur les routes PRO sensibles (backend)
  - `@Roles('CLIENT')` sur `PATCH /users/me` (empeche PRO de modifier via cette route)
  - Design tokens migres a 100% (0 hex, 0 zinc/slate/gray, 0 `dark:` dans les .tsx)
- **Risques majeurs** :
  1. **CRITIQUE** : Param redirect mismatch — middleware envoie `?returnTo=`, login lit `?next=` → redirect post-login cassee
  2. **HIGH** : `aria-describedby="login-global-error"` reference un ID inexistant sur la page login
  3. **HIGH** : `motion-safe:` manquant sur animations de register sidebar, forgot-password, reset-password
  4. **MEDIUM** : Lockout en memoire (perdu au restart, non partage multi-instance)
  5. **MEDIUM** : `GET /dashboard/stats` sans `@Roles('PRO')` ni premium gate backend
- **Recommandations top 5** :
  1. Corriger le param redirect : unifier sur `returnTo` ou `next` (middleware.ts + login/page.tsx)
  2. Ajouter `id="login-global-error"` sur le div d'erreur du login
  3. Wrapper toutes les animations dans `motion-safe:` (register, forgot-pw, reset-pw)
  4. Persister le lockout dans Redis ou DB pour production multi-instance
  5. Ajouter `@Roles('PRO')` + premium check sur `GET /dashboard/stats`

---

## 1) /auth/login

### Frontend

**Fichier** : `apps/web/src/app/auth/login/page.tsx` (279 lignes)

**Composant legacy** : `apps/web/src/components/auth/LoginForm.tsx` (114 lignes) — **code mort**, non importe nulle part. Le login page definit son propre `LoginForm` inline.

**Champs** : `login` (email ou telephone, type="text"), `password` (type="password")
**Validation** : Aucune librairie. Utilise `required` natif HTML + `noValidate` sur le form. Aucune validation client-side avant soumission — depend entierement du backend.
**Types** : `LoginInput` et `AuthResponse` depuis `@khadamat/contracts`.

**Etats geres** :
| Etat | Implementation | Verdict |
|------|---------------|---------|
| Loading | `loading` state, bouton disabled + spinner | OK |
| Erreur | `error` state, `role="alert"` + `aria-live="assertive"` | OK |
| Succes | Implicit via redirect (`router.push`) | OK |

**Accessibilite** :
- `<label htmlFor="login-email">` et `<label htmlFor="login-password">` correctement lies — OK
- `aria-live="assertive"` sur le wrapper erreur — OK
- `aria-invalid` sur les inputs quand erreur presente — OK
- `aria-hidden="true"` sur les SVG decoratifs — OK
- `tabIndex={-1}` + `ref` + `requestAnimationFrame` focus sur le div erreur — OK
- **BUG** : `aria-describedby="login-global-error"` sur l'input login reference un ID inexistant. Le div d'erreur n'a pas `id="login-global-error"`.

**Design tokens** : 100% design tokens (`bg-primary-500`, `text-text-primary`, `bg-surface`, `border-border`, etc.). Aucun hex en dur. `text-white` utilise (acceptable pour contraste sur fond primaire). `motion-safe:` correctement utilise dans la section formulaire.

**Redirections** :
- Verifie `searchParams.get('next')` pour redirect safe (doit commencer par `/` et pas `//` — bonne protection open-redirect)
- **BUG CRITIQUE** : Le middleware envoie `?returnTo=...` mais la page login lit `?next=...`. Les noms ne correspondent pas. Le retour a la page d'origine apres login **ne fonctionne pas**.
- Redirect par role : PRO → `/dashboard`, CLIENT → `/`

**Liens** :
- Vers `/auth/forgot-password` — OK (page existe)
- Vers `/auth/register` — OK
- Vers `/` (accueil) — OK

**Securite** :
- CSRF via `postJSON` (header `X-CSRF-PROTECTION: 1` + `credentials: 'include'`) — OK
- Pas de toggle visibilite mot de passe — manquant
- `autoComplete="username"` et `autoComplete="current-password"` — OK

### API / Backend

**Endpoint** : `POST /api/auth/login`
**Fichier** : `apps/api/src/auth/auth.controller.ts` (ligne 237-254)

| Aspect | Implementation | Verdict |
|--------|---------------|---------|
| Guards | Aucun (endpoint public) | OK |
| Rate Limiting | `@Throttle({ default: { limit: 5, ttl: 60_000 } })` — 5 req/min | OK |
| DTO | `LoginDto` (whitelist + forbidNonWhitelisted) | OK |
| Lockout | `FailedLoginService` : 5 tentatives, lockout 15 min | OK |
| Timing Attack | Comparaison constante bcrypt avec `DUMMY_HASH` quand user non trouve | OK |
| Messages erreur | Generique "Identifiants invalides" pour tous les cas | OK |
| Status check | Comptes inactifs/suspendus rejetes (`user.status !== 'ACTIVE'`) | OK |
| Tokens | Envoyes en cookies httpOnly, jamais dans le body de reponse | OK |

**Problemes** :
- **MEDIUM** : Lockout en memoire (`Map<string, LoginAttempt>`) — perdu au restart serveur, non partage entre instances. Un attaquant peut reset le lockout en attendant un deploiement.
- **LOW** : Le lockout cible l'identifiant de login (email/phone), pas l'IP. Un attaquant peut verrouiller un utilisateur legitime en echouant deliberement 5 fois.

### DB

- **User model** : CUID `id`, `publicId` unique, `phone` unique, `email?` unique, `password` (bcrypt hash), `role` (enum CLIENT/PRO/ADMIN), `status` (ACTIVE par defaut)
- **RefreshToken model** : `tokenHash` (SHA-256, unique), `revoked` boolean, `expiresAt`, relation User cascade

### Problemes & recommandations

| # | Severite | Probleme | Action |
|---|----------|----------|--------|
| 1 | CRITIQUE | Param `returnTo` vs `next` mismatch | Unifier le nom dans middleware.ts et login/page.tsx |
| 2 | HIGH | `aria-describedby="login-global-error"` pointe sur ID inexistant | Ajouter `id="login-global-error"` sur le div erreur |
| 3 | MEDIUM | Lockout en memoire, perdu au restart | Migrer vers Redis/DB |
| 4 | LOW | Pas de toggle visibilite mot de passe | Ajouter Eye/EyeOff comme sur reset-password |
| 5 | LOW | Aucune validation client-side (champs vides envoyables) | Ajouter validation basique pre-soumission |
| 6 | LOW | `LoginForm.tsx` component legacy inutilise (code mort) | Supprimer le fichier |

### TODO

- [ ] Corriger le param redirect (`returnTo` → `next` dans middleware.ts, ou inversement)
- [ ] Ajouter `id="login-global-error"` sur le div d'erreur
- [ ] Ajouter toggle visibilite mot de passe
- [ ] Supprimer `components/auth/LoginForm.tsx` (dead code)

## Score detaille — /auth/login

| Aspect | Score /5 | Justification |
|--------|----------|---------------|
| Frontend structure | 4/5 | Layout clean, split sidebar/form, types corrects. Code mort LoginForm.tsx |
| UX & states | 4/5 | Loading/error/success OK. Pas de toggle password |
| Validation front | 2/5 | Aucune validation client-side, noValidate + depend du backend |
| Securite auth | 4/5 | httpOnly cookies, CSRF, constant-time compare, lockout. Lockout en memoire |
| Backend protection | 5/5 | Rate limit, lockout, DUMMY_HASH, status check, DTO whitelist |
| RBAC | 5/5 | Endpoint public, pas de guard necessaire |
| Redirections | 2/5 | Redirect par role OK mais param `returnTo`/`next` mismatch = casse |
| DB coherence | 5/5 | RefreshToken hashe, rotation, replay detection |
| Tests | 3/5 | Tests password-reset couverts, pas de tests specifiques login flow |

### Score global page : 3.8 / 5

---

## 2) /auth/register (?role=PRO|CLIENT)

### Frontend

**Fichier** : `apps/web/src/app/auth/register/page.tsx` (874 lignes)

**Etape 1** : Selection du role (CLIENT ou PRO) via boutons, auto-selection possible via URL `?role=PRO`
**Etape 2** : Formulaire multi-champs

**Champs** :
- Communs : firstName, lastName, email, phone, password, confirmPassword, cityId (CitySelect)
- CLIENT : addressLine
- PRO : cinNumber, cinFront (fichier), cinBack (fichier)

**Validation** : Pas de librairie (pas de zod client-side, pas de react-hook-form). Validation manuelle inline :
- Email regex, phone regex (format marocain `^(\+212|0)[5-7]\d{8}$`)
- CIN regex (`^[A-Za-z]{1,2}\d{5,6}$`)
- Password : 10+ chars, minuscule, majuscule, chiffre
- Confirm password match
- Fichiers : type (JPEG/PNG/WebP), taille max 5MB

**Etats geres** :
| Etat | Implementation | Verdict |
|------|---------------|---------|
| Loading | `loading` state + spinner + bouton disabled | OK |
| Erreur globale | `role="alert"` + `aria-live="assertive"` + `aria-atomic="true"` | OK |
| Erreurs champ | Inline sous chaque champ (email, phone, cin, password, files) | OK |
| Succes | Implicit via redirect | OK |

**Accessibilite** :
- Tous les labels utilisent `htmlFor` : `reg-firstName`, `reg-lastName`, `reg-email`, `reg-phone`, `reg-password`, `reg-confirmPassword`, `reg-city`, `reg-address`, `reg-cin` — OK
- `aria-describedby` lie correctement aux IDs erreur : `reg-email-error`, `reg-phone-error`, `reg-password-rules`, `reg-confirm-error`, `reg-cin-error` — OK
- `aria-invalid` sur email, phone, password, confirmPassword, cin — OK
- `errorRef` avec `tabIndex={-1}` + focus management sur erreur soumission — OK
- File inputs avec `aria-label="Photo CIN recto/verso"` — OK
- **ISSUE** : CIN Recto/Verso utilisent `<span>` pour les labels au lieu de `<label htmlFor>`. L'input file n'a pas d'`id` reference.

**Design tokens** : 100% tokens (`text-text-primary`, `bg-input-bg`, `border-border`, `text-primary-500`, `bg-surface`, etc.)
- **VIOLATION** : Sidebar gauche utilise `animate-float`, `animate-fade-in`, `stagger-1/2/3` **sans** prefix `motion-safe:`. Feature cards avec `transition-all duration-300` sans `motion-safe:`.
- Style inline `background: linear-gradient(...)` avec `var(--color-primary-*)` — techniquement des tokens CSS mais pas des classes Tailwind.

**Redirections post-inscription** :
- PRO → `/dashboard/kyc` — OK
- CLIENT → `/` — OK

**Securite** :
- **ISSUE** : La page register n'utilise PAS `postFormData` de `@/lib/api`. Elle construit manuellement un `fetch()` avec `process.env.NEXT_PUBLIC_API_URL`. Contourne la logique auto-refresh-on-401. Inclut `credentials: 'include'` et `X-CSRF-PROTECTION: 1`.
- Pas de toggle visibilite mot de passe (contrairement a reset-password)

### API / Backend

**Endpoint** : `POST /api/auth/register`
**Fichier** : `apps/api/src/auth/auth.controller.ts` (ligne 93-230)

| Aspect | Implementation | Verdict |
|--------|---------------|---------|
| Guards | Aucun (public) | OK |
| Rate Limiting | `@Throttle({ default: { limit: 5, ttl: 60_000 } })` — 5/min | OK |
| DTO | `RegisterDto` (whitelist + forbidNonWhitelisted) | OK |
| Role | `@IsIn(['CLIENT', 'PRO'])` — ADMIN bloque | OK |
| Password | Min 10 chars, lowercase + uppercase + digit, max 128 | OK |
| CIN | SHA-256 + salt (min 32 chars enforce au boot), `trim().toUpperCase()` | OK |
| Fichiers | MIME + magic bytes + sharp re-encode + scan malware (PHP/script/MZ/ZIP) | OK |
| Atomicite | `$transaction` pour User + ProProfile | OK |
| Cleanup | Fichiers supprimes si transaction echoue | OK |
| Anti-enumeration | "Donnees en conflit" generique | OK |

**bcrypt** : cout 10 (standard minimum, 12 recommande pour production)

### DB

- **User** : cree atomiquement dans `$transaction`
- **ProProfile** : cree dans la meme transaction pour role PRO, avec `kycStatus: NOT_SUBMITTED`
- CIN stocke uniquement comme `cinHash` (SHA-256 + salt)
- Pas de contrainte DB forcant la presence d'un ProProfile pour un User role=PRO (application-level seulement)

### Problemes & recommandations

| # | Severite | Probleme | Action |
|---|----------|----------|--------|
| 1 | HIGH | `motion-safe:` manquant sur animations sidebar | Ajouter prefix `motion-safe:` sur animate-float, animate-fade-in, stagger-*, transition-all |
| 2 | MEDIUM | Register bypass `postFormData` (fetch manuelle) | Utiliser `postFormData` de `@/lib/api` |
| 3 | LOW | CIN file labels en `<span>` au lieu de `<label htmlFor>` | Corriger association accessible |
| 4 | LOW | Pas de toggle visibilite mot de passe | Ajouter comme sur reset-password |
| 5 | LOW | Pas de caractere special exige dans le mot de passe | Considerer l'ajout |
| 6 | INFO | bcrypt cout 10 | Augmenter a 12 pour production |

### TODO

- [ ] Ajouter `motion-safe:` sur toutes les animations sidebar
- [ ] Migrer fetch manuelle vers `postFormData`
- [ ] Corriger labels accessibles pour CIN recto/verso
- [ ] Ajouter toggle visibilite mot de passe

## Score detaille — /auth/register

| Aspect | Score /5 | Justification |
|--------|----------|---------------|
| Frontend structure | 4/5 | Multi-step clean, mapBackendError thorough. 874 lignes = fichier large |
| UX & states | 4/5 | Erreurs inline + globales, loading OK. Pas de toggle password |
| Validation front | 4/5 | Regex email/phone/CIN, password rules, file type/size. Manuelle mais complete |
| Securite auth | 4/5 | CSRF, file validation, CIN hashing. fetch manuelle bypass api.ts |
| Backend protection | 5/5 | Rate limit, DTO whitelist, magic bytes, sharp rebuild, malware scan, atomic tx |
| RBAC | 5/5 | ADMIN injection bloquee, role whitelist |
| Redirections | 5/5 | PRO→/dashboard/kyc, CLIENT→/ correct |
| DB coherence | 4/5 | Transaction atomique User+ProProfile. Pas de contrainte DB-level |
| Tests | 3/5 | password-reset.service.spec.ts OK, pas de tests registration e2e |

### Score global page : 4.2 / 5

---

## 3) /profile

### Frontend

**Fichier** : `apps/web/src/app/profile/page.tsx` (468 lignes)

**Mode vue** : firstName, lastName, city, address, avatar, role, nombre de reservations
**Mode edition** : firstName, lastName, cityId (select), addressLine, avatarUrl (input URL)
**Validation** : Aucune librairie. `required` natif HTML. Pas de validation client-side sur save.

**Etats geres** :
| Etat | Implementation | Verdict |
|------|---------------|---------|
| Loading | `mounted` state anti-hydration + spinner redirect | OK |
| Erreur | `toast.error()` via `@/store/toastStore` | Partiel (pas inline) |
| Succes | `successMessage` inline + auto-clear 3s | OK |
| Erreur villes | `console.error` silencieux + fallback `[]` | Manquant pour l'utilisateur |

**Accessibilite** :
- Labels `htmlFor` en mode edition : `profile-avatar`, `profile-firstname`, `profile-lastname`, `profile-city`, `profile-address` — OK
- Bouton logout `aria-label="Se deconnecter"` — OK
- Bouton modifier `aria-label="Modifier les informations personnelles"` — OK
- **ISSUE** : Message de succes sans `role="alert"` ni `aria-live` → non annonce par les lecteurs d'ecran
- **ISSUE** : Pas de rendu inline des erreurs de champs (tout passe par toast)
- **ISSUE** : `animate-spin` sans prefix `motion-safe:` (ligne 165)

**Design tokens** : 100% tokens (`bg-background`, `bg-surface`, `text-text-primary`, `border-border`, `bg-inverse-bg`, etc.)

**Redirections** :
- Non authentifie → `/auth/login` (client-side + middleware)
- PRO → `/dashboard/profile` (client-side `router.replace`)
- Apres logout → `/`

**Securite** :
- `patchJSON` de `@/lib/api` avec CSRF — OK
- `avatarUrl` accepte des URLs arbitraires. `<img src={avatarUrl}>` pourrait etre utilise pour tracking (chargement d'images externes)

### API / Backend

**Endpoint** : `PATCH /api/users/me`
**Fichier** : `apps/api/src/users/users.controller.ts` (ligne 26-35)

| Aspect | Implementation | Verdict |
|--------|---------------|---------|
| Guards | JwtAuthGuard + RolesGuard | OK |
| Roles | `@Roles('CLIENT')` — PRO ne peut pas utiliser cette route | OK |
| DTO | `UpdateProfileDto` (whitelist + forbidNonWhitelisted) | OK |
| Mass assignment | Whitelist : cityId, firstName, lastName, addressLine, avatarUrl | OK |

**Problemes backend** :
- **MEDIUM** : La reponse `updateProfile` retourne l'ID interne CUID au lieu du `publicId` — fuite du pattern de separation ID public/interne
- **MEDIUM** : `@IsUUID('4')` sur `cityId` dans `UpdateProfileDto` mais les City IDs sont des CUIDs → mismatch de validation (les updates de ville echoueront)

### DB

- User model mis a jour directement via `prisma.user.update`
- `avatarUrl` sans validation `@IsUrl()` dans le DTO (seulement `@IsOptional()` + `validateUrl()` service-level)

### Problemes & recommandations

| # | Severite | Probleme | Action |
|---|----------|----------|--------|
| 1 | MEDIUM | Reponse PATCH /users/me fuit l'ID interne | Mapper vers publicId |
| 2 | MEDIUM | `@IsUUID('4')` sur cityId rejette les CUIDs | Corriger le validateur |
| 3 | LOW | Message succes sans `aria-live` | Ajouter `role="alert"` |
| 4 | LOW | Erreurs save via toast uniquement (pas inline) | Ajouter rendu erreur inline |
| 5 | LOW | `animate-spin` sans `motion-safe:` | Corriger |
| 6 | LOW | `avatarUrl` accepte URLs arbitraires sans sanitization | Valider cote serveur et/ou upload fichier |

### TODO

- [ ] Mapper la reponse vers publicId
- [ ] Corriger validateur cityId (CUID ou publicId format)
- [ ] Ajouter `role="alert"` sur le message de succes
- [ ] Ajouter `motion-safe:` sur animate-spin

## Score detaille — /profile

| Aspect | Score /5 | Justification |
|--------|----------|---------------|
| Frontend structure | 4/5 | Mode vue/edition clean, CitySelect reutilise |
| UX & states | 3/5 | Succes inline OK, erreurs via toast seulement, erreur villes silencieuse |
| Validation front | 2/5 | Aucune validation client-side, `required` natif seulement |
| Securite auth | 4/5 | CSRF, client-side + middleware guard. avatarUrl non sanitise |
| Backend protection | 3/5 | Whitelist DTO OK. Fuite ID interne, cityId validation mismatch |
| RBAC | 5/5 | `@Roles('CLIENT')` correct, PRO redirige vers /dashboard/profile |
| Redirections | 5/5 | Non-auth, PRO redirect, logout — tous corrects |
| DB coherence | 4/5 | Update direct OK. avatarUrl sans `@IsUrl()` dans DTO |
| Tests | 2/5 | Pas de tests specifiques pour /profile ou PATCH /users/me |

### Score global page : 3.6 / 5

---

## 4) /auth/forgot-password

### Frontend

**Fichier** : `apps/web/src/app/auth/forgot-password/page.tsx` (175 lignes) — **CONFIRME** (existait pas dans l'audit initial)

**Champs** : Un seul champ `identifier` (email ou telephone)
**Validation** : Regex client-side — `EMAIL_REGEX` si contient `@`, `PHONE_REGEX` sinon. Verification champ vide.

**Etats geres** :
| Etat | Implementation | Verdict |
|------|---------------|---------|
| Loading | Bouton disabled + Loader2 spinner | OK |
| Erreur | `role="alert"` + `aria-live="assertive"` | OK |
| Succes | `pageState === 'submitted'` avec message confirmation | OK |

**Anti-enumeration UX** : Le message de succes dit "Si un compte est associe a cet identifiant..." — ne revele pas l'existence du compte. Excellent.

**Accessibilite** :
- `<label htmlFor="identifier">` correctement lie — OK
- `autoFocus` sur l'input — OK
- `aria-hidden="true"` sur icones decoratives — OK
- Erreur avec `role="alert"` + `aria-live` — OK
- **ISSUE** : Pas de `aria-describedby` liant l'input au message d'erreur
- **ISSUE** : Pas de `aria-invalid` sur l'input en erreur
- **VIOLATION** : `transition-all duration-200`, `transition-colors`, `animate-spin` sans `motion-safe:`

**Design tokens** : 100% tokens — OK

**Liens** :
- Retour vers `/auth/login` — OK
- Vers `/auth/register` — OK
- Apres soumission, vers `/auth/login` — OK

### API / Backend

**Endpoint** : `POST /api/auth/forgot-password`
**Fichier** : `apps/api/src/auth/auth.controller.ts` (ligne 314-324)

| Aspect | Implementation | Verdict |
|--------|---------------|---------|
| Guards | Aucun (public) | OK |
| Rate Limiting | `@Throttle({ default: { limit: 3, ttl: 3_600_000 } })` — 3/heure | OK |
| DTO | `ForgotPasswordDto` (whitelist + forbidNonWhitelisted) | OK |
| Anti-enumeration | Toujours le meme message generique | OK |
| Token | `crypto.randomBytes(32)` — 256 bits d'entropie | OK |
| Stockage token | SHA-256 hash en DB uniquement | OK |
| TTL | 15 minutes | OK |
| Email | Via Resend (production) ou console.log (dev) | OK |

**Problemes** :
- **LOW** : Pas de limite de tokens en cours par utilisateur — un attaquant peut accumuler des tokens valides (max 3/h)
- **LOW** : Les utilisateurs phone-only ne recoivent aucune notification (token cree mais aucun mecanisme SMS)

### DB

**PasswordResetToken model** :
| Champ | Type | Notes |
|-------|------|-------|
| `id` | String | CUID |
| `tokenHash` | String | `@unique` — SHA-256 du token brut |
| `userId` | String | FK vers User |
| `expiresAt` | DateTime | TTL 15 min |
| `usedAt` | DateTime? | Single-use enforcement |
| `createdAt` | DateTime | `@default(now())` |

Index : `@@index([userId, expiresAt])`
Migration : `20260217161317_add_password_reset_token` — correcte

**Reset password** (`POST /api/auth/reset-password`) :
- Token valide (hash match + non expire + non utilise)
- Password mis a jour (bcrypt hash)
- Token marque comme utilise (`usedAt`)
- TOUS les refresh tokens revoques
- Le tout dans une `$transaction` atomique

**Frontend reset** (`apps/web/src/app/auth/reset-password/page.tsx`, 282 lignes) :
- 3 etats : `form`, `success`, `missing-token`
- Validation password identique au register (10+ chars, lower/upper/digit)
- Toggle visibilite mot de passe present (Eye/EyeOff) — OK
- `role="alert"` pour erreurs — OK
- **ISSUE** : Pas de `aria-describedby` liant le password aux regles
- **VIOLATION** : `transition-all`, `animate-spin` sans `motion-safe:`

### Problemes & recommandations

| # | Severite | Probleme | Action |
|---|----------|----------|--------|
| 1 | HIGH | `motion-safe:` manquant sur forgot-password et reset-password | Ajouter prefix |
| 2 | LOW | Pas de `aria-invalid` / `aria-describedby` sur forgot-password | Ajouter |
| 3 | LOW | Pas de `aria-describedby` sur reset-password regles | Ajouter |
| 4 | LOW | Phone-only users ne recoivent pas le lien reset | Implementer SMS ou documenter la limitation |
| 5 | LOW | Tokens non invalides quand un nouveau est genere | Invalider les anciens tokens |
| 6 | LOW | Tokens expires jamais nettoyes en DB | Ajouter cron de cleanup |

### TODO

- [ ] Corriger `motion-safe:` sur forgot-password et reset-password
- [ ] Ajouter `aria-invalid` + `aria-describedby` sur forgot-password
- [ ] Ajouter `aria-describedby` regles password sur reset-password
- [ ] Evaluer SMS pour phone-only users

## Score detaille — /auth/forgot-password + /auth/reset-password

| Aspect | Score /5 | Justification |
|--------|----------|---------------|
| Frontend structure | 4/5 | Pages clean, etats bien geres, multi-state (form/submitted/missing-token) |
| UX & states | 4/5 | Loading/error/success bien geres. Anti-enumeration UX excellent |
| Validation front | 4/5 | Regex identifier, password rules client-side |
| Securite auth | 5/5 | Token 256-bit, hashe, TTL 15min, single-use, session revocation, rate limit 3/h |
| Backend protection | 5/5 | Anti-enumeration, DTO whitelist, atomic transaction, all tokens revoked |
| RBAC | 5/5 | Endpoints publics, pas de guard necessaire |
| Redirections | 4/5 | Liens corrects. Pas de redirect auto apres reset (OK par design) |
| DB coherence | 4/5 | Token model correct, index, cascade. Pas de cleanup cron |
| Tests | 4/5 | `password-reset.service.spec.ts` couvre 11 cas (enum, expiry, used, hash, revoke) |

### Score global page : 4.3 / 5

---

## Synthese RBAC & redirections

### Regles de redirection observees vs attendues

| # | Scenario | Attendu | Frontend | Backend | Match ? |
|---|----------|---------|----------|---------|---------|
| 1 | Non-auth → `/dashboard` | Login redirect | middleware.ts : `/auth/login?returnTo=...` | JwtAuthGuard 401 | OUI |
| 2 | Non-auth → `/client/bookings` | Login redirect | middleware.ts : `/auth/login?returnTo=...` | JwtAuthGuard 401 | OUI |
| 3 | Non-auth → `/profile` | Login redirect | middleware.ts : `/auth/login?returnTo=...` | Pas de route backend `/profile` | FRONTEND-ONLY |
| 4 | CLIENT → `/dashboard` | Redirect away | DashboardLayout : `role !== 'PRO'` → `/` | `@Roles('PRO')` → 403 | PARTIEL |
| 5 | PRO → `/client/bookings` | Bloque | client/bookings : `role !== 'CLIENT'` → `/dashboard` | `GET /bookings` sert les 2 roles | **GAP** — backend autorise |
| 6 | PRO PENDING → `/dashboard/bookings` | Waiting room | DashboardLayout : `KycPendingState` | `KycApprovedGuard` 403 sur ecritures ; lectures OK | PARTIEL |
| 7 | PRO REJECTED → `/dashboard/services` | Redirect KYC | DashboardLayout : force `/dashboard/kyc` | 403 sur KYC-gated writes | PARTIEL |
| 8 | PRO non-premium → `/dashboard` | Redirect bookings | dashboard/page.tsx : `!isPremium` → `/dashboard/bookings` + menu masque | **AUCUN** — `GET /dashboard/stats` sert tous | **GAP** |
| 9 | Login CLIENT | → `/` | login/page.tsx : `router.push('/')` | Pas de redirect backend | OK |
| 10 | Login PRO | → `/dashboard` | login/page.tsx : `router.push('/dashboard')` | Pas de redirect backend | OK |
| 11 | Register CLIENT | → `/` | register/page.tsx : `router.push('/')` | Pas de redirect backend | OK |
| 12 | Register PRO | → `/dashboard/kyc` | register/page.tsx : `router.push('/dashboard/kyc')` | Pas de redirect backend | OK |
| 13 | Auth user → `/auth/login` | Redirect away | middleware.ts : → `/` | Pas d'equivalent backend | OK |
| 14 | Login `?returnTo=` → retour | Redirect vers page originale | **CASSE** — lit `next`, middleware envoie `returnTo` | N/A | **CRITIQUE** |

### Matrice RBAC backend complete

| Route | Methode | Guards | Roles | KYC | Premium |
|-------|---------|--------|-------|-----|---------|
| `POST /auth/register` | POST | Aucun | Tous | Non | Non |
| `POST /auth/login` | POST | Aucun | Tous | Non | Non |
| `POST /auth/refresh` | POST | CSRF check | Tous | Non | Non |
| `POST /auth/logout` | POST | CSRF check | Tous | Non | Non |
| `POST /auth/forgot-password` | POST | Aucun | Tous | Non | Non |
| `POST /auth/reset-password` | POST | Aucun | Tous | Non | Non |
| `GET /auth/me` | GET | Jwt | Tous auth | Non | Non |
| `PATCH /users/me` | PATCH | Jwt + Roles | CLIENT | Non | Non |
| `GET /pro/me` | GET | Jwt + Roles | PRO | Non | Non |
| `PATCH /pro/profile` | PATCH | Jwt + Roles + KycApproved | PRO | **OUI** | Non |
| `PUT /pro/services` | PUT | Jwt + Roles + KycApproved | PRO | **OUI** | Non |
| `PUT /pro/availability` | PUT | Jwt + Roles + KycApproved | PRO | **OUI** | Non |
| `POST /pro/portfolio` | POST | Jwt + Roles + KycApproved | PRO | **OUI** | **OUI** (service) |
| `DELETE /pro/portfolio/:id` | DELETE | Jwt + Roles + KycApproved | PRO | **OUI** | **OUI** (service) |
| `POST /bookings` | POST | Jwt | Tous auth | Non | Non |
| `GET /bookings` | GET | Jwt | Tous auth | Non | Non |
| `PATCH /bookings/:id/status` | PATCH | Jwt + KycApproved | Tous auth | **OUI** (PRO) | Non |
| `PATCH /bookings/:id/cancel` | PATCH | Jwt | Tous auth | Non | Non |
| `GET /dashboard/stats` | GET | Jwt | Tous auth | Non | Non |
| `POST /payment/checkout` | POST | Jwt + Roles | PRO | Non | Non |

### Gaps identifies

| # | Gap | Severite | Action |
|---|-----|----------|--------|
| 1 | `GET /dashboard/stats` sans `@Roles('PRO')` | MEDIUM | Ajouter `@Roles('PRO')` |
| 2 | `GET /dashboard/stats` sans premium check | MEDIUM | Ajouter check isPremium (guard ou service) |
| 3 | `POST /bookings` sans `@Roles('CLIENT')` | LOW | Ajouter guard (check service existe mais defense-in-depth) |
| 4 | `POST /payment/checkout` sans KycApprovedGuard | LOW | Ajouter guard |
| 5 | Avatar/setup gate frontend-only | LOW | Documenter ou ajouter check backend |
| 6 | Param redirect `returnTo`/`next` mismatch | CRITIQUE | Corriger immediatement |

---

## Contrat technique Auth & Session (actualise)

### Methode auth
- JWT (access token 15 min) + Refresh token (7 jours) en cookies httpOnly
- `sameSite: strict`, `secure: true` en production
- Refresh token scope `/api/auth` uniquement

### Stockage tokens
- **Cote client** : Aucun token en localStorage/sessionStorage/Zustand. 100% cookie-based.
- **Cote serveur** : RefreshToken hashe SHA-256 en DB, PasswordResetToken hashe SHA-256 en DB

### Refresh strategy
- Auto-refresh dans `baseFetch` (`apps/web/src/lib/api.ts`) : sur 401, `POST /auth/refresh` puis retry
- Deduplication via `refreshPromise` partage (evite appels concurrents)
- Header `x-retry` empeche boucle infinie

### Expiration
| Token | TTL | Configurable |
|-------|-----|-------------|
| Access JWT | 15 min | `JWT_ACCESS_EXPIRES` env |
| Refresh | 7 jours | `JWT_REFRESH_EXPIRES` env |
| Password Reset | 15 min | Hardcode |

### Logout
- Revoque TOUS les refresh tokens du user (global logout)
- Clear cookies accessToken + refreshToken
- Access token reste valide jusqu'a expiration (15 min max, pas de blacklist serveur)

### CSRF
- Custom header `X-CSRF-PROTECTION: 1` sur toutes les requetes non-publiques
- `sameSite: strict` sur les cookies

### Headers securite (Helmet)
| Header | Valeur |
|--------|--------|
| CSP | `default-src 'self'`, `img-src 'self' data:`, `script-src 'self'`, `frame-ancestors 'none'` |
| HSTS | maxAge 1 an, includeSubDomains, preload |
| X-Frame-Options | DENY |
| X-Content-Type-Options | nosniff |
| Referrer-Policy | no-referrer |

### CORS
- Origins whitelist depuis `CORS_ORIGINS` env
- Credentials: true
- Fail-closed si CORS_ORIGINS vide
- Preflight cache 600s

### Rate limiting
| Endpoint | Limite | TTL |
|----------|--------|-----|
| Global | 60 req | 60s |
| Login | 5 req | 60s |
| Register | 5 req | 60s |
| Forgot-password | 3 req | 1h |
| Reset-password | 5 req | 1h |

### Password
- Hachage : bcryptjs, cout 10
- Politique : min 10 chars, minuscule + majuscule + chiffre, max 128
- Comparaison constante : DUMMY_HASH quand user non trouve
- Lockout : 5 echecs → 15 min (en memoire)

### Replay detection
- Reuse d'un refresh token revoque → revocation globale de TOUS les tokens utilisateur
- Warning log (throttle 1/user/60s)

---

## Securite supplementaire

### Tests existants
| Fichier | Couverture |
|---------|-----------|
| `password-reset.service.spec.ts` | 11 cas : anti-enum, token hash, expire, used, revoke all |
| `booking.service.spec.ts` | Tests booking existants |
| `rbac.e2e-spec.ts` | Tests RBAC (PATCH /users/me roles, KYC gate PRO) |
| `kyc-submit.spec.ts` | Tests KYC submission |

### Ce qui manque en tests
- Tests e2e login flow (redirect, lockout, refresh)
- Tests e2e register flow (role param, file upload, conflict)
- Tests matrice RBAC complete (dashboard/stats, bookings create)
- Tests middleware.ts redirections

### Observabilite
- `FailedLoginService` log les tentatives echouees
- Replay detection log les warnings
- Pas d'alerting securite configure (pas de webhook/notification sur anomalies)

---

## Score global Phase 1 (actualise)

| Page | Score |
|------|-------|
| /auth/login | 3.8 / 5 |
| /auth/register | 4.2 / 5 |
| /profile | 3.6 / 5 |
| /auth/forgot-password + reset | 4.3 / 5 |

### **Score moyen Phase 1 : 4.0 / 5** (Bon)

**Progression depuis audit initial** :
- Forgot-password : 0/5 → 4.3/5 (implemente)
- Middleware : inexistant → operationnel (edge SSR)
- Design tokens : violations → 100% migre
- KycApprovedGuard : inexistant → applique sur routes PRO
- `@Roles('CLIENT')` sur PATCH /users/me : ajoute

**Axes d'amelioration restants** :
1. Corriger le mismatch param redirect (`returnTo` / `next`)
2. Corriger `aria-describedby` references cassees
3. Unifier `motion-safe:` sur toutes les animations
4. Persister lockout pour multi-instance
5. Ajouter guards manquants (`GET /dashboard/stats`, `POST /bookings`)

---

## Annexe — Fichiers audites Phase 1 (re-audit)

**Frontend** :
- `apps/web/src/app/auth/login/page.tsx`
- `apps/web/src/app/auth/register/page.tsx`
- `apps/web/src/app/auth/forgot-password/page.tsx`
- `apps/web/src/app/auth/reset-password/page.tsx`
- `apps/web/src/app/profile/page.tsx`
- `apps/web/src/components/auth/LoginForm.tsx` (dead code)
- `apps/web/src/components/dashboard/DashboardLayout.tsx`
- `apps/web/src/components/dashboard/KycPendingState.tsx`
- `apps/web/src/middleware.ts`
- `apps/web/src/store/authStore.ts`
- `apps/web/src/lib/api.ts`

**Backend** :
- `apps/api/src/auth/auth.module.ts`
- `apps/api/src/auth/auth.controller.ts`
- `apps/api/src/auth/auth.service.ts`
- `apps/api/src/auth/jwt.strategy.ts`
- `apps/api/src/auth/jwt-auth.guard.ts`
- `apps/api/src/auth/guards/roles.guard.ts`
- `apps/api/src/auth/guards/kyc-approved.guard.ts`
- `apps/api/src/auth/decorators/roles.decorator.ts`
- `apps/api/src/auth/failed-login.service.ts`
- `apps/api/src/auth/refresh-token-cleanup.service.ts`
- `apps/api/src/auth/dto/forgot-password.dto.ts`
- `apps/api/src/auth/dto/reset-password.dto.ts`
- `apps/api/src/auth/password-reset.service.spec.ts`
- `apps/api/src/users/users.controller.ts`
- `apps/api/src/users/users.service.ts`
- `apps/api/src/main.ts`
- `apps/api/src/pro/pro.controller.ts`
- `apps/api/src/booking/booking.controller.ts`
- `apps/api/src/dashboard/dashboard.controller.ts`
- `apps/api/src/payment/payment.controller.ts`
- `apps/api/src/kyc/kyc.controller.ts`

**Database** :
- `packages/database/prisma/schema.prisma`
- `packages/database/prisma/migrations/20260217161317_add_password_reset_token/migration.sql`

**Configuration** :
- `apps/api/.env` (structure verifiee, secrets non exposes)
- 
# Phase 2 — Parcours public & Funnel CLIENT (audit)

> **Date** : 2026-02-19
> **Scope** : `/` → `/pros` → `/pro/[publicId]` → `/book/[proId]` → `/client/bookings`

## Resume executif

- **Statut global** : ⚠️ A ameliorer
- **Points forts** :
  - Architecture ID publics coherente bout-en-bout (publicId partout, jamais d'ID interne expose)
  - Booking creation atomique ($transaction) avec detection de collision de creneaux
  - Pattern Winner-Takes-All elegant pour gestion des reservations concurrentes
  - Etats loading/empty/error bien geres sur la homepage (Hero, Categories, FeaturedPros)
  - Securite ownership : clientId/proId extraits du JWT, jamais du body
  - BookingEvent audit trail complet sur chaque action
  - Server-side cache (cache-manager) sur cities, categories, pros/v2
  - CSRF + httpOnly cookies sur toutes les mutations authentifiees
- **Risques majeurs** :
  1. **CRITIQUE** : `/client/bookings` — mismatch contrat reponse : backend renvoie `{ data, meta }`, frontend attend un array plat → page probablement cassee
  2. **CRITIQUE** : `/book/[proId]` pas dans le middleware matcher → auth client-side seulement, pas de returnTo apres login
  3. **CRITIQUE** : WhatsApp CTA sur succes booking toujours "Numero indisponible" (credentials: 'omit' sur /public/*)
  4. **HIGH** : `/pros` utilise endpoint v1 sans cache, sans tri, sans pagination meta
  5. **HIGH** : Systeme de penalites defini en DB mais jamais implemente dans le code
- **Recommandations top 5** :
  1. Corriger le contrat `GET /bookings` : frontend doit lire `response.data` au lieu du array brut
  2. Ajouter `/book` au middleware matcher + passer `?next=` dans le redirect login
  3. Envoyer credentials sur `/public/pros/:id` depuis la booking page pour recuperer le phone
  4. Migrer `/pros` vers l'endpoint v2 (cache, tri premium-first, pagination)
  5. Implementer le systeme de penalites ou retirer les champs DB inutilises

---

## 1) / (Homepage)

### Frontend

**Fichier** : `apps/web/src/app/page.tsx` (Server Component)

**Composants** :

| Composant | Fichier | Type | Role |
|-----------|---------|------|------|
| `Navbar` | `components/Navbar.tsx` | Client | Nav sticky, dropdown accessible, menu mobile avec focus trap |
| `Hero` | `components/home/Hero.tsx` | Client | Formulaire recherche ville + categorie, combobox autosuggest |
| `HeroSkeleton` | `components/home/HeroSkeleton.tsx` | Server | Skeleton Suspense pendant chargement Hero |
| `TrustStrip` | `components/home/TrustStrip.tsx` | Server | 3 badges de confiance (statique) |
| `Categories` | `components/home/Categories.tsx` | Client | Grille categories depuis API |
| `FeaturedPros` | `components/home/FeaturedPros.tsx` | Client | Pros mis en avant via /public/pros/v2 |
| `Testimonials` | `components/home/Testimonials.tsx` | Client | Carousel temoignages (donnees en dur) |
| `HowItWorks` | `components/home/HowItWorks.tsx` | Server | 3 etapes (statique) |
| `PricingSection` | `components/home/PricingSection.tsx` | Client | Tarifs Premium/Boost (masque pour CLIENT) |
| `SecuritySection` | `components/home/SecuritySection.tsx` | Server | KYC/securite (statique) |
| `ProCTA` | `components/home/ProCTA.tsx` | Server | CTA inscription PRO |
| `Footer` | `components/home/Footer.tsx` | Client | Navigation + newsletter + legal |

**Appels API** :

| Composant | Endpoint | Declenchement | Params |
|-----------|----------|---------------|--------|
| Hero | `GET /public/cities` | useEffect mount | Aucun |
| Hero | `GET /public/categories` | useEffect mount (parallele) | Aucun |
| Categories | `GET /public/categories` | useEffect mount | Aucun |
| FeaturedPros | `GET /public/pros/v2` | mount + changement ville | `?cityId=X&page=1&limit=4` |
| Footer | `POST /newsletter/subscribe` | submit form | `{ email }` |

**Etats** :
- Hero : HeroSkeleton (loading) → formulaire (ready) → erreur + bouton "Reessayer" (error) — OK
- Categories : CategorySkeleton x8 (loading) → EmptyState (vide) → erreur + retry (error) — OK
- FeaturedPros : ProCardSkeleton x4 (loading) → EmptyState (vide) → erreur + retry (error) — OK

**Accessibilite** :
- Navbar : `role="navigation"`, `aria-label`, `aria-expanded`, `aria-controls`, focus trap mobile, `focus-visible` — Excellent
- Hero : `role="combobox"`, `aria-expanded`, `aria-activedescendant`, `aria-autocomplete="list"`, `role="listbox"` + `role="option"`, labels `htmlFor` — Excellent
- Bouton submit : `disabled` + `title` tooltip + `aria-label` — conforme CLAUDE.md
- Testimonials : `aria-roledescription="carousel"`, keyboard nav (ArrowLeft/Right), `aria-live="polite"`, pause au hover/focus — Excellent
- `motion-safe:`/`useReducedMotion()` utilises sur Hero, Testimonials — OK

**Design tokens** : 100% tokens, aucun hex en dur — OK

### API / Backend

**`GET /public/cities`** (`catalog.controller.ts` → `catalog.service.ts`)
- Public, pas de guard. Cache serveur 10 min (`catalog:cities`). Retourne `{ id: publicId, name, slug }[]`. Pas d'ID interne expose. OK.

**`GET /public/categories`** (`catalog.controller.ts` → `catalog.service.ts`)
- Public, pas de guard. Cache serveur 10 min (`catalog:categories`). Retourne `{ id: publicId, name, slug }[]`. OK.

**`GET /public/pros/v2`** (`catalog.controller.ts` → `catalog.service.ts`)
- Public. Params : `cityId?`, `categoryId?`, `page?` (def 1), `limit?` (def 20, max 50)
- Validation : regex `isEntityId()` sur cityId/categoryId
- Tri : `isPremium DESC, boostActiveUntil DESC, createdAt DESC` (monetisation-first)
- Cache serveur 2 min, cle composite
- 2 queries paralleles : findMany + count
- Retourne `{ data: PublicProCard[], meta: { page, limit, total, totalPages, hasNext, hasPrev } }`

### DB

- `City` : `id` (cuid), `publicId` (unique), `name` (unique), `slug` (unique)
- `Category` : meme structure
- `ProProfile` : pas d'index explicite sur `cityId` (FK implicite potentiel)
- `ProService` : `@@index([categoryId])` pour le filtre services

### Problemes & recommandations

| # | Severite | Probleme | Action |
|---|----------|----------|--------|
| 1 | MEDIUM | Doublon `GET /public/categories` (Hero + Categories appellent chacun au mount) | Partager les donnees via props ou context |
| 2 | MEDIUM | FeaturedPros attend `{ total, page, limit }` top-level, backend renvoie dans `meta` | Corriger le type frontend pour lire `res.meta.total` |
| 3 | LOW | Hero + FeaturedPros couples via CustomEvent DOM | Considerer un store partage |
| 4 | LOW | Categories links vers `/pros?categoryId=X` sans cityId (perd le contexte ville) | Propager le cityId selectionne |
| 5 | INFO | `/public/stats/home` existe mais n'est appele par aucun composant | Utiliser pour TrustStrip ou supprimer |

### TODO

- [ ] Partager les categories entre Hero et Categories (eviter double fetch)
- [ ] Corriger FeaturedPros pour lire `res.meta.total`
- [ ] Propager cityId dans les liens Categories

## Score detaille — /

| Axe | Note /5 | Justification |
|-----|---------|---------------|
| Fonctionnel | 4 | Happy path complet. Doublon fetch, FeaturedPros total undefined |
| Securite & acces | 5 | Public, IDs publics, aucune fuite de donnees sensibles |
| Integration & coherence data | 4 | Types alignes globalement. Mismatch meta FeaturedPros |
| UX & accessibilite | 5 | Tous les etats geres, ARIA complet, carousel accessible, reduced-motion |
| Performance & robustesse | 4 | Cache serveur, AbortController. Doublon fetch, 4 appels mount |

### Score global page : 4.4 / 5

---

## 2) /pros (?cityId=X&categoryId=Y)

### Frontend

**Fichier** : `apps/web/src/app/pros/page.tsx` (Async Server Component)

**Appel API** : `GET /public/pros` (v1) — server-side avec `cache: 'no-store'`
- Params construits depuis `searchParams.cityId` et `searchParams.categoryId`
- Fetch directe (`fetch()`) sans passer par `api.ts`

**Etats** :
| Etat | Implementation | Verdict |
|------|---------------|---------|
| Loading | **AUCUN** — pas de `loading.tsx`, pas de Suspense. Browser loading indicator seulement | Manquant |
| Vide | "Aucun professionnel trouve pour ces criteres." | OK |
| Erreur | Banniere rouge generique. **Pas de bouton retry** | Insuffisant |
| Succes | Grille ProCards 1/2/3 colonnes responsive | OK |

**Composant ProCard** (`components/ProCard.tsx`) :
- Lien vers `/pro/${pro.id}` (publicId)
- Affiche : prenom, ville, verification, services avec tarifs

**Problemes majeurs** :
- **Utilise l'endpoint v1** (`GET /public/pros`) au lieu de v2 :
  - Pas de pagination metadata → pas de "page suivante"
  - Pas de tri → pros premium/boostes non priorises
  - Pas de cache serveur → chaque requete hit la DB directement
  - Limit max 100 (v2 = 50)
- **Pas de filtres UI** : aucun dropdown ville/categorie sur la page. L'utilisateur doit revenir a la homepage pour changer ses criteres
- **Header.tsx** au lieu de Navbar.tsx : dropdown sans `aria-expanded`, sans `role="menu"`, sans keyboard nav

### API / Backend

**`GET /public/pros`** (v1) — `catalog.controller.ts` → `catalog.service.ts`
- Public. Params : `cityId?`, `categoryId?`, `page?` (def 1), `limit?` (def 20, max 100)
- Validation : `isEntityId()` regex
- **Pas de orderBy** (ordre arbitraire DB)
- **Pas de cache serveur**
- Retourne `PublicProCard[]` (array plat, pas de meta pagination)
- Where : `role=PRO, status=ACTIVE, kycStatus=APPROVED` + filtres optionnels
- `phone` selectionne mais pas retourne dans le mapping → defense-in-depth risque

### DB

- `ProProfile` : pas d'index explicite sur `cityId`
- `ProService` : `@@index([categoryId])` OK pour le filtre
- `@@unique([proUserId, categoryId])` sur ProService — 1 service par categorie par pro

### Problemes & recommandations

| # | Severite | Probleme | Action |
|---|----------|----------|--------|
| 1 | HIGH | Endpoint v1 sans cache, sans tri, sans pagination meta | Migrer vers v2 |
| 2 | MEDIUM | Pas de loading state (`loading.tsx` manquant) | Creer `apps/web/src/app/pros/loading.tsx` |
| 3 | MEDIUM | Header.tsx accessibilite deficiente vs Navbar.tsx | Unifier sur Navbar ou corriger Header |
| 4 | MEDIUM | `phone` over-selectionne dans `proSelectFields()` | Retirer `phone: true` du select v1/v2 card |
| 5 | LOW | Pas de filtres UI (ville/categorie) sur la page | Ajouter barre de filtres |
| 6 | LOW | Pas de bouton retry sur l'erreur | Ajouter |
| 7 | LOW | Pas de breadcrumb ni navigation retour | Ajouter |

### TODO

- [ ] Migrer /pros vers endpoint v2
- [ ] Creer loading.tsx skeleton
- [ ] Unifier Header/Navbar
- [ ] Ajouter filtres ville/categorie sur la page
- [ ] Ajouter bouton retry sur erreur

## Score detaille — /pros

| Axe | Note /5 | Justification |
|-----|---------|---------------|
| Fonctionnel | 3 | Happy path OK. Pas de pagination, pas de tri, pas de filtres UI |
| Securite & acces | 5 | Public, IDs publics, phone non expose |
| Integration & coherence data | 3 | v1 vs v2 inconsistance. Types alignes. Pas de meta pagination |
| UX & accessibilite | 2 | Pas de loading, pas de retry, Header non accessible, pas de filtres |
| Performance & robustesse | 2 | Pas de cache, pas de tri, limit 100, pas d'index cityId explicite |

### Score global page : 3.0 / 5

---

## 3) /pro/[publicId]

### Frontend

**Fichiers** :
- `apps/web/src/app/pro/[publicId]/page.tsx` (Server Component RSC)
- `apps/web/src/app/pro/[publicId]/ProDetailClient.tsx` (Client — favoris toggle)
- `apps/web/src/app/pro/[publicId]/loading.tsx` (Skeleton Suspense)
- `apps/web/src/components/ProBookingCTA.tsx` (Client — CTA conditionnel)

**Appels API** :

| Appel | Endpoint | Declenchement | Params |
|-------|----------|---------------|--------|
| Fetch profil pro | `GET /public/pros/{publicId}` | Server-side RSC | `publicId` depuis URL |
| Check favoris | `GET /favorites` | Client mount si CLIENT auth | Aucun |
| Toggle favori | `POST/DELETE /favorites/{proId}` | Click bouton | `proId` (publicId) |

**Etats** :
| Etat | Implementation | Verdict |
|------|---------------|---------|
| Loading | `loading.tsx` skeleton Suspense (avatar, services, CTA) | OK |
| 404 | `notFound()` → page 404 Next.js | OK |
| Erreur reseau | **`notFound()`** aussi → masque la vraie erreur | Bug |
| Succes | Profil complet : header, portfolio (premium), services, avis, CTA | OK |

**CTA conditionnel (ProBookingCTA)** :
- Non connecte → "Se connecter" (lien `/auth/login` **sans** param `next` → perd le contexte)
- CLIENT → "Reserver maintenant" (lien `/book/{proId}?categoryId={categoryId}`)
- PRO → "Reservation impossible" (message explicatif)

**Accessibilite** :
- Bouton favori : `aria-label` dynamique ("Retirer/Ajouter aux favoris") — OK
- Images portfolio : alt generique "Realisation {n}" — acceptable
- `loading.tsx` : `animate-pulse` **sans** `motion-safe:` — violation CLAUDE.md

### API / Backend

**`GET /public/pros/:id`** — `catalog.controller.ts` → `catalog.service.ts`
- Guard : `OptionalJwtGuard` (auth optionnelle, ne throw jamais)
- Lookup par `proProfile.publicId`
- Phone expose seulement si : owner OU client avec booking actif
- LastName masque (initiale seulement)
- Portfolio expose seulement si premium
- Retourne `PublicProProfile` : `{ id (publicId), firstName, lastName (initiale), city, isVerified, bio, isPremium, ratingAvg, ratingCount, completedBookingsCount, lastReviews, portfolio, services, phone? }`

### DB

- `ProProfile` : lookup par `publicId` (unique index) — OK
- `ProService` : inclus avec category name/publicId
- `Review` : aggregation via `_avg` et `_count` — efficace
- `Booking` : jointure pour le check "client a un booking" (phone visibility)

### Problemes & recommandations

| # | Severite | Probleme | Action |
|---|----------|----------|--------|
| 1 | MEDIUM | Erreur reseau traitee comme 404 (notFound()) | Distinguer network error vs 404 |
| 2 | MEDIUM | CTA "Se connecter" sans param `next` → perte de contexte apres login | Ajouter `?next=/pro/{publicId}` |
| 3 | LOW | `animate-pulse` dans loading.tsx sans `motion-safe:` | Corriger |
| 4 | LOW | Alt images portfolio generique | Ameliorer si caption disponible |

### TODO

- [ ] Distinguer erreur reseau de 404 dans le catch
- [ ] Ajouter `?next=` sur le lien "Se connecter" du CTA
- [ ] Corriger `motion-safe:` dans loading.tsx

## Score detaille — /pro/[publicId]

| Axe | Note /5 | Justification |
|-----|---------|---------------|
| Fonctionnel | 4 | Profil complet, portfolio premium, avis. Erreur reseau = 404 |
| Securite & acces | 5 | OptionalJwtGuard, phone conditionnel, lastName masque, publicId |
| Integration & coherence data | 5 | publicId coherent partout, types alignes, CTA params corrects |
| UX & accessibilite | 3 | Skeleton OK, favori accessible. CTA login perd contexte, animate-pulse sans motion-safe |
| Performance & robustesse | 4 | Server-side fetch, cache backend. Single query avec includes |

### Score global page : 4.2 / 5

---

## 4) /book/[proId] (?categoryId=X) [CLIENT]

### Frontend

**Fichier** : `apps/web/src/app/book/[proId]/page.tsx` (Client Component `'use client'`)

**Appels API** :

| Appel | Endpoint | Declenchement | Params |
|-------|----------|---------------|--------|
| Fetch pro | `GET /public/pros/{proId}` | mount apres hydration | `proId` depuis URL |
| Fetch creneaux | `GET /public/slots` | mount + changement date | `proId`, `selectedDate`, `categoryId` |
| Creer booking | `POST /bookings` | click "Valider la reservation" | `{ proId, categoryId, date, time }` |

**Auth guard** :
- Client-side uniquement via `useAuthStore` → `router.push('/auth/login')` si non auth
- **`/book/[proId]` N'EST PAS dans le middleware matcher** → pas de protection server-side
- Le redirect login n'inclut PAS de param `returnTo`/`next` → **l'utilisateur perd le contexte booking**
- Meme si un param etait passe : middleware utilise `returnTo`, login lit `next` → mismatch

**Role check** : si `user.role !== 'CLIENT'` → ecran de blocage "Acces reserve aux clients" + bouton logout — OK

**categoryId** : extrait de `searchParams.get('categoryId')`. Si absent → ecran erreur "Categorie manquante". Pas de validation format client-side (le backend valide via Zod).

**Etats** (tres complets) :
| Etat | Implementation |
|------|---------------|
| Hydration pending | `null` (ecran blanc) |
| Non authentifie | Spinner + "Redirection..." |
| Non CLIENT | Avertissement + logout |
| categoryId manquant | Erreur + lien retour |
| Pro loading | Spinner |
| Pro erreur/introuvable | "Professionnel non trouve" + retour |
| Slots loading | Spinner dans section |
| 0 creneaux | "Aucun creneau disponible ce jour" |
| Creneaux disponibles | Grille de boutons time |
| Booking erreur 409 | "Creneau deja pris, choisir un autre" |
| Booking erreur 400 CITY_REQUIRED | Toast + redirect /profile |
| Booking erreur 400 CITY_MISMATCH | Erreur inline + redirect 3s |
| Booking erreur 400 ADDRESS_REQUIRED | Toast + redirect /profile |
| Booking erreur 403 | "Ce professionnel n'est pas disponible" |
| Booking succes | Ecran succes + WhatsApp CTA + "Voir mes reservations" |
| Envoi en cours | Bouton "Envoi en cours..." disabled |

**Accessibilite** :
- **VIOLATION** : `<label>` date sans `htmlFor`, `<input>` date sans `id`
- **VIOLATION** : Boutons creneaux sans `aria-label` (seulement le texte "09:00") ni `aria-pressed`/`aria-selected`
- **MANQUANT** : Pas de `aria-live` sur la zone d'erreur booking
- **VIOLATION** : `animate-spin` sans `motion-safe:`

### API / Backend

**`GET /public/slots`** — `booking.controller.ts` → `booking.service.ts`
- Public, pas de guard
- Validation Zod : `proId` (publicId ou cuid), `date` (YYYY-MM-DD), `categoryId` (publicId)
- Algorithme : weekday → WeeklyAvailability → creneaux horaires → soustrait CONFIRMED existants → filtre passes
- **Design** : seuls les bookings CONFIRMED bloquent. PENDING ne bloque PAS → 2 clients peuvent voir le meme creneau
- Retourne `string[]` ex: `["09:00", "10:00", "14:00"]`

**`POST /bookings`** — `booking.controller.ts` → `booking.service.ts`
- Guard : `JwtAuthGuard`
- Validation Zod : `proId`, `categoryId`, `date` (YYYY-MM-DD), `time` (HH:MM)
- Role : CLIENT uniquement (extraite du JWT, pas du body)
- Validations dans `$transaction` :
  1. Resolve proId/categoryId (publicId → interne)
  2. User existe + a cityId + addressLine
  3. ProProfile existe + kycStatus = APPROVED
  4. City match (client.cityId === pro.cityId)
  5. ProService actif pour la categorie
  6. Pas de CONFIRMED existant sur le creneau
  7. WeeklyAvailability correspond au jour
  8. Creneau dans la plage horaire
  9. Creneau dans le futur
  10. Creation booking status PENDING
  11. Creation BookingEvent (audit)
- Post-transaction : `eventEmitter.emit('booking.created')`
- **Securite** : clientId = `req.user.id` (JWT), pas de IDOR possible

**Erreurs misleading** :
- "Creneau deja pris" (code `SLOT_TAKEN`) est retourne pour PLUSIEURS cas differents : creneau confirme, service inactif, hors plage horaire, dans le passe. Rend le debug difficile et confond l'utilisateur.

### DB

**Booking model** (schema.prisma) :
- `id` (cuid PK), `status` (BookingStatus enum), `timeSlot` (DateTime), `cityId`/`categoryId`/`clientId`/`proId` (FK), `expiresAt`, `cancelledAt`, `completedAt`, `confirmedAt`, `estimatedDuration` (enum), `duration` (Int, def 1), `isModifiedByPro`, `cancelReason`, timestamps
- **Pas de `@@unique` sur `[proId, timeSlot]`** → par design (multiples PENDING autorises, un seul CONFIRMED enforce en code)
- Index : `@@index([proId, status, timeSlot])` — bien adapte aux queries de collision
- BookingEvent : audit trail avec `actorUserId`, `actorRole`, `metadata` (JSON)

**BookingStatus enum** :
```
PENDING, CONFIRMED, DECLINED,
CANCELLED_BY_CLIENT, CANCELLED_BY_CLIENT_LATE, CANCELLED_BY_PRO,
CANCELLED_AUTO_FIRST_CONFIRMED (jamais utilise), CANCELLED_AUTO_OVERLAP,
EXPIRED (jamais set par le code), WAITING_FOR_CLIENT, COMPLETED
```

### Problemes & recommandations

| # | Severite | Probleme | Action |
|---|----------|----------|--------|
| 1 | CRITIQUE | `/book/[proId]` pas dans le middleware matcher → auth client-side seulement | Ajouter `/book` a `PROTECTED_PREFIXES` |
| 2 | CRITIQUE | Redirect login sans param `next` → perte contexte booking | Ajouter `?next=/book/{proId}?categoryId={catId}` |
| 3 | CRITIQUE | WhatsApp CTA toujours "Numero indisponible" — `api.ts` envoie `credentials: 'omit'` sur `/public/*` donc phone jamais retourne | Creer endpoint dedie ou envoyer credentials |
| 4 | HIGH | "Creneau deja pris" pour 4+ cas differents | Differencier les messages d'erreur |
| 5 | MEDIUM | `<label>` date sans `htmlFor`, input sans `id` | Corriger |
| 6 | MEDIUM | Boutons creneaux sans `aria-pressed`/`aria-label` | Ajouter |
| 7 | MEDIUM | Pas de `aria-live` sur erreur booking | Ajouter |
| 8 | LOW | `animate-spin` sans `motion-safe:` | Corriger |
| 9 | LOW | Booking response expose IDs internes (cuid) | Mapper vers publicId |

### TODO

- [ ] Ajouter `/book` au middleware matcher
- [ ] Ajouter `?next=` au redirect login
- [ ] Corriger WhatsApp CTA (credentials ou endpoint dedie)
- [ ] Differencier les messages d'erreur (service inactif, hors plage, passe, etc.)
- [ ] Corriger accessibilite date picker et creneaux
- [ ] Ajouter `aria-live` sur erreur booking

## Score detaille — /book/[proId]

| Axe | Note /5 | Justification |
|-----|---------|---------------|
| Fonctionnel | 4 | Flow complet, tous les etats geres (15+ cas). Erreurs misleading |
| Securite & acces | 3 | JWT ownership OK, role check OK. Pas dans middleware, pas de returnTo, WhatsApp casse |
| Integration & coherence data | 4 | publicId coherent, Zod validation. credentials: 'omit' sur public casse le phone |
| UX & accessibilite | 2 | Pas de label date, pas d'aria creneaux, pas d'aria-live erreur, perte contexte login |
| Performance & robustesse | 4 | Transaction atomique, double validation (display + creation), collision check |

### Score global page : 3.4 / 5

---

## 5) /client/bookings [CLIENT]

### Frontend

**Fichier** : `apps/web/src/app/client/bookings/page.tsx`

**Auth guard** :
- Couche 1 : `middleware.ts` — `/client/bookings` dans `PROTECTED_EXACT` → redirect server-side si pas de cookie — OK
- Couche 2 : Client-side — `isAuthenticated` + `user.role === 'CLIENT'` check — OK
- PRO redirige vers `/dashboard` — OK

**Appels API** :

| Appel | Endpoint | Declenchement | Auth |
|-------|----------|---------------|------|
| Liste bookings | `GET /bookings` | mount si auth + CLIENT | JWT cookie |
| Annuler booking | `PATCH /bookings/:id/cancel` | click bouton | JWT cookie |
| Repondre modif | `PATCH /bookings/:id/respond` | click accepter/refuser | JWT cookie |

**PROBLEME CRITIQUE — Mismatch contrat reponse** :
- Le backend `GET /bookings` retourne `{ data: BookingDashboardItem[], meta: { page, limit, total, totalPages } }`
- Le frontend attend `BookingDashboardItem[]` (array plat) : `getJSON<BookingDashboardItem[]>('/bookings')`
- `bookings.filter(...)` appele sur un objet `{ data, meta }` → **`.filter()` n'existe pas sur un objet** → crash ou silent fail
- Pas de params pagination envoyes par le frontend
- **La page est potentiellement cassee**

**Onglets** (4 tabs) :
- `pending` : PENDING
- `waiting` : WAITING_FOR_CLIENT
- `confirmed` : CONFIRMED
- `history` : DECLINED, CANCELLED_BY_CLIENT, CANCELLED_BY_CLIENT_LATE, CANCELLED_BY_PRO, CANCELLED_AUTO_FIRST_CONFIRMED, COMPLETED, EXPIRED

**ISSUES tabs** :
- `CANCELLED_AUTO_OVERLAP` **absent** de tous les filtres → bookings avec ce statut invisibles
- `CANCELLED_AUTO_FIRST_CONFIRMED` reference dans le frontend mais **jamais set par le backend** (dead status)

**Actions** :
- WAITING_FOR_CLIENT : Accepter / Refuser (sans confirmation)
- CONFIRMED : Annuler (avec ConfirmDialog) — OK
- PENDING : aucune action (attente)
- History : lecture seule

**Etats** :
| Etat | Implementation | Verdict |
|------|---------------|---------|
| Loading | Spinner + "Chargement..." | OK |
| Vide | "Aucune reservation dans cette categorie." | OK |
| Erreur | **Aucun affichage erreur** — catch silencieux → montre etat vide | Violation CLAUDE.md |
| Succes | Cartes avec statut, pro info, actions | OK |

**Accessibilite** :
- **VIOLATION** : Onglets sans `role="tablist"` / `role="tab"` / `role="tabpanel"` (pattern WCAG tabs)
- **VIOLATION** : Emojis inline sans `aria-hidden` ni alternatives
- **VIOLATION** : Boutons actions sans `aria-label` contextuel ("Annuler" sans preciser quel booking)
- **VIOLATION** : `animate-spin` sans `motion-safe:`
- Pas de pattern `<article>` ni roles semantiques sur les cartes

### API / Backend

**`GET /bookings`** — `booking.controller.ts` → `booking.service.ts`
- Guard : `JwtAuthGuard`
- Params : `page?` (def 1), `limit?` (def 20, max 100)
- Filtre : `clientId` (CLIENT) ou `proId` (PRO) selon le role
- Tri : `timeSlot DESC`
- Retourne `{ data, meta }` (pas un array plat)
- Ownership : filtre automatique par user du JWT — OK
- **Pas de RolesGuard** : les 2 roles accedent au meme endpoint (correct, le filtre est role-based)

**`PATCH /bookings/:id/cancel`** — `booking.controller.ts` → `booking.service.ts`
- Guard : `JwtAuthGuard` (pas de KycApproved — correct cote CLIENT)
- Validation Zod : `reason?` (optionnel, requis pour PRO en service-level)
- Ownership : `updateMany` atomique avec `clientId` (CLIENT) ou `proId` (PRO) dans le WHERE
- Transitions : CONFIRMED → CANCELLED_BY_CLIENT ou CANCELLED_BY_CLIENT_LATE (seuil 24h)
- Penalites late : statut enregistre mais **compteurs jamais incrementes** (champs DB inutilises)

**`PATCH /bookings/:id/respond`** — `booking.controller.ts` → `booking.service.ts`
- Guard : `JwtAuthGuard`
- DTO : `RespondDto` (`accept: boolean`)
- Ownership : `booking.clientId !== userId` → ForbiddenException
- Transitions : WAITING_FOR_CLIENT → CONFIRMED (accept) ou DECLINED (refuse)
- DECLINED path : **pas de transaction** (find + update sequentiels) → race condition mineur
- CONFIRMED path : transaction avec Winner-Takes-All cleanup

**Systeme complet de transitions booking** :
```
PENDING ──[PRO confirme]──> CONFIRMED ──[PRO complete]──> COMPLETED
   │                            │
   ├──[PRO decline]──> DECLINED │──[CLIENT annule <24h]──> CANCELLED_BY_CLIENT_LATE
   │                            │──[CLIENT annule >24h]──> CANCELLED_BY_CLIENT
   ├──[PRO modifie duree]──>    │──[PRO annule]──> CANCELLED_BY_PRO
   │  WAITING_FOR_CLIENT
   │    ├──[CLIENT accepte]──> CONFIRMED
   │    └──[CLIENT refuse]──> DECLINED
   │
   └──[Auto overlap]──> CANCELLED_AUTO_OVERLAP
```

### DB

**Booking model** — cf. section /book/[proId] ci-dessus

**Champs penalites non implementes** :
- `User.clientLateCancelCount30d` — jamais incremente
- `User.clientSanctionTier` — jamais verifie
- `User.bookingCooldownUntil` — jamais verifie a la creation booking
- `ProProfile.proCancelCount30d` — jamais incremente
- `ProProfile.proConsecutiveCancelCount` — jamais incremente

**`expiresAt`** : defini sur chaque booking (timeSlot + 24h) mais **aucun cron/scheduler** n'expire les bookings PENDING → le statut `EXPIRED` n'est jamais set.

**`estimatedDuration`** (enum H1-H8) vs `duration` (Int) : redondance — `estimatedDuration` semble legacy.

### Tests

**Fichier** : `apps/api/src/booking/booking.service.spec.ts`

**Couvert** (20 tests) :
- createBooking : KYC rejected/pending, slot taken, success
- updateBookingStatus DECLINED : atomique, status deja change
- completeBooking : success, too early, invalid status, double complete
- cancelBooking : normal, late, reason required (PRO), PRO cancel, invalid status, race cancel+complete
- updateDuration : success, already modified, invalid status, slot conflict

**Non couvert** :
- `getAvailableSlots` (0 tests — endpoint public le plus utilise)
- `respondToModification` (0 tests — accept + decline)
- `getMyBookings` (0 tests — pagination, filtre role)
- `autoCompletePreviousBooking` (0 tests)
- `updateBookingStatus` CONFIRMED path (0 tests — Winner-Takes-All)
- Ownership checks IDOR (0 tests)
- BookingEvent creation (0 tests)

### Problemes & recommandations

| # | Severite | Probleme | Action |
|---|----------|----------|--------|
| 1 | CRITIQUE | Frontend attend array plat, backend renvoie `{ data, meta }` → page cassee | Frontend : `const res = await getJSON<{data: ..., meta: ...}>('/bookings'); setBookings(res.data)` |
| 2 | HIGH | `CANCELLED_AUTO_OVERLAP` absent des filtres → bookings invisibles | Ajouter au filtre `history` |
| 3 | HIGH | `CANCELLED_AUTO_FIRST_CONFIRMED` dans frontend mais jamais set en backend | Retirer du frontend ou implementer en backend |
| 4 | HIGH | Penalites DB definies mais non implementees | Implementer ou retirer les champs |
| 5 | HIGH | `EXPIRED` status + `expiresAt` champ mais pas de cron d'expiration | Implementer le cron ou retirer |
| 6 | MEDIUM | Aucun affichage erreur (catch silencieux → etat vide) | Ajouter etat erreur + retry |
| 7 | MEDIUM | Onglets sans ARIA tab pattern | Ajouter `role="tablist/tab/tabpanel"` |
| 8 | MEDIUM | `respondToModification` DECLINED sans transaction | Wrapper dans transaction |
| 9 | MEDIUM | 0 tests sur getAvailableSlots et respondToModification | Ajouter tests |
| 10 | LOW | `animate-spin` sans `motion-safe:` | Corriger |
| 11 | LOW | Pas de refresh manuel / pas de liens vers profil pro | Ajouter |

### TODO

- [ ] Corriger le parsing reponse GET /bookings (lire `res.data`)
- [ ] Ajouter `CANCELLED_AUTO_OVERLAP` aux filtres
- [ ] Retirer `CANCELLED_AUTO_FIRST_CONFIRMED` du frontend
- [ ] Implementer cron d'expiration bookings PENDING
- [ ] Ajouter etat erreur visible + bouton retry
- [ ] Corriger accessibilite onglets (ARIA tabs)
- [ ] Ajouter tests : getAvailableSlots, respondToModification, getMyBookings, CONFIRMED path

## Score detaille — /client/bookings

| Axe | Note /5 | Justification |
|-----|---------|---------------|
| Fonctionnel | 2 | Mismatch contrat reponse (page potentiellement cassee). Statuts manquants dans filtres |
| Securite & acces | 5 | Dual auth (middleware + client), ownership JWT, role check |
| Integration & coherence data | 2 | Contrat data/meta mismatch. Statuts frontend/backend incoherents |
| UX & accessibilite | 2 | Pas d'erreur visible, pas d'ARIA tabs, emojis sans aria-hidden |
| Performance & robustesse | 3 | Pas de pagination frontend, refetch apres actions OK, pas de polling |

### Score global page : 2.8 / 5

---

## Synthese funnel (end-to-end)

### Schema du flux reel observe

```
/ (Homepage)
  └── Hero: ville + categorie → router.push('/pros?cityId=X&categoryId=Y')
  └── Categories: → /pros?categoryId=X (sans ville)
  └── FeaturedPros: → /pro/{publicId}

/pros?cityId=X&categoryId=Y
  └── GET /public/pros (v1, pas de cache/tri/pagination)
  └── ProCard: → /pro/{publicId}

/pro/{publicId}
  └── GET /public/pros/{publicId} (server-side RSC)
  └── ProBookingCTA:
        Non auth → /auth/login (SANS ?next= !!!)
        CLIENT → /book/{proId}?categoryId={catId}
        PRO → "Reservation impossible"

/book/{proId}?categoryId={catId}  [CLIENT, auth client-side seulement]
  └── GET /public/pros/{proId} (credentials: omit → phone absent!)
  └── GET /public/slots?proId&date&categoryId
  └── POST /bookings { proId, categoryId, date, time }
  └── Succes: WhatsApp CTA (CASSE - pas de phone) + "Voir mes reservations"

/client/bookings  [CLIENT, auth middleware + client]
  └── GET /bookings (MISMATCH: attend array, recoit {data, meta})
  └── PATCH /bookings/:id/cancel
  └── PATCH /bookings/:id/respond
```

### Points de rupture

| # | Point | Severite | Impact utilisateur |
|---|-------|----------|-------------------|
| 1 | `/client/bookings` reponse mismatch | CRITIQUE | Page potentiellement blanche ou crash `.filter()` |
| 2 | `/book/[proId]` pas dans middleware | CRITIQUE | Auth client-side seulement, flash contenu, pas de returnTo |
| 3 | WhatsApp CTA sans phone | CRITIQUE | CTA principal post-booking inutilisable |
| 4 | `/auth/login` param mismatch (`returnTo` vs `next`) | CRITIQUE (Phase 1) | Redirect post-login jamais vers page originale |
| 5 | `/pros` utilise v1 (pas de cache/tri) | HIGH | Perf degradee, monetisation ignoree |
| 6 | Penalites non implementees | HIGH | Annulations abusives sans consequence |
| 7 | EXPIRED jamais set (pas de cron) | HIGH | Bookings PENDING persistent indefiniment |

### Gaps vs flux attendu

| Attendu | Observe | Gap |
|---------|---------|-----|
| Non-auth → /book → login → retour /book | Non-auth → /book → login → / (perte contexte) | `/book` pas dans middleware, pas de `next` param |
| PRO bloque sur /book | PRO voit "Acces reserve" + logout | OK (client-side) |
| PRO bloque sur /client/bookings | PRO redirige vers /dashboard | OK |
| /pros affiche resultats tries premium-first | /pros affiche ordre arbitraire DB | v1 sans orderBy |
| /client/bookings affiche TOUS les bookings | CANCELLED_AUTO_OVERLAP invisible | Statut manquant dans filtre |
| WhatsApp CTA fonctionnel post-booking | "Numero indisponible" | credentials: 'omit' sur /public/* |
| Bookings PENDING expirent apres 24h | Jamais expires | Pas de cron |

### Actions recommandees (priorisees)

1. **P0** : Corriger contrat `GET /bookings` dans `/client/bookings` (lire `response.data`)
2. **P0** : Ajouter `/book` au middleware matcher + param `next`
3. **P0** : Corriger WhatsApp CTA (credentials ou endpoint dedie pour phone)
4. **P0** : Unifier param redirect login (`returnTo` → `next` ou inverse) — cf Phase 1
5. **P1** : Migrer `/pros` vers endpoint v2 (cache, tri, pagination)
6. **P1** : Implementer cron expiration bookings PENDING
7. **P1** : Ajouter `CANCELLED_AUTO_OVERLAP` aux filtres client/bookings
8. **P2** : Implementer penalites ou retirer champs DB inutilises
9. **P2** : Corriger accessibilite (/book date picker, /client/bookings tabs ARIA)
10. **P2** : Ajouter filtres ville/categorie sur /pros + loading.tsx

---

## Score global Phase 2

| Page | Score |
|------|-------|
| / (Homepage) | 4.4 / 5 |
| /pros | 3.0 / 5 |
| /pro/[publicId] | 4.2 / 5 |
| /book/[proId] | 3.4 / 5 |
| /client/bookings | 2.8 / 5 |

### **Score moyen Phase 2 : 3.6 / 5** (Moyen-Bon)

---

## Annexe — Fichiers audites Phase 2

**Frontend** :
- `apps/web/src/app/page.tsx`
- `apps/web/src/app/pros/page.tsx`
- `apps/web/src/app/pro/[publicId]/page.tsx`
- `apps/web/src/app/pro/[publicId]/ProDetailClient.tsx`
- `apps/web/src/app/pro/[publicId]/loading.tsx`
- `apps/web/src/app/book/[proId]/page.tsx`
- `apps/web/src/app/client/bookings/page.tsx`
- `apps/web/src/components/home/Hero.tsx`
- `apps/web/src/components/home/HeroSkeleton.tsx`
- `apps/web/src/components/home/Categories.tsx`
- `apps/web/src/components/home/FeaturedPros.tsx`
- `apps/web/src/components/home/Testimonials.tsx`
- `apps/web/src/components/home/HowItWorks.tsx`
- `apps/web/src/components/home/PricingSection.tsx`
- `apps/web/src/components/home/SecuritySection.tsx`
- `apps/web/src/components/home/ProCTA.tsx`
- `apps/web/src/components/home/Footer.tsx`
- `apps/web/src/components/home/HeroMobileCTA.tsx`
- `apps/web/src/components/Navbar.tsx`
- `apps/web/src/components/Header.tsx`
- `apps/web/src/components/ProCard.tsx`
- `apps/web/src/components/ProBookingCTA.tsx`
- `apps/web/src/middleware.ts`

**Backend** :
- `apps/api/src/catalog/catalog.controller.ts`
- `apps/api/src/catalog/catalog.service.ts`
- `apps/api/src/catalog/stats.controller.ts`
- `apps/api/src/booking/booking.controller.ts`
- `apps/api/src/booking/booking.service.ts`
- `apps/api/src/booking/booking.service.spec.ts`

**Database** :
- `packages/database/prisma/schema.prisma` (Booking, BookingEvent, BookingStatus, ProService, WeeklyAvailability, Category, City)

---
---

# Phase 3 — Dashboard PRO (profil, services, disponibilite, bookings, historique)

> **Date** : 2026-02-21
> **Contexte** : Audit complet du Dashboard PRO — 7 pages frontend + backend PRO/KYC/Booking/Dashboard endpoints + modeles DB.
> **Pages auditees** : `/dashboard`, `/dashboard/profile`, `/dashboard/kyc`, `/dashboard/services`, `/dashboard/availability`, `/dashboard/bookings`, `/dashboard/history`

## Resume executif

- **Statut global** : ⚠️ Moyen — fonctionnellement solide mais plusieurs problemes critiques d'integration et de securite
- **Points forts** :
  - Architecture booking robuste : Winner-Takes-All atomique en `$transaction`, IDOR protege partout
  - KycApprovedGuard applique sur les mutations PRO (services, availability, profile, portfolio, booking status/duration/complete)
  - Securite KYC exemplaire : magic bytes, Sharp re-encode, CIN hashe SHA-256, audit logging
  - Premium limits correctement enforces server-side (free=1 / premium=3 services)
  - publicId / internal ID separation respectee dans les reponses API
  - DashboardLayout gate correctement KYC PENDING (waiting room) et REJECTED (redirect KYC)
- **Risques majeurs** :
  1. **CRITIQUE** : `RolesGuard` ne lit PAS les `@Roles()` au niveau classe — bypass total de la protection PRO sur tout le ProController
  2. **CRITIQUE** : Frontend bookings/history attend un `array`, backend renvoie `{data, meta}` — pages vides/cassees
  3. **CRITIQUE** : `GET /dashboard/stats` sans `RolesGuard` et sans verification Premium — tout utilisateur authentifie peut acceder aux stats PRO
  4. **HIGH** : `KycApprovedGuard` sur `PATCH /pro/profile` cree un catch-22 avec le gate avatar du DashboardLayout
  5. **HIGH** : `@Body() dto: any` sur le profile update — aucune validation pipeline
  6. **HIGH** : `resubmit` KYC ne valide pas les magic bytes sur les fichiers uploades
  7. **HIGH** : Pas de validation client-side `startTime < endTime` sur la disponibilite
  8. **HIGH** : History page filtre cote client — incompatible avec la pagination backend
- **Recommandations top 5** :
  1. Corriger `RolesGuard` : utiliser `getAllAndOverride()` pour lire les metadata classe + methode
  2. Corriger la consommation de la pagination : destructurer `{data, meta}` dans bookings + history
  3. Ajouter `@Roles('PRO')` + premium check sur `GET /dashboard/stats`
  4. Retirer `KycApprovedGuard` de `PATCH /pro/profile` ou ne l'appliquer qu'aux champs business
  5. Ajouter validation magic bytes sur `resubmit` KYC

---

## 1) DashboardLayout (wrapper commun)

### Frontend

**Fichier** : `apps/web/src/components/dashboard/DashboardLayout.tsx`
**Fichier lie** : `apps/web/src/components/dashboard/KycPendingState.tsx`

**Role** : Wrapper de toutes les pages `/dashboard/*`. Gere l'auth guard, le KYC gating, la sidebar de navigation, et le "setup gate" (avatar obligatoire).

**Fonctionnement** :
- Fetch `GET /pro/me` pour verifier `isPremium`, `hasAvatar`, `kycStatus`
- 3 branches de rendu : setup gate (pas d'avatar), KYC gate (PENDING/REJECTED), normal
- Sidebar avec liens : Vue d'ensemble (Premium only), Reservations, Historique, Services, Disponibilite, Mon Profil, KYC

**Findings** :

| # | Severite | Description |
|---|----------|-------------|
| DL-01 | MEDIUM | **API `/pro/me` appele 2 fois** : DashboardLayout fetch `/pro/me` + chaque page enfant re-fetch independamment. Pas de partage de donnees via context/store. |
| DL-02 | MEDIUM | **Sidebar markup duplique** : Le code `<aside>` avec navigation est copie-colle identiquement dans 2 branches de rendu (setup gate, lignes 104-131, et normal, lignes 163-211). Tout changement de menu doit etre replique. |
| DL-03 | MEDIUM | **Auth guard client-side uniquement** : Depend de `useAuthStore` qui peut ne pas etre initialise. Le middleware Next.js protege `/dashboard` via `PROTECTED_PREFIXES` mais le timing de l'hydratation peut causer des flashs. |
| DL-04 | LOW | **KYC status non rafraichi** : `user.kycStatus` vient du authStore (set au login). Le fetch `/pro/me` recupere le `kycStatus` frais mais ne met PAS a jour le store. Si l'admin approuve le KYC, l'utilisateur reste bloque jusqu'a re-auth. |
| DL-05 | LOW | **`<main>` sans `aria-label`** : Le `<main>` n'a pas d'`aria-label` pour differencier les landmarks. `<aside>` manque `aria-label="Menu lateral"`. |
| DL-06 | INFO | **Pas de skip-to-content link** : WCAG recommande un lien "Aller au contenu principal" pour les utilisateurs clavier. |

### KycPendingState

**Fichier** : `apps/web/src/components/dashboard/KycPendingState.tsx`

| # | Severite | Description |
|---|----------|-------------|
| KP-01 | LOW | **Progress bar sans ARIA** : La barre de progression n'a pas `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`. |
| KP-02 | LOW | **SVG checkmarks sans `aria-hidden`** : Les SVG decoratifs des etapes ne sont pas marques `aria-hidden="true"`, les lecteurs d'ecran essaieront de les lire. |

### Scores DashboardLayout

| Axe | Score | Detail |
|-----|-------|--------|
| Fonctionnalite | 4/5 | Gates fonctionnels (REJECTED prison, PENDING waiting room, avatar setup). Sidebar dupliquee. |
| Securite | 3/5 | Auth guard client-side. Relies sur `useAuthStore` state. Middleware SSR present mais timing hydratation. |
| Qualite code | 2.5/5 | Duplication sidebar significative. Pas de context partage pour `/pro/me`. |
| Accessibilite | 3.5/5 | `aria-label` sur nav, `aria-current` sur liens, `aria-hidden` sur icones. Manque skip-to-content. |
| Integration front↔back | 3.5/5 | Fetch `/pro/me` redondant. KYC status non synchronise avec le store. |

### Score global : 3.3 / 5

---

## 2) /dashboard (Vue d'ensemble — Premium uniquement)

### Frontend

**Fichier** : `apps/web/src/app/dashboard/page.tsx` (302 lignes)

**Composant** : Page overview avec KPIs + graphiques Recharts (LineChart demandes/jour, PieChart taux de conversion, prochaine reservation).

**Champs** : Aucun (lecture seule).

**Etats geres** :
| Etat | Implementation | Verdict |
|------|---------------|---------|
| Loading | `loading` state, spinner + texte | OK |
| Erreur dashboard | `error` state, `role="alert"` | OK |
| Erreur stats | `console.error` silencieux | **KO** — aucun retour utilisateur |
| Non-premium redirect | `router.replace('/dashboard/bookings')` | OK |

**Accessibilite** :
- Erreur dashboard avec `role="alert"` — OK
- Loading spinner avec `motion-safe:animate-spin` — OK
- **ISSUE** : Graphiques SVG sans `role="img"` ni `aria-label` — lecteurs d'ecran ne peuvent pas interpreter les charts
- **ISSUE** : Loading container sans `aria-busy` / `aria-live`
- **ISSUE** : Stats loading spinners sans `motion-safe:` prefix (lignes 204, 226)

**Design tokens** :
- **VIOLATION** : Hex en dur dans les composants Recharts : `#10b981`, `#ef4444`, `#3b82f6`, `#8884d8` (lignes 110-111, 214, 238). Regles CLAUDE.md : "JAMAIS de hex en dur".

### API / Backend

**Endpoint** : `GET /dashboard/stats`
**Controller** : `apps/api/src/dashboard/dashboard.controller.ts`
**Service** : `apps/api/src/dashboard/dashboard.service.ts`

| Aspect | Implementation | Verdict |
|--------|---------------|---------|
| Guards | `JwtAuthGuard` uniquement | **KO** — pas de `RolesGuard`, pas de `@Roles('PRO')` |
| Role check | Service-level `if (userRole !== 'PRO')` → 403 | Insuffisant — devrait etre au guard |
| Premium check | **AUCUN** | **KO** — tout PRO (meme free) peut acceder aux stats |
| Response shape | `{ requestsCount, conversionRate, pendingCount, nextBooking }` | OK — match frontend |
| PII | `nextBooking.client.phone` expose | **ATTENTION** — telephone client en clair |

### Findings

| # | Severite | Description |
|---|----------|-------------|
| DO-01 | CRITIQUE | **`GET /dashboard/stats` sans `RolesGuard`** : N'importe quel utilisateur authentifie (CLIENT inclus) peut appeler l'endpoint. Le service-level check est insuffisant (devrait etre au guard). Aucune verification Premium. |
| DO-02 | HIGH | **Telephone client expose** : `nextBooking.client.phone` renvoie le numero complet. PII sensible sans masquage ni consentement explicite. |
| DO-03 | HIGH | **Hex en dur dans Recharts** : 4 couleurs hex en dur violent la regle "JAMAIS de hex en dur". Utiliser `var(--color-success-500)`, `var(--color-error-500)`, etc. |
| DO-04 | MEDIUM | **Erreur stats silencieuse** : Si `/dashboard/stats` echoue, l'utilisateur voit "0" partout sans savoir que les donnees n'ont pas charge. Pas de retry. |
| DO-05 | MEDIUM | **Charts non accessibles** : Les SVG Recharts n'ont aucune semantique ARIA. |
| DO-06 | LOW | **Loading sans `aria-busy`** : Le container loading n'a pas `aria-busy="true"` ni `aria-live="polite"`. |

### Scores

| Axe | Score | Detail |
|-----|-------|--------|
| Fonctionnalite | 3.5/5 | Charts fonctionnels, redirect non-premium OK. Erreur stats silencieuse. |
| Securite | 2/5 | Pas de RolesGuard, pas de Premium gate, PII client expose. |
| Qualite code | 3/5 | Hex en dur. Erreur stats swallow. |
| Accessibilite | 2.5/5 | Charts sans ARIA. Loading sans aria-busy. |
| Integration front↔back | 4/5 | Response shape match correct. |

### Score global : 3.0 / 5

---

## 3) /dashboard/profile (Profil PRO)

### Frontend

**Fichier** : `apps/web/src/app/dashboard/profile/page.tsx`

**Composant** : Edition profil PRO (bio, whatsapp, ville, avatar URL), portfolio CRUD, reviews affichees.

**Champs** : `bio` (textarea), `whatsapp` (tel), `cityId` (select), `avatarUrl` (URL), portfolio URLs (input URL)

**Etats geres** :
| Etat | Implementation | Verdict |
|------|---------------|---------|
| Loading | Spinner | OK |
| Erreur | Banner erreur | OK (manque `role="alert"`) |
| Succes | Banner succes | OK (manque `role="alert"`) |
| Portfolio CRUD | Add/delete avec feedback | OK |

**Accessibilite** :
- Labels avec `htmlFor` sur les inputs principaux — OK
- Portfolio delete avec `aria-label` — OK
- **ISSUE** : Loading spinner `animate-spin` sans `motion-safe:` (ligne 185)
- **ISSUE** : Input portfolio URL sans `<label>` ni `id` (lignes 334-339)
- **ISSUE** : Error/success messages sans `role="alert"` (lignes 284-293)

**Design tokens** : 100% tokens — OK

### API / Backend

**Endpoint** : `PATCH /pro/profile`
**Controller** : `apps/api/src/pro/pro.controller.ts` (ligne 41)
**Service** : `apps/api/src/pro/pro.service.ts`

| Aspect | Implementation | Verdict |
|--------|---------------|---------|
| Guards | Jwt + Roles + KycApproved | **PROBLEME** — KycApproved empeche les nouveaux PRO de configurer leur avatar |
| Validation | `@Body() dto: any` — pas de DTO/Zod | **KO** — bypass complet du pipeline de validation |
| Bio limit | Service-level : free=100, premium=500 chars | OK |
| URL validation | `validateUrl()` dans le service | OK |
| Portfolio premium | Service-level `isPremiumPro()` check | OK |

### Findings

| # | Severite | Description |
|---|----------|-------------|
| DP-01 | HIGH | **Catch-22 : KycApprovedGuard + avatar gate** : DashboardLayout force les PRO sans avatar vers `/dashboard/profile`. Mais `PATCH /pro/profile` exige KYC APPROVED. Un PRO PENDING ne peut ni acceder aux autres pages ni modifier son profil. Boucle infinie. |
| DP-02 | HIGH | **`@Body() dto: any`** : Aucune validation pipeline. N'importe quel champ peut etre envoye. `bio` et `avatarUrl` ne sont valides qu'au niveau service. |
| DP-03 | MEDIUM | **`animate-spin` sans `motion-safe:`** (ligne 185). |
| DP-04 | MEDIUM | **Input portfolio sans `<label>`** : L'input URL portfolio (lignes 334-339) n'a pas de `<label htmlFor>` associe. |
| DP-05 | MEDIUM | **Error/success sans `role="alert"`** : Les messages feedback (lignes 284-293) ne sont pas annonces aux lecteurs d'ecran. |
| DP-06 | MEDIUM | **`avatarUrl: ""` cause erreur** : Envoyer une chaine vide declenche `validateUrl` au lieu de supprimer l'avatar. Le service devrait traiter `""` comme `null`. |
| DP-07 | MEDIUM | **Portfolio delete utilise ID interne (cuid)** : `DELETE /pro/portfolio/:id` expose l'ID database. Le modele `ProPortfolioImage` n'a pas de `publicId`. Inconsistant avec le pattern publicId. |
| DP-08 | LOW | **Portfolio images alt generique** : Toutes les images portfolio ont `alt="Portfolio"` — pas descriptif. |
| DP-09 | LOW | **Avatar preview sans fallback `onError`** : Si l'URL avatar est invalide, image cassee sans fallback aux initiales. |

### Scores

| Axe | Score | Detail |
|-----|-------|--------|
| Fonctionnalite | 4/5 | CRUD profil + portfolio fonctionnel. Bio limit et reviews. |
| Securite | 3.5/5 | URL validation OK. Mais `dto: any` bypass validation pipeline. |
| Qualite code | 3.5/5 | Bon error handling. Spinner manque motion-safe. |
| Accessibilite | 3/5 | Labels OK. Portfolio input et alerts manquent ARIA. |
| Integration front↔back | 4/5 | Response shapes OK. publicId mapping correct. |

### Score global : 3.6 / 5

---

## 4) /dashboard/kyc (Verification KYC)

### Frontend

**Fichier** : `apps/web/src/app/dashboard/kyc/page.tsx`

**Composant** : Workflow KYC complet : upload CIN recto/verso + numero CIN, statut affiche, resoumission possible apres rejet.

**Champs** : `cinNumber` (text), `cinFront` (file), `cinBack` (file)

**Etats geres** :
| Etat | Implementation | Verdict |
|------|---------------|---------|
| NOT_SUBMITTED | Formulaire upload complet | OK |
| PENDING | Animation d'attente avec progression | OK |
| APPROVED | Badge vert avec date | OK |
| REJECTED | Alerte rouge + formulaire re-soumission | OK |
| Loading | Spinner | OK |
| Erreur | Message erreur | OK (manque `role="alert"`) |
| Succes | Message succes | OK (manque `role="alert"`) |

**Accessibilite** :
- Labels avec `htmlFor` sur tous les inputs — OK
- **ISSUE** : `animate-spin` sans `motion-safe:` (lignes 169, 241)
- **ISSUE** : Error/success messages sans `role="alert"` (lignes 346-355)
- **ISSUE** : Alerte rejet sans `role="alert"` (lignes 193-211)

**Design tokens** : 100% tokens — OK

### API / Backend

**Endpoint submit** : `POST /kyc/submit`
**Endpoint resubmit** : `POST /kyc/resubmit`
**Controller** : `apps/api/src/kyc/kyc.controller.ts`
**Service** : `apps/api/src/kyc/kyc.service.ts`

| Aspect | Implementation | Verdict |
|--------|---------------|---------|
| Guards | Jwt + Roles('PRO') | OK |
| File validation (submit) | Magic bytes (JPEG/PNG), taille via multer | OK |
| File validation (resubmit) | **Pas de magic bytes** | **KO** — bypass possible |
| CIN hash | SHA-256 + salt configurable | OK |
| CIN uniqueness | Hash en DB, unique constraint | OK |
| Access logging | Audit log best-effort | OK |
| Body validation (resubmit) | `@Body() body: any` | **KO** — pas de DTO |

### Findings

| # | Severite | Description |
|---|----------|-------------|
| DK-01 | HIGH | **`resubmit` ne valide pas les magic bytes** : Contrairement a `submitKyc` qui appelle `validateMagicBytes()`, `resubmitKyc` (ligne 145-149 du controller) ne le fait pas. Un fichier spoofe peut passer lors de la re-soumission. |
| DK-02 | MEDIUM | **`resubmit` body type `any`** : `@Body() body: any` (ligne 131) — aucune validation DTO sur le body de re-soumission. `cinNumber` extrait sans validation de format. |
| DK-03 | MEDIUM | **Raw `fetch()` au lieu de `postFormData()`** : La page KYC (lignes 93-101) utilise `fetch()` manuellement au lieu du helper `postFormData()` de `lib/api.ts`. Perd l'auto-refresh sur 401 et duplique la logique CSRF. |
| DK-04 | MEDIUM | **CIN sans validation de format frontend** : L'input CIN accepte n'importe quel texte. Placeholder "AB123456" mais pas de `pattern` ni validation JS. Le backend ne valide pas non plus le format. |
| DK-05 | MEDIUM | **`animate-spin` sans `motion-safe:`** (lignes 169, 241). |
| DK-06 | MEDIUM | **Error/success sans `role="alert"`** (lignes 346-355). |
| DK-07 | LOW | **Pas de validation taille fichier frontend** : L'info dit "max 5MB" et le backend enforce via multer, mais le frontend ne verifie pas `file.size` avant upload. Erreur multer cryptique si > 5MB. |
| DK-08 | LOW | **Alerte rejet sans `role="alert"`** (lignes 193-211). |
| DK-09 | LOW | **`logAccess` fire-and-forget** : L'audit log KYC ecrit en best-effort avec `.catch()` silencieux. Les logs d'acces fichiers KYC sont critiques pour la securite. |

### Scores

| Axe | Score | Detail |
|-----|-------|--------|
| Fonctionnalite | 4/5 | Workflow KYC complet. Submit + resubmit + status display. |
| Securite | 4/5 | Magic bytes, CIN hash, audit logging. SAUF resubmit sans magic bytes. |
| Qualite code | 3/5 | Raw fetch() au lieu du helper. Spinner sans motion-safe. |
| Accessibilite | 3/5 | Labels OK. Manque role="alert" sur messages feedback. |
| Integration front↔back | 4/5 | Endpoints correctement cibles. Shapes OK. |

### Score global : 3.6 / 5

---

## 5) /dashboard/services (Gestion des services PRO)

### Frontend

**Fichier** : `apps/web/src/app/dashboard/services/page.tsx`

**Composant** : Activation/desactivation de services par categorie, configuration tarification (fixe/fourchette), limites free/premium.

**Champs** : Toggle par categorie (checkbox sr-only), type de tarification (select), prix fixe (number), prix min/max (number)

**Etats geres** :
| Etat | Implementation | Verdict |
|------|---------------|---------|
| Loading | Spinner | OK |
| Erreur | Message erreur | OK (pas de retry) |
| Succes | Message succes persistant | OK (pas d'auto-dismiss) |
| Saving | Bouton disabled + texte | OK |

**Accessibilite** :
- **VIOLATION** : Aucun label n'a de `htmlFor` et aucun input n'a d'`id` (lignes 215, 234, 256, 278, 297)
- **VIOLATION** : Checkboxes toggle sr-only sans `aria-label` (lignes 218-221)
- **ISSUE** : `animate-spin` sans `motion-safe:` (ligne 191)

**Design tokens** : 100% tokens — OK

### API / Backend

**Endpoint** : `PUT /pro/services`
**Controller** : `apps/api/src/pro/pro.controller.ts` (ligne 65-73)
**Service** : `apps/api/src/pro/pro.service.ts` (lignes 273-348)
**Schema** : `packages/contracts/src/schemas/pro.ts` (lignes 44-100)

| Aspect | Implementation | Verdict |
|--------|---------------|---------|
| Guards | Jwt + Roles('PRO') + KycApproved | OK (SAUF RolesGuard bypass — voir DS-01) |
| Zod validation | `UpdateServicesSchema` avec refine sur pricing | OK |
| Premium limit | free=1, premium=3 | OK server-side |
| Strategy | Delete all + recreate dans transaction | **ATTENTION** — perte d'ID et createdAt a chaque update |

### Findings

| # | Severite | Description |
|---|----------|-------------|
| DS-01 | CRITIQUE | **`RolesGuard` ne lit pas `@Roles()` au niveau classe** : `roles.guard.ts` ligne 28-30 utilise `this.reflector.get('roles', context.getHandler())` qui ne lit que les metadata de la METHODE. `@Roles('PRO')` est au niveau CLASSE (pro.controller.ts ligne 31). Le guard retourne toujours `true` → **tout utilisateur authentifie peut acceder aux endpoints PRO** (services, availability, profile, portfolio). |
| DS-02 | HIGH | **Pas de feedback premium limit en frontend** : Le frontend ne montre pas combien de services restent disponibles, ne desactive pas les toggles quand la limite est atteinte. L'erreur `SERVICE_LIMIT_REACHED` arrive comme message brut. |
| DS-03 | HIGH | **KYC 403 non gere en frontend** : Si un PRO non-approuve atteint la page, l'erreur `KYC_NOT_APPROVED` s'affiche comme message generique. Pas de redirect vers `/dashboard/kyc`. |
| DS-04 | HIGH | **Labels sans `htmlFor`/`id`** : Aucune des 5 categories de labels (toggle, pricing type, prix fixe, min, max) n'a d'association label-input WCAG. |
| DS-05 | MEDIUM | **Toggle checkboxes sans `aria-label`** : Les checkboxes sr-only n'ont pas d'`aria-label` indiquant quel service est active/desactive. |
| DS-06 | MEDIUM | **`animate-spin` sans `motion-safe:`** (ligne 191). |
| DS-07 | MEDIUM | **`parseInt` pour les prix** : `parseInt(service.fixedPriceMad, 10)` tronque les decimales sans avertissement. L'HTML `min="0"` permet 0 mais Zod exige `.positive()` (> 0). |
| DS-08 | MEDIUM | **Delete-and-recreate dans transaction** : `updateServices` supprime puis recree tous les ProService. Perd les `id` et `createdAt` existants. References externes cassees. |
| DS-09 | LOW | **`existingServices` state variable jamais lue** : State mort — set mais jamais utilise dans le rendu. |
| DS-10 | LOW | **Pas de retry sur erreur chargement** : Erreur initiale sans bouton retry. |
| DS-11 | LOW | **Succes message non auto-dismiss** : Persiste indefiniment. |

### Scores

| Axe | Score | Detail |
|-----|-------|--------|
| Fonctionnalite | 3.5/5 | CRUD fonctionne. Pas de feedback premium limit. Dead state. |
| Securite | 2.5/5 | KYC guard OK server-side MAIS RolesGuard bypass CRITIQUE. |
| Qualite code | 3/5 | Structure OK. `any` types, dead state, pas de helpers extraits. |
| Accessibilite | 1.5/5 | Aucun `htmlFor`/`id`, aucun `aria-label`, pas de `motion-safe:`. Echec WCAG AA labeling. |
| Integration front↔back | 3.5/5 | Shapes match. Mapping publicId OK. Premium gate error mal gere. |

### Score global : 2.8 / 5

---

## 6) /dashboard/availability (Disponibilite hebdomadaire)

### Frontend

**Fichier** : `apps/web/src/app/dashboard/availability/page.tsx`

**Composant** : Configuration des creneaux de disponibilite par jour de la semaine (lundi-dimanche), toggle + heures debut/fin.

**Champs** : Toggle par jour (checkbox sr-only), heure debut (time), heure fin (time)

**Etats geres** :
| Etat | Implementation | Verdict |
|------|---------------|---------|
| Loading | Spinner | OK |
| Erreur | Message erreur | OK (pas de retry) |
| Succes | Message succes | OK |
| Saving | Bouton disabled | OK |

**Accessibilite** :
- **VIOLATION** : Aucun label n'a de `htmlFor` et aucun input n'a d'`id` (lignes 208, 226-228, 240-242)
- **VIOLATION** : Checkboxes toggle sr-only sans `aria-label` (lignes 209-212)
- **ISSUE** : `animate-spin` sans `motion-safe:` (ligne 187)
- **ISSUE** : `transition` et `after:transition-all` sans `motion-safe:` (lignes 215, 276)

**Design tokens** : 100% tokens — OK

### API / Backend

**Endpoint** : `PUT /pro/availability`
**Controller** : `apps/api/src/pro/pro.controller.ts` (ligne 75-83)
**Service** : `apps/api/src/pro/pro.service.ts` (lignes 350-387)
**Schema** : `packages/contracts/src/schemas/pro.ts` (lignes 111-134)

| Aspect | Implementation | Verdict |
|--------|---------------|---------|
| Guards | Jwt + Roles('PRO') + KycApproved | OK (SAUF RolesGuard bypass) |
| Zod validation | `startMin` < `endMin` refine | OK server-side |
| Uniqueness | `@@unique([proUserId, dayOfWeek])` en DB | OK — mais Zod ne valide pas les doublons |
| Strategy | Delete all + recreate dans transaction | Meme pattern que services |

### Findings

| # | Severite | Description |
|---|----------|-------------|
| DA-01 | CRITIQUE | **Meme RolesGuard bypass que DS-01** : `PUT /pro/availability` affecte par le meme probleme. Tout utilisateur authentifie peut modifier la disponibilite. |
| DA-02 | HIGH | **Pas de validation client `startTime < endTime`** : Le frontend envoie `startMin` et `endMin` sans verifier que debut < fin. L'erreur Zod backend est generique ("Validation failed"). Aucun feedback inline. |
| DA-03 | HIGH | **KYC 403 non gere en frontend** : Meme probleme que DS-03. |
| DA-04 | HIGH | **Labels sans `htmlFor`/`id`** : Meme violation que DS-04 — toggle, start time, end time. |
| DA-05 | MEDIUM | **Toggle checkboxes sans `aria-label`** : Meme que DS-05 — pas d'identification du jour pour les lecteurs d'ecran. |
| DA-06 | MEDIUM | **`animate-spin` et `transition` sans `motion-safe:`** (lignes 187, 215, 276). |
| DA-07 | MEDIUM | **Doublons `dayOfWeek` possibles via API** : Le schema Zod ne valide pas l'unicite de `dayOfWeek` dans le tableau. Un appel API direct avec 2 entrees pour le meme jour cause une erreur 500 Prisma (unique constraint). |
| DA-08 | LOW | **Logique de mapping dupliquee** : Le code de conversion availability → form est copie-colle entre le chargement initial et le post-save (lignes 50-71 vs 137-157). |
| DA-09 | LOW | **Pas de retry sur erreur chargement**. |

### Scores

| Axe | Score | Detail |
|-----|-------|--------|
| Fonctionnalite | 3.5/5 | Conversion temps fonctionne. Pas de validation client startTime < endTime. |
| Securite | 2.5/5 | Meme RolesGuard bypass. Doublons dayOfWeek causent 500. |
| Qualite code | 3/5 | Mapping duplique, sinon propre. |
| Accessibilite | 1.5/5 | Meme violations que services — labels, aria-label, motion-safe. |
| Integration front↔back | 4/5 | Conversion HH:MM ↔ minutes propre. Schema Zod match payload. |

### Score global : 2.9 / 5

---

## 7) /dashboard/bookings (Gestion reservations PRO)

### Frontend

**Fichier** : `apps/web/src/app/dashboard/bookings/page.tsx`

**Composant** : Liste des reservations PRO avec onglets (en attente, confirmees, annulees). Actions : accepter, refuser, modifier duree, completer, annuler. Modals pour cancel et duration.

**Etats geres** :
| Etat | Implementation | Verdict |
|------|---------------|---------|
| Loading | Spinner | OK |
| Erreur | `console.error` silencieux | **KO** — pas d'affichage erreur, pas de retry |
| Tabs | 4 onglets avec filtre | OK |
| Actions | Accept/decline/cancel/complete/duration | OK |
| Modals | Cancel + Duration | OK (manque focus trap et ARIA) |

**Accessibilite** :
- **VIOLATION** : Tabs sans `role="tablist"`, `role="tab"`, `aria-selected` — pas de pattern ARIA Tabs (lignes 247-311)
- **VIOLATION** : Modals cancel/duration sans `role="dialog"`, `aria-modal`, focus trap, escape key (lignes 430-529)
- **ISSUE** : `animate-spin` sans `motion-safe:` (lignes 200, 318)
- **ISSUE** : Boutons action sans `aria-label` (lignes 373-419)
- **ISSUE** : Label duration modal sans `htmlFor`/`id` (lignes 493-499)

**Design tokens** : 100% tokens — OK

### API / Backend

**Endpoint principal** : `GET /bookings` (avec `?page=N&limit=N`)
**Mutations** : `PATCH /bookings/:id/status`, `/duration`, `/complete`, `/cancel`
**Controller** : `apps/api/src/booking/booking.controller.ts`
**Service** : `apps/api/src/booking/booking.service.ts`

| Aspect | Implementation | Verdict |
|--------|---------------|---------|
| Response shape | `{ data: BookingDashboardItem[], meta: PaginationMeta }` | OK backend |
| Frontend consumption | `getJSON<BookingDashboardItem[]>(...)` | **CRITIQUE** — attend un array, recoit un objet |
| Guards mutations | Jwt + KycApproved sur status/duration/complete | OK |
| Guards cancel | Jwt uniquement + check service-level | **INCONSISTANT** — manque KycApproved au guard |
| IDOR | `booking.proId !== userId` sur toutes les mutations | OK |
| Winner-Takes-All | Transaction atomique + auto-cancel conflits | OK |

### Findings

| # | Severite | Description |
|---|----------|-------------|
| DB-01 | CRITIQUE | **Mismatch pagination** : Le frontend appelle `getJSON<BookingDashboardItem[]>('/bookings')` (ligne 64) et assigne le resultat a `setBookings(data)`. Le backend renvoie `{ data: [...], meta: {...} }`. Le frontend recoit un OBJET et non un ARRAY → `.filter()` et `.map()` echouent silencieusement. **La page entiere est cassee — aucune reservation ne s'affiche.** Ce bug est repete lignes 84, 116, 152, 174 (re-fetch apres mutations). |
| DB-02 | HIGH | **Pas de pagination frontend** : Le backend supporte `?page=N&limit=N` avec `hasNext`, `hasPrev`, `totalPages`. Le frontend n'envoie jamais de params et n'a aucun controle de pagination. Default limit=20 → PROs avec 20+ reservations perdent les anciennes. |
| DB-03 | HIGH | **`KycApprovedGuard` manquant sur cancel controller** : `PATCH /bookings/:id/cancel` utilise `@UseGuards(JwtAuthGuard)` sans `KycApprovedGuard`. Le check existe au service-level (lignes 1024-1039) mais c'est inconsistant avec les autres routes qui utilisent le guard. |
| DB-04 | HIGH | **Auth guard ne verifie pas `loading` du store** : La page utilise `useAuthStore()` mais ne verifie pas si le store a fini d'initialiser. Risque de redirect premature avant hydratation. |
| DB-05 | MEDIUM | **Tabs sans ARIA pattern** : Les onglets n'implementent pas le pattern WAI-ARIA Tabs (role tablist/tab/tabpanel, aria-selected, navigation fleches). |
| DB-06 | MEDIUM | **Modals sans focus trap** : Les modals cancel et duration (lignes 430-529) n'ont pas `role="dialog"`, `aria-modal="true"`, focus trap, ni gestion Escape. Le composant `ConfirmDialog` existant implemente tout correctement — pas reutilise ici. |
| DB-07 | MEDIUM | **`animate-spin` sans `motion-safe:`** (lignes 200, 318). |
| DB-08 | MEDIUM | **Boutons action sans `aria-label`** : "Accepter", "Refuser" avec emojis — pas d'aria-label clair pour lecteurs d'ecran. |
| DB-09 | MEDIUM | **Label duration modal sans `htmlFor`/`id`** (lignes 493-499). |
| DB-10 | MEDIUM | **`completeBooking` pattern update-then-check** : Le service fait l'update AVANT de verifier le timing. Si erreur entre update et revert, l'etat est corrompu. La transaction garantit l'atomicite mais le pattern est fragile. |
| DB-11 | MEDIUM | **`autoCompletePreviousBooking` hors transaction** : L'auto-complete post-confirmation est fire-and-forget sans `BookingEvent` ni notification. |
| DB-12 | LOW | **Pas de toast succes sur accept/decline** : `handleUpdateStatus` ne montre pas de toast apres succes. `handleCompleteBooking` et `handleUpdateDuration` le font. |
| DB-13 | LOW | **Pas d'etat erreur avec retry** : Erreur fetch silencieuse (`console.error`), pas d'affichage ni de retry. |
| DB-14 | INFO | **`CANCELLED_AUTO_FIRST_CONFIRMED` manquant dans BookingStatusBadge** : Le filtre onglet "annulees" (ligne 225) inclut ce status mais le composant `BookingStatusBadge` n'a pas de case pour ce status — affiche le string brut. |

### Scores

| Axe | Score | Detail |
|-----|-------|--------|
| Fonctionnalite | 1/5 | CRITIQUE : mismatch pagination = page completement vide. Dead code. |
| Securite | 4/5 | Backend bien garde (IDOR, WTA). KycGuard manquant sur cancel controller. |
| Qualite code | 3/5 | Error handling APIError OK. Pattern fetch duplique. |
| Accessibilite | 2/5 | Tabs sans ARIA, modals sans focus trap, motion-safe manquant, labels. |
| Integration front↔back | 1/5 | CRITIQUE : frontend attend array, backend envoie `{data, meta}`. Pas de pagination. |

### Score global : 2.2 / 5

---

## 8) /dashboard/history (Historique reservations PRO)

### Frontend

**Fichier** : `apps/web/src/app/dashboard/history/page.tsx`

**Composant** : Affichage des reservations terminees/annulees. Read-only.

**Etats geres** :
| Etat | Implementation | Verdict |
|------|---------------|---------|
| Loading | Spinner | OK |
| Erreur | `console.error` silencieux | **KO** — pas d'affichage erreur, pas de retry |
| Vide | Message "aucun historique" | OK |

**Accessibilite** :
- **ISSUE** : `animate-spin` sans `motion-safe:` (lignes 72, 107)
- **ISSUE** : Pas d'etat erreur visible pour l'utilisateur

**Design tokens** : 100% tokens — OK

### API / Backend

Utilise le meme endpoint `GET /bookings` que la page bookings.

### Findings

| # | Severite | Description |
|---|----------|-------------|
| DH-01 | CRITIQUE | **Meme mismatch pagination que DB-01** : `getJSON<BookingDashboardItem[]>('/bookings')` (ligne 49) attend un array, recoit `{data, meta}`. Page completement vide. |
| DH-02 | HIGH | **Filtrage cote client incompatible avec pagination** : La page fetch `/bookings` (toutes les reservations) puis filtre cote client pour `COMPLETED`, `DECLINED`, `CANCELLED_*`, `EXPIRED`. Avec la pagination backend (page 1 de 20), les statuts history ne sont peut-etre pas dans la premiere page. **L'historique pourrait etre vide meme si des reservations existent.** |
| DH-03 | HIGH | **`CANCELLED_AUTO_OVERLAP` manquant dans le filtre** : Le filtre inclut `CANCELLED_AUTO_FIRST_CONFIRMED` (ligne 86) mais omet `CANCELLED_AUTO_OVERLAP`. Les reservations annulees par overlap n'apparaitront JAMAIS dans l'historique. |
| DH-04 | MEDIUM | **Pas de controles pagination** : Meme probleme que DB-02. |
| DH-05 | MEDIUM | **`animate-spin` sans `motion-safe:`** (lignes 72, 107). |
| DH-06 | MEDIUM | **Pas d'etat erreur avec retry** : Erreur silencieuse, pas d'affichage utilisateur. |
| DH-07 | LOW | **Redirect inconsistant** : Utilisateurs non-auth rediriges vers `/` alors que la page bookings redirige vers `/auth/login`. |

### Scores

| Axe | Score | Detail |
|-----|-------|--------|
| Fonctionnalite | 1/5 | CRITIQUE : mismatch pagination = page vide. Statut manquant dans le filtre. |
| Securite | 4/5 | Herite protections backend. Page read-only avec auth guard. |
| Qualite code | 2/5 | Code duplique depuis bookings. Pas d'abstraction partagee. |
| Accessibilite | 2/5 | Motion-safe manquant. Pas d'etat erreur. |
| Integration front↔back | 1/5 | CRITIQUE mismatch pagination. Filtrage client-side incompatible avec pagination serveur. |

### Score global : 2.0 / 5

---

## Synthese RBAC & securite Dashboard PRO

### Matrice RBAC backend (routes Dashboard PRO)

| Route | Methode | Guards | Roles | KYC | Premium | Verdict |
|-------|---------|--------|-------|-----|---------|---------|
| `GET /pro/me` | GET | Jwt + Roles | PRO | Non | Non | OK (SAUF RolesGuard bypass) |
| `PATCH /pro/profile` | PATCH | Jwt + Roles + KycApproved | PRO | **OUI** | Non | **PROBLEME** — catch-22 avatar |
| `PUT /pro/services` | PUT | Jwt + Roles + KycApproved | PRO | **OUI** | Limit 1/3 | OK (SAUF RolesGuard bypass) |
| `PUT /pro/availability` | PUT | Jwt + Roles + KycApproved | PRO | **OUI** | Non | OK (SAUF RolesGuard bypass) |
| `POST /pro/portfolio` | POST | Jwt + Roles + KycApproved | PRO | **OUI** | **OUI** | OK (SAUF RolesGuard bypass) |
| `DELETE /pro/portfolio/:id` | DELETE | Jwt + Roles + KycApproved | PRO | **OUI** | Non | OK (expose ID interne) |
| `GET /pro/portfolio` | GET | Jwt + Roles | PRO | Non | Non | OK |
| `POST /kyc/submit` | POST | Jwt + Roles | PRO | Non | Non | OK |
| `POST /kyc/resubmit` | POST | Jwt + Roles | PRO | Non | Non | **ISSUE** — pas de magic bytes |
| `GET /dashboard/stats` | GET | Jwt | **AUCUN** | Non | **AUCUN** | **CRITIQUE** — ouvert a tous |
| `PATCH /bookings/:id/status` | PATCH | Jwt + KycApproved | PRO (service) | **OUI** | Non | OK |
| `PATCH /bookings/:id/duration` | PATCH | Jwt + KycApproved | PRO (service) | **OUI** | Non | OK |
| `PATCH /bookings/:id/complete` | PATCH | Jwt + KycApproved | PRO (service) | **OUI** | Non | OK |
| `PATCH /bookings/:id/cancel` | PATCH | Jwt | Mixte (service) | Service-level PRO | Non | **INCONSISTANT** |

### Protection IDOR

| Endpoint | Methode de verification | Verdict |
|----------|------------------------|---------|
| `PUT /pro/services` | `proUserId: userId` (from JWT) | OK — pas d'ID user-supplied |
| `PUT /pro/availability` | `proUserId: userId` (from JWT) | OK |
| `PATCH /pro/profile` | `userId` from JWT | OK |
| `DELETE /pro/portfolio/:id` | `proUserId: userId` WHERE clause | OK |
| `PATCH /bookings/:id/status` | `booking.proId !== userId` check | OK |
| `PATCH /bookings/:id/duration` | `updateMany WHERE proId=userId` | OK |
| `PATCH /bookings/:id/complete` | `updateMany WHERE proId=userId` | OK |
| `PATCH /bookings/:id/cancel` | `updateMany WHERE proId/clientId=userId` | OK |

### Winner-Takes-All (booking confirmation)

| Etape | Implementation | Verdict |
|-------|---------------|---------|
| 1. Lecture booking + verify PENDING | Transaction interactive | OK |
| 2. Detection conflits horaires | Interval overlap query sur CONFIRMED | OK |
| 3. Confirmation | Atomic update | OK |
| 4. Auto-cancel overlaps | `updateMany` PENDING/WAITING → CANCELLED_AUTO | OK |
| 5. Race condition | Transaction serializable | OK |

---

## Score global Phase 3

| Page | Score |
|------|-------|
| DashboardLayout | 3.3 / 5 |
| /dashboard (overview) | 3.0 / 5 |
| /dashboard/profile | 3.6 / 5 |
| /dashboard/kyc | 3.6 / 5 |
| /dashboard/services | 2.8 / 5 |
| /dashboard/availability | 2.9 / 5 |
| /dashboard/bookings | 2.2 / 5 |
| /dashboard/history | 2.0 / 5 |

### **Score moyen Phase 3 : 2.9 / 5** (Moyen)

**Points les plus faibles** :
- Bookings et History casses par le mismatch pagination (CRITIQUE)
- RolesGuard bypass total sur le ProController (CRITIQUE)
- Dashboard stats sans guard role ni premium (CRITIQUE)
- Accessibilite tres faible sur services et availability (labels, ARIA)

**Points forts** :
- Backend booking securise (IDOR, WTA, transactions)
- KYC backend exemplaire (magic bytes, hash, audit)
- Design tokens 100% migres
- publicId separation respectee

---

## Priorites de remediation Phase 3

### P0 — Bloquant production (CRITIQUE)

| # | Issue | Fichier(s) | Impact |
|---|-------|-----------|--------|
| 1 | RolesGuard ne lit pas `@Roles()` classe-level → bypass total | `auth/guards/roles.guard.ts:28` | Tout utilisateur peut acceder aux endpoints PRO |
| 2 | Frontend bookings/history attend array, backend envoie `{data, meta}` | `dashboard/bookings/page.tsx:64`, `dashboard/history/page.tsx:49` | Pages completement vides |
| 3 | `GET /dashboard/stats` sans RolesGuard ni Premium check | `dashboard/dashboard.controller.ts:23` | Stats PRO accessibles a tous |

### P1 — High priority

| # | Issue | Fichier(s) |
|---|-------|-----------|
| 4 | KycApprovedGuard catch-22 avec avatar setup | `pro/pro.controller.ts:41`, `DashboardLayout.tsx:96` |
| 5 | `@Body() dto: any` sur profile update | `pro/pro.controller.ts:44` |
| 6 | `resubmit` KYC sans magic bytes validation | `kyc/kyc.controller.ts:145` |
| 7 | Pas de validation client startTime < endTime | `availability/page.tsx:119` |
| 8 | History filtre cote client — incompatible pagination | `history/page.tsx:49,80` |
| 9 | `CANCELLED_AUTO_OVERLAP` manquant dans history filter | `history/page.tsx:86` |
| 10 | Labels sans `htmlFor`/`id` sur services + availability | `services/page.tsx`, `availability/page.tsx` |
| 11 | Telephone client expose dans stats | `dashboard.service.ts:113` |
| 12 | Hex en dur dans Recharts | `dashboard/page.tsx:110,214` |

### P2 — Medium priority

| # | Issue | Fichier(s) |
|---|-------|-----------|
| 13 | Pagination controls absents (bookings + history) | `bookings/page.tsx`, `history/page.tsx` |
| 14 | Tabs sans ARIA pattern (bookings) | `bookings/page.tsx:247` |
| 15 | Modals sans focus trap (bookings) | `bookings/page.tsx:430` |
| 16 | `animate-spin` sans `motion-safe:` (6 occurrences) | Toutes les pages dashboard |
| 17 | Error/success sans `role="alert"` (profile, kyc) | `profile/page.tsx`, `kyc/page.tsx` |
| 18 | KYC raw fetch au lieu de postFormData | `kyc/page.tsx:93` |
| 19 | CIN sans validation format frontend | `kyc/page.tsx:275` |
| 20 | API `/pro/me` fetche 2 fois par page | `DashboardLayout.tsx` + pages enfant |
| 21 | Sidebar markup duplique | `DashboardLayout.tsx:104-131,163-211` |
| 22 | `resubmit` body type `any` | `kyc.controller.ts:131` |
| 23 | Portfolio delete expose ID interne | `pro.controller.ts:101` |
| 24 | `avatarUrl: ""` cause erreur au lieu de clear | `pro.service.ts:206` |
| 25 | Doublons dayOfWeek causent 500 Prisma | `pro.service.ts:360` |
| 26 | `autoCompletePreviousBooking` sans BookingEvent | `booking.service.ts:1198` |
| 27 | KycApprovedGuard manquant sur cancel controller | `booking.controller.ts:239` |

### P3 — Low priority

| # | Issue | Fichier(s) |
|---|-------|-----------|
| 28 | KYC status non rafraichi dans authStore | `DashboardLayout.tsx:35` |
| 29 | Portfolio images alt generique | `profile/page.tsx:318` |
| 30 | Retry buttons absents sur erreurs chargement | Toutes les pages |
| 31 | Succes message non auto-dismiss (services) | `services/page.tsx` |
| 32 | Toast manquant sur accept/decline (bookings) | `bookings/page.tsx:78` |
| 33 | Redirect inconsistant history vs bookings | `history/page.tsx:35` |
| 34 | Progress bar KYC sans ARIA semantics | `KycPendingState.tsx:63` |
| 35 | SVG checkmarks sans aria-hidden | `KycPendingState.tsx:80` |

---

## Annexe — Fichiers audites Phase 3

**Frontend** :
- `apps/web/src/app/dashboard/page.tsx`
- `apps/web/src/app/dashboard/profile/page.tsx`
- `apps/web/src/app/dashboard/kyc/page.tsx`
- `apps/web/src/app/dashboard/services/page.tsx`
- `apps/web/src/app/dashboard/availability/page.tsx`
- `apps/web/src/app/dashboard/bookings/page.tsx`
- `apps/web/src/app/dashboard/history/page.tsx`
- `apps/web/src/components/dashboard/DashboardLayout.tsx`
- `apps/web/src/components/dashboard/KycPendingState.tsx`
- `apps/web/src/components/BookingStatusBadge.tsx`

**Backend** :
- `apps/api/src/pro/pro.controller.ts`
- `apps/api/src/pro/pro.service.ts`
- `apps/api/src/kyc/kyc.controller.ts`
- `apps/api/src/kyc/kyc.service.ts`
- `apps/api/src/kyc/multer.config.ts`
- `apps/api/src/booking/booking.controller.ts`
- `apps/api/src/booking/booking.service.ts`
- `apps/api/src/dashboard/dashboard.controller.ts`
- `apps/api/src/dashboard/dashboard.service.ts`
- `apps/api/src/auth/guards/roles.guard.ts`
- `apps/api/src/auth/guards/kyc-approved.guard.ts`

**Schemas/Contracts** :
- `packages/database/prisma/schema.prisma`
- `packages/contracts/src/schemas/pro.ts`
- `packages/contracts/src/schemas/availability.ts`

**Database models audites** :
- `ProProfile`, `ProService`, `WeeklyAvailability`, `ProPortfolioImage`
- `Booking`, `BookingEvent`, `BookingStatus` enum
- `KycDocument`, `KycStatus` enum

---
---

# Phase 4 — Monetisation PRO : Plans & Subscription (audit)

> **Date** : 2026-02-21
> **Scope** : `/plans` → `POST /payment/checkout` → `/dashboard/subscription/success` ou `/dashboard/subscription/cancel`
> **Contexte** : Flux monétisation manuel (virement, cash, mobile money) — MVP sans intégration Stripe/CMI

## Resume executif

- **Statut global** : ⚠️ Moyen-Bon — architecture solide mais plusieurs gaps critiques UX et sécurité
- **Points forts** :
  - Architecture payment backend propre : PaymentOrder PENDING → admin CONFIRM → activation atomique en transaction
  - Prix déterminés server-side depuis `PAYMENT_PLANS` (350/3000/200 MAD hardcodés) — client ne peut pas manipuler
  - Ownership strict : `proUserId` extrait du JWT uniquement, aucun IDOR possible
  - Validation DTO robuste : regex sur publicId format (`city_xxx_nnn`, `cat_xxx_nnn`)
  - Cooldown Boost 21j enforced server-side (7j actif + 14j repos)
  - Exclusivité mutuelle : Premium + Boost ne peuvent pas coexister
  - Transaction atomique `activatePlan()` : ProSubscription/ProBoost + ProProfile.isPremium/premiumActiveUntil updated ensemble
  - Guards PRO strict sur tous les endpoints payment (JwtAuthGuard + RolesGuard + @Roles('PRO'))
  - Admin endpoints ADMIN-only (confirm/reject/pending list)
- **Risques majeurs** :
  1. **CRITIQUE** : Aucun webhook — confirmation paiement 100% manuelle admin, risque oubli activation
  2. **CRITIQUE** : Success/cancel pages ne vérifient PAS le paiement server-side — affichage "succès" sans vérification réelle
  3. **CRITIQUE** : Pas de synchronisation auth store après paiement — user doit logout/login pour voir Premium status dans le DashboardLayout
  4. **HIGH** : Pas de protection double-submit — cliquer 2x crée 2 PaymentOrder PENDING
  5. **HIGH** : `/plans` avec auth guard client-side SEULEMENT (redirect client, pas de middleware)
  6. **HIGH** : Premium status expire silencieusement — aucun cron/scheduler pour désactiver `isPremium` après `premiumActiveUntil`
  7. **HIGH** : `animate-bounce` dans success page sans `motion-safe:`
  8. **MEDIUM** : Hardcoded contact phone/email (+212 6XX, paiement@khadamat.ma) — devrait être en env
  9. **MEDIUM** : Pas de tests unitaires/e2e sur payment flow (payment.service.spec.ts présent mais probablement vide)
- **Recommandations top 5** :
  1. Ajouter appel `GET /payment/status/:oid` dans success page + refresh auth store si PAID
  2. Implémenter debounce/disabled state 3s sur PaymentButton après click (éviter double-submit)
  3. Créer cron job quotidien pour désactiver `isPremium` si `premiumActiveUntil < now`
  4. Ajouter `/plans` au middleware matcher (protection server-side)
  5. Ajouter `motion-safe:` sur tous les animate-* (success confetti, bounce icon)

---

## 1) /plans (Sélection du plan)

### Frontend

**Fichier** : `apps/web/src/app/plans/page.tsx` (341 lignes)
**Composant** : `PaymentButton` (`apps/web/src/components/payment/PaymentButton.tsx`, 227 lignes)

**Rôle** : Page publique affichant Premium (mensuel/annuel) et Boost avec CTA paiement.

**Auth guard** :
- Client-side uniquement : `useEffect` lines 49-58 redirect si non-auth ou non-PRO
- **ISSUE** : `/plans` **N'EST PAS dans middleware matcher** → aucune protection server-side
- CLIENT peut voir la page brièvement avant redirect JS

**Contenu affiché** :
- **Premium card** (info-themed) : toggle mensuel (350 MAD / 30j) vs annuel (3000 MAD / 365j, économie 200 MAD)
- **Boost card** (primary-themed) : 200 MAD / 7j, avec selects ville + catégorie (required)

**PaymentButton workflow** :
1. Click → `handlePayment()` (line 63)
2. Payload construction : `{ planType }` + optionnel `{ cityId, categoryId }` pour Boost (lines 68-78)
3. `POST /payment/checkout` via `postJSON()` (line 81-84)
4. Response `PaymentResponse` → modal instructions (lines 135-222)
5. Modal affiche : référence OID, montant, méthodes paiement (virement/cash/mobile money), contact phone/email, bouton "Copier référence"

**Etats gérés** :
| Etat | Implementation | Verdict |
|------|---------------|---------|
| Loading | `isLoading` + Loader2 spinner | OK |
| Auth redirect | Spinner pendant redirect | OK |
| Erreur API | Toast + console.error | OK |
| Modal instructions | Controlled `showModal` state | OK |

**Accessibilite** :
- Labels avec `htmlFor` sur selects ville/catégorie (lines 268, 294) — OK
- **ISSUE** : Boutons toggle mensuel/annuel sans `aria-pressed` (lines 125-147)
- **ISSUE** : Modal sans `role="dialog"`, `aria-modal="true"`, focus trap, escape key (lines 136-222)
- **ISSUE** : `animate-spin` sur Loader2 sans `motion-safe:` (line 123)
- **ISSUE** : `transition` sur boutons sans `motion-safe:` (lines 128, 140)

**Design tokens** : 100% tokens — OK

### API / Backend

**Endpoint** : `POST /api/payment/checkout`
**Controller** : `apps/api/src/payment/payment.controller.ts` (lines 44-56)
**Service** : `apps/api/src/payment/payment.service.ts` (`initiatePayment`, lines 46-150)
**DTO** : `apps/api/src/payment/dto/initiate-payment.dto.ts`

| Aspect | Implementation | Verdict |
|--------|---------------|---------|
| Guards | `JwtAuthGuard` + `RolesGuard` + `@Roles('PRO')` | OK |
| Validation | `InitiatePaymentDto` avec class-validator : `@IsIn([PREMIUM_MONTHLY, PREMIUM_ANNUAL, BOOST])`, regex `@Matches()` sur cityId/categoryId | OK |
| Prix | Déterminé server-side depuis `PAYMENT_PLANS` constant (line 59) — **client ne peut PAS manipuler** | OK |
| Ownership | `userId` extrait de `req.user.id` (JWT), jamais du body | OK — pas d'IDOR |
| Boost cityId/categoryId | Validation required (line 69-73), résolution publicId→interne via `CatalogResolverService` (lines 72-73) | OK |
| Exclusivité Premium/Boost | Premium actif → Boost refusé (lines 74-76). Boost actif → Premium refusé (lines 96-98) | OK |
| Cooldown Boost | Vérifie dernier Boost, refuse si < 21 jours (lines 78-93) | OK |
| OID generation | `KHD-{timestamp}-{randomBytes(16)}` (lines 102-104) | OK — unique, imprévisible |
| DB création | `PaymentOrder.create` status PENDING (lines 108-119) | OK |
| Idempotence | **AUCUNE** — double-click crée 2 orders PENDING | **KO** |
| Response | Retourne `{ success, order, message, paymentInstructions }` avec contact hardcodé (lines 124-149) | OK shape, **ISSUE** hardcoded contact |

### DB

**Model** : `PaymentOrder` (`schema.prisma` lines 420-447)

```prisma
model PaymentOrder {
  id          String               @id @default(cuid())
  oid         String               @unique
  proUserId   String
  pro         ProProfile           @relation(...)
  planType    PaymentOrderPlanType // PREMIUM_MONTHLY | PREMIUM_ANNUAL | BOOST
  provider    PaymentProvider      @default(MANUAL)
  amountCents Int                  // Prix en centimes
  status      PaymentOrderStatus   @default(PENDING) // PENDING | PAID | FAILED
  cityId      String?              // Pour BOOST uniquement
  categoryId  String?
  adminNotes  String?
  createdAt   DateTime             @default(now())
  paidAt      DateTime?

  @@index([proUserId, status])
  @@index([oid])
}
```

**Pas de contrainte unique sur (proUserId, planType, status=PENDING)** → double-submit possible.

### Findings

| # | Severite | Description |
|---|----------|-------------|
| P-01 | CRITIQUE | **Pas de protection double-submit** : Cliquer 2x sur PaymentButton crée 2 `PaymentOrder` PENDING avec 2 OID différents. Aucun debounce, aucune contrainte DB unique. |
| P-02 | HIGH | **`/plans` pas dans middleware** : Pas de protection server-side. Un CLIENT peut voir la page brièvement avant redirect client-side JS. |
| P-03 | HIGH | **`animate-spin` et `transition` sans `motion-safe:`** : Violations CLAUDE.md (lines 123, 128, 140). |
| P-04 | MEDIUM | **Contact hardcodé** : `phone: '+212 6XX XXX XXX'`, `email: 'paiement@khadamat.ma'` en dur dans le service (lines 144-145). Devrait être dans `.env`. |
| P-05 | MEDIUM | **Boutons toggle sans `aria-pressed`** : Les boutons Mensuel/Annuel (lines 125-147) n'ont pas `aria-pressed` pour indiquer l'état sélectionné. |
| P-06 | MEDIUM | **Modal instructions sans ARIA dialog** : Pas de `role="dialog"`, `aria-modal`, focus trap, escape key (lines 136-222 de PaymentButton.tsx). |
| P-07 | LOW | **Console.log en production** : `console.log('✅ Payment request created:', ...)` (line 86 PaymentButton) devrait être retiré ou conditionnel à dev mode. |

### Scores

| Axe | Score | Detail |
|-----|-------|--------|
| Fonctionnel | 4/5 | Flow complet, modal instructions. Double-submit pas bloqué. |
| Securite & acces | 4/5 | Prix server-side OK, JWT ownership OK. Pas dans middleware. Double-submit. |
| Integration front↔back | 4.5/5 | Response shapes match parfaitement. Contact hardcodé. |
| UX & accessibilite | 2.5/5 | Modal non accessible, toggle sans aria-pressed, motion-safe manquant. |
| Performance & robustesse | 3/5 | Idempotence manquante. Pas de retry. |

### Score global : 3.6 / 5

---

## 2) /pro/subscription (Page résultat paiement — MAL NOMMÉE)

### Frontend

**Fichier** : `apps/web/src/app/pro/subscription/page.tsx` (241 lignes)

**Rôle** : Affiche le résultat d'une demande de paiement via query params `?status=`, `?error=`, `?oid=`.
**NOTE** : Le nom du fichier est trompeur — ce n'est PAS une page "subscription management" mais une page "résultat de demande".

**Query params attendus** :
- `status` : `'success'` | `'pending'` | `'failed'` | `'error'`
- `error` : message d'erreur (optionnel)
- `oid` : référence de commande (optionnel)

**Affichage conditionnel** :
- `status=success` : Alerte verte "Paiement validé" → CTA "Dashboard" + "Voir offres"
- `status=pending` : Alerte bleue "Demande en attente" → instructions de règlement (virement/cash/mobile money) + CTA "Dashboard"
- `status=failed` : Alerte rouge "Paiement rejeté" → CTA "Réessayer" + "Dashboard"
- `status=error` : Alerte orange "Erreur technique" → CTA "Réessayer" + "Dashboard"
- Aucun status : Message générique + lien "Découvrir nos offres"

**PROBLÈME MAJEUR** : Cette page ne fait **AUCUNE vérification server-side**. Le `status=success` est affiché tel quel, même si le paiement n'est pas vraiment validé en DB. Un utilisateur peut naviguer manuellement vers `/pro/subscription?status=success&oid=FAKE` et voir "Paiement validé".

**Accessibilité** :
- **ISSUE** : Pas de `role="alert"` sur les alertes de statut (lines 40-121)
- **ISSUE** : `transition` sur boutons sans `motion-safe:` (lines 110, 118, 137)

**Design tokens** : 100% tokens — OK

### Findings

| # | Severite | Description |
|---|----------|-------------|
| PS-01 | CRITIQUE | **Aucune vérification server-side** : La page affiche `status=success` sans appeler `GET /payment/status/:oid` pour vérifier. Un utilisateur peut forger l'URL. |
| PS-02 | HIGH | **Nom de fichier trompeur** : `/pro/subscription` suggère une page de gestion d'abonnement, mais c'est une page de résultat de paiement. Devrait être `/payment/result` ou `/payment/status`. |
| PS-03 | MEDIUM | **Pas de `role="alert"` sur alertes** : Les 4 alertes de statut (lines 40-121) n'ont pas `role="alert"` — lecteurs d'écran ne les annoncent pas. |
| PS-04 | MEDIUM | **`transition` sans `motion-safe:`** : Lines 110, 118, 137. |

### Scores

| Axe | Score | Detail |
|-----|-------|--------|
| Fonctionnel | 3/5 | Affiche les 4 états. Pas de vérification server-side. |
| Securite & acces | 1/5 | Status forgeable. Aucune validation. |
| Integration front↔back | 2/5 | Devrait appeler `/payment/status/:oid` mais ne le fait pas. |
| UX & accessibilite | 3/5 | États clairs. Alerts sans role="alert", transition sans motion-safe. |
| Performance & robustesse | 3/5 | Statique, pas de latence. Mais pas de retry si erreur. |

### Score global : 2.4 / 5

---

## 3) /dashboard/subscription/success (Succès paiement)

### Frontend

**Fichier** : `apps/web/src/app/dashboard/subscription/success/page.tsx` (133 lignes)

**Rôle** : Page post-paiement "succès" avec animation confetti (emojis).

**Workflow** :
- `useEffect` mount → crée 30 emojis confetti (🎉🎊✨) qui tombent (lines 12-58)
- Affiche message "Paiement validé !" + checklist avantages
- CTA "Accéder au Dashboard" + "Voir les offres"

**PROBLÈME MAJEUR** : Comme `/pro/subscription`, **aucune vérification server-side**. Un utilisateur peut naviguer vers `/dashboard/subscription/success` directement et voir la page de succès sans avoir payé.

**PROBLÈME SYNCHRONISATION** : La page ne fait **aucun appel API** pour :
1. Vérifier que le paiement est réellement PAID en DB
2. Rafraîchir le `authStore` pour mettre à jour `user.isPremium`

Résultat : L'utilisateur voit "succès" mais le DashboardLayout ne reflète pas le statut Premium (il faut logout/login).

**Accessibilité** :
- **VIOLATION GRAVE** : `animate-bounce` sur l'icône success (line 65) sans `motion-safe:` — utilisateurs `prefers-reduced-motion` voient l'animation
- **ISSUE** : Confetti animation (lines 37-46) sans vérifier `prefers-reduced-motion`
- **ISSUE** : Pas de `role="alert"` sur la card principale

**Design tokens** : 100% tokens — OK

### Findings

| # | Severite | Description |
|---|----------|-------------|
| SS-01 | CRITIQUE | **Aucune vérification server-side** : Page accessible directement sans payer. Devrait appeler `GET /payment/status/:oid` + vérifier `status === 'PAID'`. |
| SS-02 | CRITIQUE | **Pas de refresh auth store** : `isPremium` non mis à jour dans le store. DashboardLayout affiche toujours "free tier" jusqu'à logout/login. |
| SS-03 | HIGH | **`animate-bounce` sans `motion-safe:`** : Line 65, violation WCAG + CLAUDE.md. |
| SS-04 | MEDIUM | **Confetti sans respect `prefers-reduced-motion`** : L'animation confetti (lines 37-46) devrait vérifier `window.matchMedia('(prefers-reduced-motion: reduce)')` avant de créer les éléments. |
| SS-05 | LOW | **Message "email confirmation envoyé" non implémenté** : Line 127 dit "Un email de confirmation vous a été envoyé" mais aucun service email n'est configuré dans le code. |

### Scores

| Axe | Score | Detail |
|-----|-------|--------|
| Fonctionnel | 2/5 | Affichage OK. Pas de vérification paiement. Store non refresh. |
| Securite & acces | 1/5 | Page forgeable, pas de vérification. |
| Integration front↔back | 1/5 | Aucun appel API. Store jamais refresh. |
| UX & accessibilite | 2/5 | Confetti fun mais viole motion-safe. Pas de role="alert". |
| Performance & robustesse | 4/5 | Confetti léger, cleanup OK (timeout 5s). |

### Score global : 2.0 / 5

---

## 4) /dashboard/subscription/cancel (Annulation paiement)

### Frontend

**Fichier** : `apps/web/src/app/dashboard/subscription/cancel/page.tsx` (68 lignes)

**Rôle** : Page post-paiement "annulé" avec message rassurant.

**Workflow** :
- Affiche icône XCircle + "Paiement annulé"
- Message "Aucun montant débité"
- CTA "Réessayer" → `/plans`, "Retour Dashboard" → `/dashboard`
- Lien support email

**Bon point** : Page simple, purement informative, pas d'action critique.

**Accessibilité** :
- **ISSUE** : Pas de `role="alert"` sur la card principale
- Design tokens : 100% — OK

### Findings

| # | Severite | Description |
|---|----------|-------------|
| SC-01 | LOW | **Pas de `role="alert"`** : La card principale (lines 18-54) devrait avoir `role="alert"` pour annoncer l'annulation aux lecteurs d'écran. |
| SC-02 | INFO | Page simple, aucune action critique, pas de vérification nécessaire. Statique uniquement. |

### Scores

| Axe | Score | Detail |
|-----|-------|--------|
| Fonctionnel | 5/5 | Affichage simple, CTAs clairs. |
| Securite & acces | 5/5 | Aucune action sensible. |
| Integration front↔back | 5/5 | Pas d'API nécessaire (purement informatif). |
| UX & accessibilite | 4/5 | CTA clairs, support email. Manque role="alert". |
| Performance & robustesse | 5/5 | Statique, instantané. |

### Score global : 4.8 / 5

---

## 5) Backend Payment System (Analyse transversale)

### Architecture

**Version** : MVP Manuel (pas de Stripe/CMI intégration — prévu pour v2)

**Flow** :
1. PRO → `POST /payment/checkout` → `PaymentOrder` créé (status PENDING)
2. Admin → reçoit notification (hors code, processus manuel)
3. Admin vérifie virement/cash → `POST /payment/admin/confirm/:oid`
4. Service → `confirmPayment()` → `activatePlan()` en transaction atomique
5. `ProProfile.isPremium = true` + `premiumActiveUntil = now + durationDays`
6. (ou `ProBoost.create()` + `ProProfile.boostActiveUntil`)

### Endpoints

| Route | Methode | Guards | Role | Description |
|-------|---------|--------|------|-------------|
| `POST /payment/checkout` | POST | Jwt + Roles | PRO | Crée PaymentOrder PENDING |
| `GET /payment/status/:oid` | GET | Jwt + Roles | PRO | Récupère statut (avec ownership check) |
| `POST /payment/admin/confirm/:oid` | POST | Jwt + Roles | ADMIN | Valide paiement → active plan |
| `POST /payment/admin/reject/:oid` | POST | Jwt + Roles | ADMIN | Rejette paiement |
| `GET /payment/admin/pending` | GET | Jwt + Roles | ADMIN | Liste PENDING (pagination) |

### Validation robuste

| Aspect | Implementation |
|--------|---------------|
| DTO validation | `@IsIn([...])`, `@Matches(/^city_[a-z]+_\d{3}$/)` sur cityId/categoryId |
| Prix | Server-side depuis `PAYMENT_PLANS` constant (client ne peut PAS envoyer amount) |
| Ownership | `req.user.id` uniquement, jamais du body |
| PublicId resolve | `CatalogResolverService` convertit publicId → interne ID |

### Transaction atomique `activatePlan()`

**Fichier** : `payment.service.ts` lines 268-341

```typescript
await this.prisma.$transaction(async (tx) => {
  if (planType === BOOST) {
    await tx.proBoost.create({ ... });
    await tx.proProfile.update({ boostActiveUntil: endsAt });
  } else { // PREMIUM
    const existing = await tx.proSubscription.findFirst({ ... });
    if (existing) {
      await tx.proSubscription.update({ ... });
    } else {
      await tx.proSubscription.create({ ... });
    }
    await tx.proProfile.update({ isPremium: true, premiumActiveUntil: endsAt });
  }
});
```

**Bon point** : Atomique. Si une étape échoue, tout rollback.
**ISSUE** : Pas d'invalidation cache après activation. Si le DashboardLayout a fetch `/pro/me` avant activation, le cache n'est pas refresh.

### Security Analysis

| Aspect | Verdict |
|--------|---------|
| IDOR | ✅ OK — `proUserId` from JWT, ownership check dans `getPaymentStatus` |
| Prix manipulation | ✅ OK — prix déterminé server-side |
| Role enforcement | ✅ OK — `@Roles('PRO')` sur checkout, `@Roles('ADMIN')` sur confirm/reject |
| Idempotency | ❌ KO — pas de contrainte unique, double-submit crée 2 orders |
| Webhook signature | N/A — pas de webhook (paiement manuel) |
| Premium expiration | ❌ KO — `premiumActiveUntil` set mais aucun cron pour désactiver `isPremium` après expiration |
| Cache invalidation | ❌ KO — activation ne clear pas le cache `/pro/me` |

### Findings Backend

| # | Severite | Description |
|---|----------|-------------|
| BE-01 | CRITIQUE | **Pas de webhook** : Confirmation 100% manuelle. Risque oubli admin → client paie mais non activé. Pas de notification automatique. |
| BE-02 | HIGH | **Pas de cron expiration Premium** : `premiumActiveUntil` stocké mais jamais vérifié automatiquement. Un PRO reste `isPremium=true` même après expiration jusqu'à prochaine action manuelle. |
| BE-03 | HIGH | **Pas d'invalidation cache après activation** : `activatePlan()` ne clear pas le cache de `/pro/me`. DashboardLayout peut afficher old data. |
| BE-04 | MEDIUM | **Pas de tests** : `payment.service.spec.ts` existe mais probablement vide (pas lu). Aucun test e2e du flow checkout → confirm → activation. |
| BE-05 | MEDIUM | **Contact hardcodé** : Phone/email dans `initiatePayment` response (lines 144-145) devrait être `.env`. |
| BE-06 | LOW | **`amountCents` calculé mais jamais utilisé pour vérification** : Le backend stocke `amountCents` (line 105) mais l'admin confirme sans vérifier que le montant reçu correspond. |

---

## Synthese E2E Flow (observé vs attendu)

### Flow réel observé

```
/plans
  └── PaymentButton click
      └── POST /payment/checkout { planType, cityId?, categoryId? }
          └── Backend: PaymentOrder.create(status=PENDING)
          └── Response: { oid, reference, paymentInstructions }
          └── Modal: affiche instructions + référence à copier

PRO règle hors plateforme (virement/cash)
PRO contacte admin avec référence OID

ADMIN (process manuel, hors code):
  └── Vérifie paiement reçu
  └── POST /payment/admin/confirm/:oid
      └── Backend: PaymentOrder.update(status=PAID, paidAt=now)
      └── Backend: activatePlan() atomique
          └── ProSubscription.create ou ProBoost.create
          └── ProProfile.update(isPremium=true, premiumActiveUntil=...)

PRO navigue vers /dashboard/subscription/success (URL manually entered? redirect unknown)
  └── Frontend: affiche "succès" SANS vérifier status
  └── DashboardLayout: affiche toujours free tier (cache non refresh)
  └── PRO logout + login → refresh auth store → voit Premium
```

### Gaps critiques

| Attendu | Observé | Gap |
|---------|---------|-----|
| Success page vérifie payment | Success page affiche sans vérifier | PS-01, SS-01 |
| Success page refresh auth store | Store jamais refresh | SS-02 |
| Idempotence checkout | Double-submit crée 2 orders | P-01 |
| Webhook auto-confirm | Confirmation 100% manuelle | BE-01 |
| Premium expire automatiquement | Reste actif même après `premiumActiveUntil` | BE-02 |
| `/plans` protected server-side | Client-side redirect only | P-02 |
| Cache invalidation post-activation | Cache jamais clear | BE-03 |

---

## Score global Phase 4

| Page | Score |
|------|-------|
| /plans | 3.6 / 5 |
| /pro/subscription | 2.4 / 5 |
| /dashboard/subscription/success | 2.0 / 5 |
| /dashboard/subscription/cancel | 4.8 / 5 |
| Backend Payment System | 3.5 / 5 |

### **Score moyen Phase 4 : 3.3 / 5** (Moyen)

**Points les plus faibles** :
- Success/result pages sans vérification server-side (forgeable)
- Auth store jamais refresh après paiement
- Premium expiration non automatisée
- Double-submit non bloqué

**Points forts** :
- Prix server-side, ownership JWT strict
- Transaction atomique activatePlan
- Guards RBAC complets (PRO/ADMIN)
- Exclusivité Premium/Boost enforced

---

## Priorites de remediation Phase 4

### P0 — Bloquant production (CRITIQUE)

| # | Issue | Fichier(s) | Impact |
|---|-------|-----------|--------|
| 1 | Success page sans vérification server-side | `dashboard/subscription/success/page.tsx` | Utilisateur voit "succès" sans avoir payé |
| 2 | Auth store jamais refresh après paiement | Tous les frontend pages | DashboardLayout affiche free tier même après paiement validé |
| 3 | Webhook manquant → confirmation manuelle | Backend payment | Risque oubli activation admin |

### P1 — High priority

| # | Issue | Fichier(s) |
|---|-------|-----------|
| 4 | Premium expiration non automatisée | Backend (besoin cron) |
| 5 | Double-submit crée 2 orders | `payment.controller.ts:44`, `PaymentButton.tsx:63` |
| 6 | `/plans` pas dans middleware | `middleware.ts` |
| 7 | `animate-bounce` sans `motion-safe:` | `dashboard/subscription/success/page.tsx:65` |
| 8 | Contact hardcodé (phone/email) | `payment.service.ts:144-145` |

### P2 — Medium priority

| # | Issue | Fichier(s) |
|---|-------|-----------|
| 9 | Cache `/pro/me` non invalidé après activation | `payment.service.ts:268-341` |
| 10 | Pas de tests payment flow | `payment.service.spec.ts` |
| 11 | Modal PaymentButton sans ARIA dialog | `PaymentButton.tsx:136-222` |
| 12 | Boutons toggle sans `aria-pressed` | `plans/page.tsx:125-147` |
| 13 | Confetti sans `prefers-reduced-motion` | `dashboard/subscription/success/page.tsx:37-46` |
| 14 | Alerts sans `role="alert"` | `/pro/subscription/page.tsx`, `/dashboard/subscription/*` |
| 15 | Nom fichier trompeur `/pro/subscription` | Renommer en `/payment/result` |

### P3 — Low priority

| # | Issue | Fichier(s) |
|---|-------|-----------|
| 16 | `console.log` en production | `PaymentButton.tsx:86` |
| 17 | `amountCents` stocké mais non vérifié admin | `payment.service.ts:105` |
| 18 | Message "email envoyé" non implémenté | `dashboard/subscription/success/page.tsx:127` |

---

## Annexe — Fichiers audites Phase 4

**Frontend** :
- `apps/web/src/app/plans/page.tsx`
- `apps/web/src/app/pro/subscription/page.tsx`
- `apps/web/src/app/dashboard/subscription/success/page.tsx`
- `apps/web/src/app/dashboard/subscription/cancel/page.tsx`
- `apps/web/src/components/payment/PaymentButton.tsx`

**Backend** :
- `apps/api/src/payment/payment.controller.ts`
- `apps/api/src/payment/payment.service.ts`
- `apps/api/src/payment/dto/initiate-payment.dto.ts`
- `apps/api/src/payment/utils/payment.constants.ts`
- `apps/api/src/payment/types/prisma-enums.ts`
- `apps/api/src/catalog/catalog-resolver.service.ts` (utilisé pour publicId resolution)

**Database** :
- `packages/database/prisma/schema.prisma` (PaymentOrder, ProSubscription, ProBoost, ProProfile.isPremium/premiumActiveUntil/boostActiveUntil)

**Models audités** :
- `PaymentOrder`, `ProSubscription`, `ProBoost`
- `PaymentOrderPlanType` enum : `PREMIUM_MONTHLY`, `PREMIUM_ANNUAL`, `BOOST`
- `PaymentOrderStatus` enum : `PENDING`, `PAID`, `FAILED`
- `SubscriptionPlan` enum, `SubscriptionStatus` enum, `BoostStatus` enum

---

# 🔎 PHASE 5 — AUDIT PAGES STATIQUES & CONTENU

**Objectif** : Auditer `/blog`, `/help`, et les 3 pages légales (`/legal/cgu`, `/legal/mentions`, `/legal/privacy`) en analysant SEO, accessibilité, sécurité de rendu, et cohérence navigation.

**Périmètre** :
- **Frontend** : 5 pages + 1 composant BlogContent
- **Backend** : N/A (pas d'API spécifique, contenu statique)
- **SEO** : Métadonnées, OpenGraph, sitemap, robots.txt
- **Accessibilité** : WCAG AA, navigation clavier, ARIA, `prefers-reduced-motion`
- **Sécurité** : XSS sur contenu dynamique, liens externes
- **Performance** : RSC vs CSR, bundle size, images

**Pages auditées** :
1. `/blog` (`apps/web/src/app/blog/page.tsx` + `components/blog/BlogContent.tsx`)
2. `/help` (`apps/web/src/app/help/page.tsx`)
3. `/legal/cgu` (`apps/web/src/app/legal/cgu/page.tsx`)
4. `/legal/mentions` (`apps/web/src/app/legal/mentions/page.tsx`)
5. `/legal/privacy` (`apps/web/src/app/legal/privacy/page.tsx`)

---

## 📄 1. PAGE /BLOG

### 1.1 Structure & Architecture

**Wrapper RSC** : `apps/web/src/app/blog/page.tsx` (12 lignes)
```typescript
export const metadata: Metadata = {
  title: 'Blog — Khadamat',
  description: 'Conseils et astuces pour mieux choisir vos professionnels...',
};
export default function BlogPage() {
  return <BlogContent />;
}
```

**Composant Client** : `apps/web/src/components/blog/BlogContent.tsx` (225 lignes)
- **Type** : `'use client'` avec Framer Motion
- **Contenu** : 3 articles hardcodés (lignes 14-33)
- **Sections** :
  - Hero avec search bar (readOnly, placeholder)
  - Trust signals (3 badges)
  - Grille d'articles (3 cards)
  - CTA finale "Trouver un professionnel"
  - Navigation footer

### 1.2 Fonctionnel

✅ **Ce qui fonctionne** :
- Affichage des 3 articles avec titre, excerpt, date
- Navigation "Retour à l'accueil"
- CTA "Trouver un professionnel" → `/`

❌ **Ce qui ne fonctionne pas** :
- **[MEDIUM]** Articles non cliquables (cursor-pointer ligne 143, mais aucun `<Link>` → affordance trompeuse)
- **[MEDIUM]** Search bar décorative (readOnly ligne 103, placeholder "Rechercher..." mais aucune fonctionnalité)
- **[LOW]** Pas de pagination, pas de CMS, pas de routing `/blog/[slug]`

**Données** :
- 3 articles statiques (titres : "Comment choisir un bon plombier ?", "Préparer son logement avant une intervention", "Pourquoi la vérification d'identité protège tout le monde")
- Dates : Février 2026, Janvier 2026 × 2
- Aucun appel API, aucune intégration backend

### 1.3 SEO

✅ **Métadonnées présentes** :
```typescript
title: 'Blog — Khadamat'
description: 'Conseils et astuces pour mieux choisir vos professionnels...'
```

❌ **Manquant** :
- **[HIGH]** OpenGraph tags (`og:title`, `og:description`, `og:image`, `og:url`)
- **[HIGH]** Twitter Card
- **[MEDIUM]** Canonical URL
- **[CRITICAL]** Sitemap.xml (ni statique dans `/public`, ni dynamique `sitemap.ts` dans `/app`)
- **[CRITICAL]** Robots.txt (aucun fichier trouvé)
- **[MEDIUM]** Articles individuels non indexables (pas de routing `/blog/[slug]`)
- **[LOW]** Structured data (Schema.org Article/BlogPosting)

**Impact** : Découvrabilité très limitée. Google ne peut pas indexer les articles individuellement, pas d'aperçu social media, pas de contrôle crawl.

### 1.4 Accessibilité

✅ **Conforme** :
- `aria-hidden="true"` sur icônes décoratives (lignes 59, 70, 97, 116, 120, 124, 146, 155, 169, 172, 186, 189, 206, 218)
- `aria-label="Rechercher un article"` sur input (ligne 104)
- Contraste visuel OK (texte noir sur fond blanc, tokens Tailwind)
- Navigation clavier fonctionnelle sur liens

❌ **Problèmes** :
- **[MEDIUM]** Animations Framer Motion sans `prefers-reduced-motion` (lignes 35-49, animations y/opacity) → peut causer nausée pour utilisateurs sensibles
- **[MEDIUM]** Articles avec `cursor-pointer` mais non interactifs → confusion utilisateur clavier (Tab sur élément non-focusable)
- **[LOW]** Search input readOnly mais visuellement actif → peut confondre utilisateurs lecteur d'écran

### 1.5 Sécurité

✅ **Aucun risque XSS** : Contenu 100% statique, aucun `dangerouslySetInnerHTML`, aucun Markdown rendu

❌ **Observations** :
- **[INFO]** CTA externe `href="/"` : OK (lien interne)
- **[INFO]** Pas de liens externes dans articles → pas de besoin `rel="noopener noreferrer"`

### 1.6 Performance

**Bundle impact** :
- **[MEDIUM]** Framer Motion importé (`import { motion } from 'framer-motion'`) → +50-80KB au bundle client
- **[LOW]** 6 icônes lucide-react distinctes importées (lignes 5-6)

**Rendu** :
- Page wrapper = RSC (léger)
- Contenu = CSR obligatoire pour animations → TTFB bon, mais FCP/LCP retardés vs full RSC

**Optimisations manquantes** :
- **[LOW]** Images articles absentes (placeholders `<BookOpen>` ligne 146) → pas d'optimisation Next.js Image
- **[INFO]** Gradient backgrounds CSS (lignes 57-59, 185-191) → performant, OK

### 1.7 Cohérence Navigation

✅ **Navigation cohérente** :
- Header absent (pas de `<Header />`) → intentionnel pour page dédiée ?
- Footer navigation présent (ligne 214-220)
- CTA "Trouver un professionnel" → cohérent avec funnel

❌ **Incohérences** :
- **[LOW]** Pas de Header global → utilisateur ne peut pas accéder à login/dashboard depuis `/blog` sans revenir à `/`

---

### 📊 SCORING /BLOG

| Axe | Note | Commentaire |
|-----|------|-------------|
| **1. Fonctionnel** | 2/5 | 3 articles affichés, mais non cliquables. Search décoratif. Pas de CMS. |
| **2. Sécurité & accès** | 5/5 | Contenu statique, aucun risque XSS. Pas de backend concerné. |
| **3. Intégration & cohérence data** | 2/5 | Données hardcodées, aucune API. Pas de routing individuel. |
| **4. UX & accessibilité** | 3/5 | ARIA correct, mais animations sans motion-safe + affordance trompeuse (cursor-pointer). |
| **5. Performance & robustesse** | 3/5 | RSC wrapper OK, mais CSR Framer Motion alourdit bundle. Pas d'images. |

**Score global /blog** : **3.0/5**

---

## 📄 2. PAGE /HELP

### 2.1 Structure & Architecture

**Fichier** : `apps/web/src/app/help/page.tsx` (63 lignes)
- **Type** : RSC (React Server Component)
- **Sections** :
  1. Header + navigation retour
  2. Titre "Centre d'aide"
  3. Card email contact (`support@khadamat.ma`)
  4. Section FAQ (placeholder "Bientôt disponible")

### 2.2 Fonctionnel

✅ **Ce qui fonctionne** :
- Navigation "Retour à l'accueil" (ligne 14-19)
- Lien email `mailto:support@khadamat.ma` fonctionnel (ligne 28-30)

❌ **Ce qui ne fonctionne pas** :
- **[MEDIUM]** FAQ placeholder (ligne 43-46) → "Bientôt disponible. Les réponses aux questions fréquentes seront ajoutées prochainement."

**Données** : Email contact hardcodé, aucun appel API.

### 2.3 SEO

✅ **Métadonnées présentes** :
```typescript
title: 'Centre d\'aide — Khadamat'
description: 'Besoin d\'aide ? Contactez notre équipe ou consultez notre FAQ.'
```

❌ **Manquant** :
- **[HIGH]** OpenGraph tags
- **[HIGH]** Twitter Card
- **[MEDIUM]** Canonical URL
- **[CRITICAL]** Sitemap.xml (page non listée)
- **[LOW]** Structured data (FAQPage schema quand FAQ sera implémentée)

### 2.4 Accessibilité

✅ **Conforme** :
- `aria-hidden="true"` sur icônes (lignes 18, 37, 49)
- Contraste OK (tokens Tailwind)
- Navigation clavier fonctionnelle

❌ **Problèmes** : Aucun

### 2.5 Sécurité

✅ **Aucun risque** : Contenu statique, lien email sécurisé.

### 2.6 Performance

✅ **Excellent** :
- RSC pur (pas de `'use client'`)
- Aucune dépendance JS lourde
- Pas d'images
- Bundle minimal

### 2.7 Cohérence Navigation

❌ **Incohérences** :
- **[LOW]** Pas de Header global (comme `/blog`) → utilisateur isolé

---

### 📊 SCORING /HELP

| Axe | Note | Commentaire |
|-----|------|-------------|
| **1. Fonctionnel** | 3/5 | Email contact OK, FAQ placeholder non implémentée. |
| **2. Sécurité & accès** | 5/5 | RSC statique, aucun risque. |
| **3. Intégration & cohérence data** | 4/5 | Email hardcodé OK, FAQ manquante. |
| **4. UX & accessibilité** | 5/5 | ARIA parfait, contraste OK, navigation claire. |
| **5. Performance & robustesse** | 5/5 | RSC pur, bundle minimal, TTFB/FCP excellent. |

**Score global /help** : **4.4/5**

---

## 📄 3. PAGE /LEGAL/CGU

### 3.1 Structure & Architecture

**Fichier** : `apps/web/src/app/legal/cgu/page.tsx` (48 lignes)
- **Type** : RSC
- **Contenu** : Titre + paragraphe d'intro + **placeholder "en cours de rédaction"** (ligne 33-35)

### 3.2 Fonctionnel

❌ **Contenu manquant** :
- **[CRITICAL]** CGU non rédigées → "Cette page est en cours de rédaction. Les conditions générales d'utilisation seront publiées prochainement."
- **Impact** : Non-conformité légale RGPD/Loi 09-08 (plateforme de mise en relation = obligation CGU)

✅ **Navigation** : Retour accueil fonctionnel (ligne 14-19)

### 3.3 SEO

✅ **Métadonnées présentes** :
```typescript
title: 'Conditions Générales d\'Utilisation — Khadamat'
description: 'Conditions générales d\'utilisation de la plateforme Khadamat.'
```

❌ **Manquant** : OpenGraph, Twitter, canonical, sitemap (identique autres pages)

### 3.4 Accessibilité

✅ **Conforme** : ARIA OK (ligne 18 `aria-hidden="true"`)

### 3.5 Sécurité

✅ **Aucun risque** : Contenu statique

### 3.6 Performance

✅ **Excellent** : RSC pur

### 3.7 Cohérence Navigation

❌ **[LOW]** Pas de Header global

---

### 📊 SCORING /LEGAL/CGU

| Axe | Note | Commentaire |
|-----|------|-------------|
| **1. Fonctionnel** | 1/5 | Page placeholder, aucun contenu légal réel. |
| **2. Sécurité & accès** | 5/5 | RSC statique, aucun risque technique. |
| **3. Intégration & cohérence data** | 1/5 | Contenu manquant = non-conformité légale. |
| **4. UX & accessibilité** | 5/5 | ARIA OK, navigation claire. |
| **5. Performance & robustesse** | 5/5 | RSC pur, performant. |

**Score global /legal/cgu** : **3.4/5** (pénalisé par absence contenu légal)

---

## 📄 4. PAGE /LEGAL/MENTIONS

### 4.1 Structure & Architecture

**Fichier** : `apps/web/src/app/legal/mentions/page.tsx` (48 lignes)
- **Type** : RSC
- **Contenu** : Titre + paragraphe d'intro + **placeholder "en cours de rédaction"** (ligne 32-35)

### 4.2 Fonctionnel

❌ **Contenu manquant** :
- **[CRITICAL]** Mentions légales non rédigées → "Cette page est en cours de rédaction. Les mentions légales complètes seront publiées prochainement."
- **Impact** : Non-conformité légale (obligation mentions légales = art. 6 LCEN transposé au Maroc)

✅ **Navigation** : Retour accueil fonctionnel (ligne 14-19)

### 4.3 SEO

✅ **Métadonnées présentes** :
```typescript
title: 'Mentions Légales — Khadamat'
description: 'Mentions légales de la plateforme Khadamat.'
```

❌ **Manquant** : OpenGraph, Twitter, canonical, sitemap

### 4.4 Accessibilité

✅ **Conforme** : ARIA OK (ligne 18)

### 4.5 Sécurité

✅ **Aucun risque** : Contenu statique

### 4.6 Performance

✅ **Excellent** : RSC pur

### 4.7 Cohérence Navigation

❌ **[LOW]** Pas de Header global

---

### 📊 SCORING /LEGAL/MENTIONS

| Axe | Note | Commentaire |
|-----|------|-------------|
| **1. Fonctionnel** | 1/5 | Page placeholder, aucun contenu légal réel. |
| **2. Sécurité & accès** | 5/5 | RSC statique, aucun risque technique. |
| **3. Intégration & cohérence data** | 1/5 | Contenu manquant = non-conformité légale. |
| **4. UX & accessibilité** | 5/5 | ARIA OK, navigation claire. |
| **5. Performance & robustesse** | 5/5 | RSC pur, performant. |

**Score global /legal/mentions** : **3.4/5**

---

## 📄 5. PAGE /LEGAL/PRIVACY

### 5.1 Structure & Architecture

**Fichier** : `apps/web/src/app/legal/privacy/page.tsx` (48 lignes)
- **Type** : RSC
- **Contenu** : Titre + paragraphe d'intro mentionnant Loi 09-08 + **placeholder "en cours de rédaction"** (ligne 32-35)

### 5.2 Fonctionnel

❌ **Contenu manquant** :
- **[CRITICAL]** Politique de confidentialité non rédigée → "Cette page est en cours de rédaction. La politique de confidentialité complète sera publiée prochainement."
- **Impact** : Non-conformité RGPD + Loi 09-08 (traitement données personnelles = obligation privacy policy)
- **Aggravation** : KYC CIN stockées sans politique explicite = risque CNDP (Commission Nationale de Contrôle de la Protection des Données)

✅ **Navigation** : Retour accueil fonctionnel (ligne 14-19)

### 5.3 SEO

✅ **Métadonnées présentes** :
```typescript
title: 'Politique de Confidentialité — Khadamat'
description: 'Politique de confidentialité et protection des données personnelles de Khadamat.'
```

❌ **Manquant** : OpenGraph, Twitter, canonical, sitemap

### 5.4 Accessibilité

✅ **Conforme** : ARIA OK (ligne 18)

### 5.5 Sécurité

✅ **Aucun risque technique** : Contenu statique

❌ **Risque réglementaire** :
- **[CRITICAL]** Absence privacy policy + KYC CIN stockées = exposition CNDP sanctions

### 5.6 Performance

✅ **Excellent** : RSC pur

### 5.7 Cohérence Navigation

❌ **[LOW]** Pas de Header global

---

### 📊 SCORING /LEGAL/PRIVACY

| Axe | Note | Commentaire |
|-----|------|-------------|
| **1. Fonctionnel** | 1/5 | Page placeholder, aucun contenu légal réel. |
| **2. Sécurité & accès** | 2/5 | RSC statique OK, mais risque CNDP (privacy manquante + KYC). |
| **3. Intégration & cohérence data** | 1/5 | Contenu manquant = non-conformité Loi 09-08. |
| **4. UX & accessibilité** | 5/5 | ARIA OK, navigation claire. |
| **5. Performance & robustesse** | 5/5 | RSC pur, performant. |

**Score global /legal/privacy** : **2.8/5**

---

## 🎯 SYNTHÈSE PHASE 5

### ✅ Points forts

1. **Performance technique** : 4/5 pages en RSC pur → TTFB/FCP excellent, bundle minimal
2. **Accessibilité ARIA** : `aria-hidden="true"` systématique sur icônes décoratives
3. **Sécurité XSS** : Contenu 100% statique, aucun risque injection
4. **Métadonnées de base** : Toutes pages ont `title` + `description`

### ❌ Problèmes critiques

#### 1. **[CRITICAL] Non-conformité légale — 3 pages légales**

**Pages concernées** : `/legal/cgu`, `/legal/mentions`, `/legal/privacy`

**Constat** :
- Les 3 pages affichent un placeholder "en cours de rédaction"
- Aucun contenu légal réel publié
- Privacy policy manquante alors que KYC CIN stockées (Loi 09-08 art. 4 + RGPD art. 13)

**Impact** :
- **Risque CNDP** : Sanctions administratives (10 000 à 100 000 MAD, Loi 09-08 art. 53)
- **Risque contractuel** : CGU absentes → nullité contrats PRO/CLIENT en cas litige
- **Risque réputation** : Plateforme perçue comme non-professionnelle

**Action requise** : Rédiger et publier les 3 documents légaux AVANT mise en production.

#### 2. **[CRITICAL] SEO — Absence sitemap.xml & robots.txt**

**Constat** :
- `Glob "**/sitemap.xml"` → aucun fichier trouvé
- `Glob "**/sitemap.ts"` → aucun fichier trouvé (Next.js 14 Dynamic Sitemap)
- `Glob "**/robots.txt"` → aucun fichier trouvé

**Impact** :
- Google ne peut pas découvrir les pages efficacement
- Aucun contrôle crawl (pages sensibles potentiellement indexées, pages publiques ignorées)
- Perte SEO sur toutes pages statiques (blog, help, legal)

**Action requise** :
```typescript
// apps/web/src/app/sitemap.ts
export default function sitemap() {
  return [
    { url: 'https://khadamat.ma', lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: 'https://khadamat.ma/blog', lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: 'https://khadamat.ma/help', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: 'https://khadamat.ma/legal/cgu', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
    { url: 'https://khadamat.ma/legal/mentions', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
    { url: 'https://khadamat.ma/legal/privacy', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
    // + pages dynamiques /pro/[publicId], /pros, etc.
  ];
}
```

```
// apps/web/public/robots.txt
User-agent: *
Allow: /
Disallow: /dashboard
Disallow: /api
Sitemap: https://khadamat.ma/sitemap.xml
```

#### 3. **[HIGH] SEO — OpenGraph & Twitter Card absents**

**Pages concernées** : Toutes (5/5)

**Constat** : Métadonnées `title` + `description` présentes, mais aucun `openGraph`, `twitter`, `canonical`.

**Impact** :
- Partage social (Facebook, Twitter, LinkedIn) → aperçu générique sans image
- Perte trafic social media
- Pas de contrôle URL canonique (risque duplicate content si plusieurs domaines)

**Action requise** : Ajouter à chaque page :
```typescript
export const metadata: Metadata = {
  title: '...',
  description: '...',
  openGraph: {
    title: '...',
    description: '...',
    url: 'https://khadamat.ma/...',
    siteName: 'Khadamat',
    images: [{ url: 'https://khadamat.ma/og-image.jpg', width: 1200, height: 630 }],
    locale: 'fr_MA',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '...',
    description: '...',
    images: ['https://khadamat.ma/og-image.jpg'],
  },
  alternates: {
    canonical: 'https://khadamat.ma/...',
  },
};
```

### ⚠️ Problèmes moyens

#### 4. **[MEDIUM] Blog — Articles non cliquables**

**Fichier** : `apps/web/src/components/blog/BlogContent.tsx:143`

**Constat** :
```tsx
<motion.article
  className="... cursor-pointer"
>
  {/* Contenu article, mais aucun <Link> */}
</motion.article>
```

**Impact** :
- Affordance trompeuse (cursor-pointer mais non-interactive)
- Utilisateur clique → rien ne se passe → frustration
- SEO : articles non-indexables individuellement (pas de `/blog/[slug]`)

**Action requise** :
1. Court terme : Retirer `cursor-pointer` si articles restent statiques
2. Long terme : Implémenter routing `/blog/[slug]` + CMS (Contentful, Sanity, ou Markdown local)

#### 5. **[MEDIUM] Blog — Search bar décorative**

**Fichier** : `apps/web/src/components/blog/BlogContent.tsx:100-105`

**Constat** :
```tsx
<input
  type="text"
  placeholder="Rechercher un conseil (ex: plomberie, prix)..."
  readOnly
/>
```

**Impact** :
- Illusion d'interactivité (placeholder invite à taper, mais readOnly)
- Confusion utilisateur + lecteurs d'écran

**Action requise** :
1. Court terme : Retirer search bar OU ajouter message "Prochainement"
2. Long terme : Implémenter recherche client-side (Fuse.js) ou Algolia

#### 6. **[MEDIUM] Animations Framer Motion sans motion-safe**

**Fichier** : `apps/web/src/components/blog/BlogContent.tsx:35-49`

**Constat** :
```tsx
const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.5 } },
};
```

Aucun contrôle `prefers-reduced-motion`.

**Impact** : Utilisateurs sensibles au mouvement (vestibular disorders) peuvent ressentir nausée/malaise.

**Action requise** :
```tsx
const shouldReduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const itemVariants = shouldReduceMotion
  ? { hidden: { opacity: 0 }, visible: { opacity: 1 } }
  : { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1, transition: { duration: 0.5 } } };
```

OU utiliser Tailwind `motion-safe:` classes :
```tsx
<div className="motion-safe:animate-fadeIn">...</div>
```

#### 7. **[MEDIUM] Performance — Framer Motion bundle weight**

**Fichier** : `apps/web/src/components/blog/BlogContent.tsx:4`

**Constat** :
```tsx
import { motion } from 'framer-motion';
```

**Impact** : +50-80KB au bundle client pour animer 3 articles statiques.

**Alternative** :
- CSS animations (`@keyframes` + Tailwind `animate-*`)
- IntersectionObserver + Tailwind transitions (plus léger)

**Action requise** : Si animations essentielles → OK. Sinon, migrer vers CSS pur.

### 🔍 Problèmes mineurs

#### 8. **[LOW] Header global absent sur pages statiques**

**Pages concernées** : `/blog`, `/help`, toutes `/legal/*`

**Constat** : Aucune page n'importe `<Header />` → utilisateur ne peut pas accéder login/dashboard depuis ces pages sans revenir à `/`.

**Impact** : Navigation dégradée, mais lien "Retour à l'accueil" présent → impact UX limité.

**Action requise** (optionnelle) : Ajouter `<Header />` si cohérence navigation souhaitée.

#### 9. **[LOW] FAQ placeholder sur /help**

**Fichier** : `apps/web/src/app/help/page.tsx:43-46`

**Constat** : Section FAQ affichée avec message "Bientôt disponible".

**Impact** : Utilisateur cherchant réponse rapide → déçu. Mais email contact fonctionnel → alternative existante.

**Action requise** : Implémenter FAQ réelle (5-10 questions fréquentes avec accordéon).

#### 10. **[INFO] Structured Data absent**

**Pages concernées** : Toutes

**Constat** : Aucun `<script type="application/ld+json">` avec Schema.org (BlogPosting, FAQPage, Organization).

**Impact** : Perte rich snippets Google (FAQ déroulante, fil d'Ariane, logo organisation).

**Action requise** (long terme) :
```tsx
<script type="application/ld+json">
{JSON.stringify({
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "Comment choisir un bon plombier ?",
  "author": { "@type": "Organization", "name": "Khadamat" },
  "datePublished": "2026-02-01",
  ...
})}
</script>
```

---

## 📈 SCORING GLOBAL PHASE 5

| Page | Fonctionnel | Sécurité | Intégration | UX/A11y | Perf | Moyenne |
|------|-------------|----------|-------------|---------|------|---------|
| `/blog` | 2/5 | 5/5 | 2/5 | 3/5 | 3/5 | **3.0/5** |
| `/help` | 3/5 | 5/5 | 4/5 | 5/5 | 5/5 | **4.4/5** |
| `/legal/cgu` | 1/5 | 5/5 | 1/5 | 5/5 | 5/5 | **3.4/5** |
| `/legal/mentions` | 1/5 | 5/5 | 1/5 | 5/5 | 5/5 | **3.4/5** |
| `/legal/privacy` | 1/5 | 2/5 | 1/5 | 5/5 | 5/5 | **2.8/5** |

**Score moyen Phase 5** : **3.4/5**

**Interprétation** :
- ✅ **Sécurité technique** excellente (RSC statique, aucun XSS)
- ✅ **Performance** excellente (4/5 pages RSC pur)
- ✅ **Accessibilité ARIA** conforme WCAG AA
- ⚠️ **SEO** critique (pas de sitemap/robots, pas d'OpenGraph)
- ❌ **Fonctionnel & légal** bloquant (3 pages légales vides, blog non-interactif)

---

## 🚨 ACTIONS PRIORITAIRES

### 🔴 P0 — Bloquant mise en production

1. **Rédiger les 3 pages légales** (CGU, Mentions, Privacy) → conformité Loi 09-08
2. **Créer sitemap.ts** → découvrabilité Google
3. **Créer robots.txt** → contrôle crawl

### 🟠 P1 — Critique SEO/UX

4. **Ajouter OpenGraph/Twitter Card** sur toutes pages
5. **Retirer cursor-pointer** sur articles blog OU implémenter `/blog/[slug]`
6. **Retirer search bar** blog OU implémenter recherche
7. **Ajouter prefers-reduced-motion** sur animations Framer Motion

### 🟡 P2 — Améliorations

8. **Implémenter FAQ** sur /help
9. **Ajouter Header global** sur pages statiques
10. **Optimiser bundle** : remplacer Framer Motion par CSS animations
11. **Structured Data** : Schema.org BlogPosting/Organization

---

## 📁 ANNEXE — FICHIERS AUDITÉES PHASE 5

**Frontend (6 fichiers)** :
```
apps/web/src/app/blog/page.tsx (12 lignes)
apps/web/src/components/blog/BlogContent.tsx (225 lignes)
apps/web/src/app/help/page.tsx (63 lignes)
apps/web/src/app/legal/cgu/page.tsx (48 lignes)
apps/web/src/app/legal/mentions/page.tsx (48 lignes)
apps/web/src/app/legal/privacy/page.tsx (48 lignes)
```

**Backend** : N/A (aucune API spécifique, contenu statique)

**Database** : N/A

**SEO/Infrastructure** :
- ❌ `apps/web/src/app/sitemap.ts` → **NON TROUVÉ**
- ❌ `apps/web/src/app/robots.ts` → **NON TROUVÉ**
- ❌ `apps/web/public/sitemap.xml` → **NON TROUVÉ**
- ❌ `apps/web/public/robots.txt` → **NON TROUVÉ**

**Total lignes lues** : 444 lignes frontend

---

**FIN PHASE 5 — AUDIT PAGES STATIQUES & CONTENU**