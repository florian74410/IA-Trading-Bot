# 🛡 Risk Engine & Risk Gate — V2.0 DEBUG

## Pour débuter

**Risk ne sert plus seulement à afficher un niveau de risque. V2.0 lui ajoute un “sas” déterministe, le Risk Gate : avant qu'une intention de trading autonome puisse continuer vers l'exécution, elle doit respecter les règles de risque configurées et recevoir une autorisation temporaire.**

<small>🔧 Service :8019. Le moteur analytique reste séparé du `risk_gate.js`. Le Gate n'exécute jamais d'ordre et n'accepte pas les limites de risque fournies par le TradeIntent.</small>

## Deux fonctions distinctes

**Analyse :** exposition, levier, volatilité, drawdown, VaR, Expected Shortfall, PnL et score de risque.

**Gate :** validation d'une intention d'exécution et émission d'un `risk_approval_id`.

<details>
<summary><b>➕ En savoir plus — contrôles du Risk Gate</b></summary>

Le Gate normalise `cp1.trade-intent/1.0` et contrôle notamment : Risk activé, schéma, source `supervisor.autonomous-trading`, mode PAPER/LIVE_GUARDED, exchange, symbole, BUY/SELL, taille et limite de levier.

Une intention approuvée reçoit un identifiant `rap-...`, un hash SHA-256 et une expiration. Le TTL configuré dans le service est de 30 secondes. L'approbation est stockée en mémoire et peut être consommée une seule fois.

`risk.gate.verify` recalcule le hash de l'intention : si l'ordre a été modifié après approbation, la vérification échoue avec `RISK_APPROVAL_INTENT_MISMATCH`.

</details>

<details>
<summary><b>➕ En savoir plus — commandes CP/1 V2.0</b></summary>

Aux commandes analytiques s'ajoutent :
- `risk.gate.evaluate`
- `risk.gate.verify`

Le ProtocolRegistry déclare aussi le type produit `risk.approval` avec schéma `risk.gate-decision/1.0`.

</details>
