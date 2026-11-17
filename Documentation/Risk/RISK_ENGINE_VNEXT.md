# Risk Engine vNext — 2.6.0-dev.3 DEBUG

La même version reçoit ensuite le [raccordement OKX du profil](OKX_PROFILE_CONNECTION.md). Ce complément remplace les constats initiaux concernant la lecture propriétaire OKX et précise les limites qui subsistent.

## Livraison et périmètre

Base : `florian74410/IA-Trading-Bot`, branche `supervisor/iatb_v2.6.0.2`, commit `a4c86e6cae11eca04d90765255021dcccfd4f2cb` (5 novembre 2026). Les branches distantes et tags ont été inspectés ; cette branche est plus récente que `main`, `2.6`, les branches dev.2 et `2.5.3`. `IA-TB` est le nom du projet, le dépôt réel est `IA-Trading-Bot`.

Nouvelle branche : `feature/risk-engine-parallel-snapshots`. Version précédente déclarée : `2.6.0-dev.1` ; nom de branche précédent : v2.6.0.2. Nouvelle version : **2.6.0-dev.3**, build **DEBUG**. Les métadonnées manifest/lock/current_release indiquaient encore 2.5.3 ; elles sont maintenant cohérentes. `build_info` reconnaît les suffixes de développement au lieu de revenir silencieusement au manifest.

Ce travail livre un moteur analytique, des contrats CP/1, une préparation du scalping natif et un bundle source reproductible. Il ne livre pas une session autonome de scalping, une UI de permissions, une qualification de production ou une activation LIVE.

## Audit initial

| Composant | État constaté | Conservation ou évolution |
|---|---|---|
| `Risk/Engine/risk_engine.js` | Analyse pure, score 0–100, position, exposition, volatilité, drawdown, VaR/ES historiques ; données absentes souvent ramenées à zéro | API historique conservée sans changement numérique ; ne pas utiliser ce résultat historique comme approbation du nouveau mode |
| `risk_service.js` | Service loopback 8019, CP/1, paramètres SQLite, collecte MarketData/Indicator/Portfolio en parallèle | Conservé ; ajout de quatre commandes ; validation des arguments également à l'entrée Risk |
| `risk_r1_modules.js` | Capital, perte au stop, frais/slippage, budget et redimensionnement proposé | Conservé ; calculs R1 analytiques, aucune autorisation automatique |
| `risk_r2_modules.js` | Equity, drawdown, concentration, marge, stop global, intégrité ; corrélation/stress non opérationnels | Conservé ; nouveau calcul Pearson indépendant dans le moteur de snapshots |
| `risk_gate.js` | Intention normalisée, hash exact, approbation HMAC en mémoire, TTL 30 s, consommation unique ; contrôles structurels/levier | Conservé ; le service exige en plus un nouveau snapshot frais pour les intentions marquées `native_scalping`, avant émission et avant consommation |
| Router | Registre canonique, validation des arguments, anti-rejeu et enveloppes CP/1 | Correction ciblée : conserver `data.error` sur erreur HTTP d'un Engine |
| Supervisor | Orchestrateur intention-only, collecte parallèle, LLM via Gateway, mémoire propriétaire ; outils cognitifs restreints à une petite allowlist de lecture | Trois méthodes CP/1 structurées ajoutées ; aucune permission ni outil cognitif activé automatiquement |
| Function Registry | Inventaire avec contrats historiques non vérifiés ; contrôles d'exécution globaux encore partiellement raccordés | Contrats typés et vérifiés pour les quatre nouveaux handlers, privilège initial DENY ; génération conserve ces contrats |
| MarketData | Bougies et carnet microstructure avec contrôle Firewall et horodatage ; niveaux `{price,size}` | Source canonique CP/1 ; aucune requête directe à un exchange |
| Indicator | Indicateurs déjà calculés et contexte analytique | Ancienne collecte conservée ; nouveau moteur ne redemande pas des indicateurs inutiles aux formules de risque |
| Liquidity | Calculs de carnet/spread/profondeur/impact et données dérivées déjà présents | Aucun changement ; le snapshot Risk calcule un VWAP directionnel pour l'intention exacte depuis le carnet canonique, sans mélanger des snapshots Liquidity d'un autre instant |
| Portfolio | `portfolio.snapshot` ne sélectionne pas un propriétaire ; mode `TRADING_ONLY` où equity = PnL de trading, pas capital total ; historique clôturé disponible | Ne jamais confondre PnL et capital. Nouvelle voie refuse ce mode comme equity et exige portefeuille/monnaie/réconciliation vérifiés |
| Strategy | Signaux intention-only, hints de risque, pas scalping natif autonome | Aucun changement ; type/paramètres de stratégie sont conservés dans le contexte, historique filtré par type s'il est fourni |
| Firewall / Trading | Vérification et consommation du Risk approval, forward protégé, exécution dans Trading | Conservé ; client Risk du Firewall et demande Supervisor utilisaient un détail `execution` non autorisé par CP/1 : remplacé par `analysis`, testé sur transport réel |
| Documentation ancienne | README Risk v0.1 et certains chapitres Supervisor décrivaient un état dépassé | Le présent document est la référence du nouveau contrat ; anciennes pages redirigées vers ce document |
| Tests historiques | Test de normalisation attendait encore Supervisor RESERVED et recherchait une URL déplacée dans le client commun | Assertions actualisées sur le runtime ACTIVE et sur la délégation existante, sans affaiblir les contrôles de signature/registre |

