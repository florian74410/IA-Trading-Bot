# IA-TB 2.1 — Cahier des charges validé

## ChartViewer : barre de sélection, Indicator Studio et outils de dessin

**Projet :** `florian74410/IA-Trading-Bot`\
**Branche source confirmée :** `feature/indicator-visual-renderer-v2.1` (PR #7)\
**SHA HEAD confirmé :** `8907c6b2b89add55afacd0ccd441184f4981551e`\
**Branche de destination :** branche dédiée à la refonte UI, créée depuis ce SHA ou depuis un descendant vérifié de la PR #7.\
**Statut :** cahier des charges de développement ; aucun accord pour fusion ou déploiement.

## 1. Mission et périmètre ferme

Réaliser une interface graphique **professionnelle, cohérente et utilisable** pour trois composants de la page **Trading IA** et de son ChartViewer natif :

1. **Barre supérieure du graphique** : sélection du fournisseur/marché, paire, intervalle temporel, nombre de bougies et actions d'affichage.
2. **Indicator Studio** : sélecteur d'indicateurs, recherche, catégories, état actif, paramètres visuels, import JSON existant et contrôle des superpositions/sous-graphes.
3. **Outils de dessin** : barre d'outils, interactions sur le graphique, édition des objets, historique annuler/rétablir et nettoyage sélectif.

**Hors périmètre :** authentification/User Management V1, chiffrement, comptes, permissions, modifications des calculs Indicator Engine, réécriture des définitions `.indicator.json`, changement des contrats JSON V2 et réécriture du Visual Renderer V2. Ne pas modifier ces composants sans nécessité documentée et accord explicite. Ne pas remplacer le ChartViewer natif par une iframe TradingView ou une nouvelle bibliothèque sans justification acceptée.

## 2. Synchronisation GitHub et coexistence des chantiers

- Récupérer la PR #7, vérifier le HEAD SHA et l'état réel du dépôt juste avant toute modification.
- Ne pas repartir de DEBUG 2.0.1 ou d'un ancien état 2.0.4 ; **utiliser la base Renderer V2 de la PR #7**, tout en vérifiant et préservant les changements récents des branches parallèles.
- Créer une **branche UI indépendante**. Ne pas pousser directement sur la branche de l'agent Renderer si un autre agent la modifie.
- Séparer les commits par composant, minimiser les modifications des fichiers partagés et signaler les risques d'intégration.
- Ne pas fusionner la PR #7 ni la branche UI ; ne pas déployer sur GEN-1. Les vérifications QA Renderer V2 ne sont pas closes.
- Si la branche de référence avance pendant le chantier, comparer les différences, intégrer seulement les changements compatibles et retester. Aucun écrasement silencieux.

## 3. Design du ChartViewer

- Conserver l'identité visuelle IA-TB : thème sombre, bleu/cyan discret, typographie lisible, icônes homogènes et cohérence avec les pages Fondamental et Paramètres.
- Le **graphique principal reste prioritaire** en surface utile ; pas de multiplication de panneaux imposés ou de boutons surdimensionnés.
- Mettre en place des contrôles accessibles, des info-bulles, états actifs et raccourcis raisonnables ; assurer le fonctionnement souris/clavier et un affichage adaptable aux écrans plus étroits.
- Ne jamais fabriquer des cours de marché ou des sorties d'indicateurs pour embellir le graphique.

## 4. Barre supérieure : marché, paire et période

### 4.1 Marché de référence

- Le marché/exchange sélectionné dans l'espace Trading IA **fait autorité pour le ChartViewer et ses indicateurs**. Éviter les sources divergentes entre panneaux.
- Réutiliser le catalogue réel du Market Data Collector via le Router et les règles du Data Firewall. N'utiliser aucune liste statique présentée comme exhaustive.
- Les fournisseurs déjà pris en charge par le backend, notamment Binance, Kraken, OKX et GMX selon leurs capacités réelles, doivent être proposés quand disponibles ; ne pas inventer de compatibilité.
- Afficher distinctement une source indisponible, un marché non connecté, une paire non supportée et une erreur de récupération.

### 4.2 Sélecteur de paire

- Recherche rapide par symbole et nom, avec résultats issus du marché choisi, prise en charge des listes longues, filtrage et états de chargement.
- Afficher paire/base-quote, exchange/source, type spot/perp si connu, et éventuellement favoris locaux.
- Lors du changement de marché : rafraîchir les paires offertes, préserver la paire si elle est valide, sinon demander/choisir une alternative explicite cohérente (pas de substitution silencieuse).
- Lors du changement de paire ou de timeframe : mettre à jour bougies, contexte des indicateurs, résultats et dessins selon leur rattachement, sans erreurs concurrentes ni résultats tardifs d'un ancien contexte.

### 4.3 Contrôles et actions

- Intervalle temporel, nombre de bougies, ajuster/centrer, zoom, réinitialiser l'échelle, ouvrir Indicator Studio et éventuellement capture image si déjà supportée.
- États d'interaction cohérents (chargement, désactivation, erreur) et taille compacte.
- Restaurer proprement les préférences du ChartViewer pour chaque contexte utilisateur quand l'architecture existante le permet, sans créer de nouveau système d'authentification.

## 5. Indicator Studio

### 5.1 Fonction et ergonomie

- Remplacer/améliorer le sélecteur actuel par un **panneau moderne, compact et lisible**, qui peut être ouvert/fermé sans cacher durablement le graphique.
- Afficher la recherche, les catégories pertinentes (tendance, momentum, volatilité, volume, liquidité, etc.), les indicateurs déjà actifs, leur état READY/WARMING/ERROR et les paramètres disponibles.
- Chaque indicateur présente son nom, son emplacement **« Sur prix » ou « Sous-graphe »**, son état activé, ainsi que des actions Configurer / Masquer / Retirer quand elles sont disponibles.
- Permettre plusieurs indicateurs actifs tout en respectant les limites API et performances existantes.
- Préserver et intégrer l'import de fichiers `.indicator.json` existant, avec validation et messages d'erreur compréhensibles.

### 5.2 Contrôle du rendu

- **Ichimoku, Bollinger, SMA, EMA, VWAP, SAR, Supertrend, etc.** : ne créer aucun sous-panneau inférieur pour les overlays de prix.
- **RSI, Stochastic RSI, MACD, ATR, MFI, etc.** : panneau inférieur uniquement lorsque requis par la définition et la capacité du Renderer V2.
- Ne pas recréer une zone « lecteur JSON » vide sous le graphique lorsqu'aucun indicateur séparé n'est affiché.
- Les sous-graphes doivent partager l'axe temporel visible du graphique principal et réagir au pan/zoom/timeframe.
- Les indicateurs sans données, en chauffe ou désactivés ne doivent pas produire de fausses courbes, de zéros fabriqués ou d'anciens résultats persistants.
- Les paramètres visuels (couleur, épaisseur, visibilité des séries, opacité, etc.) ne sont modifiables que s'ils sont **pris en charge par les contrats Renderer V2** ; ne pas créer un second interpréteur JSON incompatible.
- Une seule source de vérité pour les indicateurs actifs. Éviter les doubles traitements et les doublons de panneaux.

### 5.3 Paramètres et personnalisation

- Prévoir l'édition des inputs autorisés par le registre (ex. périodes), avec validation des bornes.
- Contrôles de visibilité par ligne/couche uniquement si le contrat du renderer le permet déjà. Documenter les contrôles non disponibles plutôt que d'inventer une implémentation partielle.
- Préserver les réglages d'indicateurs lors d'un rafraîchissement de données cohérent ; réinitialiser proprement lors d'un changement de contexte nécessitant un recalcul.

## 6. Outils de dessin du ChartViewer

### 6.1 Barre d'outils

Fournir une barre latérale discrète, accessible et cohérente avec le graphique. Priorité à ces outils :

1. Curseur / mode navigation, avec croix de suivi.
2. Ligne de tendance à deux points.
3. Ligne horizontale à un niveau de prix.
4. Rectangle / zone rectangulaire.
5. Retracement Fibonacci, avec niveaux standards et affichage des prix correspondant.
6. Sélection et déplacement d'objet, puis suppression ciblée.
7. Annuler / rétablir les actions graphiques ; tout effacer après confirmation lorsque pertinent.

### 6.2 Comportement métier et ergonomique

- Les dessins se positionnent sur des **coordonnées temps/prix réelles** et restent correctement ancrés lors des changements de zoom, déplacement du graphique et redimensionnement.
- Le déplacement et la modification d'un objet ne doivent pas déclencher en même temps un déplacement involontaire des bougies.
- Gérer les clics incomplets, le mode actif, Escape pour annuler une création, l'objet sélectionné, les poignées d'édition et les suppressions.
- Style cohérent (couleurs, traits, transparence), avec bornes de performance et aucun blocage du thread de rendu.
- En cas de changement de paire, exchange ou timeframe, conserver uniquement les objets dont le rattachement est valide ; jamais afficher le dessin d'un autre marché sur le contexte courant par erreur.
- Sauvegarde/restauration si le stockage de préférences du ChartViewer le permet sans créer de nouveau backend de comptes ; sinon isoler cette option et documenter la limite.

## 7. Contraintes d'architecture

- Maintenir le contrôleur et les contrats publics existants ; ne pas rompre les événements des bougies, séries, indicateurs ou opérations de zoom/pan.
- Réutiliser le Visual Renderer V2 issu de la PR #7 : les nuages, bandes, histogrammes et rendus combinés relèvent de ce moteur et de ses `.indicator.json`.
- Ne pas modifier les calculs natifs Indicator Engine ni transformer le front-end en moteur de calcul.
- Respecter l'architecture Market Data Collector → Data Firewall → Router → UI.
- Aucun appel direct navigateur vers une API exchange qui contournerait les services IA-TB.
- Ne pas toucher au Trading Engine ni déclencher d'exécution d'ordres.
- Préserver les flux réels du marché et l'affichage OHLCV même si des panneaux auxiliaires sont fermés.

## 8. Tests et critères d'acceptation

### Fonctions

- Changer Kraken/Binance/OKX/GMX **uniquement là où supporté** et constater la liste réelle des paires ; vérifier recherches, erreur et absence de paire.
- Changer paire, timeframe, nombre de bougies, zoom et pan sans perte du contrôleur et sans résultat d'indicateur de l'ancienne paire.
- Afficher Ichimoku + VWAP **sur le prix** sans sous-graphe additionnel.
- Afficher RSI et MACD dans des sous-graphes synchronisés ; fermer l'un sans affecter l'autre.
- Importer un `.indicator.json` valide ; rejeter proprement un JSON invalide ou incompatible.
- Créer, éditer, déplacer, annuler/rétablir et supprimer les principaux dessins ; tester le redimensionnement et le changement de contexte.
- Recharger la page et vérifier les préférences/sauvegardes selon les fonctionnalités réellement implémentées.

### Non-régressions et qualité

- Vérifier absence d'exception JavaScript et de réponse JSON à la place des assets CSS/JS.
- Exécuter les tests existants Renderer V2 / Indicator Engine, UI et Router en conservant les calculs inchangés.
- Tester des fenêtres desktop ordinaires et des écrans étroits ; aucun contrôle essentiel inaccessible.
- Mesurer l'absence de saccades majeures sur des centaines de bougies, plusieurs indicateurs et plusieurs dessins.
- Vérifier les chemins avec données indisponibles, bougies insuffisantes, erreurs réseau et changement rapide de paire/timeframe.
- Aucune régression des pages Trading IA, Fondamental ou Paramètres.

## 9. Livrables GitHub

1. Branche dédiée et commits atomiques clairement nommés.
2. Nouvelle barre ChartViewer et sélecteur de paires connectés aux données réelles.
3. Indicator Studio intégré aux indicateurs existants et au Renderer V2 de la PR #7.
4. Barre d'outils et dessins opérationnels.
5. Tests automatisés et procédure de QA visuelle Firefox.
6. Documentation des fichiers modifiés, événements, fonctionnalités et limites.
7. PR distincte en brouillon, avec SHA de base et SHA de livraison.

**Interdictions finales :** pas de code User Management/Auth, pas de modification de calcul Indicator Engine, pas de remplacement de contrat graphique JSON V2, pas de fusion, pas de déploiement GEN-1 sans accord explicite.

## 10. Consigne d'autonomie

Tu peux effectuer l'implémentation, les corrections et les tests de bout en bout sans solliciter l'utilisateur pour des détails déductibles du code et de ce cahier des charges. Si un point nécessite une modification du contrat Renderer V2, signale la dépendance et propose une modification isolée à faire valider plutôt que de changer silencieusement le périmètre. Ne déclare le chantier terminé qu'après avoir publié les commits, les tests et la PR de revue.