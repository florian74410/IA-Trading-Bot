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