## Architecture et cohérence

1. Supervisor appelle `risk.snapshot.create` avec le client CP/1 commun via Router.
2. Risk valide le contexte : portefeuille, symbole, période, corrélation, intention et paramètres. Le client ne peut fournir ni portefeuille réel, ni bougies, ni carnet, ni frais, ni scores, ni politique.
3. Risk collecte en parallèle les bougies, le carnet microstructure, le Portfolio et les trades par CP/1. Les bougies par actif détenu sont collectées ensuite en parallèle si nécessaires, avec une limite de huit actifs.
4. Un jeu de données est copié pour le calcul ; pas de lecture mutable du portefeuille au milieu d'un calcul. Les quatre tâches indépendantes sont marché, portefeuille, exécution et historique de stratégie. L'agrégation suit ces tâches.
5. Risk vérifie timestamps, période, symbole, venue, devise de cotation, réconciliation et portée du portefeuille/historique. Les séries de corrélation doivent avoir exactement les mêmes timestamps et pas réguliers.
6. Les métriques et scores donnent une décision structurée ; un composant critique ou une limite dure domine la moyenne.
7. Le résultat reçoit UUID, UTC, hash SHA-256 des données normalisées, hash de l'intention, identifiant de corrélation, durée et échéance. L'API renvoie une copie et le cache conserve une autre copie.

Il s'agit d'une cohérence **bornée et vérifiée**, pas d'une transaction distribuée atomique. Les sources n'offrent pas encore de numéro de version transactionnel commun. La borne d'écart book/portfolio est 15 s ; leurs timestamps et le hash de données sont conservés. Une requête ne rafraîchit jamais artificiellement la date d'une donnée reçue.

La version des politiques est embarquée dans les contraintes du snapshot. Pas de cache de décision réutilisé pour autoriser un ordre. Cache historique : au maximum 64 snapshots en RAM, remis à zéro au redémarrage. La lecture d'un snapshot périmé le marque `EXPIRED` et `UNAVAILABLE`.

## Formules et conventions

Toutes les fractions, rendements, volatilités, VaR, ES, expositions et spreads sont des **ratios** : 0,01 signifie 1 %. Les montants utilisent la monnaie de cotation vérifiée du compte et du carnet. Les scores seuls sont sur 0–100. Les niveaux du carnet sont en unités de base ; `size` est normalisé en quantité.

Une période de métrique = le timeframe demandé. `horizon`, s'il est donné, doit être identique ; aucun changement d'horizon implicite. Périodes annuelles crypto : 525600 pour 1m, 105120 pour 5m, 35040 pour 15m, 17520 pour 30m, 8760 pour 1h, 2190 pour 4h, 365 pour 1d. Pas de calendrier boursier 252 jours appliqué à la crypto.

