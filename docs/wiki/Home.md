# IA-TB — Wiki

Bienvenue dans la documentation officielle de **IA-TB / IA-Trading-Bot**.

IA-TB est une application modulaire de trading crypto réunissant notamment des connecteurs CEX/DEX, un moteur Market Data, un Chart Viewer, un Indicator Engine, une architecture de routage centralisée, une configuration centralisée des API et un système de mise à jour versionné.

## Vue d’ensemble de l’architecture

<p align="center">
  <a href="Architecture.md">
    <img src="../assets/architecture-overview.png" alt="IA-TB — Schéma de communication entre modules" width="100%" />
  </a>
</p>

<p align="center">
  <sub>Schéma officiel IA-TB — <a href="Architecture.md">documentation d’architecture</a> · <a href="../assets/architecture-overview.png">PNG</a> · <a href="../assets/architecture-overview.svg">SVG</a></sub>
</p>

## Commencer

- [Installation et démarrage](Installation.md)
- [Architecture](Architecture.md)
- [Connecteurs CEX / DEX](Connectors-CEX-DEX.md)
- [Settings / API](Settings-API.md)

## Données et analyse

- [Market Data](Market-Data.md)
- [Chart Viewer](Chart-Viewer.md)
- [Indicator Engine](Indicator-Engine.md)
- [Liquidity Engine](Liquidity-Engine.md)

## Exploitation et maintenance

- [Administration — Manuel d'exploitation](Administration.md) — documentation opérateur/admin du dépôt privé, commandes serveur locales et futur VPS, logs, services, diagnostics, Trading Engine, providers, sauvegardes, sécurité et procédures d'urgence.
- [Update Manager](Update-Manager.md)
- [Versionnage et releases](Versioning-and-Releases.md)
- [Sécurité](Security.md)
- [Dépannage](Troubleshooting.md)
- [Changelog fonctionnel](Changelog.md)
- [Roadmap](Roadmap.md)

## Règle documentaire

Le Wiki décrit les fonctions réellement publiées ou explicitement planifiées. Toute release doit faire l'objet d'une analyse d'impact documentaire.

Chaque ajout d'un CEX ou DEX doit documenter au minimum : marchés/paires, OHLC/OHLCV, volumes propres à la plateforme, intégration Market Data, Chart Viewer, paramètres requis dans `Settings > API`, authentification et limitations connues.

La provenance des données doit toujours rester identifiable : une donnée Binance, Coinbase, OKX ou GMX ne doit jamais être mélangée silencieusement avec celle d'une autre plateforme.

Toute nouvelle composante serveur ou commande d'administration doit également mettre à jour le [Manuel d'exploitation Admin](Administration.md). Aucun secret ou credential ne doit être enregistré dans le Wiki.
