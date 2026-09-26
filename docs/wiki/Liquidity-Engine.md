# Liquidity Engine

## Rôle

**Liquidity Engine :8014** analyse la structure de liquidité. Il ne possède pas les credentials broker et ne tient pas l'état du portefeuille.

Il consomme les données nécessaires via la couche Market Data/Financial Data et produit un contrat `iatb.liquidity/2.0`.

## Capacités

- zones de liquidité ;
- snapshot temps réel ;
- order book / profondeur lorsque la source le permet ;
- open interest ;
- liquidations et fenêtre temporelle ;
- données DeFi/liquidité normalisées.

## CP/1

`liquidity.health`, `capabilities`, `zones`, `realtime`, `snapshot`, `liquidations`.

Une requête realtime/snapshot choisit un symbole et peut préciser source, profondeur et fenêtre de liquidations. Les sorties gardent leur provenance.

## Frontière

Liquidity **analyse** ; Market Data **collecte/normalise** ; Strategy **interprète dans une stratégie** ; Trading **exécute**. Cette séparation empêche un module d'analyse de devenir implicitement un broker.
