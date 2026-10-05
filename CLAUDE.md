@AGENTS.md

# eDeal — SaaS pour vendeurs d'iPhone

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
| Régénérer les types de la base | `npm run db:types` |
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
- Couleurs : uniquement les tokens de `src/app/globals.css` (`bg-primary`, `text-muted`…), jamais de couleur en dur. Palette indigo ; les couleurs de statut (vert, rouge, ambre) restent distinctes du primaire. Zones tactiles ≥ 44 px.
- Mise en page : `AppShell` (`src/components/app-shell.tsx`) — onglets en bas sur téléphone, menu latéral à partir de `lg`. Chaque écran doit être soigné à 360 px **et** sur ordinateur.
- Nom affiché : « eDeal » dans l'espace perso et les écrans communs ; le nom de la boutique (modifiable par le patron) dans un espace boutique.
- Next.js 16 : le middleware s'appelle `proxy` (`src/proxy.ts`). Lire `node_modules/next/dist/docs/` avant d'utiliser une API Next.

## Organisation du code

- `src/domain/` : logique pure (aucun accès base ni réseau), très testée. Calcul des parts, solde, IMEI, imputation des règlements.
- `src/lib/` : accès Supabase, variables d'environnement, compression des photos (`photos/`), file d'envoi différé (`offline/`).
- `src/features/money/` : fiche de vente avec échéances, soldes des dealers, règlements.
- `src/features/dashboard/` : tableaux de bord (boutique selon le rôle, espace perso).
- `src/features/sales/` : dépôts, ventes, clients (formulaires, listes, validation du patron).
- `src/features/devices/` : écrans d'appareil partagés entre l'espace boutique et l'espace perso (le « scope » dit dans lequel on se trouve). Les fichiers de `src/app/**/devices/` ne font que les appeler.
- `src/app/` : pages et Server Actions. `(auth)` connexion, `(hub)` choix d'espace et compte, `s/[shopId]` espace boutique, `perso` espace personnel.
- `src/lib/session.ts` : `requireUser`, `requireShop`, `requireOwner` — à appeler en tête de chaque page protégée.
- `src/lib/database.types.ts` : généré par `npm run db:types` après chaque migration.
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
11. Un règlement appartient au couple dealer-boutique, couvre une ou plusieurs ventes, et est enregistré par le patron ou le caissier (jamais par le dealer). Il ne peut pas dépasser le solde dû. Une vente entièrement réglée fait passer son dépôt à « réglé ».
11b. Échéances du client : un échéancier se définit une fois par vente validée, sa somme égale le prix de vente ; chaque échéance se pointe payée ou non. Elles n'ont aucun effet sur la dette du dealer.
12. Seul le patron confie un appareil et enregistre son retour. Un appareil confié ne peut être vendu que par son dealer. Le dealer ne voit que les appareils qui lui sont confiés, ses constats, ses ventes et les clients boutique qu'il a lui-même enregistrés.
13. Visibilité : le patron voit tout l'espace boutique, jamais l'espace perso d'un dealer ; le dealer voit ses dépôts et ventes boutique et son espace perso (pas le reste du stock) ; le caissier voit le stock et les ventes boutique, sans pouvoir modifier le stock.
14. Un seul patron par boutique (son créateur). Le patron ajoute dealers et caissiers par téléphone ou e-mail ; une personne sans compte est invitée et rejoint la boutique à son inscription. Un membre désactivé ne voit plus la boutique.
15. Montants en entiers dans la plus petite unité de la devise. Taux en points de base (2500 = 25 %). Devise par boutique, FCFA par défaut.

## Décisions d'architecture

- **Next.js + Supabase** (PostgreSQL, authentification, stockage).
- **Étanchéité appliquée par la base** (politiques par ligne), pas seulement par l'interface. Chaque nouvelle table arrive avec ses politiques et ses tests dans `tests/db/`.
- **Authentification** : téléphone ou e-mail + mot de passe, sans SMS. Hachage et sessions gérés par Supabase Auth. Le profil `public.users` est créé par un déclencheur à l'inscription.
- **Opérations sensibles** (créer une boutique, gérer les membres, confier, vendre, valider, régler) : fonctions PostgreSQL appelées en RPC, en transaction. Elles lèvent des codes d'erreur (`not_owner`…) traduits dans `messages/fr.json` sous `errors`.
- **Politiques d'accès** : fonctions d'aide dans le schéma `private` (`private.my_role(shop_id)`). Pas d'`insert`/`update` direct sur les tables sensibles.
- **Calcul des parts** : `src/domain/shares.ts` (module pur, stratégie remplaçable) sert à l'aperçu ; la base refait le calcul à l'enregistrement (`private.compute_dealer_share`) et fait foi. `tests/db/shares.test.ts` vérifie que les deux concordent sur les cas de `src/domain/shares.cases.ts` : toute nouvelle règle doit y être ajoutée des deux côtés.
- **Solde et règlements** : la vue `sale_dues` donne ce qui reste dû par vente en dépôt, la fonction `dealer_balances(shop)` le solde par dealer. `record_settlement` répartit un règlement sur les ventes désignées puis les plus anciennes ; `src/domain/settlement.ts` applique la même règle pour l'aperçu, et `tests/db/settlements.test.ts` vérifie la concordance.
- **Fonctions de contrôle d'accès en SQL** : toujours renvoyer un vrai booléen (`exists(...)` ou `coalesce(..., false)`). Une comparaison avec un `shop_id` vide vaut `NULL`, et `if not <NULL>` laisse passer.
- **Type de vente** déduit par la base : appareil perso du vendeur → `PERSONAL` ; appareil confié au vendeur → `SHOP` avec commission ; appareil en stock vendu par le patron ou le caissier → `SHOP` sans commission.
- **Constat + opération** : dépôt, retour et vente s'enregistrent chacun avec leur constat dans une seule transaction (`create_consignment`, `return_consignment`, `create_sale`) et passent tous par la file d'envoi différé. `ReportOperationForm` (`src/features/devices/report-fields.tsx`) est le formulaire commun.
- **PWA** : manifeste + service worker minimal (`public/sw.js`). La file de synchronisation hors-ligne (IndexedDB, identifiants générés sur le téléphone) arrive avec les ventes et les photos.
- **Photos** : compressées sur le téléphone (1280 px max, JPEG), envoyées dans le bucket privé `photos` sous `<appareil>/<constat>/<photo>`. Seule la clé est en base ; l'URL signée est générée à la lecture. Ni modification ni suppression possibles.
- **Envoi différé** : un constat est d'abord déposé dans IndexedDB (`src/lib/offline/report-queue.ts`), puis envoyé. Sans connexion il reste en file et repart au retour du réseau ; l'envoi est rejouable car les identifiants sont créés sur le téléphone. Le chargement des écrans eux-mêmes demande encore une connexion (phase 5).
- **Valeurs d'énumération** en anglais dans le code et la base (`OWNER`, `IN_STOCK`, `LIKE_NEW`…), traduites dans `messages/fr.json`.

## Avancement

- [x] Phase 0 : fondations
- [x] Phase 1 : organisation (boutiques, membres, rôles, taux)
- [x] Phase 2 : appareils, constats, photos
- [x] Phase 3 : dépôts et ventes
- [x] Phase 4 : argent (échéances, règlements, soldes, tableau de bord)
- [ ] Phase 5 : confort (reçu, annonce, hors-ligne complet)
