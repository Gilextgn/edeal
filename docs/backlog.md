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
