# Architecture

IA-TB suit une architecture modulaire. Depuis la v1.8.12, les communications backend inter-modules sont normalisées autour du **Communication Router + CP/1**. Le but est d'ajouter des Engines, services et CEX/DEX sans créer de dépendances directes entre leurs implémentations internes.

<p align="center">
  <img src="../../assets/architecture-overview.png" alt="IA-TB — Architecture fonctionnelle" width="100%" />
</p>

> Version SVG : [`assets/architecture-overview.svg`](../../assets/architecture-overview.svg)

## Vue logique actuelle

```text
Clients / Supervisor / Strategy / Console Admin
                    |
                    v
             Protocol Registry
                    |
                    v
           Communication Router
      _________|_____|_____|_________
     |         |     |     |         |
 Indicator  Trading Risk Portfolio Market Data
                         |            |
                    Liquidity    Fundamental

Trading Engine <-> Trading Firewall <-> Exchanges
```

Le Router est le hub de communication central. Les échanges métier entre composants actifs passent par lui afin de limiter le couplage, appliquer les contrôles CP/1 et rendre les flux observables.

Voir la spécification détaillée : [Router Protocol / CP/1](Router-Protocol-CP1.md).

## Composants CP/1 actifs — v1.8.12

- **Indicator Engine**
- **Trading Engine**
- **Risk Engine**
- **Portfolio Engine**
- **Market Data** — adapter CP/1 normalisé
- **Liquidity Engine** — adapter CP/1 normalisé
- **Fundamental Engine** — adapter CP/1 normalisé, `INFORMATION_ONLY`

## Exceptions d'architecture

### Trading Firewall

Le **Trading Firewall** est un `SECURITY_BRIDGE` volontaire entre le Trading Engine et les Exchanges. Il n'est pas une cible métier Router directe. Son rôle est de sécuriser le canal d'exécution : authentification CP, signatures, âge du message, whitelist, protection anti-doublon et règles de sécurité associées.

### Strategy Engine

Statut v1.8.12 : **RESERVED**. Le contrat est préparé mais aucun service runtime autonome correspondant n'est présent dans le build. Il ne doit donc pas être présenté comme fonctionnel.

### Supervisor IA

Statut v1.8.12 : **RESERVED**. Le contrat est préparé mais aucun service runtime CP/1 autonome correspondant n'est présent dans le build. Il ne doit donc pas être présenté comme fonctionnel.

## Contrat de communication

Une requête CP/1 normalisée transporte notamment : `protocol`, `request_id`, `timestamp`, `target`, `action`, `detail`, `arguments`.

Une réponse CP/1 normalisée transporte notamment : `protocol`, `request_id`, `engine`, `action`, `status`, `schema`, `generated_at`, `duration_ms`, `data_hash`, `data`, `warnings`.

Les sources de vérité de la v1.8.12 sont :

- `Core/Communication/router_protocol_spec_v1.8.12.json` — source machine-readable ;
- `Docs/Architecture/ROUTER_PROTOCOL_SPEC_v1.8.12.md` — documentation humaine du build.

## Séparation des responsabilités

- **Supervisor** : orchestration et décision de haut niveau lorsqu'un runtime autonome sera intégré.
- **Strategy Engine** : production de stratégies/signaux lorsqu'un runtime autonome sera intégré.
- **Risk Engine** : mesure et représentation analytique du risque ; il ne décide pas directement l'exécution.
- **Trading Engine** : préparation/adaptation et exécution technique des ordres autorisés.
- **Trading Firewall** : contrôle de sécurité du canal d'exécution.
- **Market Data** : acquisition et normalisation des données de marché.
- **Liquidity Engine** : analyse de liquidité et informations temps réel associées.
- **Fundamental Engine** : informations et contexte uniquement (`INFORMATION_ONLY`).
- **Portfolio Engine** : positions, événements, historique, PnL et états Portfolio.
- **Indicator Engine** : calcul des indicateurs techniques.
- **Exchange connector** : communication avec l'API CEX/DEX concernée.

## Principes obligatoires

### Aucun Engine-to-Engine direct

Un Engine ne doit pas dépendre directement de l'implémentation interne d'un autre Engine. Les échanges passent par le Router et les contrats CP/1 déclarés.

### Registre et whitelist

Les capacités exposées doivent être déclarées dans les registres correspondants. Une commande absente ou non autorisée ne doit pas être simulée comme réussie.

### Sécurité CP/1

Le protocole normalisé conserve : localhost, token CP partagé, HMAC-SHA256, whitelist Registry et protection anti-replay Router. Aucun shell, chemin système ou URL arbitraire ne doit être exposé par le protocole.

### Faible couplage et machine cible

L'application doit rester légère pour la machine cible : cache maîtrisé, mémoire limitée, traitement à la demande et flux temps réel raisonnables plutôt qu'un chargement historique massif au démarrage.

## QA v1.8.12

La normalisation Router v1.8.12, le protocole CP/1, le Debug Framework v1.8.11 et les Common Tools CP/1 v1.8.9 sont annoncés **OK** dans le handoff technique. Le VERSION-GUARD est **OK 1.8.12** et 30 fichiers visuels ont été contrôlés sans modification.
