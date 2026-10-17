Crypto Chart Viewer IA Trader v1.0
=============================

BASE
- Nouveau projet dérivé de l’ancienne base Crypto Trading v3.2.
- Version repartie à v1.0 sous le nouveau nom : Crypto Chart Viewer IA Trader.
- Une seule application locale, deux modules séparés.

LANCEMENT SUR MACBOOK PRO 2011 / HIGH SIERRA
1. Décompresse l'archive dans un dossier normal (Applications ou Documents).
2. Si Node.js n'est pas disponible, double-clique install_node_high_sierra.command.
3. Double-clique start.command.
4. Le navigateur s'ouvre sur http://localhost:8000

PAGES
- / ou /trading : Trading IA (GMX / Arbitrum, PREPARE_ONLY).
- /chart-viewer : Chart Viewer TradingView + Chat IA séparé.

CHART VIEWER
- Commandes simples (paire, timeframe, thème, rechargement) : traitement local, 0 token OpenAI.
- Demandes complexes (analyse, stratégie, Pine Script, plan de trade) : API OpenAI.
- Le widget TradingView est chargé depuis Internet et reste isolé dans son iframe.

API OPENAI
- La clé n'est pas incluse dans cette archive.
- Elle se renseigne depuis l'interface et est stockée dans le coffre local chiffré.

TRADING IA
- Runtime marché : GMX uniquement.
- Réseau : Arbitrum One.
- Les ordres sont préparés localement ; la confirmation/signature finale reste dans GMX / Trust Wallet.

MISES A JOUR FUTURES
- Cette archive complète est la base v1.0.
- Les prochaines évolutions pourront être livrées sous forme de patchs v1.1, v1.2, etc.
- Nom d'archive de patch attendu : Crypto Chart Viewer IA Trader.zip

PORTS
- Interface publique locale : localhost:8000
- Port superviseur interne : 127.0.0.1:3000
