# Routage des comptes — complément 2.5.3 DEV

État : composant de sélection intégré à TradingEngine et testé sur fixtures.
**Le service de production ne l'instancie pas encore. P5 réel reste désactivé.**
Ce complément ne termine pas la mise à jour demandée.

## Contrat backend

`AccountRouting` reçoit quatre capacités injectées par le serveur :
`authorize`, `listAccounts`, `readCredentials`, `walletSigner`.
L'autorisation doit vérifier une preuve liée à l'intention normalisée complète et
à l'action, avec identité Auth21 et délégation de stratégie. Un champ `owner`
transmis par le Supervisor ne constitue jamais cette preuve.

Chaque affectation contient un identifiant public stable `id`, `owner`,
`exchange`, `kind` (CEX/DEX), `markets`, `actions`, `enabled`, `default` et une
référence opaque `credentialRef` ou `walletRef`. DEX exige aussi `chain` et
`address`. Ces affectations proviennent du serveur, jamais du corps de l'ordre.

Le moteur sélectionne le compte demandé par `account`, ou l'unique affectation
marquée par défaut. Absence, ambiguïté, mauvais propriétaire, marché non autorisé,
réseau incorrect ou révocation : refus avant accès au secret. Les CEX reçoivent
un fournisseur de secrets limité au broker sélectionné. GMX reçoit l'adresse
résolue et une interface de signature limitée au wallet/réseau sélectionné.
Les clés ne sont ni enregistrées ni retournées dans l'identité publique.
Les permissions sont relues avant et après lecture du secret. Le verrou P4 est
revérifié après résolution et le transport conserve son contrôle de génération.

## Raccordements encore nécessaires

- Administration persistante des affectations et délégations de stratégie.
- Preuve d'identité de l'ordre sur Supervisor → Router → Firewall → Trading.
  La preuve ADMIN de maintenance existante ne remplace pas ce contrat.
- Pont privé vers `UserManagement` : les secrets actuels sont par utilisateur
  et les lectures exigent une session vérifiée ; aucun accès global de secours.
- Signataire GMX vérifiant le contenu préparé, les contrats, le réseau et les
  montants ; WalletConnect doit permettre une signature effective, pas seulement
  une connexion ou une adresse. Aucun signataire n'est actuellement implémenté.
- Lectures privées CEX, statut distant, attribution durable des ressources,
  réconciliation Portfolio et confirmations on-chain/keeper pour P5.
- Raccordement de ces capacités au service et qualification multiprocessus.

Aucun flag LIVE n'est modifié, aucune opération financière n'a été effectuée.
Les tests de routage utilisent des secrets fictifs et un faux signataire.

## Validation de ce complément

Suite Trading locale sous Node 24.19.0 : 52 tests réussis, aucun échec ni skip,
après reconstruction locale de better-sqlite3 pour cette version de Node.
La suite inclut six tests de routage et les régressions P4/P5 simulées.
Ces résultats ne qualifient pas un broker réel.
