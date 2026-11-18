# Risk Engine — vNext DEBUG

Le runtime conserve les analyses historiques, R1/R2, paramètres et Risk Gate.
La version 2.6.0-dev.3 ajoute les snapshots cohérents et bornés via CP/1 :
`risk.snapshot.create`, `risk.snapshot.get`, `risk.constraints.get`, `risk.status`.

Référence complète : [audit, contrats, formules, scores, parallélisation, tests et limites](../../Documentation/Risk/RISK_ENGINE_VNEXT.md).
Les données absentes donnent UNAVAILABLE. Aucun snapshot n'est un ordre ni une
approbation permanente. Aucun nouveau privilège IA n'est activé par défaut.

Node 22 requis. Depuis App : `npm run test:risk` et `npm run bench:risk`.

Complément de cette même version : [compte OKX du profil → Portfolio → Risk](../../Documentation/Risk/OKX_PROFILE_CONNECTION.md).
