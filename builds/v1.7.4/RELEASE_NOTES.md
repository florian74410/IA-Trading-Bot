# IA-TB v1.7.4

Source version: `1.7.3`  
Target version: `1.7.4`

## Ajouts

- Intégration de Coinbase au moteur Market Data.
- Intégration de OKX au moteur Market Data.
- Support OHLC/OHLCV et volumes propres à Coinbase et OKX.
- Coinbase et OKX disponibles comme sources dans le Chart Viewer.
- Propagation de la source sélectionnée vers l'Indicator Engine et le Liquidity Engine.
- Paramètres Coinbase dans `Settings > API`.
- Paramètres OKX dans `Settings > API`.
- Boutons de test de connexion Coinbase et OKX.

## Architecture

Les données de marché restent séparées par CEX/DEX. Le cache et les requêtes conservent la provenance de l'exchange afin d'éviter qu'une série OHLCV ou un volume d'une plateforme soit silencieusement substitué à celui d'une autre.

Les données publiques de marché peuvent fonctionner sans identifiants privés lorsque la plateforme le permet. Les informations privées requises par les connecteurs sont centralisées dans `Settings > API`.

## Validation

Le patch a été vérifié avec l'UpdateManager de la v1.7.3 et déclare explicitement :

- `package_type = UPDATE`
- `from_version = 1.7.3`
- `to_version = 1.7.4`

SHA-256 du build :

`5478062b635e62aad2a3a4445755abf9e530930e24f158b03493cea46a72a608`

Voir `QA.txt` dans ce dossier pour le rapport de validation détaillé.

## Wiki impact

Pages impactées :

- Connecteurs CEX / DEX
- Market Data
- Chart Viewer
- Settings / API
- Versionnage / Releases
