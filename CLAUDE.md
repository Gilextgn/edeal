@AGENTS.md

# eDeal — SaaS pour vendeurs de téléphones

Application pour boutiques et dealers indépendants de téléphones, iPhone et Samsung (neufs et d'occasion). Une boutique confie des téléphones à un dealer **en dépôt-vente** ; le dealer a aussi **ses propres téléphones et ses propres clients**. L'application sépare ces deux espaces de façon étanche, trace l'état de chaque téléphone avec photos, et calcule ce que chacun doit à l'autre.

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
- Couleurs : uniquement les tokens de `src/app/globals.css` (`bg-primary`, `text-muted`…), jamais de couleur en dur. Palette unique, choisie par le propriétaire d'après une maquette : orange vif `#f4632b` (`primary`) sur fond presque blanc (`bg`), cartes blanches, orange sombre (`brand`) ; ni bleu, ni vert, ni doré, et pas de choix de couleurs pour l'utilisateur. Statuts : vert, rouge, orange. Trois teintes douces (`tint-1..3`) pour les tuiles, texte `text-fg` dessus. Formes : cartes `rounded-3xl` sans bordure, boutons et onglets en pastille (`rounded-full`), élément actif rouge. Thème clair/sombre (`data-theme` sur `<html>`, posé avant l'affichage, gardé dans le navigateur par `src/lib/browser-store.ts`). Zones tactiles ≥ 44 px.
- Listes déroulantes : toujours `SearchSelect` (`src/components/search-select.tsx`), qui permet de chercher ; pas de `<select>` natif.
- Photos de l'écran de connexion (`public/login/`) : servies telles quelles, sans zoom ni agrandissement au-delà de leur taille.
- **Téléphone d'abord** : c'est l'usage principal. Concevoir chaque écran à 360 px, puis l'élargir. Barre du bas flottante avec l'action principale au centre, bandeaux à faire glisser, grandes cartes arrondies ; pas de tableau large sans colonnes masquées.
- Police : Plus Jakarta Sans, droite, pour toute l'application. Seule exception, voulue par le propriétaire : le nom « eDeal » en écriture manuscrite (`font-wordmark`, Pacifico) sur l'écran d'ouverture et l'écran de connexion. Aucune autre cursive.
- Mise en page : `AppShell` (`src/components/app-shell.tsx`, partie interactive dans `shell.tsx`) — menu latéral repliable en carte flottante (élément actif en pastille noire, utilisateur et déconnexion en pied), barre du haut sans fond propre, de même largeur que le contenu (`max-w-7xl`) : recherche Ctrl+K au centre, qui prend la place libre, puis à droite espace courant, action principale selon le profil et une pastille thème / alertes / compte. Relief par `shadow-card` (filet + ombre douce), menus par `shadow-pop` ; pas de bordure sur les cartes ; rayons `rounded-2xl` (champs), `rounded-3xl` (cartes), `rounded-full` (boutons) ; sur téléphone, le menu est une feuille qui monte du bas (utilisateur, écrans en tuiles, compte / espaces / déconnexion), jamais un panneau latéral de site web ; la barre du haut dit « Bonjour » et le nom de la boutique sur l'accueil, et une barre blanche flottante en pastille reste en bas : pastille rouge de marque (accueil) à gauche, onglets, action principale au milieu, onglet ouvert en tuile rouge avec un point. Écran d'ouverture (`.splash` dans `globals.css`, posé par `src/app/layout.tsx`) : le nom et une illustration à plat (`src/components/splash-art.tsx`) sur fond orange, une fois par onglet, jamais bloquant. Accueil sur téléphone : barre du haut orange prolongée par le bloc de recherche. Connexion et inscription (maquette choisie par le propriétaire) : écran blanc, titre centré avec un mot en orange, champs pleins sans bordure (libellé dans le champ), bouton orange, « Ou connectez-vous avec » puis Google, lien vers l'autre écran tout en bas ; pas de photo sur téléphone, diaporama à gauche sur ordinateur. Accueil d'un compte sans boutique (`src/app/(hub)/page.tsx`) : bannière orange illustrée, « Comment ça marche » en trois étapes, deux cartes pour commencer (boutique ou espace perso). Flèche retour automatique dans la barre du haut (`parentPath` dans `shell.tsx`), rien à ajouter par page : sur les écrans secondaires partout, et sur téléphone sur tout écran autre que l'accueil (le menu s'ouvre alors par « Plus »). Tailles sobres sur ordinateur : pas de titres géants ni de bannière haute. Tableau de bord, façon accueil d'application de commande : recherche, bannière rouge (période Semaine / Mois / Année via `?period=`, total vendu, action principale), raccourcis ronds à faire glisser, appareils en cartes (`DeviceCard`, `loadDeviceCovers` dans `src/features/devices/device-cards.tsx`), indicateurs. Le stock s'affiche en cartes sur téléphone et en tableau au-delà. Pages étroites (formulaires) centrées : `mx-auto w-full max-w-2xl`. Invitations : l'application n'envoie ni SMS ni e-mail ; le patron transmet l'invitation par WhatsApp ou e-mail depuis l'écran Membres. Chaque écran doit être soigné à 360 px **et** sur ordinateur.
- Listes : tableaux (`TableCard`, `Th`, `Td`) paginés par 10 (`ListPagination`, `src/domain/pagination.ts`), actions par ligne avec `ActionLink` / `ActionButton` (voir, modifier, supprimer) ; une suppression passe par `ConfirmForm`. Toute création, modification ou suppression demande confirmation dans la fenêtre de l'application (`src/components/confirm.tsx` : `ConfirmButton` pour un bouton d'envoi, `useConfirm` pour un envoi en JavaScript), jamais `window.confirm` ; feuille qui monte du bas sur téléphone, bouton rouge pour une suppression, « Retour » pour renoncer. Sur téléphone, les colonnes secondaires sont masquées.
- Graphiques : SVG maison (`src/features/dashboard/bar-chart.tsx`), une seule teinte (`--chart`), infobulle au survol, tableau de données pour les lecteurs d'écran.
- Page d'arrivée (`/`) selon le profil : une seule boutique → son tableau de bord ; aucune → accueil ; plusieurs → choix. « Créer une boutique » n'est mis en avant que pour un patron ou un nouveau compte ; un dealer ou caissier le trouve dans « Compte ».
- IMEI : lu sur une photo (`src/lib/photos/read-imei.ts` : code-barres puis texte) pour éviter les fautes de frappe ; un lien « Saisir l'IMEI à la main » reste toujours disponible.
- Connexion : téléphone ou e-mail + mot de passe, puis Google (`signInWithGoogle`, retour sur `/auth/callback`), activé sur le projet Supabase en ligne avec un identifiant client Google (pas en local).
- Nom affiché : « eDeal » dans l'espace perso et les écrans communs ; le nom de la boutique (modifiable par le patron) dans un espace boutique.
- Next.js 16 : le middleware s'appelle `proxy` (`src/proxy.ts`). Lire `node_modules/next/dist/docs/` avant d'utiliser une API Next.

