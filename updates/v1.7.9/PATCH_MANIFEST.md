# Patch v1.7.9 — Refonte UI Admin

Base : v1.7.8
Cible : v1.7.9

## Objectif
Améliorer fortement l’ergonomie de la page Admin sans modifier les fonctions backend existantes.

## Modifications
- Nouvelle barre latérale gauche fixe inspirée de la maquette validée.
- Navigation Application : Trading IA, Chart Viewer, Portfolio, Fondamental.
- Navigation Admin interne : Vue d’ensemble, Services, Maintenance, Logs & exécutions, Système, Mises à jour.
- Navigation interne par ancres HTML natives, sans dépendance JavaScript supplémentaire.
- Nouveau header Admin compact avec état LOCAL et bouton Actualiser.
- Cartes Services, métriques système, consoles et UpdateManager harmonisés visuellement.
- Responsive : sidebar compacte sur largeur intermédiaire et navigation basse sur petit écran.
- Aucun changement des IDs fonctionnels utilisés par admin_controller_v1.0.js et update_ui_v1.0.js.

## Fichiers
- Frontend/Pages/admin_v1.0.html
- Frontend/CSS/admin_v1.0.css

## Compatibilité
- macOS High Sierra / Intel.
- Node.js 16.20.2.
- Firefox ESR compatible.
- Aucun package npm supplémentaire.
