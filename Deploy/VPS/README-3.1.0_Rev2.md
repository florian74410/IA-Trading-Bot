# IA-TB 3.1.0 Rev2 — préparation de la bascule GEN‑1

La présente procédure couvre le VPS qui sert `trading.iatb.duckdns.org`. La bascule, l’arrêt du service et le nettoyage nécessitent la validation de la prochaine étape. La recette se fait avec `IATB_TRADING_LIVE=0`.

## Inventaire à blanc

Le point de retour indiqué pour la production est `b304f65e36107ffc78c9a5b1116433df7743adcf`. Le journal transmis signale le retrait de `iatb-debug-online-app` et la création de `iatb-debug-online:rollback-20261118T195034Z`. Le second `no such object` est cohérent avec ce retrait. L’accès SSH depuis l’environnement de livraison a renvoyé `Network is unreachable`. La racine active, les chemins des données et le routage Caddy restent donc à relever sur place.

Sur le VPS, relever les chemins en lecture seule. Examiner les fichiers d’environnement et la configuration Caddy en local sur le VPS. Conserver uniquement les noms des variables et les chemins utiles dans le relevé partagé.

```bash
svc=iatb-rev1.service
sudo systemctl is-active "$svc"
sudo systemctl show "$svc" -p FragmentPath -p DropInPaths -p WorkingDirectory -p User -p Group -p MainPID -p EnvironmentFiles
pid=$(systemctl show "$svc" --property=MainPID --value)
if [[ "$pid" =~ ^[1-9][0-9]*$ ]]; then
  sudo readlink -f "/proc/$pid/cwd"
  sudo readlink -f "/proc/$pid/exe"
  sudo ps --ppid "$pid" -o pid,comm
fi
sudo ss -ltnp
sudo systemctl show caddy -p FragmentPath -p DropInPaths -p WorkingDirectory -p EnvironmentFiles
sudo docker ps -a --format '{{.Names}} {{.Image}} {{.Status}}'
sudo docker image inspect iatb-debug-online:rollback-20261118T195034Z --format '{{.Id}}'
sudo docker volume ls
```

- Lire l’unité et ses drop-ins sur place pour identifier `ExecStart`, le script réel, son répertoire courant, l’environnement et l’utilisateur. Confirmer le `BUILD.json` de l’arborescence lancée et la version de Node utilisée par le service.
- Suivre les racines effectives `IATB_DATA_ROOT`, `IATB_RUNTIME_ROOT`, `IATB_STATE_ROOT`, `IATB_UPDATES_ROOT`, `IATB_ANNEX_ROOT` et les éventuels chemins historiques sous le lanceur. Relever les liens, points de montage et propriétaires. Le lanceur SAFE livré attend, par défaut, `~/IA-TB-v23-Auth21-private`, avec `data/Database/clients.sqlite`, `data/Security/client_master.key`, `tls/localhost.crt` et `tls/localhost.key`. Les chemins observés dans le service existant font foi.
- Relever la configuration effectivement chargée par Caddy, y compris les imports et drop-ins. Noter l’upstream du seul vhost Trading, le nom TLS et la CA utilisés en amont, les ports des autres sites, les services MCP et les montages consultés par les autres unités.

## Préparation et sauvegarde

