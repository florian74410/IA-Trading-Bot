# 🗺️ ROADMAP — IA Trading Bot

Cette feuille de route est la référence officielle du développement du projet.

## Règles de suivi

- La dernière version validée et stabilisée est considérée comme figée.
- La version suivante est préparée ici avant le début de son développement.
- `[ ]` = fonctionnalité prévue / non terminée.
- `[x]` = fonctionnalité conçue, intégrée et suffisamment vérifiée.
- Une fonctionnalité n'est pas cochée uniquement parce que du code existe.
- Une version ne devient **STABLE** qu'après validation de ses fonctions, tests, documentation et packaging.
- `ROADMAP.md` décrit le travail prévu ou en cours ; `CHANGELOG.md` décrit le travail réellement livré.

---

## ✅ Dernière version stabilisée

### v1.7.8 — STABLE

Principales évolutions clôturées :

- [x] Architecture Market Data multi-provider.
- [x] Nouveau type de provider `SOCKET`.
- [x] Hyperliquid comme premier provider `SOCKET`.
- [x] OHLCV historique Hyperliquid.
- [x] Flux WebSocket temps réel Hyperliquid.
- [x] Trades et carnet `l2Book` Hyperliquid.
- [x] Provenance des données et volumes conservée.
- [x] Cache Market Data borné et séparé par provider / symbole / timeframe.
- [x] Diagnostics et gestion des providers Market Data.
- [x] Dépendance WebSocket `ws` intégrée au runtime.
- [x] Documentation/Wiki mise à jour.
- [x] Build complet v1.7.8 généré et archivé.

---

# 🚧 v1.7.9 — EN DÉVELOPPEMENT

**Progression fonctionnelle validée : 0 / 3**

## Flux de données prévus

- [ ] **CoinGecko — API** — intégration technique terminée, validation machine cible restante
  - [x] Socle du provider `COINGECKO` programmé.
  - [x] Enregistrement dans le registre multi-provider programmé.
  - [x] Provenance CoinGecko explicite et séparation des données CEX/DEX natives.
  - [x] Aucun volume d'exchange artificiel : volume indisponible déclaré explicitement.
  - [x] État interne : dernière réussite, dernière erreur et état d'authentification.
  - [x] Configuration complète depuis `Settings > API` avec stockage de la clé dans le coffre RSA existant.
  - [x] Transmission de la clé à Market Data uniquement en mémoire via canal interne authentifié.
  - [x] Tests automatiques du provider, de la provenance, du volume et du pont de sécurité ajoutés.
  - [ ] Tests d'intégration et validation sur la machine cible.
  - [ ] Validation fonctionnelle finale CoinGecko avant passage de la fonction principale à `[x]`.

- [ ] **Blockchain.com — API**
  - Intégration comme source de données complémentaire.
  - Normalisation et provenance explicite des données.
  - État, fraîcheur et erreurs visibles.

- [ ] **DefiLlama — API**
  - Intégration comme source de données complémentaire DeFi.
  - Normalisation et provenance explicite des données.
  - État, fraîcheur et erreurs visibles.

> Ces sources API complètent les données de l'application. Elles ne doivent pas remplacer silencieusement les chandeliers ou volumes natifs des CEX/DEX.

## Validation v1.7.9

- [ ] Intégration fonctionnelle des éléments prévus.
- [ ] Tests automatiques réussis.
- [ ] Tests de fonctionnement sur la machine cible.
- [ ] Vérification consommation mémoire / stabilité.
- [ ] Wiki et documentation mis à jour.
- [ ] `CHANGELOG.md` mis à jour.
- [ ] `VERSION` mis à jour.
- [ ] Patch `.zip` directement compatible UpdateManager publié dans `updates/`.
- [ ] Build complet publié dans `builds/v1.7.9/`.
- [ ] Archive complète publiée dans `archives/`.
- [ ] Vérification finale puis déclaration **v1.7.9 STABLE**.

---

## 📌 Convention de reprise du développement

Au début d'une session de développement :

1. Lire `ROADMAP.md` depuis GitHub.
2. Identifier la dernière version **STABLE**.
3. Reprendre la première tâche non cochée de la version en cours.
4. Après intégration et vérification, passer la tâche de `[ ]` à `[x]`.
5. Reporter les changements réellement livrés dans `CHANGELOG.md`.
6. Ne clôturer la version qu'une fois toute la section de validation terminée.

Ainsi, GitHub reste la source de vérité permettant de reprendre le développement sans perdre l'état d'avancement du projet.