## Organisation du code

- `src/domain/` : logique pure (aucun accès base ni réseau), très testée. Calcul des parts, solde, IMEI, imputation des règlements.
- `src/lib/` : accès Supabase, variables d'environnement, compression des photos (`photos/`), file d'envoi différé (`offline/`).
- `src/features/share/` : reçu de vente (WhatsApp, impression) et annonce générée depuis le dernier constat.
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
- **Authentification** : téléphone ou e-mail + mot de passe, sans SMS. Hachage et sessions gérés par Supabase Auth. Une inscription par numéro passe par le serveur (`adminClient` de `src/lib/supabase/admin.ts`, numéro tenu pour confirmé), car Supabase exigerait sinon une confirmation par SMS ; elle ne dépend donc d'aucun réglage du projet. Le profil `public.users` est créé par un déclencheur à l'inscription. Les numéros sont ramenés à une seule forme (`parseIdentifier`, `src/domain/identifier.ts`) : au Bénin, l'ancien numéro à 8 chiffres devient le nouveau à 10 (« 01 » devant), sans quoi une invitation et le compte de la même personne ne se retrouvent pas.
- **Fin de session pour inactivité** (`src/components/session-timeout.tsx`, monté dans le cadre de l'application) : après 30 minutes sans activité (`IDLE_MINUTES`), une fenêtre prévient une minute avant ; sans réponse, déconnexion et message sur l'écran de connexion (`/login?error=timeout`). Dernière activité partagée entre onglets (localStorage), contrôlée au réveil du téléphone. Le superadmin arrive directement sur `/admin`.
- **Sécurité de la connexion** : mot de passe de 8 caractères au moins avec lettres et chiffres, ni trop courant ni tiré de l'identifiant (`src/domain/password.ts`, et `password_requirements` côté Supabase) ; confirmation à l'inscription ; blocage 15 minutes après 5 échecs en 15 minutes (`src/lib/login-throttle.ts`, migration `login_throttle`), dont les fonctions ne sont appelables qu'avec `SUPABASE_SECRET_KEY`, clé réservée au serveur.
- **Mot de passe oublié** : tout se passe sur l'écran `/forgot`, sans quitter l'application (usage mobile) : on saisit l'e-mail du compte (réponse identique que le compte existe ou non), puis, sur le même écran, le code à 6 chiffres reçu et le nouveau mot de passe (`resetWithCode`, mêmes règles qu'à l'inscription). En secours, l'e-mail porte aussi un lien vers `/auth/confirm`, qui ouvre la session et mène à `/reset`. Pas de SMS : un compte créé avec un numéro seul ne peut pas se dépanner ainsi. L'e-mail en français (`supabase/templates/recovery.html`) et un envoi fiable demandent un service SMTP branché dans Supabase ; sans lui, l'offre gratuite n'écrit qu'aux membres de l'équipe du projet, en anglais.
- **En-têtes de sécurité** dans `next.config.ts` : politique de contenu (CSP), interdiction d'affichage dans un cadre, HSTS, etc. Toute nouvelle source externe (script, image, API) doit être ajoutée à la CSP.
- **Erreurs** : jamais de message technique pour l'utilisateur. Serveur injoignable : les actions de connexion renvoient « Impossible de joindre le serveur… » (`isNetworkError`, `src/lib/network.ts`) ; une page qui ne peut pas lire la base lève `NETWORK_ERROR` au lieu de déconnecter ; `src/app/error.tsx` et `global-error.tsx` affichent un écran clair (réessayer / accueil).
- **Vitesse** : le proxy (`src/proxy.ts`) vérifie la session une fois par requête, sur place (`getClaims`, jeton signé ES256, sans appel réseau sauf renouvellement) et transmet l'identité aux pages par l'en-tête interne `x-edeal-user` (il supprime d'abord tout en-tête du même nom venu du navigateur) ; `requireUser` / `requireShop` ne rappellent pas le service d'authentification et lancent leurs lectures en parallèle. Chaque espace a un `loading.tsx` : l'écran répond dès le clic. En développement (`npm run dev`) chaque page se compile à sa première visite : juger la vitesse avec `npm run build && npm start`.
- **Base locale** : elle contient les comptes créés à la main par le propriétaire du projet. Appliquer une migration avec `npx supabase migration up` ; ne jamais lancer `db reset` sans son accord.
- **Espace superadmin** (`/admin`, `src/lib/superadmin.ts`) : vue d'ensemble, utilisateurs, boutiques, suspension d'un compte (blocage de connexion via Supabase Auth) ou d'une boutique (`shops.suspended_at` : `private.my_role` ne renvoie plus de rôle, donc plus aucun accès ; rien n'est effacé). Ses écrans lisent avec la clé secrète : chaque page et chaque action commence par `requireSuperadmin`, et l'espace renvoie une page introuvable aux autres comptes. Superadmins : table `platform_admins`, sans aucune politique d'accès, alimentée à la main avec la clé secrète (jamais d'adresse en dur dans le dépôt). Le contenu des espaces perso reste privé : le superadmin n'en voit que des nombres.
- **Opérations sensibles** (créer une boutique, gérer les membres, confier, vendre, valider, régler) : fonctions PostgreSQL appelées en RPC, en transaction. Elles lèvent des codes d'erreur (`not_owner`…) traduits dans `messages/fr.json` sous `errors`.
- **Politiques d'accès** : fonctions d'aide dans le schéma `private` (`private.my_role(shop_id)`). Pas d'`insert`/`update` direct sur les tables sensibles.
- **Calcul des parts** : `src/domain/shares.ts` (module pur, stratégie remplaçable) sert à l'aperçu ; la base refait le calcul à l'enregistrement (`private.compute_dealer_share`) et fait foi. `tests/db/shares.test.ts` vérifie que les deux concordent sur les cas de `src/domain/shares.cases.ts` : toute nouvelle règle doit y être ajoutée des deux côtés.
- **Solde et règlements** : la vue `sale_dues` donne ce qui reste dû par vente en dépôt, la fonction `dealer_balances(shop)` le solde par dealer. `record_settlement` répartit un règlement sur les ventes désignées puis les plus anciennes ; `src/domain/settlement.ts` applique la même règle pour l'aperçu, et `tests/db/settlements.test.ts` vérifie la concordance.
- **Fonctions de contrôle d'accès en SQL** : toujours renvoyer un vrai booléen (`exists(...)` ou `coalesce(..., false)`). Une comparaison avec un `shop_id` vide vaut `NULL`, et `if not <NULL>` laisse passer.
- **Type de vente** déduit par la base : appareil perso du vendeur → `PERSONAL` ; appareil confié au vendeur → `SHOP` avec commission ; appareil en stock vendu par le patron ou le caissier → `SHOP` sans commission.
- **Constat + opération** : dépôt, retour et vente s'enregistrent chacun avec leur constat dans une seule transaction (`create_consignment`, `return_consignment`, `create_sale`) et passent tous par la file d'envoi différé. `ReportOperationForm` (`src/features/devices/report-fields.tsx`) est le formulaire commun.
- **PWA et hors-ligne** : `public/sw.js` garde les fichiers statiques et chaque page ouverte ; sans réseau il les ressert (bandeau « Pas de connexion »). À l'ouverture d'une fiche d'appareil ou de dépôt, les formulaires liés (vente, constat, dépôt, retour) sont mis en cache d'avance (`<Precache>`), ce qui permet de saisir une vente sans réseau ; l'envoi passe par la file IndexedDB. Seules les opérations de cette file fonctionnent hors-ligne : créer un appareil, régler ou pointer une échéance demandent le réseau. Les pages gardées sont effacées à la déconnexion et au changement de compte. Changer `VERSION` dans `sw.js` quand sa logique change.
- **Photos** : compressées sur le téléphone (1280 px max, JPEG), envoyées dans le bucket privé `photos` sous `<appareil>/<constat>/<photo>`. Seule la clé est en base ; l'URL signée est générée à la lecture. Ni modification ni suppression possibles.
- **Envoi différé** : un constat est d'abord déposé dans IndexedDB (`src/lib/offline/report-queue.ts`), puis envoyé. Sans connexion il reste en file et repart au retour du réseau ; l'envoi est rejouable car les identifiants sont créés sur le téléphone.- **Valeurs d'énumération** en anglais dans le code et la base (`OWNER`, `IN_STOCK`, `LIKE_NEW`…), traduites dans `messages/fr.json`.

## Avancement

- [x] Phase 0 : fondations
- [x] Phase 1 : organisation (boutiques, membres, rôles, taux)
- [x] Phase 2 : appareils, constats, photos
- [x] Phase 3 : dépôts et ventes
- [x] Phase 4 : argent (échéances, règlements, soldes, tableau de bord)
- [x] Phase 5 : confort (reçu, annonce, hors-ligne)
