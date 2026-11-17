# IA-TB 2.6.0-dev.4 — CP1 et Supervisor Simulator

Cette version consolide la base Risk/OKX `e115285a` sans fusion globale des branches. Elle livre un build source DEBUG et une validation isolée des communications. Elle ne constitue pas un déploiement de production ni une autorisation LIVE.

Le Router conserve l’acheminement des commandes ; Core héberge le registre et les permissions dans le service Auth21 existant. Chaque Engine publie son catalogue via son `FunctionRegistry/startup.js` et le publisher commun, au démarrage puis toutes les cinq secondes. Core effectue également un pull avec un challenge signé. Les schémas du Protocol Registry sont conservés et les contrats qualifiés sont recopiés dans `Functions.json` et `VERSION.json`.

## Parcours et identités

1. Une session Auth21 ADMIN ou USER enregistre son propre agent puis crée une session d’analyse bornée.
2. Supervisor utilise `AgentEngineGateway` avec le jeton opaque de cette session. Le modèle reçoit uniquement les schémas des outils autorisés.
3. Core vérifie la session propriétaire, la permission courante, le contrat, l’état de publication et les arguments. Core signe une autorisation de routage.
4. Router authentifie le service Supervisor, réserve l’exécution, consomme atomiquement une permission ONCE et transmet une preuve destinée à l’Engine.
5. L’Engine revalide la preuve et l’autorisation auprès de Core avant son handler. Les contrôles CP1/HMAC et métier existants sont maintenus.
6. La réponse est validée puis enregistrée avec son identifiant CP1. Un même identifiant avec un contenu différent est refusé. Une exécution ambiguë ne fait jamais l’objet d’une nouvelle soumission automatique.

Les clés HMAC de service sont différentes. Seul Core possède la clé privée Ed25519 qui signe les preuves d’exécution ; les Engines disposent de la clé publique. Un rôle ADMIN ou un identifiant propriétaire présent dans un JSON n’est jamais une preuve. Les scripts de gestion de services affectent la bonne identité au processus enfant ; UI n’hérite pas de la clé Core.

Les commandes OWNER passent par l’admission commune puis par le receiver Auth21 existant. Core construit lui-même l’enveloppe propriétaire. Pour Portfolio OKX et Risk, le Vault émet un ticket de lecture limité au compte du profil et à la session Auth21 active. `TradingReadContext` relit les préférences et secrets chiffrés du propriétaire dans Core ; les identifiants ne sont transmis ni au modèle, ni à Portfolio, ni à Risk. Le parcours de compte conserve Router → Firewall → Trading → API OKX.

## Permissions et sessions

Le refus est la valeur par défaut. Les permissions permanentes, temporaires et ONCE utilisent le même évaluateur. La décision est relue à l’admission ; une révocation interdit l’opération même après une réservation ONCE. Le changement ou la suppression d’un contrat invalide toutes les familles de permissions associées.

Les sessions portent un propriétaire et un agent issus du stockage authentifié, une expiration de 1 à 3 600 secondes, une liste de commandes facultative et un périmètre typé : portefeuille, exchange, marchés, capital, exposition, positions et limites. Cette livraison accepte ANALYZE et PAPER uniquement et retourne `financial_execution:false`. Elle ne permet pas de transformer ce contrat préparatoire en session LIVE. Les limites financières ne sont pas présentées comme un moteur d’exécution opérationnel.

Le statut de qualification est distinct de la vérification historique d’un handler. Les handlers cognitifs propriétaire vérifiés restent `hard_deny:true` pour l’agent générique. Une fonction non qualifiée reste visible dans le catalogue avec sa raison d’indisponibilité. Les retraits, transferts, secrets et mutations sensibles ne deviennent pas des outils disponibles.

## API Backend pour Paramètres → IA Trading

Utiliser `POST /auth21/cp1/control`, un cookie Auth21 réel, l’Origin HTTPS exact et `X-IATB-CSRF`. Le corps est `{ "operation": "...", "data": {...} }`.

| Opération | Droit et effet |
|---|---|
| `agent.register` | ADMIN/USER, crée uniquement son agent ; `agent_id` |
| `session.create` | ADMIN/USER, son agent ; `agent_id`, `duration_seconds`, `scope` ; jeton réservé au serveur |
| `session.revoke` | ADMIN/USER, uniquement une session lui appartenant |
| `commands` | ADMIN, inventaire complet et permissions de `agent_key` |
| `permission.request` | ADMIN, demande pour un agent enregistré ; aucune autorisation immédiate |
| `permission.review` | ADMIN, approuve ou refuse une demande ; `request_id`, `approve` |
| `permission.grant` | ADMIN, décision permanente ALLOW/DENY pour `agent_key`, `engine`, `command` |
| `permission.revoke` | ADMIN, révoque une autorisation approuvée par `request_id` |
| `permission.requests` | ADMIN, demandes et états |
| `audit` | ADMIN, événements récents |

La Gateway permet également à l’agent de demander une permission ; cette demande est PENDING et l’identité de l’agent est dérivée de sa session. L’agent ne dispose d’aucune méthode d’approbation. L’API interne `/auth21/internal/cp1-control` utilise HTTPS et l’identité signée du service ; elle n’est pas une API de navigateur.

## Interface Supervisor

`SupervisorCore.agentEngineGateway(token)` instancie le même client que le simulateur. Les méthodes disponibles sont `list_available_engines`, `list_available_commands`, `describe_command`, `validate_command`, `execute_authorized_command`, `get_command_execution_result`, `get_command_execution_audit`, `request_permission`, `openai_tools` et `execute_tool`.

