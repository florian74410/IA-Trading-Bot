# IA-TB — Wiki

Bienvenue dans la documentation officielle de **IA-TB / IA-Trading-Bot**.

IA-TB est une application modulaire de trading crypto réunissant notamment des connecteurs CEX/DEX, un moteur Market Data, un Chart Viewer, des Engines spécialisés, une architecture de routage centralisée, une configuration centralisée des API et un système de mise à jour versionné.

## Vue d’ensemble de l’architecture

<p align="center">
  <a href="Architecture.md">
    <img src="../../assets/architecture-overview.png" alt="IA-TB — Schéma de communication entre modules" width="100%" />
  </a>
</p>

<p align="center">
  <sub>Schéma officiel IA-TB — <a href="Architecture.md">documentation d’architecture</a> · <a href="../../assets/architecture-overview.png">PNG</a> · <a href="../../assets/architecture-overview.svg">SVG</a></sub>
</p>

## Commencer

- [Installation et démarrage](Installation.md)
- [Architecture](Architecture.md)
- [Router Protocol / CP/1](Router-Protocol-CP1.md) — contrat de communication normalisé v1.8.12, composants actifs, bridges et RESERVED.
- [Connecteurs CEX / DEX](Connectors-CEX-DEX.md)
- [Settings / API](Settings-API.md)

## Données, analyse et risque

- [Market Data](Market-Data.md)
- [Chart Viewer](Chart-Viewer.md)
- [Indicator Engine](Indicator-Engine.md)
- [Liquidity Engine](Liquidity-Engine.md)
- [Risk Engine](Risk-Engine.md) — calcul et représentation analytique du risque.

## Sécurité de l'exécution

- [Trading Firewall Module](Firewall-Module.md) — `SECURITY_BRIDGE` du canal d'exécution, modes Protection/Observation, whitelists, authentification, signatures, âge des messages et protection anti-doublon.
- [Sécurité](Security.md) — secrets, moindre privilège, logs et règles du dépôt.

## Exploitation et maintenance

- [Administration — Manuel d'exploitation](Administration.md) — Console Générale Admin, Debug Framework, CP/1, logs, services, diagnostics, sécurité et procédures d'urgence.
- [Update Manager](Update-Manager.md)
- [Versionnage et releases](Versioning-and-Releases.md)
- [Dépannage](Troubleshooting.md)
- [Changelog fonctionnel](Changelog.md)
- [Roadmap](Roadmap.md)

## État d'architecture v1.8.12

Actifs CP/1 : Indicator, Trading, Risk, Portfolio, Market Data, Liquidity et Fundamental (`INFORMATION_ONLY`). Trading Firewall est un `SECURITY_BRIDGE`. Strategy Engine et Supervisor IA restent `RESERVED` tant que leur runtime autonome n'est pas intégré et validé.

## Règle documentaire

Le Wiki décrit les fonctions réellement publiées ou explicitement planifiées. Toute release doit faire l'objet d'une analyse d'impact documentaire.

La documentation doit distinguer clairement les composants `ACTIVE`, `SECURITY_BRIDGE`, `RESERVED` et les fonctions simplement prévues. Une spécification ou un registre ne suffit pas à déclarer un runtime fonctionnel.

Chaque ajout d'un CEX ou DEX doit documenter au minimum : marchés/paires, OHLC/OHLCV, volumes propres à la plateforme, intégration Market Data, Chart Viewer, paramètres requis dans `Settings > API`, authentification et limitations connues.

La provenance des données doit toujours rester identifiable : une donnée Binance, Coinbase, OKX ou GMX ne doit jamais être mélangée silencieusement avec celle d'une autre plateforme.

Toute nouvelle composante serveur ou commande d'administration doit également mettre à jour le [Manuel d'exploitation Admin](Administration.md). Aucun secret ou credential ne doit être enregistré dans le Wiki.
