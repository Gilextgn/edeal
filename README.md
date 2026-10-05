# eDeal

Application de dépôt-vente d'iPhone pour boutiques et dealers.

## Démarrer en local

Prérequis : Node.js 24, Docker Desktop lancé.

```bash
npm install
npm run db:start        # première fois : plusieurs minutes de téléchargement
npm run db:status       # affiche l'URL et la clé publique locales
cp .env.example .env.local   # puis coller la « Publishable key »
npm run dev             # http://localhost:3000
```

## Vérifier

```bash
npm run lint
npm run typecheck
npm test            # tests unitaires
npm run test:db     # tests d'accès aux données (base locale requise)
```

Le détail du projet, des règles de gestion et des conventions est dans [CLAUDE.md](CLAUDE.md).
