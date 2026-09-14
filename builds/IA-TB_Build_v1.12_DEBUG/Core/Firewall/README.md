# IA-TB Firewall

Architecture v1.12 : **1 coordinateur / 1 port (8017) / 2 Workers de protection optionnels**.

- Thread 0 — Firewall Coordinator : orchestration HTTP, proxy interne et cycle de vie des Workers.
- Thread 1 — Trading Protection : `Protection/trading_firewall.js`, configuration `Config/Trading/`.
- Thread 2 — Market Data Protection : `Protection/market_data_firewall.js`, configuration `Config/MarketData/`.

## Mode normal

Par défaut, les deux Workers de protection sont initialisés. Le coordinateur vérifie les commandes Trading et les données Market Data avant transmission.

## Mode test sans pare-feu

Lancer `./start_no_firewall.command` ou démarrer avec `IATB_FIREWALL_ENABLED=0 ./start.command`.

Dans ce mode, **aucun Worker de protection n'est initialisé**. Le coordinateur 8017 reste uniquement comme pass-through afin de conserver exactement la même topologie réseau et de pouvoir comparer le comportement de l'application avec et sans protections sans modifier Router, CP/1 ou Trading Engine.

Le Trading Engine conserve ses contrôles propres, notamment CP/1 et `risk_approval_id`; seules les inspections Firewall sont bypassées.

Ce mode est destiné au diagnostic et au développement. Le mode normal/prod doit garder les protections actives.

## Protections Market Data

Les règles `priceJump`, `bidAsk` et `spread` sont maintenant effectives :
- saut de prix maximum par provider/symbol ;
- bid/ask positifs et non inversés ;
- spread maximum configurable.

Les événements restent centralisés dans `Core/Firewall/Firewall.log`.
