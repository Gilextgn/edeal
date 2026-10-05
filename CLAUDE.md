@AGENTS.md

# iDépôt — SaaS pour vendeurs d'iPhone

Application pour boutiques et dealers indépendants d'iPhone (neufs et d'occasion). Une boutique confie des téléphones à un dealer **en dépôt-vente** ; le dealer a aussi **ses propres téléphones et ses propres clients**. L'application sépare ces deux espaces de façon étanche, trace l'état de chaque téléphone avec photos, et calcule ce que chacun doit à l'autre.

Utilisateurs : peu à l'aise avec l'informatique, sur smartphone (360 px), connexion instable.

La plateforme **n'encaisse aucun paiement** : elle enregistre seulement ce qui a été payé en dehors.

## Source de vérité

- Modèle du domaine : `docs/domain/class-diagram.puml`. Toute divergence se discute avant d'être codée.
- Idées hors périmètre : `docs/backlog.md`.

## Commandes

| Action | Commande |
|---|---|
| Installer | `npm install` |
| Démarrer la base locale (Docker requis) | `npm run db:start` |
| Voir l'URL et la clé locales | `npm run db:status` |
| Réappliquer les migrations | `npm run db:reset` |
| Lancer l'application | `npm run dev` |
| Lint | `npm run lint` |
| Types | `npm run typecheck` |
| Tests unitaires (sans réseau) | `npm test` |
| Tests d'accès aux données (base locale) | `npm run test:db` |
| Build de production | `npm run build` |

Configuration : copier `.env.example` en `.env.local`. Aucun secret dans le dépôt.

## Conventions

- Code, tables, colonnes : **anglais**. Textes de l'interface : **français**, dans `messages/fr.json`, jamais en dur.
- Correspondance : Boutique=Shop, Utilisateur=User, Membre=Membership, Client=Customer, Appareil=Device, ConstatEtat=ConditionReport, Photo=Photo, Depot=Consignment, Vente=Sale, Echeance=Installment, Reglement=Settlement.
- Commits : Conventional Commits.
- Tests écrits en même temps que le code.
- Pas de sur-ingénierie : seulement ce que la phase demande.
- Couleurs : uniquement les tokens de `src/app/globals.css` (`bg-primary`, `text-muted`…). Jamais de texte jaune sur fond clair. Zones tactiles ≥ 44 px.
- Next.js 16 : le middleware s'appelle `proxy` (`src/proxy.ts`). Lire `node_modules/next/dist/docs/` avant d'utiliser une API Next.

## Organisation du code

- `src/domain/` : logique pure (aucun accès base ni réseau), très testée. Calcul des parts, solde, IMEI, imputation des règlements.
- `src/lib/` : accès Supabase, variables d'environnement.
- `src/app/` : pages et Server Actions.
- `src/components/` : composants d'interface.
- `supabase/migrations/` : schéma et politiques d'accès.
- `tests/db/` : tests d'étanchéité, exécutés contre la base locale avec la clé publique.

## Règles de gestion

1. Un appareil a exactement un propriétaire : une boutique OU un utilisateur.
2. IMEI unique, 15 chiffres, clé de Luhn.
3. Un seul dépôt actif par appareil.
4. Constat d'état obligatoire à la remise au dealer, au retour et à la vente, avec 4 photos minimales (face, dos, écran allumé, écran « À propos »).
5. Constats et photos immuables. Une correction crée un nouveau constat.
6. `dealerShare = max(0, floor(taux × (prixVente − prixAchat)))`, `shopShare = prixVente − dealerShare`. Vente à perte : part du dealer à 0.
7. Sous le prix plancher, la vente reste en attente jusqu'à la validation du patron : pas de parts, l'appareil reste confié.
8. Vente PERSO (appareil et client du dealer) : `shopShare = 0`, invisible pour la boutique.
9. Vente directe boutique (patron ou caissier, sans dépôt) : pas de commission.
10. Solde dû par un dealer = somme des `shopShare` de ses ventes issues de dépôts − somme de ses règlements. Toute la part est due dès la vente.
11. Un règlement appartient au couple dealer-boutique, couvre une ou plusieurs ventes, et est enregistré par le patron ou le caissier.
12. Visibilité : le patron voit tout l'espace boutique, jamais l'espace perso d'un dealer ; le dealer voit ses dépôts et ventes boutique et son espace perso ; le caissier voit les ventes boutique.
13. Montants en entiers dans la plus petite unité de la devise. Taux en points de base (2500 = 25 %). Devise par boutique, FCFA par défaut.

## Décisions d'architecture

- **Next.js + Supabase** (PostgreSQL, authentification, stockage).
- **Étanchéité appliquée par la base** (politiques par ligne), pas seulement par l'interface. Chaque nouvelle table arrive avec ses politiques et ses tests dans `tests/db/`.
- **Authentification** : téléphone ou e-mail + mot de passe, sans SMS. Hachage et sessions gérés par Supabase Auth. Le profil `public.users` est créé par un déclencheur à l'inscription.
- **Opérations sensibles** (confier, vendre, valider, régler) : côté serveur, en transaction.
- **Stratégie de rémunération** remplaçable, isolée dans `src/domain/`.
- **PWA** : manifeste + service worker minimal (`public/sw.js`). La file de synchronisation hors-ligne (IndexedDB, identifiants générés sur le téléphone) arrive avec les ventes et les photos.
- **Photos** : seule la clé de l'objet est en base ; l'URL signée est générée à la lecture.

## Avancement

- [x] Phase 0 : fondations
- [ ] Phase 1 : organisation (boutiques, membres, rôles, taux)
- [ ] Phase 2 : appareils, constats, photos
- [ ] Phase 3 : dépôts et ventes
- [ ] Phase 4 : argent (échéances, règlements, soldes, tableau de bord)
- [ ] Phase 5 : confort (reçu, annonce, hors-ligne complet)
