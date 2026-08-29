# Changelog

## v1.7.7 - DEV

- Trading Engine transforme en service runtime supervise sur `127.0.0.1:8016`.
- Integration au Communication Protocol CP/1 via le Router.
- Endpoints de debug/etat: `/health`, `/api/status`, `/api/capabilities`, `/api/last-execution`, `/cp/v1`.
- ADMIN: carte Trading Engine avec ONLINE/OFFLINE, PID, version, LIVE ON/OFF, exchanges et Risk Approval.
- Restart global, logs, stop.command et Service Registry etendus au Trading Engine.
- Execution LIVE desactivee par defaut; `risk_approval_id` reste obligatoire.
- Le secret CP local n est plus pre-emballe dans l archive complete; il est regenere au premier demarrage.

## v1.7.4 - STABLE

- Correctif layout Trading IA : header agrandi, logo/navigation repositionnes.
- Scroll vertical desktop global pour acceder aux modules Mosaique.
- Synchronisation hauteur header avec overlays et mode Chart agrandi.
- Baseline GitHub et protocole de versionnage GitHub ajoutes.
- Patch source v1.7.3 -> v1.7.4 conserve dans `Update/`.
