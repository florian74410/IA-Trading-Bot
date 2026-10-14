# IA-TB — Checklist de Pull Request

## Objectif et compatibilité

- [ ] Décrire la nouvelle fonctionnalité ou le correctif et les effets réels (mémoire, disque, provider, ordres, configuration).
- [ ] Conserver les fonctions existantes et préciser tout risque de régression.
- [ ] Distinguer DEBUG et RELEASE ; **aucun changement de réseau/Contabo ou de Wallet** sans approbation spécifique.
- [ ] Décrire les performances affectées (chemin critique MarketData / Router / Engines, p95/p99).

## Sécurité RBAC — obligatoire à chaque mise à jour

- [ ] J'ai inventorié **toutes** les nouvelles routes HTTP, actions CP/1, fonctionnalités CLI, tâches planifiées, WebSocket, outils IA et événements à effet.
- [ ] Pour chaque action ajoutée/modifiée, j'ai renseigné son identifiant, ses rôles **ADMIN/USER/GUEST ou principal SERVICE**, sa classe de données, sa portée `clientId`, ses effets (dont éventuels coûts fournisseurs), les contrôles côté Core/Router/Engine et ses tests.
- [ ] Les actions et routes nouvelles figurent dans le registre RBAC versionné (ou sont explicitement DENY jusqu'à revue).
- [ ] J'ai vérifié que le changement n'accorde **aucun droit supplémentaire à GUEST** ou USER par reclassification d'une route privilégiée ; toute élévation voulue a une justification, des tests et une revue du propriétaire du dépôt.
- [ ] Toute modification de politique ou du vérificateur RBAC est reliée à la [politique d'intégrité](Documentation/Security/AUTH_DEBUG_2.1_RBAC_POLICY_INTEGRITY.md) et exige un build vérifié ; aucune matrice éditable n'est utilisée comme autorité runtime.
- [ ] J'ai ajouté des **tests négatifs** (GUEST, USER, IDOR autre compte, rôle/clientId falsifié, Core indisponible, accès Router/Engine direct, CSRF si pertinent).
- [ ] Aucune opération dite « lecture » ne déclenche une écriture, une collecte ou un coût sans droit approprié.
- [ ] Je n'ai pas introduit de fallback ADMIN/USER, `localBypass`, confiance dans les headers navigateur ou clé CP/1 comme autorité humaine.
- [ ] J'ai incrémenté `permissions_version` si le sens d'une permission a changé et documenté la compatibilité / rollback.
- [ ] Aucune clé maître, session, donnée personnelle brute, donnée wallet ou credential n'est incluse dans le commit/log/test.

**Important :** coche et explication de ces cases ne remplacent **pas** l'application des contrôles dans le runtime. Un nouveau chemin inconnu doit rester interdit tant qu'il n'est pas vérifié. Voir `Documentation/Security/AUTH_DEBUG_2.1_RBAC_CHANGE_POLICY.md`.

## Validation

- [ ] Tests unitaires/intégration exécutés et résultats indiqués (ou blocage décrit).
- [ ] Tests de sécurité exécutés sur fixtures, jamais sur wallets ou clés GEN-1 réels.
- [ ] Pour une mutation SQL / volumes / clés : snapshot cohérent et plan de restauration sur copie validés avant déploiement.
- [ ] Impact CPU, RAM, débit et latence p95/p99 évalué lorsque applicable.
- [ ] Décision de déploiement distincte de la validation documentaire et approuvée par Overflow.

**Résumé des nouvelles actions / de leur classification RBAC :**

<!-- Exemple :
- indicator.personal.create | USER, ADMIN | OWNER_WRITE | clientId depuis session Core | tests deny GUEST et accès autre compte
- ou "Aucune action/route ajoutée", vérifié dans les diffs.
-->

**Commandes de tests et résultats :**

<!-- N'indiquez jamais de secrets, tokens, adresses privées sensibles ni sorties de données clients. -->
