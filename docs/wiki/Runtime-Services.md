# Services, ports et runtime

## Carte runtime DEBUG 1.12

| Ordre | Service | Type | Port | Redémarrable |
|---:|---|---|---:|---|
| 10 | Core Server | CORE | 8001 | non |
| 15 | Graphical UI | UI | 8000 | oui |
| 20 | Router | CORE | 8021 | non |
| 40 | Indicator Engine | ENGINE | 8012 | oui |
| 50 | Market Data Collector | SERVICE | 8013 | oui |
| 60 | Liquidity Engine | ENGINE | 8014 | oui |
| 70 | Fundamental Engine | ENGINE | 8015 | oui |
| 80 | Trading Engine | ENGINE | 8016 | oui |
| 90 | Firewall | FIREWALL | 8017 | oui |
| 100 | Strategy Engine v2 | ENGINE | 8018 | oui |
| 110 | Risk Manager Engine | ENGINE | 8019 | oui |
| 115 | Portfolio Engine | ENGINE | 8020 | oui |

Les manifestes sont centralisés dans `Core/ProcessRegistry/manifests`. Le Process Registry donne à l'Admin une source commune pour statut, script, log, variables d'environnement et dépendances.


> **Lecture rapide :** l'essentiel est ci-dessus. Les détails sont disponibles sans quitter la page.

<details>
<summary><b>➕ En savoir plus — détails techniques</b></summary>

## Démarrage

`start.command` orchestre l'environnement local. Le mode DEBUG conserve aussi `start_no_firewall.command` pour le diagnostic et `start_with_kraken.command` pour le chemin historique Kraken.

## Logs

Chaque service possède un log dédié sous `.runtime/logs` ou le dossier UI. Le Wiki Admin décrit les commandes d'exploitation et la génération de rapports.

## Dépendances

Risk et Strategy dépendent explicitement du Router. UI dépend de Core + Router. Les autres relations métier passent par les contrats de communication plutôt que par des imports directs entre Engines.

## Compatibilité

Le build vise Node 16 et conserve une attention particulière au vieux runtime macOS/Firefox. Le graphique natif a été conservé notamment pour éviter une dépendance externe lourde.


</details>
