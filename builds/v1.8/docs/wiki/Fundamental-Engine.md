# Fundamental Engine

## Rôle

Le Fundamental Engine transforme des informations fondamentales hétérogènes en un résultat normalisé utilisable par le Router.

Flux officiel :

```text
Fundamental Engine <-> Router
```

Le moteur ne passe jamais d'ordre et ne communique jamais directement avec un CEX/DEX pour exécuter un trade.

## Catégories prévues

- News / événements
- Macroéconomie
- Données on-chain
- Tokenomics
- Écosystème / protocole

## Sortie normalisée

Chaque analyse produit :

- `score` de -1 à +1
- `confidence` de 0 à 1
- `bias`
- liste des signaux sources
- diagnostics
- contexte `exchange`, `symbol`, `asset`, `timeframe`

## État v1.7.5

La v1.7.5 pose la fondation architecturale :

- moteur indépendant ;
- contrat Router normalisé ;
- registre de providers ;
- agrégation pondérée ;
- health check ;
- tests déterministes.

Les providers réseau réels (news, macro, on-chain, tokenomics) seront intégrés progressivement après validation de cette base.