L’adaptateur OpenAI expose exclusivement des outils autorisés, en ligne et qualifiés. Les noms techniques des outils sont déterministes. Une réponse du modèle ne fournit aucune identité ni autorité. Le branchement de ce mécanisme à la planification, au ChatBot et au scalping natif reste un travail Supervisor ultérieur.

Les anciens appels bruts de Supervisor ne constituent pas un chemin de remplacement pour l’agent lorsque le contrôle est activé : ils sont refusés, sauf la passerelle AI existante qui possède ses propres preuves propriétaire. Les anciens parcours restent disponibles dans le mode historique sans ce nouveau contrôle ; les futurs outils doivent utiliser la Gateway. Cette qualification ne prétend pas requalifier tous les anciens outils du ChatBot.

## Qualification et simulation

Node 22, npm, Python 3 et OpenSSL sont nécessaires. Les tests ne requièrent aucune clé OpenAI ni aucun compte réel.

```sh
cd App
npm ci --omit=dev --no-audit --no-fund
npm run test:integration -- /tmp/iatb-cp1-validation
```

Le programme lance les véritables services sur des ports locaux isolés, un Core TLS composé des véritables modules Auth21/registre et un profil fictif. Les contrôles ADMIN/USER/GUEST sont aussi testés avec le véritable UserStore SQLite. Les seules fixtures du scénario OKX remplacent les transports de l’exchange et des fournisseurs de marché, par un preload de test explicitement activé. Les handlers Trading, MarketData, Firewall, Portfolio et Risk restent les modules de l’application.

Les scénarios versionnés se trouvent dans `App/Tools/Tests/SupervisorSimulator/scenarios/`. Le simulateur n’accorde aucun droit : le harness isolé provisionne explicitement les permissions via un principal ADMIN de test. Le CLI autonome utilise une session déjà autorisée, fournie dans un fichier privé :

```sh
IATB_CP1_AGENT_TOKEN_FILE=/chemin/prive/jeton \
  node Tools/Tests/SupervisorSimulator/cli.js \
  Tools/Tests/SupervisorSimulator/scenarios/engine-read.json rapport.json
```

Le CLI requiert aussi l’environnement de service Supervisor décrit ci-dessous. Le scénario `engine-read` suppose les permissions indiquées dans ses étapes ; son refus attendu sur `risk.status` doit être provisionné explicitement. Les scénarios ne peuvent ni accorder des permissions, ni activer LIVE. Ils valident les contrats, réponses, corrélations, résultats persistés et audits ; les rapports ne contiennent pas les données privées complètes du portefeuille.

Les empreintes de qualification sont dans `Control/qualification.json`. Une modification d’implémentation retire automatiquement sa qualification. Pour une nouvelle livraison, `npm run qualify:cp1` renouvelle les empreintes et exécute les services isolés et les régressions cognitives ; tout échec restaure les anciennes empreintes et manifestes. Cette commande est un outil de développement, jamais une opération d’agent ni de démarrage de production.

## Activation technique ultérieure

La nouvelle infrastructure est inactive si `IATB_CP1_CONTROL_ROOT` n’est pas configuré. Aucun secret ne doit être commité ou ajouté au build.

```sh
node App/Tools/cp1_provision.js /chemin/prive/iatb-control
```

Chaque service doit recevoir `IATB_CP1_CONTROL_ROOT`, `IATB_CP1_SERVICE_ID`, `IATB_CP1_SERVICE_KEY_FILE`, `IATB_AUTH_TLS_CERT`, `CORE_PUBLIC_PORT` et `ROUTER_PORT`, avec `IATB_AUTH_MODE=authenticated`. La clé de service correspond exactement à l’Engine. Core doit pouvoir lire son issuer privé et les clés de vérification ; un Engine ne doit recevoir que sa propre clé et `trust/issuer.pub`, via des montages ou droits d’OS séparés. Ne pas monter le répertoire Core privé dans un Engine. L’isolation physique de ces secrets et le démarrage complet Core/UI sur la cible font partie de la qualification de déploiement, non effectuée ici.

Les publishers et la découverte partagent les ports définis par les variables `IATB_*_PORT` des services. Les appels ont des limites de taille, huit exécutions en vol par Engine et seize requêtes Agent simultanées au Router. Les fonctions qualifiées utilisent un timeout de cinq secondes. Un résultat `AMBIGUOUS` exige une réconciliation ; il ne faut pas réutiliser automatiquement l’ordre sous un autre identifiant.

## Build et retour arrière

```sh
node App/Tools_validate_release_version.js
python3 Tools/Build/build_risk_snapshot.py
python3 Tools/Build/verify_source_bundle.py artifacts/IA-TB-2.6.0-dev.4-debug-source.zip
```

Le bundle contient les sources complètes, les registres, scripts et tests ; les dépendances sont réinstallées par `npm ci`. Il exclut les bases de données, secrets, caches, modules installés et données de profil. Le manifeste BUILD.json et le SHA-256 vérifient son contenu. Deux générations sur le même inventaire donnent le même SHA-256.

Pour revenir à la base, utiliser un checkout distinct de `feature/risk-engine-parallel-snapshots` au commit `e115285a`, réinstaller ses dépendances et conserver les sauvegardes de données et de configuration. Le nouveau registre utilise son propre SQLite sous le contrôle privé ; ne pas effacer le profil OKX ou les bases de portefeuille. Aucun changement de production n’a été effectué par cette livraison.
