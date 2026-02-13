# Smoke Tests Phase 4A — Khadamat Pré-Prod

## A. Setup local

```bash
# 1. DB : assume PostgreSQL running locally (database: khadamat)

# 2. Appliquer migrations
cd packages/database
pnpm exec prisma migrate deploy

# 3. Exécuter seed (idempotent, peut être lancé 2x)
node prisma/seed.js

# 4. Démarrer API (port 3001)
cd ../../apps/api
pnpm dev

# 5. Démarrer Web (port 3000)
cd ../web
pnpm dev
```

Comptes seed :

| Rôle   | Phone        | Email                       | Password     |
|--------|-------------|-----------------------------|-------------|
| CLIENT | 0612345678  | amine.client@khadamat.test  | Password1234 |
| PRO    | 0651111111  | khalid.pro@khadamat.test    | Password1234 |
| ADMIN  | +212600000000 | admin@khadamat.com        | Password1234 |

---

## B. Smoke — Auth

### B1. Register CLIENT

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "Client",
    "email": "test.smoke@example.com",
    "phone": "0699999999",
    "password": "Password1234",
    "role": "CLIENT",
    "cityId": "city_casa_001",
    "addressLine": "1 Rue Test"
  }'
```

Attendu : `201` + `{ "user": { "id": "usr_...", ... } }`

### B2. Login CLIENT

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{ "login": "0612345678", "password": "Password1234" }' \
  -c cookies.txt -v
```

Attendu :
- `200` + `{ "user": { "id": "usr_...", ... } }`
- Headers `set-cookie` contiennent `accessToken` et `refreshToken`
- `user.id` commence par `usr_` (pas un cuid)

### B3. Refresh token

```bash
curl -X POST http://localhost:3001/api/auth/refresh \
  -H "X-CSRF-Protection: 1" \
  -b cookies.txt -c cookies.txt -v
```

Attendu : `200` + nouveaux cookies

### B4. Vérifier : id = publicId (pas cuid)

```bash
curl http://localhost:3001/api/auth/me \
  -b cookies.txt | jq '.id'
```

Attendu : `"usr_<32 hex chars>"` — jamais un cuid (`c...`)

---

## C. Smoke — Public Catalog + Pro Page

### C1. Lister les pros

```bash
curl http://localhost:3001/api/public/pros | jq '.[0].id'
```

Attendu : `"pro_<32 hex chars>"`

### C2. Ouvrir page pro

Naviguer vers : `http://localhost:3000/pro/<pro_publicId_from_C1>`

Attendu :
- URL contient `/pro/pro_...`
- Page charge sans erreur
- Nom du pro visible (ex: "Khalid Lahlou")
- Ville visible (ex: "Casablanca")
- Section "Services proposés" visible

### C3. Vérifier pas de cuid dans URL

L'URL de la page pro ne doit jamais contenir un cuid (`/pro/clk...` ou `/pro/cml...`).

---

## D. Smoke — Booking flow minimal

### D1. Créer booking (CLIENT)

```bash
# 1. Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{ "login": "0612345678", "password": "Password1234" }' \
  -c cookies.txt

# 2. Get slots
PRO_ID=$(curl -s http://localhost:3001/api/public/pros | jq -r '.[0].id')
DATE=$(date -v+7d +%Y-%m-%d)
CATEGORY=$(curl -s http://localhost:3001/api/public/pros | jq -r '.[0].services[0].categoryId')

curl "http://localhost:3001/api/public/slots?proId=$PRO_ID&date=$DATE&categoryId=$CATEGORY"

# 3. Create booking (utiliser un slot disponible)
curl -X POST http://localhost:3001/api/bookings \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d "{\"proId\": \"$PRO_ID\", \"categoryId\": \"$CATEGORY\", \"date\": \"$DATE\", \"time\": \"10:00\"}"
```

Attendu : `201` + `{ "id": "...", "status": "PENDING" }`

### D2. PRO voit le booking PENDING

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{ "login": "0651111111", "password": "Password1234" }' \
  -c pro-cookies.txt

curl http://localhost:3001/api/bookings -b pro-cookies.txt | jq '.[].status'
```

Attendu : au moins un `"PENDING"`

### D3. PRO confirme

```bash
BOOKING_ID=<id du booking PENDING>
curl -X PATCH "http://localhost:3001/api/bookings/$BOOKING_ID/status" \
  -H "Content-Type: application/json" \
  -b pro-cookies.txt \
  -d '{ "status": "CONFIRMED" }'
```

Attendu : `200` + `{ "status": "CONFIRMED" }`

---

## E. Smoke — KYC security

### E1. PRO accède à ses fichiers KYC

```bash
# Login PRO
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{ "login": "0651111111", "password": "Password1234" }' \
  -c pro-cookies.txt

# Get pro publicId
PRO_ID=$(curl -s http://localhost:3001/api/public/pros | jq -r '.[0].id')

# Download KYC file
curl -v "http://localhost:3001/api/kyc/files/cin-front/download?proPublicId=$PRO_ID" \
  -b pro-cookies.txt
```

Attendu : `200` (si fichier existe) ou `404` (fichier absent sur disque) — jamais `403`

### E2. CLIENT ne peut PAS accéder au KYC d'un PRO

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{ "login": "0612345678", "password": "Password1234" }' \
  -c client-cookies.txt

curl -v "http://localhost:3001/api/kyc/files/cin-front/download?proPublicId=$PRO_ID" \
  -b client-cookies.txt
```

Attendu : `403`

### E3. Vérifier KycAccessLog en DB

```bash
psql -U postgres -d khadamat -c 'SELECT "userId", "filename", "result", "ip" FROM "KycAccessLog" ORDER BY "createdAt" DESC LIMIT 5;'
```

Attendu :
- ALLOW pour le PRO owner
- DENY pour le CLIENT

### E4. Vérifier : aucune réponse API ne contient `kyc...Key`

```bash
# KYC status endpoint
curl http://localhost:3001/api/kyc/status -b pro-cookies.txt | grep -i "key"
```

Attendu : aucune occurrence de `kycCinFrontKey`, `kycCinBackKey`, `kycSelfieKey`

---

## F. Smoke — PublicId & City leak

### F1. Villes : pas de City.id interne

```bash
curl http://localhost:3001/api/public/cities | jq '.[0]'
```

Attendu : `{ "id": "city_casa_001", "name": "Casablanca", "slug": "casablanca" }` — `id` = publicId, pas un cuid

### F2. Catégories : pas de Category.id interne

```bash
curl http://localhost:3001/api/public/categories | jq '.[0]'
```

Attendu : `{ "id": "cat_...", "name": "...", "slug": "..." }` — `id` = publicId

### F3. Pros : pas de User.id / cuid

```bash
curl http://localhost:3001/api/public/pros | jq '.[].id'
```

Attendu : tous commencent par `pro_`, aucun cuid

### F4. Login response : pas de cuid

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{ "login": "0612345678", "password": "Password1234" }' | jq '.user.id'
```

Attendu : `"usr_..."` — jamais `"clk..."` ou `"cml..."`