| Métrique | Formule / hypothèse |
|---|---|
| Rendement log | `r[t] = ln(close[t] / close[t-1])` |
| Moyenne | `mu = sum(r)/n` |
| Volatilité historique | Écart-type échantillonnal, `sigma = sqrt(sum((r-mu)^2)/(n-1))` |
| Volatilité annualisée | `sigma * sqrt(periods_per_year)` ; hypothèse de mise à l'échelle iid, sans prétention prédictive |
| Volatilité réalisée | `sqrt(sum(r^2))` sur la fenêtre entière ; différente de l'écart-type par période |
| Volatilité courte | Écart-type des 20 derniers rendements |
| VaR gaussienne | `max(0, z_alpha*sigma - mu)`, z95=1.6448536269514722, z99=2.3263478740408408 ; pertes logarithmiques par période |
| VaR historique | Quantile linéaire à 95/99 % de `loss=-r`, borné à zéro |
| CVaR / ES | Moyenne empirique des pertes `>= quantile_alpha`, bornée à zéro ; méthode discrète incluant les égalités |
| Maximum drawdown | Maximum de `(running_peak-close)/running_peak` |
| Sharpe | `mu/sigma * sqrt(periods_per_year)`, taux sans risque = 0 |
| Sortino | `mu/sqrt(mean(min(r,0)^2)) * sqrt(periods_per_year)`, cible de rendement = 0 |
| Calmar | `expm1(mu*periods_per_year)/maximum_drawdown` ; estimation annualisée rétrospective, pas une prévision |
| Rendement / risque | Moyenne log / VaR historique 95 %, uniquement si cette VaR est positive |
| Corrélation | Pearson des rendements log strictement synchronisés ; séries constantes ou désynchronisées => null |
| Exposition | Somme des notionnels absolus / equity ; détail des notionnels par symbole |
| Concentration | Plus gros notionnel par symbole / equity ; HHI = somme des carrés des parts du notionnel brut |
| Risque combiné | Somme des pertes estimées au stop des positions / equity |
| Spread | `(best_ask-best_bid)/mid` |
| Profondeur | Somme des quantités et somme prix*quantité du côté exécutable du carnet fourni |
| VWAP / slippage | Consommation des niveaux ask pour BUY, bid pour SELL ; VWAP directionnel comparé au mid ; manque de profondeur => risque de remplissage partiel et BLOCK |
| Frais | Notionnel rempli * taux de frais explicitement fourni par la source de confiance ; absence => null, jamais zéro implicite |
| Stop proposé | Perte au stop depuis le VWAP, plus frais d'entrée et estimation frais/slippage de sortie ; hypothèse prudente locale, pas une garantie de remplissage au stop |
| PnL net de stratégie | `realized_pnl - fees + funding` avec funding signé ; uniquement trades clôturés du même portefeuille ; netPnl explicite accepté dans les fixtures/contracts de source |
| Profit factor | Somme PnL positifs / valeur absolue somme PnL négatifs ; aucun dénominateur négatif => null |
| Espérance | Moyenne des PnL nets, avec fréquence de gain et quantiles min/p05/médiane/p95/max |

Minimum : 21 clôtures positives, finies, ordonnées et séparées d'exactement une période. Les trous ne sont pas silencieusement supprimés. Les ratios indéfinis sont `null` ; une sous-analyse impossible a `available:false` avec raison. Les résultats numériques non finis rendent la sous-analyse indisponible. Pour borner le coût et la taille CP/1, la nouvelle analyse de portefeuille accepte au plus 32 positions et la collecte de corrélation au plus huit actifs distincts.

La VaR gaussienne est livrée avec VaR historique, ES, drawdown et avertissements de données. Aucun Monte-Carlo, stress test avancé ou modèle GARCH n'est annoncé opérationnel. Les tâches pures de `Snapshots/math.js` constituent le point d'extension pour des modèles testés ultérieurement.

