# KHADAMAT — Règles Projet Claude Code

## Stack technique
- **Framework** : Next.js 16 App Router (React 19)
- **Styling** : Tailwind CSS v4 + design tokens définis dans `globals.css` via `@theme`
- **State** : Zustand
- **Icons** : lucide-react uniquement
- **API publique** : `GET /public/cities`, `GET /public/categories`, `GET /public/pros`
- **Routing recherche** : `/pros?cityId=X&categoryId=Y`
- **Backend** : NestJS 10 (apps/api)
- **Monorepo** : Turborepo + pnpm workspaces
- **Build check** : `npx turbo build --filter=@khadamat/web`

## Conventions de code

### Couleurs
- Utiliser UNIQUEMENT les design tokens Tailwind : `text-primary-500`, `bg-surface`, `text-text-secondary`, etc.
- JAMAIS de hex en dur (`#F08C1B`, `#1A1A1A`). Toutes les couleurs sont dans `globals.css @theme`.

### Accessibilité (OBLIGATOIRE)
- Tout `<label>` doit avoir un `htmlFor` lié à un `id` sur l'input
- Tout élément interactif doit avoir un `aria-label` si le texte visible est insuffisant
- Navigation clavier fonctionnelle sur tous les composants interactifs
- Contraste minimum WCAG AA (4.5:1 pour le texte, 3:1 pour les grands textes)
- `prefers-reduced-motion` : conditionner toute animation CSS/JS

### Composants interactifs
- JAMAIS de `<Link>` wrappant un `<button>` (double interactif). Utiliser `<Link className="...">` stylé en bouton
- JAMAIS d'illusion d'interactivité : si un input/bouton existe visuellement, il DOIT fonctionner
- Bouton `disabled` + `title` tooltip si le formulaire est incomplet
- Pas de placeholder trompeur (pas de texte qui laisse croire qu'une fonctionnalité existe si elle n'est pas implémentée)

### API
- Pas d'appels API inutiles (pas de polling, pas de fetch sur des endpoints inexistants)
- Gérer les 3 états : loading (skeleton), ready, error (message + retry)

### Textes
- Pas de lorem ipsum ni de texte générique
- Wording en français, adapté au contexte marocain
- Les chiffres affichés doivent être soit réels (API) soit clairement présentés comme indicatifs

## Structure Homepage (contrat)
1. Navbar fixe (existant, ne pas modifier)
2. Hero fonctionnel : ville + service obligatoires, redirection `/pros`
3. Trust Strip : 3 valeurs de confiance
4. Catégories dynamiques depuis l'API
5. Comment ça marche (3 étapes)
6. Section Sécurité / KYC
7. CTA Professionnel
8. Footer avec liens légaux

## Méthodologie CCOF
Chaque modification doit :
1. Annoncer le fichier touché AVANT de modifier
2. Montrer le DIFF essentiel (avant/après)
3. Vérifier le build (`npx turbo build --filter=@khadamat/web`)
4. Proposer le rollback (`git checkout -- <fichier>`)
5. Ne modifier qu'un seul composant à la fois
