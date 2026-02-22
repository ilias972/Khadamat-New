# Khadamat — Guide Setup Local

> Tout ce qu'il faut pour cloner le repo et lancer le projet en local.

---

## 1. Fichiers .env requis

### Vue d'ensemble

| Fichier | Versionne ? | Obligatoire ? | Role |
|---------|------------|---------------|------|
| `.env.database` (racine) | OUI (deja commite) | OUI | DATABASE_URL + SHADOW_DATABASE_URL |
| `packages/database/.env` | OUI (deja commite) | OUI | Meme DATABASE_URL pour Prisma CLI |
| `apps/api/.env` | NON (.gitignore) | OUI | Config API (JWT, ports, CORS) |
| `apps/web/.env.local` | NON (.gitignore) | OUI | URL de l'API pour Next.js |

### `.env.database` (racine) — DEJA COMMITE

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/khadamat?schema=public&connection_limit=10&pool_timeout=10"
```

> Ce fichier est deja dans le repo. Pas besoin de le creer sauf si tu changes tes credentials Postgres.

### `packages/database/.env` — DEJA COMMITE

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/khadamat?schema=public"
SHADOW_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/khadamat_shadow?schema=public"
```

> Aussi commite. Contient en plus le `SHADOW_DATABASE_URL` requis par `prisma migrate dev`.

### `apps/api/.env` — A CREER

```env
# Port de l'API
API_PORT=3001
NODE_ENV=development

# URL du frontend (CORS + redirections)
FRONTEND_URL=http://localhost:3000

# JWT — OBLIGATOIRE, min 32 caracteres
JWT_SECRET=change-me-to-a-random-string-of-at-least-32-chars
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d

# CORS — origines autorisees (separees par des virgules)
CORS_ORIGINS=http://localhost:3000,http://localhost:8081

# ---- Optionnels (fonctionnent sans en dev) ----

# Email (Resend) — sans cle, les emails sont logges dans la console
# RESEND_API_KEY=re_xxxxxxxxxxxx
# RESEND_FROM_EMAIL=onboarding@resend.dev

# Hachage CIN pour KYC — defaut si absent : khadamat-cin-default-salt
# CIN_HASH_SALT=khadamat-cin-default-salt

# Debug SQL
# LOG_QUERIES=true
```

**Variables obligatoires :** `JWT_SECRET`, `API_PORT`, `CORS_ORIGINS`
**Fake en dev :** `RESEND_API_KEY` (pas besoin), `CIN_HASH_SALT` (defaut ok)

### `apps/web/.env.local` — A CREER

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

C'est la seule variable utilisee cote web. Elle pointe vers le prefix `/api` du backend NestJS.

---

## 2. PostgreSQL

### Credentials attendus

| Champ | Valeur par defaut |
|-------|-------------------|
| Host | `localhost` |
| Port | `5432` |
| User | `postgres` |
| Password | `postgres` |
| Database | `khadamat` |
| Shadow DB | `khadamat_shadow` |

### Format DATABASE_URL

```
postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public
```

### Creer les databases

```bash
# Verifier que Postgres tourne
psql -U postgres -c "SELECT 1;"

# Creer la DB principale
createdb -U postgres khadamat

# Creer la shadow DB (requise par prisma migrate dev)
createdb -U postgres khadamat_shadow
```

> Si tu utilises Postgres.app (macOS), l'user par defaut est souvent ton username systeme.
> Adapte les credentials dans les fichiers .env en consequence.

---

## 3. Commandes — du clone au run

```bash
# 1. Clone
git clone <repo-url> && cd Khadamat-New

# 2. Install (pnpm obligatoire)
pnpm install

# 3. Creer les fichiers .env manquants (voir section 1)
#    - apps/api/.env
#    - apps/web/.env.local
#    (les 2 autres sont deja commites)

# 4. Creer les databases PostgreSQL
createdb -U postgres khadamat
createdb -U postgres khadamat_shadow

# 5. Generer le client Prisma
pnpm --filter @khadamat/database generate

# 6. Appliquer les migrations
pnpm --filter @khadamat/database exec prisma migrate deploy

# 7. Seed (remplir la DB avec des donnees de test)
pnpm --filter @khadamat/database exec prisma db seed

# 8a. Lancer API seule
pnpm --filter @khadamat/api dev

# 8b. Lancer WEB seul
pnpm --filter @khadamat/web dev

# 8c. Lancer les deux ensemble (turbo)
pnpm dev
```

