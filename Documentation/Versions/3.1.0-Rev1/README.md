# IA-TB 3.1.0 Rev1

## Développement et continuité

La révision est construite sur `release/iatb-3.0.2-Rev-X-full-source` au commit `6bdfd3626d19b37790202a66007b90d121007703`. Les dix Engines, les répertoires persistants, les migrations SQLite, Core, Router, Auth21, Firewall et Portfolio sont conservés. Aucune restructuration profonde ni suppression de composant. Les versions des contrats CP1 sont indépendantes de la version applicative 3.1.0.

Les modifications concernent la navigation ADMIN, la lecture du diagnostic structurel, les procédures de consultation Supervisor, la transmission d’une préparation vers Core et les métadonnées du build. Les PIDs, URL de services et états de déploiement des installations réelles restent à vérifier sur place.

## ADMIN et Atlas

- Route de page `/admin/analyse/structurelle` et route JSON `/admin/analyse/structurelle/rapport` servies par le Gateway UI. Le Gateway HTTPS consulte `/auth21/me` avant de servir les données du rapport. Le rôle provient de Core. Le paquet JSON réside sous `App/UI/Analysis`, hors des répertoires d’assets statiques.
- Diagnostic provenant de l’explorateur Rev-X, avec 324 fiches, 258 contrats CP1, 15 anomalies historiques et six points à vérifier. Les statuts métier et les niveaux de preuve du rapport sont distincts. Les preuves se rapportent au commit audité. La version installée désigne le build du Gateway qui répond. La version déployée est « Non vérifiée ».
- Arborescence repliable, tableau triable, filtres combinables, recherche, fiches détaillées et liens dans les deux sens entre anomalies et fonctionnalités. La vue « Travail restant » rassemble les fiches à traiter et les points à vérifier.
- Le bouton « Actualiser le rapport » recharge le JSON versionné. Une future analyse en lecture seule pourra retourner le même schéma. Une opération dynamique n’est pas disponible dans cette révision.
- Le lanceur Auth21 existant est requis pour ADMIN. Le manifeste UI hérite du mode d’authentification du lanceur. Les profils DEBUG locaux conservent leur démarrage sans authentification, avec ADMIN indisponible. Ce changement couvre les pages ADMIN et les routes d’opérateur connues de Core et du Gateway. Il ne remplace pas la qualification d’un déploiement.

## ChatBot

| Intention | Parcours | Preuve et limites |
| --- | --- | --- |
| `platform.diagnostics` | Appelle un contrat de consultation prédéfini pour chacun des dix Engines par AgentEngineGateway et Router CP1 | Indique les réponses reçues et les cas non vérifiés. Chaque commande conserve son grant, son schéma et sa qualification. |
| `platform.commands` | Lit le catalogue effectif de l’agent et garde les commandes qualifiées, autorisées et joignables | Liste calculée à partir de l’identité de l’agent. |
| `market.cross_analysis` | MarketData fournit les bougies. Indicators calcule le RSI sur ces bougies. Liquidity fournit ses capacités. Risk utilise le compte résolu et sa délégation propriétaire. | La mesure des zones Liquidity reste non qualifiée pour l’agent. Le rapport indique les données manquantes et ne produit aucune préparation ni ordre. |
| Intentions de négociation existantes | Supervisor interprète et mémorise la demande. Core prépare le diagnostic et peut émettre une demande de confirmation. | Un état de refus du Supervisor reste visible. Aucun texte généré n’est accepté en tant que confirmation. |

LOCAL, HYBRID et OPENAI utilisent les contrats existants. Un refus AgentEngineGateway, une absence de grant, une preuve propriétaire manquante ou un Engine hors ligne arrête la consultation concernée. Le rôle ADMIN n’étend pas en lui-même les grants d’un AGENT. Le contexte OpenAI reçoit des messages filtrés et omet les résultats métier privés de l’historique.

## Trading LIVE manuel

Le chemin avancé déjà livré dans Rev-X est maintenu. Core détient la préparation et la confirmation. La préparation Supervisor reste non confirmable tant que Core ne l’a pas validée. Un compte OKX actif avec marché et actions compatibles doit être configuré dans le coffre du propriétaire avec réauthentification. La confirmation est liée à la session, à la préparation et au diagnostic. La réservation, le Firewall, Risk, l’outbox, les états incertains, la réconciliation et la projection Portfolio restent gérés par les composants existants.

