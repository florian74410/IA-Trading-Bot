# IA-TB v1.8.11 — Unified Admin Console / Debug Control Framework v1

## À intégrer au Wiki Admin — dossier Console Générale Admin / Debug

La Console Générale Admin reste l’unique console. Le Debug Control Framework est fusionné à CP/1 et à la gestion des logs. Aucun shell macOS arbitraire n’est ajouté.

### Syntaxe
`debug <target> <action> [key=value]`

Exemples :
- `debug trading health`
- `debug trading restart` (mode Commande + confirmation)
- `debug router health | grep online`
- `debug marketdata logs lines=80 | grep ERROR`
- `debug indicators trace-on level=debug`
- `debug indicators trace-status`
- `debug indicators trace-off`
- `debug trading dependencies`
- `debug firewall self-test`

### Actions v1
Observation : capabilities, status, health, self-test, metrics, dependencies, dump-state, logs, errors, trace-status.
Contrôle : start, stop, restart, reset-safe, trace-on, trace-off.

### Sécurité
- ADMIN uniquement via la Console Générale existante.
- Whitelist stricte des actions.
- Les start/stop/restart/reset-safe demandent le mode Commande et une confirmation.
- Aucune commande shell libre, aucun chemin de fichier arbitraire.
- Les logs passent par le LogReader existant.
- Toutes les actions Debug sont auditées dans logs.dat.
- Les actions de service passent par ProcessRegistry/ServiceRegistry, jamais par une chaîne shell utilisateur.

### Source documentaire
`Core/Admin/debug_commands_registry.json` est le registre machine-readable à utiliser pour maintenir le Wiki Admin et l’autocomplétion.

### Limite volontaire v1
Une action non réellement supportée par une cible doit répondre NOT_ALLOWED/UNSUPPORTED : ne jamais simuler une réussite. Les futures fonctions spécifiques (reconnect exchange, reload-config moteur, test-order-dry-run, test-risk, test-firewall, etc.) devront être ajoutées à l’interface native du module puis déclarées dans le registre.
