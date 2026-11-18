# Supervisor Engine 3.0.1 — Memory & CP1 Foundation Fix

Statut : candidat DEBUG `3.0.1-dev.1`. Aucun déploiement, ordre financier ou appel IA payant. La qualification finale est fournie dans `Results-3.0.1/final/summary.json` ; le statut global doit être PASS.

## Sources et reproduction

- Branche produit : `feature/iatb-3.0.0-dev.1-supervisor-foundation`, commit `88d6796ccbc7038c63dce80b0f74fb76b389e138`.
- Simulations importées par fichier, sans fusion : `test/iatb-3.0-dev1-supervisor-chaos`, commit `84d58936ac756a1f3f5a5b902ddd65224c60cc85`.
- Branche de livraison : `fix/iatb-3.0.1-supervisor-foundation`.
- La branche 2.x et son chantier de trading avancé sont conservés séparément.
- Le code produit original échoue sur les 32 tests Foundation avec le constructeur `filename` sans `root`. La seule correction du constructeur donne 29 succès et 3 échecs, reproduisant l'audit distant.
- La régression héritée reproduit 167/168 : le manifeste Supervisor modifié ne correspond plus aux empreintes qualifiées et refuse la commande avant la vérification de permission. Ce refus ne justifie pas d'affaiblir le contrôle d'intégrité.
- Audits distants examinés : https://github.com/florian74410/IA-Trading-Bot/actions/runs/44168994247 et https://github.com/florian74410/IA-Trading-Bot/actions/runs/44169474049 . Le job vert du workflow expérimental n'était pas une qualification : ses tests étaient `continue-on-error`.

## Corrections

| Défaut | Correction | Vérification |
|---|---|---|
| S3-001 | `filename` est résolu sans évaluer un `path.join(root,...)` inutile. Dossiers créés privés, fichier et sauvegarde 0600, WAL/FULL, transactions. | Tests Foundation, redémarrages et permissions |
| S3-002 | Validation récursive JSON, typage conservé, aucune double sérialisation, filtrage des champs secrets et des chaînes sensibles. | Objet, tableau, texte, nombre, booléen et null après réouverture |
| S3-003 | Mémoire durable par propriétaire/espace de travail, objectifs historisés et observations par contexte. La session authentifie l'accès sans devenir l'identité de mémoire. | Nouvelle session, autre propriétaire, autre espace, autre contexte, redémarrage du service |
| S3-004 | Métadonnées de provenance, contrat, disponibilité, dates, âge, TTL et FRESH/STALE/UNKNOWN. Recovery ne remplace que par des observations réellement obtenues. | Horloge simulée, autorisation retirée, réseau absent, objectif conservé |
| S3-005 | Requalification explicite des sources et contrats selon le mécanisme existant. Les quatre commandes sont OWNER-only, DENY pour les agents. | Vrais processus, TLS Core, Router, Supervisor, Gateway, Risk, révocation et contrat changé |
| S3-006 | Échec MACHINE_PROOF_INVALID non reproduit dans les exécutions isolées consignées ni après requalification. Les vérifications cryptographiques ne sont pas modifiées. | TAP d'intégration OKX isolés, qualification et régression ; voir le rapport de résultats |

Les fixtures multi-processus utilisent désormais un allocateur empêchant de réattribuer le même port à deux Engines ; une collision EADDRINUSE a été reproduite pendant la qualification locale. Ce défaut de fixture est distinct de la preuve cryptographique ; il ne suffit pas à établir la cause de l’ancien MACHINE_PROOF_INVALID.

Un ancien test Auth21 cherchait uniquement `createServer(` alors que l'entrée Trading a été migrée vers `auth21_engine_ingress.createEngineServer`. L'assertion reconnaît ce wrapper précis et la suite dynamique vérifie les points d'entrée HTTP des dix services, sans relâcher leurs politiques.

## Schéma SQLite et migration

Version `PRAGMA user_version=2` :

- `supervisor_workspaces` : propriétaire pseudonymisé, identifiant persistant, objectif actif et révision.
- `supervisor_objectives` : historique des objectifs.
- `supervisor_observations` : espace, contexte, objectif associé, valeur JSON typée, source, Engine, commande, contrat et fraîcheur.
- `supervisor_memory_migrations` : migrations appliquées.

La migration dev.1 est transactionnelle. Elle sauvegarde d'abord la base cohérente dans `<working.sqlite>.pre-v2.sqlite`, privée, puis transfère les données avant de retirer les tables liées aux sessions. Les sessions anciennes d'un même propriétaire/espace deviennent des objectifs historiques ; la plus récemment mise à jour devient active. Aucune session ni autorisation n'est restaurée.

Le format dev.1 ne permet pas de distinguer un texte ressemblant à du JSON d'un objet précédemment doublement sérialisé. La migration effectue un seul décodage JSON, conserve le texte historique sans deviner son type et marque `legacy_type_unknown=true`, fraîcheur UNKNOWN. Les nouvelles observations conservent leur type exact. Les schémas futurs inconnus sont refusés.

Un changement d'objectif masque les observations du précédent objectif sans effacer cet historique. Une réponse CP1 tardive ne peut pas être attribuée au nouvel objectif. La lecture du contexte est transactionnelle.

Limites : 64 Kio par observation nettoyée, profondeur 8, 256 éléments par tableau, 128 propriétés par objet et 4096 nœuds. Les structures cycliques, accesseurs, prototypes non JSON, nombres non finis et valeurs non JSON sont refusés. Lors des nouvelles écritures, 48 observations au maximum sont retenues par espace/contexte ; 12 sont retournées. La suppression des secrets est une défense déterministe ; elle ne constitue pas un détecteur universel de données sensibles.