## Scores et décisions

Normalisation : `N(x,L)=round(clamp(100*x/L,0,100))`. Les valeurs initiales sont **provisoires**, modifiables par l'opérateur au démarrage, sans validation statistique annoncée.

| Score demandé | Clé JSON | Formule |
|---|---|---|
| market_risk_score | `scores.market` | max(N(CVaR95,0.05), N(drawdown,0.20)) |
| portfolio_risk_score | `scores.portfolio` | max(N(exposition_brute,maxExposure), N(risque_stops,maxStopRisk)) |
| volatility_risk_score | `scores.volatility` | N(volatilité annualisée,1) |
| liquidity_risk_score | `scores.liquidity` | N(minDepthQuote / profondeur_quote,1) |
| execution_risk_score | `scores.execution` | max(N(spread,maxSpread),N(slippage+fee_rate,maxSlippage)) |
| concentration_risk_score | `scores.concentration` | N(concentration / equity,maxExposure) |
| overall_risk_score | `scores.overall` | Moyenne pondérée des six scores, poids initiaux tous égaux à 1 ; null si un score requis manque |

Une donnée manquante n'est jamais remplacée par un score faible. Les scores disponibles peuvent rester affichés lorsque d'autres sont indisponibles ; la décision reste distincte et obligatoire.

Priorité : limite dure ou score de composant >=90 => `BLOCK` ; données requises absentes/périmées/incohérentes => `UNAVAILABLE` ; score global >=60 => `REVIEW` ; sinon `ALLOW_WITH_LIMITS`. L'énumération prévoit `ALLOW`, mais le moteur actuel conserve systématiquement ses limites : il n'émet pas une autorisation sans contraintes. `execution_authorization` est toujours false.

Blocages durs : spread/slippage, profondeur insuffisante, remplissage partiel, exposition projetée, taille proposée, nombre de positions, perte journalière, risque combiné aux stops et levier. Les limites restent appliquées indépendamment de la moyenne des scores.

Valeurs initiales : exposition 100 % equity, nouvelle position 10 % du capital demandé (ou equity), 10 positions, arrêt aux nouvelles entrées à 3 % de perte journalière, levier max 2, spread 0,2 %, slippage 0,3 %, profondeur 10000 unités de cotation, stop risk total 5 %. Un modèle spot MARKET est livré ; les ordres LIMIT, marchés non-SPOT et tout levier >1 restent `UNAVAILABLE` tant que leur modèle marge/liquidation n'est pas implémenté. Le plafond de levier ne signifie donc pas que le modèle de dérivés est qualifié.

Configuration opérateur : fichier JSON privé pointé au démarrage par `IATB_RISK_POLICY_FILE`. Clés dans `Snapshots/policy.js`, nombres positifs et poids contrôlés. Exemple : `{"maxSpread":0.001,"maxPosition":0.05,"weights":{"execution":2}}`. Aucun endpoint de nouvelle politique, aucune lecture arbitraire de fichier par une requête CP/1, aucun secret dans ce fichier. La modification nécessite un redémarrage contrôlé de l'environnement isolé. Les anciens paramètres R1/R2 restent séparés et conservés.

## CP/1 et préparation du scalping

| Commande | Effet | Autorisation initiale agent |
|---|---|---|
| `risk.snapshot.create` | Nouveau snapshot structuré et calcul borné | DENY |
| `risk.snapshot.get` | Lecture par snapshot_id ET portfolio_id, avec expiration | DENY |
| `risk.constraints.get` | Lecture des contraintes opérateur | DENY |
| `risk.status` | Capacité/état de l'orchestrateur, sans compte | DENY |

Les douze commandes historiques restent disponibles, y compris `risk.snapshot`, `risk.position.analyze`, `risk.portfolio.analyze`, `risk.strategy.analyze`, R1/R2, paramètres et Risk Gate. Elles ne sont pas renommées ni dupliquées. Les nouveaux schémas/entrées/sorties, descriptions, classification, exemples et erreurs sont dans `Snapshots/contracts.js` et `Risk/FunctionRegistry/Functions.json`. Le générateur réutilise les contrats audités. `verified_handler=true` pour les quatre nouveaux handlers signifie testés ; **aucun privilège ALLOW n'est créé**.

