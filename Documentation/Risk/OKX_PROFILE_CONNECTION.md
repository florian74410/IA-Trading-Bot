# Raccordement OKX du profil — complément 2.6.0-dev.3 DEBUG

## Livraison

Intégré **à la même version et à la même branche** `feature/risk-engine-parallel-snapshots`, à partir du commit `780346300c699b33bd74a2ad3479269600a68a1d`. Le numéro reste `2.6.0-dev.3`, conformément à la demande. Le raccordement utilise le compte de trading OKX CEX, pas le wallet Web3 ni le solde Funding transférable. Aucune installation existante, clé utilisateur ou fonds réel n'a été consulté ou modifié pendant le développement.

## Clé du profil et parcours

La clé, le secret et la passphrase déjà affectés au compte OKX dans **Paramètres → Trading** sont lus dans le coffre chiffré du profil Auth21 connecté (`TradingVault`, références `TRADE_*`). Ils ne sont jamais demandés dans un message, recopiés dans une variable d'environnement ni transmis au Portfolio/Risk/navigateur.

Parcours de lecture :

1. Le navigateur connecté demande `portfolio.account.snapshot` au bridge Core existant, avec son cookie de session et CSRF. Un ADMIN ou USER peut lire son propre compte ; un GUEST ne le peut pas.
2. Core résout l'affectation du compte dans le profil, émet un ticket `read` lié au compte, au marché SPOT, au symbole, à la session et à la révision de l'affectation. Il signe le message `portfolio.user.request` avec la délégation de lecture.
3. Portfolio vérifie la preuve et sa validité auprès de Core, puis appelle `trading.account.snapshot` **via Router/CP1 → Firewall → Trading**. Il ne connaît aucune clé OKX.
4. Trading réclame le compte et ses identifiants au coffre Core sur le canal HTTPS signé existant. Le ticket expire après 30 s, n'est réclamable qu'une fois et ne permet qu'une libération des identifiants.
5. L'adaptateur OKX signe des requêtes GET et normalise les réponses. Il revalide session/affectation avant et après les échanges ; une révocation ou rotation invalide le résultat. Aucun ordre, annulation, transfert ou retrait n'est exécuté par ce parcours.
6. Portfolio reçoit uniquement les valeurs normalisées, vérifie le propriétaire et l'identifiant de compte, puis fournit un snapshot `portfolio.account/1.0`.
7. Pour `risk.snapshot.create`, Core signe une demande `risk.user.request` et une délégation distincte destinée à Portfolio. Risk utilise ce snapshot propriétaire, les sources publiques de marché et le barème de frais de ce compte. Le cache Risk exige le même propriétaire à la relecture.

Les anciens comptes affectés avec des permissions d'ordres peuvent être lus sans ressaisir leurs identifiants. Un nouveau profil peut avoir **uniquement `read`**. Cela ne crée aucune permission IA ALLOW et ne permet pas d'utiliser le ticket de lecture pour exécuter un ordre.

## API OKX et normalisation

Lectures GET bornées :

| API | Utilisation |
|---|---|
| `/api/v5/account/balance` | Total equity en USD, balances, disponible, bloqué, passifs, timestamps |
| `/api/v5/account/positions` | Positions existantes et contexte de marge, même si les dérivés ne sont pas qualifiés par Risk |
| `/api/v5/trade/orders-pending?limit=100` | Ordres ouverts ; page pleine => refus explicite plutôt qu'inventaire incomplet |
| `/api/v5/account/trade-fee?instType=SPOT&instId=…` | Frais du compte et de l'instrument |
| `/api/v5/public/instruments?instType=SPOT&instId=…` | Instrument live, devise, lot/min/max de quantité et tick |

Les taux sont sélectionnés dans `feeGroup` avec le `groupId` de l'instrument. Le champ plat `taker` déprécié n'est pas utilisé pour remplacer un groupe manquant. Une commission négative OKX devient un coût positif ; une remise n'est pas transformée en coût négatif dans le score. Absence de groupe => frais indisponibles, pas zéro inventé.

Domaines autorisés uniquement : `www.okx.com` (GLOBAL), `eea.okx.com` (Europe/EEE), `us.okx.com` (US). La région est un réglage du compte affecté, pas une URL reçue d'un appelant. Les affectations existantes conservent GLOBAL tant qu'un autre choix n'a pas été enregistré. Les clés EEE nécessitent la région EEA. Le drapeau de démonstration est également conservé dans cette affectation et applique `x-simulated-trading: 1` aux lectures privées. Aucun essai de basculement automatique de domaine avec des identifiants n'est fait.

`totalEq` reste explicitement `equityUSD`. Pour un instrument en USDT, le moteur n'assimile pas USD et USDT : il utilise `eqUsd / eq` de la ligne USDT du compte pour obtenir USD par USDT. `equity` du snapshot est alors exprimé dans la monnaie de cotation. Si cette valorisation n'existe pas, `equity` en cotation est null, `equityUSD` reste disponible et un avertissement explicite est renvoyé. Le disponible et le bloqué sont ceux de cette monnaie ; ils ne sont pas présentés comme le total du compte.

