# IA-Trading-Bot v1.7.7 — DEV

Patch de mise à niveau **v1.7.6 → v1.7.7**.

## Ajouts principaux
- Trading Engine lancé comme service runtime supervisé sur `127.0.0.1:8016`.
- Endpoints locaux `/health`, `/api/status`, `/api/capabilities`, `/api/last-execution` et `/cp/v1`.
- Intégration du Trading Engine au Communication Protocol CP/1 et au Router.
- Affichage du Trading Engine dans Admin : état, PID, version, LIVE ON/OFF, nombre d'exchanges et exigence Risk Approval.
- Redémarrage et arrêt supervisés du Trading Engine.
- LIVE Execution désactivé par défaut (`IATB_TRADING_LIVE=0`).
- Nettoyage du secret local `Parametres/CommunicationProtocol.dat` lors de la construction afin qu'il soit régénéré localement par installation.

## Sécurité
Le service Trading Engine peut fonctionner et être débogué sans autoriser l'exécution LIVE. Les ordres d'exécution nécessitent toujours un `risk_approval_id`.

Statut : **DEV**, non STABLE.
