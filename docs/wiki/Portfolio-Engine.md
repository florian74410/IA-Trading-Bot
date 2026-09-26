# Portfolio Engine

## Rôle

**Portfolio :8020** est la mémoire financière interne : événements d'exécution, balances, positions, historique, statistiques et comptabilité de coûts.

Il produit un `portfolio.snapshot` exploitable par Risk, Strategy et les interfaces.

## CP/1

Commandes principales : `portfolio.health`, `event.record`, `balance.record`, `snapshot`, `positions`, `balances`, `history`, `statistics`, `events`, `sync`, `cost.summary`, `cost.history`.

Après une exécution, Trading Engine normalise l'événement puis demande au Portfolio de l'enregistrer via le Router.

## Wallet

La documentation historique du build décrit la page Portfolio en lecture avec Trust Wallet EIP-1193, ETH + USDC Arbitrum, GMX et Kraken Public. Le principal évite de recompter les positions GMX dans le total wallet.

### Règle de sécurité
IA-TB ne doit jamais recevoir la seed ou la clé privée. Une signature nécessaire reste dans le wallet/flux externe de confirmation. Les fonctions de portefeuille internes ne doivent pas devenir un mécanisme de retrait/transfert.

## Coûts IA

Le Portfolio peut lire le **Usage Ledger** : comptabilité append-only des tokens IA. Le ledger ne stocke ni prompts, ni réponses, ni secrets. Une estimation en EUR n'est enregistrée que lorsqu'une table de prix explicite existe.