Exemple d'arguments CP/1 :

```json
{"portfolio_id":"account-1","symbol":"BTCUSDT","timeframe":"1m","context":"native_scalping","correlation_id":"session-check-1","intent":{"exchange":"BINANCE","action":"BUY","size":0.01,"stopLoss":90000,"leverage":1}}
```

La forme de réponse complète est définie dans `contracts.js` : identité, schema/schema_version, UTC, validité, portefeuille, symbole, contexte, stratégie/paramètres, capital, horizon, corrélation, métriques, scores, décision, raisons, warnings, métriques manquantes, qualité, hashes et durée. Aucun exemple de réponse chiffrée fictive n'est livré.

Codes d'erreur contrôlés : `RISK_ARGUMENT_INVALID`, `RISK_HORIZON_MISMATCH`, `RISK_OVERLOADED`, `RISK_CANCELLED`, `RISK_SNAPSHOT_NOT_FOUND`. Les erreurs de sources deviennent des raisons contrôlées sans réexposer le texte du provider. Erreurs de workers : timeout, panne, calcul échoué. Les identifiants CP/1 restent dans l'enveloppe ; le correlation_id métier reste dans le snapshot.

Nouvelles méthodes Supervisor : `createRiskSnapshot(args)`, `getRiskSnapshot(id,portfolioId)`, `riskConstraints()`. Pas d'accès HTTP direct à Risk. Aucun appel OpenAI n'est nécessaire aux calculs.

Pour la préparation native, l'intention passée au Gate doit porter `metadata.context='native_scalping'`, `metadata.portfolio_id` et éventuellement `metadata.timeframe`. Risk collecte et recalcule alors avant de créer l'approbation. Au `risk.gate.verify(...,consume:true)` du Firewall, il collecte et recalcule **à nouveau**, puis consomme atomiquement dans le Gate existant si les contrôles passent. Un snapshot_id fourni par un appelant n'est pas une preuve d'autorisation. Les anciens chemins hors contexte natif restent compatibles et gardent leurs règles historiques : ils ne bénéficient pas automatiquement du nouveau contrôle analytique complet.

## Parallélisation, saturation et délais

Runtime Node.js conservé, sans seconde pile Python. I/O concurrentes via Promises ; calculs CPU en pool `worker_threads` persistant et paresseux (deux workers), avec files bornées (32 jobs), timeout par job (1500 ms), remplacement des workers en panne et annulation.

Mode adaptatif par défaut : charge estimée `bougies * (1 + nombre_positions^2)` ; workers si charge >=10000, sinon calcul local. Le seuil est un paramètre opérateur, pas une calibration statistique. Les modes `parallel` et `sequential` du composant sont utilisés pour benchmarker les mêmes formules/données. Les faibles charges bénéficient de la suppression du coût de copie/dispatch ; les workers maintiennent l'isolation du travail lourd. Aucun gain universel n'est annoncé.

Quatre snapshots actifs au plus, cinquième rejeté `RISK_OVERLOADED`. Deadline globale 8 s et signal d'annulation ; timeout source par défaut 2500 ms, transport CP/1 de collecte également borné. Une annulation interne ne conserve pas de résultat partiel dans le cache. Les sockets CP/1 déjà partis se terminent par leur timeout borné ; le protocole ne reçoit pas un nouveau mécanisme concurrent d'annulation distribuée.

Fraîcheur : carnet 5 s, portefeuille 15 s, bougies dernière ouverture au plus `timeframe + 120 s`, tolérance futur 1 s. Les dates sont revérifiées après calcul. Validité du snapshot = minimum de maintenant+3 s et des expirations de source. Les timestamps de bougies sont les ouvertures de barres ; aucun resampling silencieux. En mode Auth21, le Portfolio propriétaire n'étant pas disponible via le contrat actuel, la nouvelle collecte ne demande jamais le Portfolio partagé et retourne `UNAVAILABLE`.

