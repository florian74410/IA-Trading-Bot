# IA-TB Firewall Service v1.8.1

Architecture officielle : **1 processus / 1 port (8017) / 3 threads**.

- Thread 0 — Router Firewall : routage interne du service, toujours actif tant que le service tourne.
- Thread 1 — Trading Engine Protection : règles + whitelist dans `Trading_Engine_security/`.
- Thread 2 — Market Data Collector Protection : règles + whitelist dans `Market_Data_Collector_security/`.

Lorsqu'un nouveau thread de protection est ajouté, créer `Core/Firewall/<Nom_Engine>_security/` avec au minimum `rules.json` et `whitelist.json`. Les règles déterminent les contrôles exécutés; la whitelist détermine les commandes, paires, providers ou types explicitement autorisés selon le moteur protégé.

Tous les événements des trois threads sont centralisés dans `Core/Firewall/Firewall.log`.
