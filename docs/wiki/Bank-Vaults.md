# 🏦 IA-TB Bank & Vaults — V2.0 DEBUG

## Pour débuter

**V2.0 introduit une première infrastructure “Banque & Coffres”. Un administrateur peut préparer la configuration d'un Vault destiné à recevoir un actif sur un réseau donné, l'associer à une stratégie et définir son cycle de settlement. Dans le build DEBUG actuel, créer un Vault crée uniquement un brouillon : aucun smart contract n'est déployé et aucun fonds n'est déplacé.**

<small>🔧 Registre : `Bank/Core/vault_registry.js`. UI utilisateur : `/bank`. Créateur ADMIN : `/admin/vaults`.</small>

## Réseaux déclarés

| Réseau | Famille | Actifs déclarés | GMX |
|---|---|---|---|
| Arbitrum | EVM | USDC, USDT, ETH, WBTC | oui |
| Avalanche | EVM | USDC, USDT, AVAX, WBTC | oui |
| Ethereum | EVM | USDC, USDT, ETH, WBTC | non |
| Polygon | EVM | USDC, USDT, POL, WBTC | non |
| Bitcoin | Bitcoin | BTC | non |

## Cycle prévu

```text
Vault on-chain
     │
     ▼
Capital Manager
     │
     ▼
Strategy Wallet
     │
     ▼
Trading Engine
 Risk + Firewall
     │
     ▼
Settlement
     │
     └────────► Vault
```

<details>
<summary><b>➕ En savoir plus — état réellement implémenté</b></summary>

`vault_registry.create()` valide réseau et actif, crée un identifiant aléatoire et enregistre un objet avec `status:'DRAFT'`, `contractAddress:null`, frais, stratégie, settlement et comptabilité.

La page Banque n'active Déposer/Retirer que si `status==='ACTIVE'` **et** qu'une `contractAddress` existe. La page ADMIN indique explicitement que le déploiement on-chain est séparé et nécessite une transaction signée.

</details>

<details>
<summary><b>➕ En savoir plus — politique Strategy Wallet</b></summary>

Le registre encode la politique :
- Strategy Wallet : `EPHEMERAL` ;
- exposition de clé privée : `ADMIN_EXPLICIT_ONLY` ;
- destruction seulement après récupération des fonds ;
- rotation à la fin de la stratégie.

La page ADMIN affiche également « clé privée : jamais exposée au Supervisor ». Ce Wiki décrit cette politique telle qu'elle est encodée ; il ne présente pas encore le cycle complet de création/destruction de wallet comme déployé on-chain.

</details>

<details>
<summary><b>➕ En savoir plus — settlement et comptabilité</b></summary>

Le settlement est prévu toutes les 24 h, avec heure UTC et fenêtre configurables. La fenêtre est bornée entre 15 et 180 minutes.

Le modèle comptable déclaré est `SHARES`, avec champs NAV, totalShares, availableLiquidity et allocatedCapital. Dans un nouveau Vault DRAFT, ces valeurs sont initialement nulles.

</details>
