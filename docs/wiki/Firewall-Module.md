# Firewall IA-TB

## Architecture v1.12

Un seul coordinateur écoute sur **8017** et pilote deux Workers optionnels :

| Thread | Fonction |
|---:|---|
| 0 | Firewall Coordinator / proxy |
| 1 | Trading Protection |
| 2 | Market Data Protection |


> **Lecture rapide :** la section ci-dessus donne l'essentiel. Ouvrez le bloc suivant pour le fonctionnement détaillé.

<details>
<summary><b>➕ En savoir plus — fonctionnement technique</b></summary>

## Trading Protection

Le Router adresse la cible Trading au port **8017**, pas directement à 8016. Le Firewall vérifie l'enveloppe CP/1, la signature/timestamp et les règles Trading, puis ajoute une preuve interne de forwarding avant d'appeler Trading Engine :8016.

Trading Engine conserve ses propres contrôles : même en bypass Firewall, CP/1 et les exigences de la commande restent applicables.

## Market Data Protection

Le coordinateur peut proxyfier les réponses Market Data et les soumettre au Worker Data. Les règles effectives incluent saut de prix maximum, bid/ask positifs/non inversés et spread maximum. Les décisions sont journalisées.

## Mode diagnostic sans protection

`IATB_FIREWALL_ENABLED=0` ou `start_no_firewall.command` garde le coordinateur 8017 comme **pass-through** mais n'initialise aucun Worker. La topologie reste identique, ce qui permet de comparer avec/sans inspection sans recâbler Router/Trading.

Ce mode est destiné au diagnostic, pas à la production.

## Administration

ADMIN peut voir les threads, événements et configurations, activer/désactiver des règles, recharger ou redémarrer les Workers. Les règles critiques demandent une confirmation explicite. Les modifications sont hot-reloadées.

Logs : `.runtime/logs/firewall.log`.


</details>
