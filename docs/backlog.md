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
- Vérifier sur le projet Supabase hébergé que l'inscription par téléphone fonctionne sans fournisseur SMS. Contournement prévu sinon : identifiant technique dérivé du numéro.
