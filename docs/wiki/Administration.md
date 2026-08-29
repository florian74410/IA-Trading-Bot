# Administration — Manuel d'exploitation

> **Accès restreint** — documentation destinée au propriétaire et aux administrateurs autorisés du dépôt privé IA-Trading-Bot.
>
> Ne jamais placer ici de clé API, secret, passphrase, token, mot de passe, cookie de session ou autre credential. Les secrets restent gérés par le mécanisme sécurisé de `Settings > API`.

Cette page constitue le manuel d'administration de IA-TB pour l'environnement local et le futur serveur/VPS. Les commandes ci-dessous définissent également l'interface cible de l'outil universel `adminctl`.

## 1. Principe `adminctl`

L'objectif est de fournir une commande d'administration identique quel que soit l'hôte :

```bash
./adminctl <commande>
```

`adminctl` doit détecter l'environnement et utiliser le mécanisme approprié : macOS/launchd en local, Linux/systemd sur le futur VPS. Une commande documentée mais non encore implémentée doit être considérée comme une spécification/roadmap et non comme une fonction disponible.

## 2. Etat général et diagnostic

```bash
./adminctl info
./adminctl version
./adminctl status
./adminctl health
./adminctl doctor
./adminctl uptime
./adminctl processes
./adminctl memory
./adminctl cpu
./adminctl disk
./adminctl ports
./adminctl network
./adminctl connections
```

`health` donne un état synthétique. `doctor` effectue un diagnostic plus complet : runtime, processus, dépendances, fichiers attendus, droits, ports, moteurs et connecteurs.

## 3. Services

```bash
./adminctl services
./adminctl status <service>
./adminctl start <service>
./adminctl stop <service>
./adminctl restart <service>
```

Services à exposer lorsque présents dans le build : serveur Web, Trading Engine, Indicator Engine, Liquidity Engine, Market Data, Update Manager et services/connecteurs associés.

## 4. Logs

```bash
./adminctl logs
./adminctl logs <service>
./adminctl logs --tail 100
./adminctl logs <service> --tail 100
./adminctl logs <service> --follow
./adminctl logs-file
```

Exemples :

```bash
./adminctl logs trading-engine
./adminctl logs update-manager
./adminctl logs provider-binance
./adminctl logs provider-gmx
./adminctl logs web --follow
```

`logs-file` doit permettre d'accéder au journal global `logs.dat`. Toute sortie de diagnostic/log destinée au partage doit masquer automatiquement credentials, tokens et autres secrets.

## 5. Trading Engine

```bash
./adminctl engine status
./adminctl engine start
./adminctl engine stop
./adminctl engine restart
./adminctl engine logs
./adminctl engine debug
./adminctl engine positions
./adminctl engine orders
./adminctl engine pending
./adminctl engine emergency-stop
```

`emergency-stop` est une commande de sécurité prioritaire : elle doit empêcher l'émission de nouveaux ordres sans dépendre de l'arrêt complet de l'application. Son comportement exact et la reprise après arrêt d'urgence doivent être explicites avant activation du trading réel.

## 6. Providers / Connecteurs CEX-DEX

```bash
./adminctl providers
./adminctl provider <provider> status
./adminctl provider <provider> test
./adminctl provider <provider> logs
./adminctl provider <provider> market
```

Exemples :

```bash
./adminctl provider binance status
./adminctl provider binance test
./adminctl provider gmx logs
```

`market` doit pouvoir afficher au minimum l'état REST/WebSocket si applicable, la fraîcheur des dernières données OHLC/OHLCV et volumes, et des informations de latence/connexion sans révéler les secrets d'authentification.

## 7. Update Manager et versions

```bash
./adminctl update status
./adminctl update check
./adminctl update history
./adminctl update verify
```

Le statut doit permettre d'identifier : version installée, build, archive/patch appliqué, date d'installation, intégrité/checksum lorsque disponible et dernier rollback disponible.

## 8. Sauvegarde, restauration et rollback

```bash
./adminctl backup
./adminctl backups
./adminctl restore <backup>
./adminctl rollback
```

Avant une mise à jour sensible, une migration ou une restauration, l'état à préserver doit être défini clairement. Les sauvegardes ne doivent pas exposer les secrets dans des fichiers non protégés.

## 9. Base de données / stockage

Lorsque le stockage persistant correspondant existe :

```bash
./adminctl database status
./adminctl database backup
./adminctl database verify
```

Les opérations destructives ou de migration doivent demander une confirmation explicite et disposer d'une procédure de restauration.

## 10. Réseau et hébergement

Commandes communes :

```bash
./adminctl network
./adminctl ports
./adminctl connections
```

Le manuel d'un déploiement VPS devra également documenter : processus de démarrage automatique, utilisateur système dédié, ports exposés, reverse proxy/TLS si utilisé, pare-feu, permissions des fichiers, rotation des logs, sauvegardes, surveillance des ressources et procédure de redémarrage après incident.

Les commandes natives macOS (`launchctl`) ou Linux (`systemctl`, `journalctl`) peuvent être documentées comme procédures de secours, mais `adminctl` reste l'interface privilégiée afin de conserver une exploitation identique entre le Mac local et le VPS.

## 11. Sécurité

```bash
./adminctl security-check
```

Le contrôle doit rechercher notamment : fichiers sensibles avec permissions trop larges, credentials accidentellement présents dans les logs, ports inattendus, configuration d'authentification manquante, fichiers de configuration dangereux et état des protections prévues par l'application.

Aucune commande d'administration ne doit afficher la valeur complète d'une clé, d'un secret, d'une passphrase ou d'un token.

## 12. Rapport de diagnostic partageable

```bash
./adminctl report
```

Le rapport cible peut être enregistré sous une forme similaire à :

```text
reports/diagnostic-YYYY-MM-DD_HH-MM.txt
```

Il doit réunir : version/build, OS/runtime, uptime, CPU/RAM/disque, état des services et moteurs, état des providers, ports utiles, Update Manager et erreurs récentes. Les secrets doivent être expurgés automatiquement afin que le rapport puisse être transmis pour analyse.

## 13. Procédures d'urgence

### Suspicion d'ordre indésirable

1. `./adminctl engine emergency-stop`
2. `./adminctl engine status`
3. `./adminctl engine positions`
4. `./adminctl engine orders`
5. `./adminctl engine logs`
6. Générer `./adminctl report` avant toute modification si possible.

### Service défaillant

1. `./adminctl status <service>`
2. `./adminctl logs <service> --tail 100`
3. `./adminctl restart <service>` si approprié.
4. `./adminctl doctor` si l'incident persiste.

### Mise à jour défaillante

1. `./adminctl update status`
2. `./adminctl logs update-manager`
3. Vérifier l'intégrité de la mise à jour.
4. Utiliser la procédure de rollback uniquement après identification de la version/backup cible.

## 14. Règles d'évolution

Toute nouvelle composante serveur doit documenter : son nom de service, son état, ses logs, ses commandes start/stop/restart si applicables, son diagnostic et son comportement en cas de panne.

Toute nouvelle commande `adminctl` doit être ajoutée à cette page lors de la même évolution documentaire. La documentation doit distinguer clairement les commandes réellement implémentées des commandes spécifiées pour une version future.
