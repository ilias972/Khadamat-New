# API Permissions Audit — Phase 4A

Audit basé sur l'inspection de tous les fichiers `*.controller.ts` dans `apps/api/src/`.
Date : 2026-02-13.

---

## Endpoints publics (aucune authentification)

| Méthode | Route                          | Guard(s)         | Notes |
|---------|-------------------------------|------------------|-------|
| GET     | /api/health                   | Aucun            | Health check |
| GET     | /api/health/ready             | Aucun            | Readiness probe |
| GET     | /api/public/cities            | Aucun            | Catalogue |
| GET     | /api/public/categories        | Aucun            | Catalogue |
| GET     | /api/public/pros              | Aucun            | Catalogue |
| GET     | /api/public/pros/v2           | Aucun            | Catalogue paginé |
| GET     | /api/public/pros/:id          | OptionalJwtGuard | Auth optionnelle (isFavorite) |
| GET     | /api/public/stats/home        | Aucun            | Stats homepage |
| GET     | /api/public/slots             | Aucun            | Créneaux dispo |
| POST    | /api/auth/register            | Aucun            | Throttle 5/min |
| POST    | /api/auth/login               | Aucun            | Throttle 5/min |
| POST    | /api/auth/refresh             | Aucun            | CSRF header requis |
| POST    | /api/auth/logout              | Aucun            | CSRF header requis |
| POST    | /api/newsletter/subscribe     | Aucun            | Throttle 5/min |
| GET     | /api/newsletter/confirm       | Aucun            | Throttle 10/min |
| POST    | /api/newsletter/unsubscribe   | Aucun            | Throttle 5/min |

---

## Endpoints authentifiés — auth only (JwtAuthGuard, pas de RolesGuard)

| Méthode | Route                            | Guard(s)      | Restriction rôle | Notes |
|---------|----------------------------------|---------------|-----------------|-------|
| GET     | /api/auth/me                     | JwtAuthGuard  | Aucune          | Tout rôle |
| PATCH   | /api/users/me                    | JwtAuthGuard  | Aucune          | Tout rôle peut modifier son profil |
| GET     | /api/dashboard/stats             | JwtAuthGuard  | Aucune          | Stats personnelles, service filtre par rôle |
| POST    | /api/bookings                    | JwtAuthGuard  | En service : CLIENT only | `booking.service.createBooking()` vérifie `userRole === 'CLIENT'` |
| GET     | /api/bookings                    | JwtAuthGuard  | En service : CLIENT ou PRO | Filtre automatique par `userId` + `role` |
| PATCH   | /api/bookings/:id/status         | JwtAuthGuard  | En service : PRO only | `updateBookingStatus()` vérifie ownership + rôle PRO |
| PATCH   | /api/bookings/:id/duration       | JwtAuthGuard  | En service : PRO only | `updateBooking()` vérifie ownership + rôle PRO |
| PATCH   | /api/bookings/:id/respond        | JwtAuthGuard  | En service : CLIENT only | `respondToModification()` vérifie ownership + rôle CLIENT |
| PATCH   | /api/bookings/:id/complete       | JwtAuthGuard  | En service : PRO only | `completeBooking()` vérifie ownership + rôle PRO |
| PATCH   | /api/bookings/:id/cancel         | JwtAuthGuard  | En service : CLIENT ou PRO | `cancelBooking()` vérifie ownership |

---

## Endpoints protégés par rôle (JwtAuthGuard + RolesGuard)

### PRO uniquement

| Méthode | Route                   | Guard(s)                    | Roles   |
|---------|------------------------|-----------------------------|---------|
| GET     | /api/pro/me            | JwtAuthGuard + RolesGuard   | PRO     |
| PATCH   | /api/pro/profile       | JwtAuthGuard + RolesGuard   | PRO     |
| PUT     | /api/pro/services      | JwtAuthGuard + RolesGuard   | PRO     |
| PUT     | /api/pro/availability  | JwtAuthGuard + RolesGuard   | PRO     |
| GET     | /api/pro/portfolio     | JwtAuthGuard + RolesGuard   | PRO     |
| POST    | /api/pro/portfolio     | JwtAuthGuard + RolesGuard   | PRO     |
| DELETE  | /api/pro/portfolio/:id | JwtAuthGuard + RolesGuard   | PRO     |
| POST    | /api/kyc/upload        | JwtAuthGuard + RolesGuard   | PRO     |
| POST    | /api/kyc/submit        | JwtAuthGuard + RolesGuard   | PRO     |
| POST    | /api/kyc/resubmit      | JwtAuthGuard + RolesGuard   | PRO     |
| GET     | /api/kyc/status        | JwtAuthGuard + RolesGuard   | PRO     |
| POST    | /api/payment/checkout  | JwtAuthGuard + RolesGuard   | PRO     |
| GET     | /api/payment/status/:oid | JwtAuthGuard + RolesGuard | PRO     |

