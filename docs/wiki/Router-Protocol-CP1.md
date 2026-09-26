# Router & protocole CP/1

## Router

**Communication Router :8021** est le bus interne. Il charge `ProtocolRegistry`, connaît les endpoints/capacités et transmet une requête validée au composant cible. Il ne transforme pas le sens métier d'une réponse.


> **Lecture rapide :** la section ci-dessus donne l'essentiel. Ouvrez le bloc suivant pour le fonctionnement détaillé.

<details>
<summary><b>➕ En savoir plus — fonctionnement technique</b></summary>

## Enveloppe CP/1

Requête :
```json
{"protocol":"CP/1","request_id":"...","timestamp":0,"target":"indicator","action":"indicator.analyze","detail":"analysis","arguments":{}}
```

Réponse : `protocol`, `request_id`, `engine`, `action`, `status`, `schema`, `generated_at`, `duration_ms`, `data_hash`, `data`, `warnings`.

États : **OK, DEGRADED, PROTECTION, OFFLINE, ERROR**.

## Sécurité

- transport local `127.0.0.1` ;
- token `X-IATB-CP-Token` ;
- HMAC-SHA256 ;
- timestamp avec fenêtre de 30 s ;
- protection anti-rejeu par `request_id` ;
- actions et arguments déclarés dans ProtocolRegistry ;
- pas de shell/path/URL arbitraire transporté comme action.

## Registry et découverte

Chaque composant possède un manifeste `Core/Communication/ProtocolRegistry/<id>.json`. Le Router refuse une action inconnue ou un argument hors contrat. Les services dynamiques peuvent s'enregistrer, mais doivent correspondre à une déclaration.

## Browser ACK

Chart Viewer est un composant `BROWSER_ACK`. Pour une action visuelle, le Router prépare une action à durée limitée ; le navigateur l'exécute puis ACK `SUCCESS/REJECTED/ERROR`. Cela évite de confondre une intention serveur avec une modification effectivement appliquée dans le navigateur.

## IA ↔ IA

Le protocole prévoit deux identités IA : `chat_ai` et `supervisor`. Elles ont des tables de capacités explicites. Dans DEBUG 1.12, leur accès Market Data/Liquidity est **READ_ONLY**. Le Supervisor autonome reste RESERVED ; la communication future se fera donc comme n'importe quel autre composant : **IA → requête CP/1 → Router → Engine → réponse CP/1**, jamais par accès direct aux internals.

Voir [Assistant IA](AI-Companion.md).


</details>
