# IA-TB DEBUG 2.1 — Authentication & User Security

**Statut :** Modèle A validé — conception en cours ; aucun déploiement réalisé.  
**Dépôt cible :** `IA-Trading-Bot` — branche de conception `feature/debug-2.1-auth-design`, future intégration dans DEBUG 2.1.  
**CLI compagnon :** `IA-TB-CLI` (commande `iatb` sur Macro).  
**Objectif :** Authentification multiutilisateur native, isolation des données et privilèges, administration des comptes en SSH/CLI, puis ouverture réseau après validation de sécurité.  
**Règle de suivi :** une case est cochée `[x]` uniquement après réalisation, tests et confirmation du retour attendu ; un commit ne suffit pas à valider un développement. Cette fiche est la checklist de référence.
**Contrainte transverse dès P1.4 :** sécurité *ET* performance : isoler Argon2id et handshakes des chemins rapides, viser une régression p95 ≤ +5 % et p99 ≤ +10 % sur mesures comparables ; aucun affaiblissement Auth/ownership pour atteindre les seuils. Voir [plan de benchmark](../Security/AUTH_DEBUG_2.1_SECURITY_PERFORMANCE.md). Ces seuils sont des objectifs provisoires, pas des résultats mesurés.

---

### PHASE 1 — Architecture et contrat de sécurité

- [x] Valider le **modèle A**, les trois rôles ADMIN / USER / GUEST et la séparation DEBUG / RELEASE (décisions de conception confirmées).
- [x] Inspecter les composants existants de DEBUG 2.0 : Clients/SQLite, Core, ancien login, UI Gateway, permissions et association wallet/clientId (revue initiale Git).
- [x] **P1.3 — Inventorier les voies HTTP/WebSocket/CP1 et accès directs possibles.** Routes et canaux documentés, rapport GEN-1 confronté aux sources ; les contrôles complets d'exposition réseau restent à faire au jalon P1.4 / Phase 7. Voir `Documentation/Security/AUTH_ENDPOINT_AUDIT_v1.md §7`.
- [x] **P1.4 — Définir les frontières de confiance** navigateur → Gateway → Core → Router/Engines, la provenance des identités et les protections fail-closed ; inclure la revue des namespaces, adresses d'écoute, ports publiés, relais et configurations réseau avant exposition.
  - **Validation du 14/10/2026 :** frontières réseau vérifiées, 13 conteneurs sans ports publiés, écouteurs internes 127.0.0.1 ; exigences de sécurité et latence conservées. Les tests du nouveau système Auth et le pare-feu externe restent à vérifier avant ouverture. Contrat détaillé [`AUTH_DEBUG_2.1_TRUST_BOUNDARIES.md`](AUTH_DEBUG_2.1_TRUST_BOUNDARIES.md) et plan de latence [`AUTH_DEBUG_2.1_SECURITY_PERFORMANCE.md`](../Security/AUTH_DEBUG_2.1_SECURITY_PERFORMANCE.md) rédigés. **À valider :** revue du contrat, relevé réseau en lecture seule et tests de sécurité/benchmarks dans les phases d'implémentation. Ne pas cocher avant validation.
- [ ] Confirmer SQLite et les chemins persistants/montages Docker, les accès OS et le mécanisme de sauvegarde/restauration.
- [ ] Définir les versions distinctes `auth_schema_version`, `auth_protocol_version`, `permissions_version` et leurs règles de compatibilité/rollback.
- [ ] Établir la matrice RBAC détaillée (ADMIN, USER, GUEST), les règles de propriété par `clientId` et les tests négatifs associés.
- [ ] Définir l'export/import **volontaire**, chiffré et versionné des comptes DEBUG ↔ RELEASE, sans sessions ni promotion implicite d'ADMIN.
- [ ] Formaliser le périmètre wallets : **pas de gestion de clés ni d'opérations réelles dans ce chantier** ; conserver les données et clés existantes sans altération.

**Validation :** contrat d'architecture, inventaire des routes, modèle SQLite et matrice de permissions relus ; aucun changement de données/ports sur GEN-1.

### PHASE 2 — Stockage et comptes utilisateurs

- [ ] Vérifier l'état réel des comptes, wallets et clés avant opération ; préparer une sauvegarde SQLite cohérente (y compris WAL) et des clés, puis tester sa restauration.
- [ ] Définir et tester les migrations SQLite transactionnelles, sans supprimer les données métier, associations client/wallet ou clés.
- [ ] Intégrer **Argon2id** avec dépendance compatible Node 22 et paramètres calibrés pour GEN-1.
- [ ] Conserver provisoirement la vérification des anciens hash PBKDF2 pour une migration contrôlée vers Argon2id ; aucune réinitialisation automatique des identités.
- [ ] Mettre en place les tables/champs de sessions, révocations, audit et préférences personnelles isolées par `clientId`.
- [ ] Empêcher la création silencieuse d'une nouvelle clé maître lorsque l'ancienne est manquante ou illisible en présence de données existantes.
- [ ] Préparer la réinitialisation **des seuls anciens comptes de connexion DEBUG**, avec sauvegarde et autorisation explicite, sans perdre les données/wallets liés.
- [ ] Garantir la persistance d'un compte ADMIN à travers les mises à jour et interdire la suppression/rétrogradation du dernier ADMIN actif.

