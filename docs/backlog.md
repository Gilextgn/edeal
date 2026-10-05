# Backlog

Idées hors du périmètre de la phase en cours. Rien ici n'est engagé.

## Hors périmètre de la V1 (à garder possible)

- Paiement Mobile Money intégré. La plateforme n'encaisse rien : elle enregistre seulement ce qui a été payé en dehors.
- Vérification d'IMEI auprès de bases externes.
- Reprises (trade-in).
- Module de garantie.
- Multi-devises.
- Applications natives.

## Notes de la phase 0

- Vérification du numéro par SMS à l'inscription (aujourd'hui le numéro n'est pas vérifié).
- Mot de passe oublié. Sans SMS ni e-mail vérifié, il faudra une réinitialisation par le patron ou un canal de vérification.
- Modification du téléphone ou de l'e-mail après inscription (le profil `users` n'est pas resynchronisé).
- Bascule manuelle clair/sombre (aujourd'hui : réglage du téléphone).
- Au déploiement : Supabase n'accepte l'inscription par téléphone que si un fournisseur SMS est déclaré. En local, des valeurs factices suffisent (`supabase/config.toml`) car aucun SMS n'est envoyé. À reproduire et vérifier sur le projet hébergé (fournisseur « Phone » activé, confirmation désactivée). Contournement sinon : identifiant technique dérivé du numéro.

## Notes de la phase 1

- Accepter ou refuser une invitation (aujourd'hui l'ajout par le patron est immédiat).
- Plusieurs patrons par boutique, ou transfert de propriété.
- Choix de la devise à la création de la boutique (colonne présente, FCFA par défaut, pas d'écran).
- Logo et couleur propres à chaque boutique (aujourd'hui : nom personnalisable uniquement).
- Tests de bout en bout automatisés dans un navigateur (parcours vérifié à la main avec un script jetable).
- Le numéro n'étant pas vérifié par SMS, quelqu'un qui s'inscrit avec le numéro d'un autre récupère son invitation. Le patron voit le nom du membre et peut le désactiver.

## Notes de la phase 2

- **À trancher : unicité de l'IMEI.** La règle demande un IMEI unique dans toute l'application. Conséquence : un téléphone vendu par une boutique ne peut pas être ré-enregistré par un autre vendeur qui le rachète plus tard. Proposition : IMEI unique seulement parmi les appareils encore en stock ou confiés.
- Recherche et filtres dans le stock (par IMEI, modèle, statut).
- Lecture de l'IMEI par l'appareil photo (code-barres de la boîte).
- Devise de l'espace perso : FCFA en dur pour l'instant.
- Le caissier voit le prix d'achat des appareils de la boutique. À masquer si le patron ne le souhaite pas.
- Nettoyage des photos envoyées dont le constat n'a jamais été enregistré.
- Chargement des écrans sans connexion (aujourd'hui seul l'envoi d'un constat déjà saisi survit à une coupure) : prévu en phase 5.
- Modèles (Apple et Samsung) : liste fixe dans `src/domain/catalog.ts`, à compléter à chaque nouvelle gamme. Autres marques (Tecno, Infinix, Xiaomi…) et modèle saisi librement : à ajouter si besoin.

## Notes de la phase 3

- **Annulation d'une vente** (erreur de saisie, client qui se rétracte) : le statut `CANCELLED` existe, pas encore l'opération ni l'écran.
- Le dealer ne peut pas déclarer lui-même un retour : c'est le patron qui l'enregistre en reprenant l'appareil.
- Fiche client : modifier un client, voir ses achats. Aujourd'hui les clients se créent uniquement au moment d'une vente.
- Prolonger la date limite ou changer le prix plancher d'un dépôt en cours.
- Durées de dépôt (7, 14, 30 jours) et de garantie (0, 7, 30, 90 jours) fixes : à rendre réglables par boutique si besoin.
- Notification au patron quand une vente attend sa validation (aujourd'hui : visible sur son tableau de bord).
- Le dealer voit le prix d'achat de l'appareil qui lui est confié (sa commission en dépend). À masquer si le patron ne le souhaite pas.

## Notes de la phase 4

- Annuler ou corriger un règlement saisi par erreur (aujourd'hui un règlement est définitif).
- Modifier un échéancier déjà enregistré (aujourd'hui : défini une seule fois).
- Paiement partiel d'une échéance.
- Tableau de bord sur une autre période que le mois en cours ; export des ventes.
- Rappels automatiques (WhatsApp ou SMS) pour les échéances et les dépôts en retard : aujourd'hui les retards s'affichent sur le tableau de bord.
- Le bénéfice affiché ne tient pas compte des frais (réparations, transport).
- Les statistiques sont calculées à l'affichage ; à déplacer en base si une boutique dépasse quelques milliers de ventes.

## Notes de la phase 5

- Reçu en vrai fichier PDF joint au message (aujourd'hui : message WhatsApp en texte, et impression ou « Enregistrer en PDF » du navigateur).
- Annonce rédigée par une IA, ou publiée directement sur Facebook / Marketplace (aujourd'hui : texte généré par un modèle fixe, à partager soi-même).
- Hors-ligne : seules les pages déjà ouvertes, et les formulaires d'un appareil dont la fiche a été ouverte, sont disponibles. Créer un appareil, enregistrer un règlement ou pointer une échéance demandent le réseau.
- Hors-ligne : les données affichées datent de la dernière visite, sans indication de leur âge.
- Logo de la boutique sur le reçu.
- Tests de bout en bout automatisés (navigateur) à ajouter à la CI : les parcours ont été vérifiés avec des scripts jetables, non conservés.

## Notes de la refonte de l'interface

- Lecture de l'IMEI : la reconnaissance de texte télécharge ses fichiers depuis Internet à la première utilisation (plusieurs Mo) et ne marche donc pas hors-ligne ; le code-barres, lui, se lit sans téléchargement. À héberger avec l'application si les connexions sont trop lentes.
- Lecture de l'IMEI : vérifiée sur des images de synthèse nettes (un écran « À propos » et un code-barres), pas encore sur de vraies photos prises au téléphone (reflets, flou, angle).
- Vraies photos ou vidéos de téléphones sur l'écran de connexion (aujourd'hui : téléphones dessinés et animés en CSS).
- Recherche globale (clients, ventes) depuis la barre du haut ; aujourd'hui elle cherche dans les appareils.
- Suppression d'un client sans vente, et d'un membre jamais actif.
- Tri et filtres par statut dans les tableaux.
- Tableau de bord : choix de la période, comparaison entre dealers.
