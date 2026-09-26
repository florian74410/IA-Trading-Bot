# ⚡ Trading Engine — V2.0 DEBUG

## Pour débuter

**Trading Engine est l'exécutant, pas le décideur. Il reçoit une commande déjà passée par les couches de contrôle et la traduit pour l'Exchange concerné. Le Supervisor n'appelle jamais directement Binance, OKX, Kraken ou GMX.**

<small>🔧 Engine :8016. Endpoint logique `trading` exposé par ProtocolRegistry via Firewall :8017. LIVE reste désactivé par défaut avec `IATB_TRADING_LIVE=0`.</small>

```text
Supervisor / autre client autorisé
        │
    TradeIntent
        ▼
     Risk Gate
        ▼
      Router
        ▼
 Firewall :8017
        ▼
 Trading :8016
        ▼
 Adapter Exchange
```

<details>
<summary><b>➕ En savoir plus — contrat V2.0</b></summary>

Les commandes sont `trading.health`, `trading.capabilities`, `trading.execute`, `trading.cancel`, `trading.close_position` et `trading.history`.

Les commandes mutantes exigent un `risk_approval_id`. Le Firewall vérifie cette approbation avant de transmettre à :8016. Les adapters présents couvrent Binance, OKX, Kraken et GMX.

</details>

<details>
<summary><b>➕ En savoir plus — état DEBUG</b></summary>

L'existence du pipeline ne signifie pas que le trading autonome LIVE est activé. Les réglages par défaut coupent LIVE, tandis que l'extension AutonomousTrading bloque encore explicitement `LIVE_GUARDED`.

</details>
