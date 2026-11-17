# 2.6.0-dev.3 DEBUG — 17 novembre 2026

- Ajout de modèles de risque explicites, scores provisoires configurables et snapshots cohérents.
- Collecte CP/1 parallèle, calcul adaptatif et pool CPU borné ; cache immuable avec expiration.
- Quatre commandes CP/1 structurées, métadonnées auditées et génération compatible, DENY par défaut.
- Préparation native_scalping et réévaluation avant émission/consommation du Risk approval.
- Corrections des erreurs CP/1 Router, détails invalides des clients Risk Supervisor/Firewall et versions incohérentes.
- Anciennes API et R1/R2 conservés, tests de normalisation devenus obsolètes actualisés.
- Tests mathématiques, intégration réelle Router/Risk, sécurité, concurrence, régression et benchmark reproductible.
- Build source DEBUG déterministe ; aucun déploiement ni activation LIVE.

Les dépendances manquantes et refus opérationnels sont explicités dans RISK_ENGINE_VNEXT.md.

## Complément OKX dans la même version

- Lectures signées du compte OKX à partir du coffre du profil connecté ; régions Global/EEE/US et démonstration.
- Tickets de lecture révocables, liés au compte ; route protégée Router/Firewall/Trading et délégations propriétaires Portfolio/Risk.
- Valorisation USD distincte de la cotation, frais par feeGroup, balances et expositions avec qualité explicite.
- Encart Portfolio en lecture seule et gestion des affectations du profil enrichie sans ressaisie des clés.
- Tests unitaires, coffre chiffré, pipeline HTTPS/CP1 et régression étendue ; aucun déploiement ni trading réel.
- Voir OKX_PROFILE_CONNECTION.md et validation-okx.log.
