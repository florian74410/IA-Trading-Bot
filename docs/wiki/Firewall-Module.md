# 🔥 Firewall IA-TB — V2.0 DEBUG

## Pour débuter

**Le Firewall est la dernière barrière logicielle avant Trading Engine. Il ne se contente plus de vérifier la forme d'une commande : pour une opération qui modifie réellement le trading, V2.0 exige aussi une approbation Risk valide.**

<small>🔧 Coordinateur :8017 ; Trading Engine réel :8016. Threads : 0 coordinateur, 1 Trading Protection, 2 Market Data Protection.</small>

```text
Router
  │
  ▼
Firewall :8017
  ├─ CP/1 / signature / timestamp
  ├─ whitelist commandes
  ├─ whitelist paires
  ├─ anti-duplicate
  └─► Risk Gate verify + consume
             │
             ▼
       Trading Engine :8016
```

<details>
<summary><b>➕ En savoir plus — approbation Risk</b></summary>

Pour `trading.execute`, `trading.cancel` et `trading.close_position`, le Firewall exige `risk_approval_id`. Il reconstruit l'intention originale depuis `metadata.trade_intent` lorsqu'elle est disponible, puis appelle `risk.gate.verify` via Router CP/1 avec `consume:true`.

L'approbation n'est donc pas un simple texte accepté aveuglément par le Firewall : elle doit encore exister, ne pas être expirée/consommée et correspondre au hash de l'intention.

</details>

<details>
<summary><b>➕ En savoir plus — protections Trading</b></summary>

Le Worker Trading vérifie authentification CP, signature, fenêtre temporelle, commandes autorisées, paires autorisées et doublons. Les empreintes d'ordres permettent de détecter une répétition même lorsque le `request_id` diffère.

Le mode OBSERVATION peut transformer certaines violations de règles en avertissements, mais les contrôles classés sécurité restent bloquants.

</details>