## API existante et permissions

Les quatre commandes utilisent le pont propriétaire existant, dans `supervisor.user.request` :

| Commande interne | Arguments |
|---|---|
| `supervisor.engine.context` | `room?`, `workspace_id?` |
| `supervisor.engine.objective` | `objective`, `room?`, `workspace_id?` |
| `supervisor.engine.discover` | `room?`, `workspace_id?`, `recover?: boolean` |
| `supervisor.engine.observe` | `engine`, `command`, `room?`, `workspace_id?` |

Sans `workspace_id`, le nom de conversation détermine l'espace par défaut, pour compatibilité. Avec `workspace_id`, un objectif est partagé par les contextes de cet espace, mais leurs observations et conversations restent distinctes. Les appels directs non authentifiés et les tentatives d'identité propriétaire fournie dans les arguments restent refusés.

Exemple d'argument du pont `/communication/v1/ui/write`, avec cookie Auth21, Origin HTTPS et CSRF valides :

```json
{"target":"supervisor","action":"supervisor.engine.discover","arguments":{"workspace_id":"operations","room":"diagnostic","recover":true}}
```

L'agent d'observation est `supervisor_engine`, distinct de `chatbot`. La production n'accorde aucune permission automatique. Un administrateur doit autoriser les commandes de lecture nécessaires par le mécanisme existant. Chaque exécution vérifie à nouveau contrat, qualification, état de l'Engine et permission. Les anciens tokens Gateway ne survivent pas à la révocation de session. L'indisponibilité du registre ne bloque pas l'accès à l'objectif déjà autorisé ; les observations deviennent indisponibles.

Aucune commande financière n'est ajoutée à l'allowlist du Supervisor Engine. Les fonctionnalités de trading 2.x ne sont pas étendues par ce correctif.

## Fraîcheur et récupération

TTL par défaut : statuts/santé 15 s ; prix/carnets/bougies 5 s ; descriptions/capacités/contraintes/catalogues 5 min ; autres observations 30 s. L'allowlist actuelle porte sur les lectures de diagnostic qualifiées, pas sur tous les produits de marché. Un échec, une date future et les observations historiques dont le type est incertain donnent UNKNOWN. Une observation expirée reste consultable comme historique STALE.

`discover(recover=true)` recharge l'objectif, découvre CP1 et tente de rafraîchir les lectures périmées ou inconnues avec les permissions actuelles. Elle ne fabrique aucune donnée ni permission. L'échec d'une lecture n'efface pas l'objectif et les autres observations restent accessibles. Il n'y a pas de boucle de stratégie autonome ni de sous-agent.

CognitiveRuntime reçoit l'objectif durable, les observations actuelles, périmées et inconnues séparées, leurs sources/dates, les changements d'objectif pertinents et la conversation autorisée. Ces données structurées sont dans le prompt de données, jamais dans les instructions système. Une valeur trop longue est omise du prompt avec un marqueur explicite, sans être supprimée de SQLite. Le stockage appartient à l'application ; changer OpenAI/Remote LLM/MOCK ne réinitialise pas la mémoire. Les paramètres Remote LLM configurés sont conservés par le gestionnaire propriétaire.

## Installation et rollback

1. Utiliser Node 22 et une installation Auth21/CP1 déjà provisionnée. Aucun secret ne se trouve dans le build.
2. Sauvegarder la configuration et les volumes privés ; arrêter proprement Supervisor avant une mise à niveau. Ne pas activer cette version directement sur le VPS suspendu.
3. Extraire le build DEBUG dans une installation versionnée et exécuter `npm ci --omit=dev --no-audit --no-fund` depuis `App/`.
4. Conserver le même chemin privé `IATB_RUNTIME_ROOT` et les paramètres de données/TLS/identités CP1. La mémoire par défaut est `<IATB_RUNTIME_ROOT>/supervisor-engine/working.sqlite` ; sans cette variable elle est sous `App/.runtime`.
5. Exécuter `node App/Tools/qualify_supervisor_foundation.js /chemin/prive/rapports` avant qualification d'une adaptation locale, puis démarrer par les mécanismes habituels. Examiner les espaces et permissions `supervisor_engine` sans copier d'anciens grants de session.

Rollback : arrêter Supervisor, restaurer le code précédemment versionné et la sauvegarde SQLite dev.1 pré-migration, en gardant une copie de la base v2 pour analyse. Ne pas faire lire la base v2 par dev.1. Les fichiers WAL/SHM appartiennent à la base arrêtée : restaurer un ensemble cohérent ; ne jamais mélanger un ancien DB et un WAL récent. Ne jamais publier ces bases privées dans Git ou les artefacts.

## Nettoyage et limites

Aucun test historique ni module produit n'a été supprimé. Deux assertions des tests expérimentaux sont adaptées au contrat demandé : continuité du même propriétaire après reconnexion remplace l'ancienne attente d'isolation par session ; le comptage utilise la table v2 au lieu de la table dev.1 retirée. Les assertions d'isolation entre propriétaires et de refus des autorisations restent présentes.

La recette inclut les vrais processus et mécanismes internes ; MOCK remplace uniquement le fournisseur IA. Les tests unitaires de fautes Gateway complètent les tests réseau et ne sont pas présentés comme du transport CP1 réel. Un test TTY d'identité OS peut être SKIP sur un hôte ne fournissant que l'UID 0 ; il est compté séparément. Le correctif ne couvre pas de stratégie autonome, de sous-agent, d'interface de gestion d'espaces dédiée ni de trading financier par le Supervisor.