**Validation :** migrations et rollback sur copie isolée, contrôles d'intégrité, cohérence des associations et essais de restauration réussis. Aucun effacement réel avant approbation.

### PHASE 3 — Authentification et sécurité serveur

- [ ] Supprimer les bypass de l'ancien système en mode authentifié et neutraliser `/api/setup`, inscription/recovery publiques non prévues en DEBUG 2.1.
- [ ] Implémenter login, logout, lock, unlock avec compte actif, mot de passe valide et sessions créées/révoquées côté serveur.
- [ ] Intégrer cookies opaques `HttpOnly`, `SameSite`, `Secure` sous HTTPS ; expiration absolue, rotation et protections CSRF.
- [ ] Mettre en place un **AutoLock après 5 minutes d'inactivité utilisateur**, sans prolongation par les rafraîchissements automatiques de données.
- [ ] Exiger la **ressaisie du mot de passe** pour déverrouiller ; bloquer les API tant que la session est verrouillée, même si l'écran de verrouillage est contourné.
- [ ] Ajouter limitation des tentatives, délais progressifs, messages d'erreur non révélateurs et journalisation sans mot de passe/token.
- [ ] Révoquer immédiatement les sessions après désactivation, changement de rôle, rotation du mot de passe ou incident de sécurité.
- [ ] Protéger toutes les pages, APIs, canaux Router/Engines et données sensibles côté serveur ; seuls login et ressources publiques explicitement autorisées restent anonymes.
- [ ] Empêcher l'usurpation de `clientId` ou du rôle par cookies forgés, paramètres ou en-têtes HTTP fournis par le navigateur.
- [ ] Tester les refus 401/403 et le comportement fail-closed en cas de panne DB/Auth/Core.

**Validation :** authentification et verrouillage réellement vérifiés côté serveur ; suite de tests de sécurité et de contournement réussie.

### PHASE 4 — Privilèges et isolation métier

- [ ] ADMIN : accès complet aux fonctions applicatives, sans accès SSH/root/Docker par le navigateur.
- [ ] USER : utilisation de l'application et écriture dans **ses propres données**, hors page Admin et fonctions administratives.
- [ ] GUEST : consultation uniquement ; sélection du marché, timeframe et affichage des indicateurs **locaux**, sans écriture serveur ni ordre.
- [ ] Vérifier chaque opération côté Gateway **et Core/Router/Engine**, indépendamment des éléments masqués dans le frontend.
- [ ] Isoler préférences, stratégies, portefeuilles, historiques et références publiques de wallets par `clientId` ; refuser les accès croisés (IDOR).
- [ ] Interdire les effets de bord par requêtes GET, canaux de communication, WebSocket ou fonctionnalités de prévisualisation.
- [ ] Préparer les permissions granulaires pour afficher plus tard certains modules aux ADMIN uniquement.
- [ ] Maintenir le Trading Engine LIVE **désactivé** pour tous les rôles en DEBUG.

**Validation :** matrice ADMIN/USER/GUEST vérifiée sur chaque route/commande sensible ; aucune escalade, modification GUEST ou fuite interutilisateur.

### PHASE 5 — Commandes natives et IA-TB CLI

- [ ] Développer **dans l'application IA-TB** le gestionnaire natif `iatb-users` (service métier commun avec Core).
- [ ] Fournir les commandes `list`, `create`, `role`, `enable`, `disable`, `reset-password`, `delete`, `audit`.
- [ ] Saisir les mots de passe par invite masquée (jamais en argument, sortie, historique shell ni journal) ; confirmations pour suppressions et promotions.
- [ ] Protéger les commandes par permissions Linux minimales et enregistrer les actions administratives sans secrets.
- [ ] Ajouter `iatb users ...` dans le dépôt séparé IA-TB-CLI : réutilisation des mêmes commandes natives sur GEN-1 via SSH, sans dédoubler leur logique.
- [ ] Ajouter diagnostics/erreurs explicites, tests unitaires CLI et tests de bout en bout sur instance isolée.
- [ ] Spécifier `auth export/import/migrate` versionnés et chiffrés comme extensions contrôlées, sans sessions ni clés privées ; ne pas les activer sans tests de migration DEBUG ↔ RELEASE.

**Validation :** une commande native testée sur GEN-1 de test et son équivalent CLI depuis Macro produisent les mêmes effets attendus, avec logs et contrôle GitHub.

### PHASE 6 — Intégration Git DEBUG 2.1

