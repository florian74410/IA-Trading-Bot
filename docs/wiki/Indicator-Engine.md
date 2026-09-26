# Indicator Engine

## Rôle

**Indicator Engine :8012** transforme des bougies normalisées en valeurs et preuves techniques. Il **ne prend aucune décision de trading**.


> **Lecture rapide :** l'essentiel est ci-dessus. Les détails sont disponibles sans quitter la page.

<details>
<summary><b>➕ En savoir plus — détails techniques</b></summary>

## Catalogue intégré

DEBUG 1.12 contient notamment : ADX, ATR, Bollinger Bands, CCI, EMA, HMA, Ichimoku Cloud, Liquidity HeatMap, MACD, MFI, OBV, Parabolic SAR, ROC, RSI, SMA, Stochastic, Stochastic RSI, Supertrend, VWAP, VWMA et Williams %R.

Les définitions officielles vivent dans `Indicators/BuiltIn/*.indicator.json`. Les créations utilisateur vont dans `Custom`; les définitions rejetées sont isolées dans `Quarantine`.

## IIL et IR

L'**Indicator Interpretation Language (IIL)** est le langage déclaratif public de définition. Il est compilé vers une représentation interne (IR). Il n'expose ni `eval`, ni JavaScript arbitraire, ni shell, réseau ou filesystem.

Les dépendances entre indicateurs sont contrôlées : cycles, dépendances absentes et profondeur >16 sont rejetés. Un batch est limité à 32 demandes et réutilise les bougies normalisées.

## États de données

Le contrat distingue **READY / WARMING / INVALID** afin qu'un consommateur sache si un calcul est exploitable, encore en chauffe ou invalide. Les protections liées au volume se propagent dans les dépendances.

## CP/1

Familles : `indicator.compute`, `compute_batch`, `analyze`, `get_state`, `get_levels`, `get_signals`, catalogue/capabilities, validation/création de définitions et compilation/validation IIL.

Flux : **Market Data → Indicator → Router → Strategy/UI/IA**.


</details>
