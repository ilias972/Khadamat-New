/**
 * Types miroirs des enums Prisma
 * Ces types correspondent exactement au schéma Prisma et seront remplacés
 * par les types générés une fois que `prisma generate` sera exécuté.
 */

export enum SubscriptionPlan {
  PREMIUM_MONTHLY_NO_COMMIT = 'PREMIUM_MONTHLY_NO_COMMIT',
  PREMIUM_ANNUAL_COMMIT = 'PREMIUM_ANNUAL_COMMIT',
}

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

export enum BoostStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
}