La simulation isolée exerce des ordres Spot Market/Limit, les opérations avancées MARGIN, SWAP et FUTURES du catalogue, les protections, annulations, amendements, plans, batchs, fills, rejets, ambiguïtés, réconciliation et arrêts d’urgence selon les scénarios du dépôt. Consulter les résultats de qualification pour le détail par scénario. Les fonctions doivent rester soumises aux capacités du compte et de la région. Le flux de confirmation Demo via le ChatBot reste indisponible. Le simulateur du flux LIVE utilise un broker fictif, séparé du mode Demo d’un compte OKX.

Aucun ordre réel, appel OpenAI payant ou déploiement VPS n’entre dans ces validations. La qualification d’un compte réel exige une recette distincte, avec compte, environnement, région et instruments vérifiés. Les valeurs Risk/Firewall et les protections impératives demeurent obligatoires.

## Anomalies et suivi

| ID | Gravité | Cause | Correction ou suivi |
| --- | --- | --- | --- |
| REV1-01 | Haute | Le Gateway historique pouvait accepter un rôle DEBUG pour ADMIN. | Refus sans session Auth21 pour ADMIN et le rapport. Couverture HTTP avec sessions générées et rôles distincts. |
| REV1-02 | Moyenne | La passerelle Companion réécrivait aussi les états de refus du Supervisor. | Seul un état de préparation en attente est transmis à l’autorité Core pour enrichissement. |
| REV1-03 | Moyenne | L’agent dispose de capacités Liquidity qualifiées, mais la lecture de zones n’a pas de contrat qualifié pour lui. | La synthèse indique la limite et ne déduit aucune zone. |
| REV1-04 | Moyenne | Le workflow manuel avancé Core refuse l’environnement Demo. | Le mode Demo reste indisponible à la confirmation via ChatBot. Une qualification dédiée demeure ouverte. |
| REV1-05 | Moyenne | Chromium système ne peut pas créer son socket de profil dans l’environnement local. | Le workflow de CI inclut les interactions Atlas dans Chromium. |

## Reproduire le build

Avec Node 22, Python 3 et le dépôt au commit à qualifier, exécuter depuis la racine.

```bash
npm ci --prefix App
node App/Tools_validate_release_version.js
bash Deploy/VPS/preflight.sh --source-only
python3 Tools/Build/build_rev1_full_source.py
python3 Tools/Build/verify_source_bundle.py artifacts/IA-TB-3.1.0_Rev1_FULL-SOURCE_VPS.zip
python3 Tools/Build/test_extracted_bundle.py artifacts/IA-TB-3.1.0_Rev1_FULL-SOURCE_VPS.zip --node-modules App/node_modules --report artifacts/extracted-package.json
```

L’archive conserve l’inventaire et les empreintes individuelles dans `BUILD.json`. Le checksum SHA-256 se trouve à côté du ZIP. Les dépendances Node sont installées depuis le lockfile. Les bases, certificats privés et clés de l’installation restent hors de l’archive.

## Correctifs d’interface Rev1

La section **AI Supervisor** du menu Paramètres regroupe deux formulaires indépendants. **Supervisor** enregistre le fournisseur, le modèle, le délai et le secours dans le profil via `/api/settings/supervisor/brains`. **ChatBot** enregistre son mode et son option de secours OpenAI via `/api/settings/chatbot`. Les anciennes URL IA et Supervisor mènent à la section fusionnée. Les clés restent gérées dans **API & Data**.

La section **Trading** reprend le formulaire des comptes d’exécution existant, ses permissions et son API Auth21. Le formulaire et la liste du niveau de risque utilisent les contrôles sombres de Paramètres.

Le menu et le contenu **ADMIN** défilent dans l’espace compris entre les barres globales. La rubrique **Analyse → Analyse structurelle** conserve l’Atlas intégré et propose l’explorateur HTML d’origine sur `/admin/analyse/structurelle/explorateur`. La vue d’origine et le rapport JSON sont réservés aux administrateurs Auth21.

Fundamental partage une seule interrogation périodique des événements entre le tableau de bord et la console. L’interrogation se met en pause lorsque l’onglet est masqué et temporise après un refus de débit. Les quotas Auth21 existants restent applicables.
