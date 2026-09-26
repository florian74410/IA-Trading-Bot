# Administration — Manuel d'exploitation

> **Accès restreint** — documentation destinée au propriétaire et aux administrateurs autorisés du dépôt privé IA-Trading-Bot.
>
> Ne jamais placer ici de clé API, secret, passphrase, token, mot de passe, cookie de session ou autre credential. Les secrets restent gérés par le mécanisme sécurisé de `Settings > API`.

Cette page constitue le manuel d'administration de IA-TB pour l'environnement local et le futur serveur/VPS.

## 1. Console Générale Admin

Depuis v1.8.11, il n'existe qu'une seule console administrative : **Console Générale Admin**. Le Debug Framework est fusionné avec les commandes Admin, la lecture des logs, CP/1 et les Common Tools.

Syntaxe Debug officielle :

```text
debug <target> <action> [key=value]
```

Les cibles fixes comprennent `server`, `client`, `router`. Les Engines/modules supplémentaires sont découverts dynamiquement via les registres runtime.

Règles obligatoires : ADMIN uniquement, whitelist stricte, aucun shell libre, aucun chemin arbitraire, logs via LogReader, actions de service via ProcessRegistry / ServiceRegistry, audit dans `logs.dat`, et retour explicite `UNSUPPORTED` / `NOT_ALLOWED` pour une fonction non disponible.

Actions Debug v1 : `capabilities`, `status`, `health`, `self-test`, `metrics`, `dependencies`, `dump-state`, `logs`, `errors`, `trace-status`, `trace-on`, `trace-off`, `start`, `stop`, `restart`, `reset-safe`.

Les actions `start`, `stop`, `restart` et `reset-safe` sont à risque élevé et requièrent confirmation.

Source machine-readable : `Core/Admin/debug_commands_registry.json`.


> **Lecture rapide :** l'essentiel est ci-dessus. Les détails sont disponibles sans quitter la page.

<details>
<summary><b>➕ En savoir plus — détails techniques</b></summary>

## 2. Router Protocol / CP/1 — v1.8.12

La Console Admin et les outils de diagnostic doivent respecter l'architecture CP/1 normalisée. Voir [Router Protocol / CP/1](Router-Protocol-CP1.md).

Composants actifs CP/1 : Indicator, Trading, Risk, Portfolio, Market Data, Liquidity et Fundamental (`INFORMATION_ONLY`).

Exceptions : Trading Firewall = `SECURITY_BRIDGE`; Strategy Engine et Supervisor IA = `RESERVED` tant qu'aucun runtime autonome correspondant n'est intégré.

### Commandes Market Data

```text
marketdata.health
marketdata.candles
marketdata.refresh
marketdata.active
marketdata.cache.clear
```

### Commandes Liquidity

```text
liquidity.health
liquidity.zones
liquidity.realtime
liquidity.snapshot
liquidity.liquidations
liquidity.cache.clear
```

### Commandes Fundamental

```text
fundamental.health
fundamental.summary
fundamental.context
fundamental.sources
fundamental.events
fundamental.collect
```

Le Fundamental Engine reste `INFORMATION_ONLY` : ces commandes servent à collecter/consulter du contexte, pas à autoriser ou exécuter un ordre.

## 3. Sécurité CP/1

Le canal normalisé utilise localhost, token CP partagé, HMAC-SHA256, whitelist Registry et protection anti-replay Router. Les interfaces Admin/Debug ne doivent jamais exposer de shell, chemin de fichier ou URL arbitraire.

Une commande ou capacité absente du Registry ne doit jamais être présentée comme disponible.

## 4. Logs

Le journal global reste `logs.dat`. Toute action Admin/Debug doit être auditable. Les sorties destinées au partage doivent masquer automatiquement les credentials, tokens et autres secrets.

Les Common Tools de lecture/filtrage peuvent être utilisés dans les pipelines autorisés, par exemple :

```text
debug router health | grep online
debug marketdata logs lines=80 | grep ERROR | tail 20
```

## 5. Services et Engines

Toute nouvelle composante serveur doit documenter : nom canonique, rôle, état, commandes supportées/non supportées, dépendances, self-test, logs associés, procédure de restart, risques d'un stop/restart et retour à l'état normal après trace.

Les actions sensibles passent par les mécanismes de service contrôlés ; elles ne sont jamais traduites depuis une chaîne shell utilisateur libre.

## 6. Update Manager et versions

Pour chaque release, vérifier au minimum : version installée, build/patch appliqué, manifeste, checksum lorsque disponible, état du VERSION-GUARD, possibilité de rollback et cohérence avec la Roadmap/Changelog/Wiki.

## 7. Sauvegarde, restauration et rollback

Avant une mise à jour sensible, une migration ou une restauration, l'état à préserver doit être défini clairement. Les sauvegardes ne doivent pas exposer les secrets dans des fichiers non protégés. Les opérations destructives doivent demander une confirmation explicite et disposer d'une procédure de restauration.

## 8. Réseau et hébergement

Le futur déploiement VPS devra documenter : démarrage automatique, utilisateur système dédié, ports exposés, reverse proxy/TLS, pare-feu, permissions, rotation des logs, sauvegardes, surveillance des ressources et procédure de redémarrage après incident.

Les commandes natives macOS (`launchctl`) ou Linux (`systemctl`, `journalctl`) peuvent être documentées comme procédures de secours, mais ne doivent pas devenir un shell libre exposé dans la Console Admin.

## 9. Procédures d'urgence

### Suspicion d'ordre indésirable

1. activer le mécanisme d'arrêt/contrôle prévu par le Trading Engine / Firewall ;
2. contrôler l'état du Trading Engine ;
3. contrôler positions et ordres ;
4. lire les logs Trading/Firewall ;
5. générer un diagnostic avant modification si possible.

### Service défaillant

1. lire `status` / `health` ;
2. lire les erreurs et logs récents ;
3. utiliser `restart` uniquement si la cible le supporte et après confirmation lorsque requise ;
4. lancer `self-test` ou diagnostics disponibles si l'incident persiste.

### Mise à jour défaillante

1. vérifier UpdateManager et VERSION-GUARD ;
2. lire les logs de mise à jour ;
3. vérifier l'intégrité du patch ;
4. utiliser le rollback uniquement après identification de la version/backup cible.

## 10. Sources de vérité documentaire

- Debug Admin : `Core/Admin/debug_commands_registry.json`
- Router CP/1 v1.8.12 : `Core/Communication/router_protocol_spec_v1.8.12.json`
- Spec humaine Router : `Docs/Architecture/ROUTER_PROTOCOL_SPEC_v1.8.12.md`

Le Wiki doit distinguer strictement **fonction disponible**, **bridge de sécurité**, **RESERVED** et **fonction prévue**. Il ne doit jamais transformer une intention d'architecture en fonctionnalité réellement disponible.


</details>
