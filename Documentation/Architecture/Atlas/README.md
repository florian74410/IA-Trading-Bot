# Architecture Atlas V2 — proposition de diagramme hiérarchique

Prototype interactif **autonome, sans accès réseau ni dépendance externe** :

- **[Ouvrir atlas-v2.html](atlas-v2.html)** en téléchargeant le fichier et en l'ouvrant dans Firefox/Chromium.
- Depuis un checkout local : `xdg-open Documentation/Architecture/Atlas/atlas-v2.html`.
- Contrôle syntaxique/contrats : `node Documentation/Architecture/Atlas/check-atlas-v2.cjs`.

## Objectif graphique

Le diagramme d'origine mélangeait types de blocs, composants réels et étapes de transport. Cette proposition impose des **couches horizontales de services pairs** et une **colonne d'autorité conceptuelle** :

```
                           IA Supervisor
                                 │   (gouvernance visuelle seulement)
UI Gateway ──────────────── Core Server ───────────── Auth21
                                 │
                       Router Switch CP/1
                    ┌────────────┼─────────────┐
                Firewall Data  Firewall Router  Firewall Trading
                    │            │             │
Providers → Market Data       Engines pairs    Trading Engine
 (colonne)   Collector          (x plusieurs)   → executors
                    │            │             │
                Stockages      Modules       P4/P5 Ledger
```

**Important :** cette géométrie classe les responsabilités ; elle ne délègue pas réellement de privilèges Unix, RBAC ou CP/1. Le Supervisor dépend techniquement du Router, même si la présentation le place au-dessus de Core comme demandé.

## Règles de lisibilité

1. **Types ≠ instances** : `Engine` comprend Market Data, Fundamental, Indicator, Strategy, Risk, Liquidity, Trading, Portfolio. `Firewall` comprend plusieurs workers de protection du **même service** (Router, Data, Trading).
2. **Pas de chaîne d'API fictive** : chaque BrokerAPI/Provider est relié indépendamment au Market Data Collector ; ils ne communiquent pas en série entre eux.
3. **Data Firewall comme péage** : collecte → contrôle Data Firewall → Router. Les autres Engines sont pairs ; leur communication passe par le routage CP/1 selon les contrats.
4. **Circuit ordres distinct** : intention Strategy → RiskGate → Firewall Trading → Trading Engine → executor, via Router et les contrôles pertinents. Aucun raccourci vers les exchanges.
5. **Niveaux distincts** : supervision, Core/identité, Router, protections, Engines, modules/stockages/adapters.
6. **Anti-spaghetti** : la vue globale n'affiche que des liens structurants et un bus d'agrégation. Une sélection ou un parcours guidé révèle les autres routes ; « Tous (audit) » est volontairement dense.
7. **Légende** : CP/1, Firewall, HTTPS/REST, Auth21/IPC signé, liaison logique en pointillés.
8. **Sans fausse disponibilité** : Caddy est optionnel ; Trading LIVE et P5 réel ne sont pas déclarés actifs ; aucune télémétrie, clé ou endpoint privé n'est appelé.

## Améliorations de lisibilité (itération V2.1)

- **Vue initiale à taille lisible** : la carte est centrée sur l'axe Supervisor → Core → Router et les trois workers Firewall, plutôt que de réduire simultanément 36 composants sur un écran de 1280 × 800.
- **Plein espace** : masque temporairement les panneaux latéraux pour donner toute la largeur au graphe, sans modifier l'application ni le site Atlas publié.
- **Recherche de composants** : saisie avec suggestions, sélection et recentrage automatique d'un Engine, Firewall, module ou BrokerAPI.
- **Cadrage par circuit** : les vues Marché, Trading, ADMIN et les parcours guidés déplacent la caméra sur la zone utile.
- **Bus d'agrégation Market Data** : les neuf sources publiques sont disposées dans une colonne unique, avec des petits segments parallèles qui rejoignent un même tronc. Cette géométrie est une **simplification graphique**, pas un nouveau broker ni un protocole réseau inventé.
- **Bus CP/1 schématique** : en vue globale, le raccordement logique des Engines pairs est dessiné comme un tronc, afin de limiter la superposition des 36+ connexions.
- **Inspection de proximité** : un clic ne rend visibles que les connexions du bloc, et l'inspecteur indique leurs types. Le survol donne sa description. Les liens sources renvoient aux fichiers du snapshot `8caae37`.
- **« Ajuster »** reste disponible pour obtenir une vue d'ensemble, y compris à faible largeur ; cette vue panoramique peut être moins lisible et sert à la navigation, pas à la lecture détaillée.
- **Un test GitHub Actions** contrôle les éléments de navigation et garantit que les API ne sont pas présentées comme une chaîne fictive.

### Audit de cohérence du snapshot

Les **36 références de fichiers associées aux blocs ont été comparées à l'arbre Git du commit `8caae37ac25ffbd72c25f52ca4eeab21ee10aa8b`** et correspondent à des chemins existants. Cela ne garantit pas qu'un service soit actuellement démarré ; cette carte ne fournit pas de télémétrie live.

## Interactions

- Navigation par type de flux : général, marché, trading, ADMIN ou audit.
- Quatre parcours guidés pour la collecte, l'intention de trading, l'administration et le calendrier macro.
- Sélection par clic et inspection des voisins, détails, rôle, port, type et chemin GitHub au snapshot `8caae37`.
- Déplacement du fond, zoom +/- et ajustement automatique ; disposition responsive et navigation clavier des boutons.

## Sources principales vérifiées

- `App/Core/ProcessRegistry/manifests/*.json` pour les services et les ports.
- `App/Core/ProcessRegistry/manifests/firewall.json` pour les workers Router/Data/Trading.
- `App/Core/Communication/ProtocolRegistry/*.json` pour les actions CP/1.
- `App/MarketData/Provider/exchange_catalog.json` et `App/MarketData/Provider/*_provider.js` pour la collecte.
- `Documentation/wiki/Architecture.md` pour les flux logiques (document historique V2.0, à recouper avec 2.5.3).
- `Documentation/Trading/ACCOUNT_ROUTING_2.5.3.md` pour le coffre et les limites de production.

## Intégration future au site publié

Ce fichier est une **proposition sur une branche isolée**, pas une mise à jour automatique du site ChatGPT « IA-TB · Architecture Atlas ». Après validation visuelle, transposer la carte dans la section « Carte du système » du site existant en conservant son menu, ses autres modules et son système de descriptions.

La PR reste en brouillon. **Ne pas fusionner dans 2.5.3 avant revue.**
