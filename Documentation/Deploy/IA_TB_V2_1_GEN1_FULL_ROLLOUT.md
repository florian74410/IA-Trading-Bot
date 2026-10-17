# IA-TB v2.1 — installation complète GEN-1 (DEBUG)

Status: **préparation ; aucune installation VPS exécutée depuis GitHub**.
Source intégrée: PR #10 `integration/chart-workspace-v2.1-gen1`, dont la PR #9 est la livraison graphique officielle et la PR #7 une dépendance de code (pas un déploiement séparé). PR #8 exclue.

## Objectif

Construire une seule image applicative IA-TB v2.1 (`iatb:v2.1-gen1`), puis remplacer de façon contrôlée **l'ensemble des 13 services démarrés** du projet DEBUG cible. Conserver les autres projets, le socket SSH privé, les données et le trading LIVE désactivé. Aucun déploiement partiel UI/Indicator.

## Inventaire GEN-1 fourni par l'opérateur

- Projet Docker **`iatb-debug-v2-01`** ; service network-owner `router`.
- Compose actif: `/home/iatbadmin/IA-TB-debug-v2-01/compose.debug-v2-01.yml`.
- Image actuellement commune aux 13 services: `sha256:47874102fce2e770ac27cf0c9b21c0780c32e2afe8c68732e258207cca4d0ec2`.
- Utilisateur conteneurs: `1001:1001`.
- Persistance: `/var/lib/iatb/debug-v2-01/{annexes,data,runtime,state,updates}`.
- Socket de l'UI: `/var/lib/iatb/debug-v2-01/runtime/ssh-ui.sock`.
- Aucun port publié ; `IATB_TRADING_LIVE=0` ; aucun service Trading observé.
- Aucun montage inscriptible entre projets distincts détecté. Les cinq montages sont **partagés dans le même projet** et doivent être sauvegardés de manière cohérente.
- L'inventaire ne fournit pas la configuration Compose résolue, les writers SQLite externes, la place libre, ni les dépendances `network_mode: service:router` ; ne pas inventer ces valeurs.

## Conditions avant toute modification Docker

1. CI Renderer **et** Workspace au vert sur le commit final ; suites Engine et intégration complètes. Documenter les échecs de tests préexistants séparément.
2. Vérifier checkout propre sur le serveur et SHA final approuvé. Construire l'image avec une référence **nouvelle et unique** sans écraser `iatb:debug-v2.01`. Confirmer son ID, VERSION, architecture, UID et présence des assets.
3. Obtenir `docker compose ... config` en fichier privé root (peut contenir secrets), inventorier tous les overrides, les dépendances, le plan d'arrêt/redémarrage et les services utilisant le namespace réseau du Router.
4. Conserver par tag unique, `docker image save` et hash SHA256 **l'ancienne image immuable** ; tester `docker image load` sur archive d'essai, avant tout remplacement.
5. Sauvegarder Compose, fichiers d'environnement, secrets, volumes bind et données persistantes hors des répertoires montés, avec accès restreint. Identifier les processus writers SQLite ; suspendre les writers selon un plan approuvé et copier de façon cohérente DB/WAL/SHM. Vérifier archives, espace disponible, permissions/ACL/xattrs et intégrité SQLite **sur copies**.
6. Figuer et relire un plan de restauration exact de **tous** les services, incluant le Router et le bridge. Restaurer d'abord l'image ancienne sans restaurer automatiquement les données si aucune migration ne les a modifiées.
7. Obtenir l'approbation de l'opérateur sur les **commandes complètes résolues**. Le présent document n'autorise ni un `down` général ni un redémarrage.

## Séquence opératoire à finaliser sur GEN-1

- Geler les changements et vérifier l'absence de Trading Engine et de ports publics.
- Sauvegarder et vérifier image + données + Compose ; enregistrer un manifeste privé de l'état initial (IDs de chaque conteneur/image, mounts, réseaux, socket, health et timestamp).
- Construire une image identifiée par un tag versionné unique, par exemple `iatb:v2.1-gen1-<sha-court>`, puis affecter **tous** les services de la cible à cette image via un override Compose **privé** ; garder l'ancien tag intact.
- Arrêter/recréer les services selon l'ordre déduit des dépendances **réelles**. Puisque plusieurs services utilisent le network namespace du Router, la recréation de ce dernier rend les références conteneur précédentes invalides. Privilégier une fenêtre courte de maintenance planifiée et une séquence d'arrêt/recréation contrôlée, **jamais** une seule commande générique improvisée. Ne pas modifier les autres projets Docker.
- Réutiliser exactement les montages, utilisateur, environnement, réseau, restrictions egress et socket SSH existants. Ne pas ajouter de ports publiés. Ne pas lancer Trading.
- Contrôler les treize services, logs, santé, CP/1, Firewall, ressources et socket tunnel. Tester en Firefox chart candles, Ichimoku, Bollinger, RSI, MACD, Indicator Studio, marché/paire, dessins et persistance ; vérifier le retour à l'application depuis la navigation.
- En cas de défaut : réappliquer la configuration sauvegardée avec l'ID de l'image d'origine et recréer **tous les services concernés** dans l'ordre réseau correct ; vérifier IDs/images et socket. Restaurer les bases uniquement sur décision explicite, après mesure des écritures depuis le snapshot.

## Interdictions

Pas de `docker compose down -v`, `docker system prune`, suppression de montages, reset Git forcé, écrasement du tag partagé, publication de secrets, déploiement RELEASE ni démarrage Trading LIVE. Le plan limité à `ui`/`indicator` dans `CHART_WORKSPACE_V21_GEN1_INTEGRATION.md` est **supplanté par ce plan complet**.

## État

GitHub peut préparer code, tests et documentation. L'exécution des sauvegardes Docker, de la construction sur GEN-1 et du redémarrage complet nécessite un canal SSH autorisé vers GEN-1 et les relevés Compose du serveur. Aucun déploiement ne doit être annoncé avant observation des IDs de conteneurs exécutant réellement l'image v2.1 et contrôle fonctionnel.