### Commandes utiles

```bash
# Prisma Studio (GUI pour explorer la DB)
pnpm --filter @khadamat/database studio

# Reset complet de la DB (drop + recreate + seed)
pnpm --filter @khadamat/database exec prisma migrate reset

# Build check
npx turbo build --filter=@khadamat/web

# Swagger docs (API en mode dev)
open http://localhost:3001/docs
```

---

## 4. Ports utilises

| Service | Port | URL |
|---------|------|-----|
| Next.js (web) | `3000` | http://localhost:3000 |
| NestJS (api) | `3001` | http://localhost:3001 |
| API prefix | — | http://localhost:3001/api |
| Swagger docs | — | http://localhost:3001/docs |
| Health check | — | http://localhost:3001/api/health |
| PostgreSQL | `5432` | — |
| Prisma Studio | `5555` | http://localhost:5555 |

---

## 5. Comptes de test (seed)

**Mot de passe universel : `Password1234`**

### Clients

| Nom | Telephone | Email | Ville |
|-----|-----------|-------|-------|
| Amine El Idrissi | `0612345678` | amine.client@khadamat.test | Casablanca |
| Sara Bennani | `0623456789` | sara.client@khadamat.test | Rabat-Sale |
| Youssef Alaoui | `0634567890` | youssef.client@khadamat.test | Marrakech |

### Professionnels

| Nom | Telephone | Ville | KYC | Premium |
|-----|-----------|-------|-----|---------|
| Khalid Lahlou | `0651111111` | Casablanca | APPROVED | Oui |
| Hana Chraibi | `0662222222` | Rabat-Sale | APPROVED | Oui |
| Rachid Omar | `0673333333` | Marrakech | APPROVED | Non (boost actif) |
| Oumaima Zerouali | `0654444444` | Casablanca | APPROVED | Non |
| Said Mouline | `0665555555` | Casablanca | PENDING | Non |

### Login via curl

```bash
# Login client
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone": "0612345678", "password": "Password1234"}'

# Login pro
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone": "0651111111", "password": "Password1234"}'

# Utiliser le token retourne
curl http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer <accessToken>"
```

---

## 6. Troubleshooting

### Port deja utilise

```bash
# Trouver le process sur le port 3001
lsof -ti:3001 | xargs kill -9

# Idem pour 3000
lsof -ti:3000 | xargs kill -9
```

### Cache Next.js / Turbo corrompu

```bash
rm -rf apps/web/.next .turbo node_modules/.cache
pnpm dev
```

### Prisma migrate echoue

```bash
# Option 1 : Reset complet (drop + recreate + migrate + seed)
pnpm --filter @khadamat/database exec prisma migrate reset

# Option 2 : Verifier que la shadow DB existe
createdb -U postgres khadamat_shadow

# Option 3 : Push force le schema (sans migrations)
pnpm --filter @khadamat/database exec prisma db push
```

### Login 401 / 403

- Verifier que `JWT_SECRET` dans `apps/api/.env` fait au moins 32 caracteres
- Verifier que le seed a bien tourne (`pnpm --filter @khadamat/database exec prisma db seed`)
- Verifier que `CORS_ORIGINS` contient `http://localhost:3000`

### `@prisma/client` not found / Prisma schema out of sync

```bash
pnpm --filter @khadamat/database generate
```

### Erreur "FATAL: database khadamat does not exist"

```bash
createdb -U postgres khadamat
createdb -U postgres khadamat_shadow
```

### Erreur bcrypt / bcryptjs au seed

```bash
pnpm --filter @khadamat/database add bcryptjs
```

### API demarre mais ne repond pas

```bash
# Verifier le health check
curl http://localhost:3001/api/health

# Verifier les logs NestJS — chercher les erreurs au boot
# Le JWT_SECRET doit etre >= 32 chars sinon crash
```