## Limites opérationnelles connues

- Le Portfolio réel ne fournit pas encore le capital et les preuves propriétaire nécessaires ; le carnet réel ne porte pas les frais et filtres de quantité vérifiés attendus par le contrat d'exécution. Dans cet état, le nouveau snapshot retourne honnêtement `UNAVAILABLE`. Les fixtures complètes vérifient le chemin positif, sans représenter une connexion à un compte réel.
- Le contrat CP/1 `portfolio.snapshot` ne sait pas sélectionner un portefeuille ; le moteur exige que la réponse porte le portfolio_id exact. Les séries multi-actifs doivent être synchronisées ; leur absence empêche de déclarer la corrélation disponible.
- Le snapshot complet est volontairement conservateur : historique net clôturé manquant, equity/peak/dailyPnl manquants, frais ou stop manquants empêchent une décision favorable. Un compte sans historique retourne donc UNAVAILABLE pour le contrat complet actuel.
- La vérification des contraintes d'exchange livrée couvre les limites min/max/step de quantité. Les autres filtres spécifiques à chaque venue restent à qualifier ; l'exécution finale doit toujours être validée par Trading et l'exchange.
- Le registre de permissions global et son application atomique Router/Engine restent un chantier amont ; cette mission n'active aucun droit et n'élargit pas l'allowlist cognitive. L'UI Paramètres → IA Trading est préparée par les métadonnées, pas implémentée ici.
- Le contexte utilisateur historique `risk.snapshot` et R1/R2 sont conservés ; les défauts de qualité de la base v0.1 ne sont pas masqués derrière une prétendue migration totale.
- Aucune session scalping, connexion exchange privée, dépense OpenAI, opération sur fonds, activation LIVE, installation VPS ou promotion en production n'a été effectuée.

Ces limites sont des refus explicites et des dépendances à qualifier, pas des modèles annoncés disponibles.

## Validation et reproduction

Node qualifié localement : **22.23.5**. Installation des dépendances réelles via npm ci, puis reconstruction des modules natifs pour Node 22. Les premiers essais techniques ont également tourné sous Node 24, mais les preuves finales portent sur Node 22, requis par le dépôt.

Validation initiale Risk (avant le complément OKX) : **40 tests réussis, 0 échec**, résultat complet dans `validation.log`. Ils couvrent références indépendantes des équations, données vides/constantes/extrêmes/invalides, synchronisation, devises/venue/portée, stops/marge absents, overflow, seuils, cache immuable/expiré, contexte distinct par requête, timeouts, annulation en cours d'I/O, panne et saturation du pool, égalité séquentiel/parallèle, R1/R2/paramètres historiques, registre/anti-rejeu, architecture Supervisor et LLM MOCK.

L'intégration utilise de vrais processus Node Router et Risk sur des ports loopback éphémères, le vrai client et les vraies méthodes Supervisor, le client de vérification Firewall et de vrais messages CP/1. Les sources de données sont des serveurs fixtures ; aucun exchange ni LLM externe. Test du refus sans token, arguments inattendus, erreurs structurées, ancienne API, nouvelle découverte, approbation native puis panne de source avant consommation, refus sans consommation et consommation unique après rétablissement. Le manager réel SQLite confirme DENY par défaut même avec un handler vérifié. Pas de qualification bout-en-bout du Trading réel.

```bash
cd App
npm ci --omit=dev --no-audit --no-fund
npm run test:risk
npm run bench:risk
cd ..
node App/Tools_validate_release_version.js
python3 Tools/Build/build_risk_snapshot.py
```

Le workflow `.github/workflows/risk-snapshots.yml` décrit la suite étendue de 40 tests et la production de l'artefact CI. Il ne déploie rien. Voir `benchmark-2.6.0-dev.3.json` pour mesures brutes, CPU, RSS échantillonnée, P50/P95/P99, charge simultanée et source indisponible. Les résultats de CI distante sont distincts des résultats locaux et doivent être consultés sur le commit publié.