- [ ] Adapter la page de connexion existante au thème IA-TB, **sans bouton d'inscription** ; intégrer verrouillage, déverrouillage et gestion des erreurs.
- [ ] Ajouter les migrations, le service d'authentification, les politiques serveur, les helpers CLI et les tests automatisés.
- [ ] Préparer le build **DEBUG 2.1** dans une branche dédiée, avec versions et manifeste de compatibilité.
- [ ] Exécuter les tests d'authentification, permissions, idempotence des migrations, isolation des données et régression UI/Core/Router/MarketData/Fundamental.
- [ ] Vérifier l'absence de secrets et clés dans les commits ; confirmer que les données DEBUG persistantes ne sont pas packagées dans les images.
- [ ] Documenter la récupération d'accès ADMIN, les procédures de sauvegarde, de retour arrière et les limites du système.
- [ ] Mettre à jour ROADMAP, documentation et changelog ; contrôler le diff, les tests et les résultats GitHub avant fusion.

**Validation :** build DEBUG 2.1 versionné, reproductible, testé et accepté ; **aucune exposition publique** ni remplacement direct du runtime GEN-1.

### PHASE 7 — Déploiement GEN-1 et ouverture réseau contrôlée

- [ ] Confirmer sauvegardes/restauration des bases, clés et volumes, état Docker, ports et configuration DEBUG avant déploiement.
- [ ] Déployer DEBUG 2.1 dans un environnement isolé en préservant les conteneurs existants ; valider la migration et un rollback réel.
- [ ] Réinitialiser les anciens comptes DEBUG uniquement selon l'inventaire et la sauvegarde approuvés.
- [ ] Créer le premier ADMIN via commandes natives appelées depuis IA-TB CLI ; vérifier sa persistance après redémarrage et changement de build.
- [ ] Créer des comptes USER/GUEST de test et valider permissions, AutoLock 5 min, expiration, révocation, accès directs et tests de contournement.
- [ ] Vérifier la non-régression MarketData/Fundamental et la persistance des préférences, stratégies et comptes ; confirmer LIVE désactivé.
- [ ] Tester l'accès **HTTP privé** (localhost/tunnel SSH ou VPN protégé), aucun port d'authentification en clair publié sur Internet.
- [ ] Au jalon d'ouverture Internet, **rediscuter et valider la solution TLS/HTTPS** et la publication réseau ; ne pas diffuser identifiants et sessions en HTTP public.
- [ ] Si ouverture publique autorisée : installer proxy HTTPS et renouvellement automatique, exposer uniquement le Gateway et contrôler Core/Router/Engines/prévisualisations.
- [ ] Vérifier scans de ports, absence de bypass DEBUG, fonctionnement en erreur réseau/Auth et plan de retour arrière ; demander la confirmation finale avant ouverture à tous.

**Validation finale :** comptes persistants, authentification obligatoire, verrouillage effectif, permissions appliquées, données isolées, récupération ADMIN vérifiée et contrôle d'exposition validé. **Ouverture Internet seulement après sécurité transport approuvée.**

---

## ÉVOLUTIONS ULTÉRIEURES — Hors livraison initiale DEBUG 2.1

- [ ] **Gestionnaire TLS dans Admin** : inventaire des certificats, alertes de validité, renouvellement ACME automatique par agent aux privilèges limités, remplacement sûr et rollback.
- [ ] **Wallets après premier déploiement**, puis alignement avec Supervisor : enregistrer des adresses **publiques** par client, en watch-only, sans conserver de clés privées sur le VPS ; étudier connexion via wallet navigateur, WalletConnect ou hardware wallet.
- [ ] **Ordres automatiques Supervisor** : vérifier les capacités réelles du connecteur. Une connexion WalletConnect ou une signature ponctuelle **n'accorde pas** une capacité générale de signature autonome. Étudier ultérieurement délégations explicites et révocables (session keys/smart accounts/contrats autorisés) avec actifs, plafonds, durée, destinataires et risques strictement limités, ou signature manuelle lorsque nécessaire.
- [ ] Préparer la migration volontaire et auditée des anciens wallets sans manipulation automatique de secrets privés.

## Conditions de livraison

**Aucune ouverture publique tant que les conditions suivantes ne sont pas satisfaites :**

- [ ] Authentification opérationnelle **fail-closed**, routes protégées et aucun bypass DEBUG.
- [ ] ADMIN valide créé, testé et récupérable sans intervention Web.
- [ ] AutoLock après 5 minutes et déverrouillage par mot de passe vérifiés.
- [ ] Matrice de privilèges et propriété des données validées, y compris tests négatifs.
- [ ] Sauvegardes, migrations, compatibilité et retour arrière testés.
- [ ] Aucun secret dans Git, les logs ou les commandes ; clés existantes préservées.
- [ ] Trading Engine LIVE désactivé.
- [ ] Accès public avec transport protégé **HTTPS** ; politique des certificats décidée au jalon réseau.
- [ ] Accord final explicite sur la publication réseau.

**Méthodologie obligatoire :** un point à la fois, travaux et tests regroupés côté assistant autant que possible, puis **une commande CLI compacte** sur Macro/GEN-1 uniquement si nécessaire. La commande vise modification, tests, validation, compte rendu et contrôle GitHub ; elle ne doit pas déployer en production ou ouvrir un port sans accord spécifique. L'utilisateur transmet la sortie réelle, le résultat est comparé au résultat attendu, **puis et seulement puis** le point est coché et le suivant démarre. Toute erreur reste `[ ]` avec diagnostic et correctif tracé.
