# IA-TB Architecture — accès VPS isolé et publication contrôlée

## Décision d'architecture

Le nom public \`architecture.iatb.duckdns.org\` héberge une **présentation client en lecture seule**.

Le futur agent qui pourra agir sur ce site devra disposer d'un périmètre **strictement limité à Architecture**, et non d'un accès root au serveur complet, même si le sous-domaine et RELEASE/DEBUG partagent physiquement un VPS.

**Aucun accès SSH/MCP direct n'est actuellement connecté à cette conversation.** La présence de droits GitHub ne donne pas de droits sur le VPS. Ce document prépare le dispositif ; il ne prouve pas qu'il soit installé.

## Cloisonnement à mettre en place par l'administrateur VPS

1. Créer un compte de service non privilégié, par exemple \`iatb-arch-deploy\`, sans accès sudo global et **sans appartenance au groupe docker**.
2. Réserver \`/srv/iatb-architecture/\` aux artefacts du site :
   - \`releases/<ID>/\` : bundles statiques immuables,
   - \`current\` : lien symbolique vers une release validée,
   - \`staging/\` : artefacts pré-validés,
   - \`logs/\` : journaux spécifiques à Architecture.
3. La configuration Caddy du vhost doit être créée **une fois par l'admin VPS**. L'agent Architecture **ne doit pas pouvoir modifier les autres blocs Caddy**, les fichiers RELEASE/DEBUG, les autres domaines ou les clés TLS.
4. Les permissions POSIX doivent restreindre les écritures aux seuls chemins Architecture. Utiliser des ACL ciblées si Caddy doit pouvoir lire les releases.
5. Ne **jamais** monter \`/var/run/docker.sock\`, les fichiers \`.env\` des services financiers, les secrets Trading ou les volumes des autres stacks dans l'agent.
6. Le site public utilise un bundle Vite statique, aucune route API d'administration n'y est requise.
7. Prévoir des sauvegardes du \`current\`, du manifeste des versions et des brouillons privés avec rotation, sans exporter de secrets.

## Contrats proposés pour le futur agent MCP Architecture

Le serveur d'administration MCP doit se trouver dans un processus isolé, idéalement sur loopback \`127.0.0.1:8810\` derrière un accès sécurisé **ou** via tunnel privé. Choisir le mécanisme compatible avec le client ChatGPT de l'utilisateur et obtenir son autorisation explicite pour installer la connexion.

N'exposer **que** les outils suivants :

| Outil | Permission | Effet |
|---|---|---|
| \`architecture.status\` | Lecture | Version, horodatage et santé du site Architecture |
| \`architecture.list_releases\` | Lecture | Historique des versions du site |
| \`architecture.read_logs\` | Lecture limitée | Journaux propres au service, expurgés des secrets |
| \`architecture.stage\` | Écriture limitée | Déposer un artefact validé dans \`staging/\` |
| \`architecture.preview\` | Écriture limitée | Créer une prévisualisation **privée** |
| \`architecture.publish\` | Approbation explicite | Activer un build après validation |
| \`architecture.rollback\` | Approbation explicite | Revenir à une release préexistante |

Aucun \`exec\` shell libre, aucune modification arbitraire de fichier, aucune commande Docker, aucun accès SSH général, aucune opération sur RELEASE/DEBUG.

**Ne pas interpréter « accès au sous-domaine entier » comme « accès à l'ensemble du VPS ».** Le périmètre autorisé couvre le contenu de ce site, ses releases et ses journaux.

### Authentification MCP

La future liaison doit utiliser une authentification serveur robuste, avec identité, scopes d'autorisation, audit et révocation. Un simple token dans le frontend public serait inacceptable. Préférer OAuth avec permissions adaptées ; une liaison ChatGPT ne peut pas être déclarée disponible tant que l'utilisateur n'a pas connecté/autorisé le plugin ou un tunnel sécurisé et que les outils n'ont pas été testés.

Les opérations de **publication** et de **rollback** exigent une validation explicite et doivent faire l'objet de journaux indépendants.

## Workflow de publication prévu

\`\`\`text
GitHub branche Architecture V3
          │
          ▼
Tests + build public (aucun éditeur)
          │
          ▼
Artefact statique dist/ signé/identifié
          │
          ▼
Staging Architecture (seulement)
          │
          ▼
Validation humaine + URL prévisualisation privée
          │
          ▼
Approbation de publication
          │
          ▼
Release Architecture actuelle
          │
          └────────── rollback versionné possible
\`\`\`

Ne pas déployer automatiquement une modification de l'éditeur. Séparer le **modèle de graphe en brouillon** du **modèle public validé**.

## Exemple d'intégration Caddy

Un exemple de vhost est présent dans \`deploy/Caddyfile.architecture.example\`.

Il s'agit d'une **proposition**, pas d'un fichier à appliquer aveuglément au Caddy partagé. Avant de recharger Caddy, vérifier les domaines déjà servis, l'ordre des routes, les droits de lecture sur \`/srv/iatb-architecture/current\`, les certificats TLS et la résolution DNS.

La page peut être client-facing sans aucune route de gestion : l'accès éditeur ne doit pas être placé dans le répertoire statique public.

## Première validation VPS à effectuer par le propriétaire

Depuis une session SSH déjà autorisée, l'administrateur peut exécuter **en lecture seule** :

\`\`\`bash
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl status caddy --no-pager
sudo ls -ld /srv/iatb-architecture /opt/iatb-architecture 2>/dev/null
\`\`\`

Ne pas publier ni modifier le DNS/Caddy tant que le dossier, l'utilisateur dédié et le processus de restauration ne sont pas prêts.

Les résultats de ces contrôles permettront d'adapter les chemins à l'installation réelle sans toucher aux autres sous-domaines.