## Build, installation isolée et retour arrière

Le dépôt utilise une application Node.js source et un Dockerfile Node 22 ; il ne possède pas de compilation binaire pertinente à ce chantier. Le build livré est donc un **bundle source DEBUG déterministe**, pas un binaire ni une image Docker prétendument construite. `Tools/Build/build_risk_snapshot.py` empaquette l'inventaire Git App/Tools/Documentation, exclut les états mutables et dépendances locales, ajoute `BUILD.json` avec les hashes SHA-256 et produit un `.zip.sha256`. Il n'installe ni ne démarre de service. Il faut ajouter les nouveaux fichiers à l'index Git avant le build local ; sur un clone du commit livré, tous sont déjà suivis.

Pour tester dans un environnement séparé : cloner la nouvelle branche dans un nouveau répertoire, employer Node 22, `npm ci`, exécuter les tests, et suivre les conventions compose existantes uniquement en PAPER/MOCK dans un environnement dont les secrets/données sont distincts. Le chemin `npm run test:risk` crée ses propres fixtures et ports temporaires : c'est la recette isolée exécutée pour cette livraison. Ne pas remplacer une installation existante ni lui partager sa base utilisateur.

Retour arrière : arrêter les seuls processus de l'environnement d'essai, conserver toute donnée de test nécessaire, puis sélectionner le commit de base `a4c86e6c` dans cette copie et réinstaller les dépendances correspondantes. Aucun déploiement n'ayant été fait, aucune installation utilisateur n'est à restaurer. Le cache de snapshots en RAM peut être perdu sans migration ; aucune modification de schéma de base utilisateur n'est introduite par ce chantier.

## Mesures locales et état de livraison

Jeu synthétique identique, 500 bougies et 5 ms I/O par source, 100 mesures par mode. Les trois modes vNext récupèrent déjà les sources en parallèle.

| Mode | P50 ms | P95 ms | P99 ms | CPU user + system ms, 100 appels | RSS maximale échantillonnée Mio |
|---|---:|---:|---:|---:|---:|
| Ancien cœur seul, périmètre différent | 0.174 | 0.620 | 1.273 | 42.026 | 63.1 |
| vNext CPU local | 6.591 | 7.306 | 7.431 | 196.817 | 101.9 |
| vNext workers chauds | 7.239 | 8.781 | 9.657 | 373.690 | 119.8 |
| vNext adaptatif | 6.539 | 8.039 | 9.041 | 243.205 | 139.2 |

Démarrage à froid des workers : 94.63 ms. Quatre snapshots simultanés acceptés en 11.63 ms ; sur cinq demandes, quatre acceptées et une rejetée pour surcharge. Source bloquée avec timeout de test 50 ms : P95 50.43 ms. Ce sont des mesures locales sur fixtures, pas des SLA de marché ni de VPS. La RSS des modes successifs inclut des allocations et workers précédents ; ce n'est pas une comparaison de processus frais.

Développé : oui. Testé localement sous Node 22 : oui. Intégré au code source : oui. Build source : procédure et preuve de reconstruction dans `build-verification.json`. Publication : branche dédiée, commit à lire sur Git. Prêt pour tests isolés : oui. Prêt pour trading réel/production : non, dépendances et limites décrites ci-dessus.

### Inventaire des fichiers

Nouveaux : `App/Risk/Snapshots/{math,policy,pool,worker,orchestrator,contracts}.js`, fixtures/tests/benchmark Risk, `Tools/Build/build_risk_snapshot.py`, workflow Risk, documentation, journal et mesures dans `Documentation/Risk/`.

Modifiés : service Risk, registres CP/1 et FunctionRegistry Risk, générateur des contrats, méthodes Supervisor, client Risk du Firewall, propagation des erreurs Router, lecteur de version, métadonnées App et package-lock, test de normalisation historique, README Risk et chapitres wiki Risk/Supervisor, `.gitignore`. Aucun adaptateur d’exchange ni schéma de base utilisateur modifié.