1. Vérifier le SHA-256, puis lancer `python3 Tools/Build/verify_source_bundle.py <ZIP>` depuis une copie de confiance des outils. Extraire l’archive dans un nouveau répertoire de release au nom de la révision et du commit. Vérifier que l’ancienne release et les répertoires des données pointent vers des chemins distincts. Installer les dépendances sous l’utilisateur du service avec Node 22 et `bash Deploy/VPS/prepare_vps.sh`. Passer `bash Deploy/VPS/preflight.sh --source-only`, puis le préflight complet avec l’environnement privé confirmé.
2. Sauvegarder l’unité, ses drop-ins, fichiers d’environnement, le lanceur et le dernier arbre Rev1 démarrable avec ses dépendances. Sauvegarder aussi les configurations Caddy concernées, les clés, certificats, comptes Auth21, réglages, sessions, bases, coffres et données persistantes des Engines. Stocker les sauvegardes privées avec accès restreint et en vérifier les empreintes. Vérifier dans une extraction privée que les fichiers, liens, propriétaires et ACL attendus sont présents. Contrôler les bases restaurées avec `PRAGMA integrity_check` et vérifier que la paire base/clé Auth21 correspond.
3. Pour le test à blanc, employer une copie cohérente ou des données fictives, un environnement isolé et des ports libres sur loopback. Utiliser un instantané cohérent pour les volumes actifs ou l’API SQLite de sauvegarde pour chaque base. Après validation de la bascule, effectuer une sauvegarde finale cohérente des bases et de leurs WAL avec tous les écrivains arrêtés. Le lanceur SAFE fixe ses ports et son origine à `https://localhost:8000`. Pour le domaine public, reprendre les valeurs et adaptations du lanceur de production relevées à l’inventaire, notamment l’origine Auth21, l’amont TLS et l’isolation des accès. Tenir la recette hors du domaine public tant que le branchement Caddy n’est pas validé.

## Permutation lors de l’étape approuvée

- Avant arrêt, noter les chemins de retour, le statut du service, l’état et les routes de santé des autres sites. Préparer une référence de release unique à remplacer atomiquement si le lanceur suit déjà un lien `current`. Si l’unité pointe sur une release fixe, préparer un drop-in de permutation consacré au seul service IA-TB, avec sa copie de retour.
- Arrêter proprement `iatb-rev1.service`, confirmer la libération des ports attendus, achever la sauvegarde cohérente, puis activer Rev2 avec les mêmes chemins privés et LIVE désactivé. Confirmer l’origine Auth21, les identités système, les permissions, les certificats et le comportement attendu au démarrage. Vérifier en loopback `/ui-health` et `/api/health`, puis le contrat de version du Core authentifié.
- Si le port et l’amont restent identiques, Caddy peut garder sa configuration. Si l’amont change, valider la configuration complète Caddy avant de recharger le service, et contrôler les autres vhosts avant et après. Tester l’accès HTTPS public avec validation TLS.
- Critères bloquants de recette | version `3.1.0`, révision `3.1.0_Rev2`, commit du ZIP, connexion Auth21, accès ADMIN, accès refusé pour USER, deux vues Atlas distinctes, `/aide` et `aide trading.buy`, persistance des réglages Supervisor et ChatBot, sélecteur Risk sombre, indicateurs de santé. Vérifier que le journal de recette ne contient aucun appel OpenAI ou ordre lors des demandes d’aide.

## Retour et périmètre du nettoyage

En cas d’échec bloquant, arrêter Rev2 et rétablir le lien ou l’unité Rev1 et l’amont précédent si celui-ci a changé. Rétablir, si nécessaire, l’état privé cohérent sauvegardé avant démarrage de Rev2 lorsque des écritures ou migrations incompatibles ont eu lieu. Préserver une copie des données postérieures pour analyse avant toute restauration. Redémarrer Rev1, vérifier son commit, l’authentification et les autres sites.

Après la recette et sa fenêtre de retour, seuls les répertoires de sources obsolètes dont le chemin réel est hors de toutes les racines privées, les archives de transit et les objets Docker explicitement identifiés comme dédiés au DEBUG retiré deviennent candidats au retrait. Vérifier pour chacun l’absence de montage, de référence par unité, de dépendance dans Compose et d’usage par un autre site. Préserver la dernière Rev1 démarrable, l’image de retour DEBUG tant qu’elle fait partie du retour, les volumes nommés, clés, bases, configurations, certificats et services tiers. Aucun nettoyage global Docker ni retrait par motif n’entre dans cette procédure.
