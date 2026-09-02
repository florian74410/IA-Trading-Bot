# Roadmap

La source officielle de suivi reste `ROADMAP.md` à la racine du dépôt. Cette page Wiki en présente la lecture fonctionnelle et doit rester cohérente avec l'état réel des builds, des handoffs et de la QA.

## Etat courant documenté

### v1.8.11 — Unified Admin Console / Debug Control Framework v1

Travail intégré et documenté :

- Console Générale Admin unique ;
- Debug intégré à la Console Admin ;
- commandes Debug déclarées par registre ;
- logs, Common Tools et CP/1 réutilisés ;
- aucune exposition de shell libre ;
- actions sensibles soumises aux niveaux de risque et confirmations ;
- audit via `logs.dat`.

### v1.8.12 — Router Protocol Normalization

Travail backend annoncé **OK** par le handoff technique :

- [x] normalisation des communications via Communication Router + CP/1 ;
- [x] Indicator Engine actif CP/1 ;
- [x] Trading Engine actif CP/1 ;
- [x] Risk Engine actif CP/1 ;
- [x] Portfolio Engine actif CP/1 ;
- [x] Market Data adapté à CP/1 ;
- [x] Liquidity Engine adapté à CP/1 ;
- [x] Fundamental Engine adapté à CP/1 en `INFORMATION_ONLY` ;
- [x] Trading Firewall identifié comme `SECURITY_BRIDGE` ;
- [x] Strategy Engine marqué `RESERVED` — runtime autonome à développer ;
- [x] Supervisor IA marqué `RESERVED` — runtime CP/1 autonome à développer ;
- [x] contrat Request/Response CP/1 normalisé ;
- [x] HMAC-SHA256, whitelist Registry et anti-replay Router conservés ;
- [x] aucun shell/path/URL arbitraire ;
- [x] nouvelles commandes Market Data documentées ;
- [x] nouvelles commandes Liquidity documentées ;
- [x] nouvelles commandes Fundamental documentées ;
- [x] VERSION-GUARD annoncé OK 1.8.12 ;
- [x] 30 fichiers visuels contrôlés sans modification.

Voir [Router Protocol / CP/1](Router-Protocol-CP1.md).

## Prochaines dépendances d'architecture

Les statuts suivants doivent rester explicites jusqu'à développement réel :

- **Strategy Engine** : contrat préparé / runtime à développer ;
- **Supervisor IA** : contrat préparé / runtime à développer.

Leur apparition dans un registre ou une spécification ne suffit pas à les déclarer fonctionnels.

## Priorité de gestion

Avant d'augmenter le nombre de modules, les prochaines évolutions doivent préserver :

1. un contrat CP/1 unique et versionné ;
2. zéro dépendance Engine-to-Engine directe ;
3. un Registry cohérent avec les capacités runtime ;
4. un Wiki aligné sur les sources machine-readable ;
5. des tests Router/CP1 et VERSION-GUARD à chaque évolution ;
6. l'absence de modification visuelle lorsqu'un chantier est déclaré backend-only ;
7. la distinction stricte entre `ACTIVE`, `SECURITY_BRIDGE`, `RESERVED` et fonctions futures.

## Règle de clôture

Une fonctionnalité n'est pas considérée validée parce que son code ou sa documentation existe. Elle devient livrée lorsque son intégration, ses tests, sa documentation et son packaging requis sont cohérents. Une version ne devient **STABLE** qu'après validation explicite selon le protocole de release du projet.

## Passage v2.x

Le passage de `v1.x` à `v2.x` reste réservé à la phase suivant la période de test/développement et la stabilisation locale.