Les actifs spot détenus sont inclus dans les expositions. Les valeurs manquantes, passifs non vérifiés, divergences avec totalEq, positions dérivées ou ordres ouverts empêchent de déclarer le compte réconcilié. La valeur `uTime` d'OKX est conservée ; `observedAt` décrit séparément la réception. Une nouvelle requête ne rajeunit pas artificiellement une donnée périmée.

Les observations de peak equity sont conservées dans les settings Portfolio déjà isolés par propriétaire et compte. `peakObservedSince` indique le début réel de cette observation ; il ne prétend pas couvrir l'histoire antérieure du compte. Le PnL journalier ajusté des dépôts/transferts/retraits reste null faute de rapprochement des flux. Les trades locaux ne sont fournis au Risk que s'ils appartiennent à ce compte ; le PnL déjà net de ce ledger n'est pas refacturé une deuxième fois.

## Interface et commandes

La page Portfolio comporte **Compte OKX du profil** : choix d'un compte OKX SPOT actif, marché, actualisation, total USD, disponible/bloqué en cotation et balances. Les comptes sont chargés depuis l'API Auth21 du profil. Les valeurs sont rendues en texte, sans injecter du HTML fourni par l'exchange. Une erreur efface les valeurs affichées plutôt que de présenter un ancien solde comme actuel.

Dans Paramètres → Trading, la gestion des affectations propose la permission de lecture, la région OKX et le mode démonstration. Laisser les champs d'identifiants vides conserve les identifiants chiffrés existants. L'enregistrement reste soumis à réauthentification/CSRF comme auparavant.

Nouvelles commandes :

- `portfolio.account.snapshot` : contrat OWNER, via `portfolio.user.request` uniquement.
- `trading.account.snapshot` : CP/1, avec ticket de lecture délivré par Core, via Firewall.
- `risk.user.request` : enveloppe propriétaire signée et réautorisée par Core ; pas un outil générique pour agent.

Les trois anciennes commandes `trading.account.balances`, `.positions` et `.orders` utilisent également le bind de compte pour OKX. Les métadonnées du registre sont mises à jour, avec **DENY par défaut** ; les enveloppes OWNER restent hard-deny pour les agents génériques. Aucune clé dans les arguments, réponses publiques ou exemples.

Le Firewall conserve ses protections et ajoute les lectures de compte à sa whitelist d'usine. Les politiques déjà personnalisées hors dépôt ne sont pas écrasées : si elles excluent ces lectures, elles continuent de les refuser. La route Trading ne devient pas enregistrable dynamiquement. Router utilise les ports Firewall/Trading configurés côté serveur pour cette frontière, sans accepter une destination reçue du client.

## Tests et limites

Les tests OKX vérifient les signatures GET indépendamment, la région EEA/démo, le groupe de frais, les unités (fixture volontairement à 2 USD par unité de cotation), zéro disponible, absence de données, stale timestamps, erreurs/rate limits, pagination incomplète, lecture sans remise en service du trading, propriété, révocation, rotation et replay des tickets.

Le test de pipeline utilise de vrais processus Router, Firewall, Portfolio et Risk ; le vrai coffre/bridge Auth21 et client de coffre HTTPS ; le vrai TradingEngine et l'adaptateur OKX. Le dispatch Trading côté test est un serveur CP/1 de fixture autour du vrai moteur et l'API OKX est simulée. Il vérifie l'approvisionnement de Portfolio et de Risk, les refus inter-utilisateurs et le refus de la réinscription dynamique de Trading. Il ne constitue pas une connexion réelle à OKX.

Exécution sous Node 22 :

```bash
cd App
npm ci --omit=dev --no-audit --no-fund
npm run test:okx
npm run test:risk
```

**Validation locale finale : 69 tests réussis, 0 échec, sous Node 22.23.5.** Les vérifications de syntaxe des fichiers JavaScript modifiés et la cohérence de version passent également.

La suite étendue exacte se trouve dans `.github/workflows/risk-snapshots.yml`, les résultats locaux dans `validation-okx.log`. Le build source est régénéré par `python3 Tools/Build/build_risk_snapshot.py` et vérifié par deux reconstructions identiques. Version conservée : 2.6.0-dev.3.

Le raccordement des soldes n'active pas le trading. Risk reste conservateur : PnL journalier ajusté, protections au stop, historique net et modèle de marge peuvent encore manquer. La microstructure publique OKX existante est orientée SWAP : un book sans preuve SPOT est désormais refusé pour la préparation propriétaire SPOT. Le nouveau raccordement ne fait pas passer un carnet SWAP pour un carnet SPOT. Les appels autonomes du Supervisor et le contrôle global de ses permissions restent un chantier distinct ; le chemin propriétaire fourni ici est prêt à être consommé par ce futur raccordement.

Aucun appel réel au compte utilisateur n'a été exécuté depuis l'environnement de développement et aucune clé n'y a été extraite. Pour une vérification réelle, cette branche doit être installée dans l'environnement isolé qui possède déjà le profil et son coffre. Ce travail ne déploie pas cette branche sur le serveur utilisateur.

## Sources officielles consultées le 17 novembre 2026

- [OKX API V5 — compte, authentification, instruments et feeGroup](https://www.okx.com/docs-v5/en/)
- [OKX API FAQ — domaine EEA](https://www.okx.com/en-gb/help/api-faq)

Les réponses réellement disponibles et les champs validés déterminent les résultats ; les modèles manquants ne sont pas présentés comme implémentés.
