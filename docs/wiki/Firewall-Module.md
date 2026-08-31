# Trading Firewall Module

## Rôle

Le **Trading Firewall** est la couche de sécurité placée sur le canal d'exécution entre le `Trading Engine` et les `Exchanges`. Il ne produit pas de stratégie et ne remplace pas le Risk Engine : il contrôle qu'une commande d'exécution est autorisée avant qu'elle atteigne un connecteur CEX/DEX.

Flux logique :

```text
Trading Engine -> Trading Firewall -> Exchange
                      |
                      +-> autoriser / bloquer / journaliser
```

Le Firewall protège notamment contre les commandes non autorisées, les messages trop anciens, les doublons et l'utilisation d'une paire qui n'a pas été explicitement autorisée.

## Paramétrage

La configuration est regroupée dans `Settings > Trading Firewall`.

### Firewall ON/OFF

- `ON` : les contrôles du Firewall sont actifs.
- `OFF` : le Firewall est désactivé. Ce mode doit rester réservé au diagnostic et au développement.

### Mode

- **Protection** : une commande qui échoue à un contrôle est bloquée.
- **Observation** : les contrôles sont exécutés et les anomalies sont journalisées, sans blocage automatique. Ce mode sert à tester une configuration avant de passer en Protection.

## Security

### Verify CP authentication

Vérifie que le message provient d'un participant authentifié du protocole de communication interne.

### Verify signatures

Vérifie la signature du message lorsqu'une signature est exigée par le canal utilisé. Une signature invalide ou absente doit provoquer un refus en mode Protection.

### Max message age

Définit l'âge maximal accepté d'un message d'exécution. Un message plus ancien est considéré comme périmé afin d'éviter qu'une ancienne instruction soit rejouée après un délai réseau ou un redémarrage.

## Command Whitelist

Le Firewall utilise une liste blanche : seules les commandes explicitement autorisées peuvent franchir la couche d'exécution.

Commandes prévues dans la configuration initiale :

- `trading.execute`
- `trading.cancel`
- `trading.close_position`
- `trading.health`

Toute commande inconnue ou absente de la whitelist est refusée en mode Protection.

## Trading Pair Whitelist

Une seconde whitelist limite les paires sur lesquelles le Trading Engine est autorisé à agir. Exemple de configuration :

- `BTC/EUR`
- `BTC/USDT`
- `ETH/EUR`

La normalisation des symboles doit être effectuée avant le contrôle afin qu'une variante de notation ne contourne pas la règle.

## Duplicate Protection

La protection anti-doublon mémorise temporairement l'identité des commandes déjà traitées.

Configuration initiale :

- `Enabled` : active ou désactive le contrôle.
- `Window` : fenêtre temporelle pendant laquelle une commande identique est considérée comme un doublon ; valeur de référence `30 sec`.

Une commande identifiée comme doublon est bloquée en mode Protection et signalée dans les diagnostics.

## Ordre recommandé des contrôles

1. Firewall activé et mode courant.
2. Authentification CP.
3. Signature du message.
4. Âge du message.
5. Command Whitelist.
6. Trading Pair Whitelist.
7. Duplicate Protection.
8. Transmission au connecteur Exchange uniquement si les contrôles obligatoires sont valides.

## Journalisation et diagnostic

Le Firewall doit rendre observable au minimum : état ON/OFF, mode, dernière commande contrôlée, résultat du contrôle et motif d'un éventuel refus. Les logs ne doivent jamais contenir de clé API, secret, passphrase, token ou clé privée.

## Séparation des responsabilités

Le **Risk Engine** mesure et décrit le risque. Le **Supervisor** prend les décisions de haut niveau. Le **Trading Firewall** applique les règles de sécurité du canal d'exécution. Le **Trading Engine** reste responsable de l'adaptation et de l'envoi des ordres aux Exchanges.
