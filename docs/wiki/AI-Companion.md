# Assistant IA, Companion et communication IA ↔ IA

## Companion v1.12

Le Companion est une UI flottante commune aux pages. Il possède 12 états visuels : HELLO, FUNNY, LAUGH, CONGRATS, MARKET_ANALYSIS, THINKING, IDEA, SUCCESS, ERROR, IDLE, CRYPTO et EXPLAIN.

Il réutilise le pipeline Chat/OpenAI existant et **n'obtient pas de privilèges ADMIN**. Le contexte de page est indicatif et nettoyé avant utilisation.

La saisie texte reste toujours disponible. La voix repose sur Web Speech du navigateur lorsque supporté.


> **Lecture rapide :** la section ci-dessus donne l'essentiel. Ouvrez le bloc suivant pour le fonctionnement détaillé.

<details>
<summary><b>➕ En savoir plus — fonctionnement technique</b></summary>

## Pipeline OpenAI

IA-TB utilise la Responses API pour les demandes complexes et décode une sortie structurée. Le parseur extrait le texte/refus, vérifie le JSON et convertit les actions en commandes déclaratives internes.

Pour le Fundamental, un helper séparé construit un contexte strictement informationnel et marque les publications comme données externes non fiables.

## Local-first

Les commandes simples d'interface doivent rester locales lorsqu'elles n'ont pas besoin d'un modèle. Cela réduit latence et consommation de tokens. L'IA est appelée lorsqu'une interprétation est réellement nécessaire.

## Commandes déclaratives

L'IA ne reçoit pas un shell. Elle propose des actions appartenant à des familles autorisées (chart, mosaïque, stratégie, wallet, settings, update, registry…). Le serveur/navigateur valide avant exécution.

## IA ↔ IA

`ProtocolRegistry/chat_ai.json` et `supervisor.json` définissent les identités IA. Leur accès Market Data/Liquidity est READ_ONLY. Le futur Supervisor produira `supervisor.decision` mais, dans DEBUG 1.12, il reste **RESERVED sans service autonome**.

Le modèle de communication est :

```text
Chat/Companion ou futur Supervisor
              │
       commande autorisée
              ▼
          Router CP/1
              │
       Engine déclaré
              │
              ▼
       réponse structurée
```

Une IA ne « parle » donc pas directement à la mémoire interne d'une autre IA : elle échange des **contrats structurés via Router**, avec permissions et provenance.

## Usage Ledger

Chaque appel IA peut enregistrer modèle, tokens, durée, cache et coût estimé si tarif connu. Aucun prompt/réponse/secret n'est stocké dans ce ledger.


</details>
