# Khadamat - Marketplace marocaine de services à la demande

## Structure du projet

Monorepo Turborepo avec pnpm.

### Apps

- **apps/api** - Backend NestJS
- **apps/web** - Frontend Next.js (App Router)
- **apps/mobile** - Application mobile Expo (iOS/Android)

### Packages

- **packages/database** - Prisma + PostgreSQL
- **packages/contracts** - TypeScript + Zod (contrats partagés)

## Installation

```bash
pnpm install
```

## Développement

```bash
pnpm dev
```

## Documentation

Voir [PRD.md](./PRD.md) pour la spécification complète du projet.
