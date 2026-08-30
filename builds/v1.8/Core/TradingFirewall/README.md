# Trading Firewall — v1.8 DEV

Flux protégé : `Supervisor -> Trading Firewall (8017) -> Trading Engine (8016)`.

Fonctions : ON/OFF, Protection/Observation, authentification CP/1, HMAC-SHA256, âge maximal, whitelist commandes/paires, anti-doublon, rapports et logs.

Le Trading Firewall protège la communication et l'exécution mais **n'analyse pas le risque de marché**. En v1.8 il ne fabrique plus de `risk_approval_id` : le Risk Engine est analytique seulement et le Supervisor reste propriétaire de la décision.

La configuration utilisateur est stockée dans `Parametres/TradingFirewall.dat` et n'est pas versionnée.