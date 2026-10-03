# IA-TB v1.11.4 — Data Pipeline Repair

Chaîne canonique du graphique IA Trading Viewer :

`Frontend IA Trading -> UI Gateway :8000 -> Router :8021 -> Firewall Data Thread :8017 -> Market Data Collector :8013 -> Provider GMX/Kraken`

Le navigateur ne contacte jamais directement GMX ou Kraken pour les bougies du graphique.
Le sélecteur d'exchange ajoute `exchange=GMX|KRAKEN` à la requête du contrat UI Market Data.
Le Market Data Collector sépare cache et contextes par `source|symbol|timeframe`.

Le Firewall Data valide provenance, type, symbole, timestamps et cohérence OHLC. Un snapshot identique au précédent est un état de marché valide : il est signalé en WARN `DUPLICATE_DATA`, mais il n'est plus rejeté. Les données absurdes ou invalides restent rejetées en mode PROTECTION.
