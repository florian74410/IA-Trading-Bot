# IA-TB v2.2.5 — Lot Globe agrandi : patch additif

**Statut : implémentation partielle / PR en brouillon. Non déployable avant raccordement et recette.**

## Livré sur la branche feature/v2.2.5-calendar-events-chart

- `App/Frontend/JS/fundamental_globe_expanded_v2_2_5.js`: normalisation défensive des nouvelles, filtres TOP/CRYPTO/DEFI/MACRO/REGULATION/SECURITY, périodes 24h/7j/30j, statistiques réelles, liste chronologique, pays/drapeaux, fermeture Escape/×, gestion focus et API `mount(host, options)`.
- `App/Frontend/CSS/fundamental_globe_expanded_v2_2_5.css`: thème IA-TB cyan/bleu nuit, panneaux 3 colonnes et présentation responsive.
- `tests/fundamental_globe_expanded_v2_2_5.test.cjs`: tests de données, dates, géolocalisation et sécurité URL.

## Point d'intégration obligatoire

Le code d'ouverture du Globe compact doit charger le nouveau JS/CSS et invoquer :
```js
const globeExpanded = IATBExpandedGlobe.mount(document.body, {
  events: normalizedNews, // tableau de vraies news Fundamental
  renderGlobe: (slot) => {
    // Monter le renderer Globe déjà existant dans slot
    // Retourner une fonction cleanup() si nécessaire
  },
  updateGlobe: (visibleEvents, state) => {
    // Mettre à jour points, clustering et focus du globe existant
  }
});
// globeExpanded.updateEvents(nextRealNews);
```

**Ne pas ajouter de globe artificiel** : réutiliser le renderer courant, ses textures/caméra et les collecteurs. Le globe n'est pas encore monté automatiquement, faute de confirmation du point d'entrée de l'implémentation existante. L'interface n'est donc pas fonctionnellement livrée à ce stade.

## Règles de recette avant fusion

- Vérifier la présence et le chemin exact du composant compact, boutons d'agrandissement, scripts et CSS chargés.
- Brancher renderGlobe/updateGlobe aux API existantes et au cache Fundamental réel, avec états loading/error.
- Clustering/hubs et zoom +/−/recentrage réels, synchronisation click point ↔ panneau de droite.
- Compteurs cohérents avec les événements filtrés; distinguer les news non géolocalisées.
- Tester écouteurs, cleanup, focus, filtrage, x/Escape, responsive 1280×800, mémoire/GPU et Firefox.
- Charger les images uniquement depuis URLs sûres et appliquer la politique CSP existante.
- Conserver tous les pipelines FED/CME et news existants.