### PRO ou ADMIN

| Méthode | Route                                  | Guard(s)                    | Roles       |
|---------|----------------------------------------|-----------------------------|-------------|
| GET     | /api/kyc/files/:type/download          | JwtAuthGuard + RolesGuard   | PRO, ADMIN  |

Note : accès KYC download vérifié en plus dans `kycService.assertAccess()` (PRO = owner only, ADMIN = any).

### CLIENT uniquement

| Méthode | Route                 | Guard(s)                    | Roles   |
|---------|-----------------------|-----------------------------|---------|
| GET     | /api/favorites        | JwtAuthGuard + RolesGuard   | CLIENT  |
| POST    | /api/favorites/:proId | JwtAuthGuard + RolesGuard   | CLIENT  |
| DELETE  | /api/favorites/:proId | JwtAuthGuard + RolesGuard   | CLIENT  |
| POST    | /api/reviews          | JwtAuthGuard + RolesGuard   | CLIENT  |

### ADMIN uniquement

| Méthode | Route                             | Guard(s)                    | Roles   |
|---------|-----------------------------------|-----------------------------|---------|
| POST    | /api/payment/admin/confirm/:oid   | JwtAuthGuard + RolesGuard   | ADMIN   |
| POST    | /api/payment/admin/reject/:oid    | JwtAuthGuard + RolesGuard   | ADMIN   |
| GET     | /api/payment/admin/pending        | JwtAuthGuard + RolesGuard   | ADMIN   |
| GET     | /api/newsletter/admin/export      | JwtAuthGuard + RolesGuard   | ADMIN   |

---

## Observations

### Booking endpoints : restriction au niveau service (pas guard)

Les routes `/api/bookings/*` utilisent uniquement `JwtAuthGuard` sans `RolesGuard`.
La vérification du rôle se fait dans `booking.service.ts` :
- `createBooking()` : `if (userRole !== 'CLIENT') throw ForbiddenException`
- `updateBookingStatus()` : `if (userRole !== 'PRO') throw ForbiddenException`
- `completeBooking()` : `if (userRole !== 'PRO') throw ForbiddenException`
- `respondToModification()` : `if (userRole !== 'CLIENT') throw ForbiddenException`
- `cancelBooking()` : vérifie ownership (clientId ou proId match)

Cela fonctionne correctement mais diffère du pattern guard utilisé ailleurs.

### Dashboard : pas de restriction rôle

`GET /api/dashboard/stats` n'a pas de `RolesGuard`. Le service filtre probablement par rôle en interne.

### Users : pas de restriction rôle

`PATCH /api/users/me` n'a pas de `RolesGuard`. Tout utilisateur authentifié peut modifier son propre profil — comportement attendu.

---

## Tests de vérification

```bash
# CLIENT ne peut pas accéder au dashboard PRO
curl -X GET http://localhost:3001/api/pro/me -b client-cookies.txt
# Attendu : 403

# Non authentifié ne peut pas créer de booking
curl -X POST http://localhost:3001/api/bookings \
  -H "Content-Type: application/json" \
  -d '{"proId":"fake","categoryId":"cat_test_001","date":"2026-03-01","time":"10:00"}'
# Attendu : 401

# PRO ne peut pas accéder aux endpoints admin
curl -X POST http://localhost:3001/api/payment/admin/confirm/fake -b pro-cookies.txt
# Attendu : 403

curl -X GET http://localhost:3001/api/payment/admin/pending -b pro-cookies.txt
# Attendu : 403

# CLIENT ne peut pas accéder au portfolio PRO
curl -X GET http://localhost:3001/api/pro/portfolio -b client-cookies.txt
# Attendu : 403

# CLIENT ne peut pas accéder au KYC status
curl -X GET http://localhost:3001/api/kyc/status -b client-cookies.txt
# Attendu : 403

# CLIENT ne peut pas télécharger fichier KYC d'un PRO
PRO_ID=$(curl -s http://localhost:3001/api/public/pros | jq -r '.[0].id')
curl -X GET "http://localhost:3001/api/kyc/files/cin-front/download?proPublicId=$PRO_ID" -b client-cookies.txt
# Attendu : 403
```
