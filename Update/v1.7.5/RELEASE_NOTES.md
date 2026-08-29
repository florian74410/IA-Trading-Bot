# IA-TB v1.7.5 — Fundamental Engine foundation

Source version: `1.7.4`
Target version: `1.7.5`

## Objectif

Normaliser le Fundamental Engine selon la nouvelle architecture :

`Fundamental Engine <-> Router`

## Ajouts

- Nouveau Fundamental Engine indépendant.
- Contrat de messages Router v1.
- Score fondamental normalisé de -1 à +1.
- Confiance normalisée de 0 à 1.
- Classification bearish / neutral / bullish.
- Registre extensible de providers.
- Catégories prévues : news, macro, on-chain, tokenomics, ecosystem.
- Gestion des erreurs providers sans faire tomber le moteur.
- Health check.
- Self-test Node.js.
- Documentation Wiki.

## Important

Cette version pose la fondation du moteur. Elle ne branche volontairement aucune source réseau externe réelle.
Le but est de stabiliser d'abord l'interface et la responsabilité du moteur avant l'ajout des providers.
