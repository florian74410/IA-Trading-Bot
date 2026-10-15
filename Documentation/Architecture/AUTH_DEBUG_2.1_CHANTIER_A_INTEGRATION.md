# Auth21 — Chantier A : intégration HTTP et RBAC (15 octobre 2026)

**Branche :** `feature/debug-2.1-auth-design`. **État : INTÉGRATION PARTIELLE,
NON CLOTURÉE.** Aucun déploiement GEN-1, connexion exchange, ordre LIVE, accès
Wallet ni migration utilisateur réel.

## Livré et vérifié

Les serveurs réels Gateway, Router, Indicators, MarketData, Fundamental,
Portfolio et Strategy sont raccordés à un chemin opt-in Auth21. L'identité du
navigateur termine son parcours sur Core, qui vérifie la session serveur,
le rôle RBAC et la propriété `clientId` avant d'émettre une preuve HMAC courte
et liée à la méthode, à l'action, à l'Engine cible et au digest exact du corps.
Router ne transmet ni bearer ni cookie ; Engine vérifie indépendamment la preuve,
le rôle, le propriétaire et le rejeu, et rejette le reste des routes legacy.
Les Engines Trading, Risk, Firewall, Liquidity et Supervisor restent verrouillés.

Les actions exercées sur le banc isolé sont :
- ADMIN : `POST indicator/settings`, `POST marketdata/settings`,
  `POST fundamental/feed` ;
- USER et ADMIN sur ses propres données : `POST portfolio/preference`,
  `POST strategy/preference` ;
- GUEST (également USER/ADMIN) : `GET marketdata/metadata`, lecture de
  métadonnées publiques synthétiques uniquement.

**Portée de la persistance :** MarketData écrit sa **véritable configuration
DEBUG isolée** via `market_data_settings.save` avec garde de snapshot ;
Portfolio sauvegarde un paramètre `auth21.preference.<clientId>.<key>`
dans la **vraie base SQLite Portfolio du banc** avec son garde. Indicator
utilise encore son adaptateur d'essai de paramètres ; la création de flux
Fundamental et les préférences Strategy utilisent des enregistrements
synthétiques strictement limités à `runtime/auth21-business`. Il serait faux
de les déclarer raccordés aux magasins métier normaux.

Tests nouveaux dans `App/Tools/Tests` :
- `auth21_business_actions.test.js` : six actions, méthodes, schémas,
  rôles, ownership et anti-rejeu ;
- `auth21_real_indicator_business_ingress.test.js` : route signée,
  paramètres malveillants, gel et refus ;
- `auth21_real_indicator_business_process.test.js` : processus **réels**
  Gateway, Router, Indicator ; émission Core contrôlée ;
- `auth21_multi_engine_business_e2e.test.js` : processus **réels**
  MarketData, Fundamental, Portfolio, Strategy, Gateway et Router,
  rôles ADMIN/USER/GUEST, propriétaire incorrect, GET et HTTP historiques ;
- `auth21_core_business_sqlite_sessions.test.js` : première identité
  ADMIN **fictive** créée avec vraie migration SQLite v3 et Argon2id,
  session réelle et révocation qui bloque l'émission de nouvelles preuves.

## Travaux indispensables avant clôture de A

1. Raccorder l'authentification au navigateur via cookies
   `Secure/HttpOnly/SameSite`, CSRF et origine HTTPS réellement contrôlée
   et activer le parcours UI de login/lock/unlock/logout sans fuite de token.
2. Raccorder les autres parcours métier autorisés aux magasins et
   services réellement exploités et terminer le contrôle d'ownership
   sur toutes les routes sensibles, pas seulement six routes expérimentales.
3. Vérifier la résistance du rejeu interprocessus et au redémarrage,
   la révocation pendant une requête déjà émise, et les frontières
   Gateway/Router/Engine en cas de panne.
4. Vérifier migrations, isolement multiutilisateur en charge, performances
   p95/p99 comparables et rollback sur installation complète de test.
5. Exécuter une campagne consolidée verte sur la **dernière révision**,
   puis seulement demander une revue de clôture. La réussite des
   fixtures seules ne constitue pas une autorisation de déployer.

**Décision :** les parcours explicitement ouverts sont en mesure d'être
testés de façon cohérente ; **le chantier A et les phases 3/4 ne sont pas clos**.
Il est interdit de déclarer que le chantier B peut démarrer sur une base
Auth21 intégralement certifiée tant que les critères ci-dessus ne sont pas
satisfaits.
