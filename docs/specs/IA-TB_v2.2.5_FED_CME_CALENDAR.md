# IA-TB v2.2.5 — Spécification : calendrier FED/CME unifié

**Statut : PLANIFIÉ — conception validée, implémentation et QA non réalisées.**
**Périmètre : Fundamental V3 > News & Événements > Calendriers FED & CME.**
**Décision produit : calendrier unifié avec filtres de sources, sans suppression des collecteurs.**

## 1. Objectif et limites

Remplacer les deux panneaux calendriers FED et CME par une interface économique unifiée, plus lisible, cohérente avec le thème sombre/cyan IA-TB. Conserver les sources, collecteurs, routes backend, diagnostics, permissions, fréquences de collecte, caches et provenance existants. Ne pas mélanger cette refonte UI avec une refonte des pipelines de collecte.

La maquette visuelle est indicative. Ne jamais importer ses dates, chiffres, horaires ou événements fictifs dans l'application.

## 2. Expérience utilisateur

- Zone supérieure : titre, état de synchronisation par source, sélection Tous/FED/CME, catégories et fuseau horaire.
- Colonne calendrier (desktop) : vue mensuelle, flèches mois précédent/suivant, retour Aujourd'hui, jours hors mois atténués, sélection accessible au clavier.
- Chaque jour : maximum trois marqueurs lisibles puis indicateur de surplus ; infobulle et libellés accessibles. Couleurs fondées sur des catégories documentées ou une importance explicitement fournie.
- Colonne agenda : événements du jour sélectionné triés par instant effectif croissant, puis source/identifiant ; heure locale, source FED/CME, type, titre et état. Liste paginée ou virtualisée si nécessaire.
- Sélection événement : panneau de détail avec titre, date/heure et fuseau, source originale, catégorie, description, lien officiel vérifié et métadonnées effectivement disponibles. Ne jamais inventer valeurs de prévision, précédent, réel ou impact.
- Modes mois/jour/liste ; semaine facultatif uniquement si traité et testé dans le même lot. Layout responsive : sous largeur tablette, empiler calendrier et agenda, sans défilement horizontal global.
- États explicites : chargement, aucune donnée disponible, filtre sans résultat, collecte en erreur, données périmées, calendrier source partiellement disponible.
- FED et CME restent utilisables séparément par filtrage même en cas d'indisponibilité de l'autre.

## 3. Contrat de normalisation non destructif

Créer un adaptateur de présentation réutilisable au plus près des réponses backend Core existantes. Avant développement, identifier et documenter les vrais endpoints, champs et composants utilisés dans la branche cible v2.2.5.

Schéma interne **proposé** (ne pas modifier les contrats externes sans revue) :

```ts
type CalendarEvent = {
  id: string;                   // stable et unique : source + identifiant natif
  source: 'FED' | 'CME';
  sourceId: string;
  title: string;
  startAtUtc: string;           // ISO-8601 avec offset/UTC vérifiable
  endAtUtc?: string | null;
  allDay?: boolean;
  category?: string | null;
  importance?: 'LOW' | 'MEDIUM' | 'HIGH' | null;
  description?: string | null;
  officialUrl?: string | null;
  updatedAtUtc?: string | null;
  sourceTimezone?: string | null;
  rawMetadata?: Record<string, unknown>; // uniquement interne, jamais rendu sans échappement
};
```

- Conserver le payload source brut en lecture seule ; mapping champ-à-champ documenté avec tests par source.
- Ne pas transformer une date sans heure en minuit UTC : prendre en charge all-day / date flottante.
- Dates stockées/comparées en instants normalisés uniquement lorsque l'heure est connue ; conversion Europe/Paris ou fuseau utilisateur à l'affichage et pour les limites de jour. Attention aux passages heure d'été/hiver.
- Déduplication seulement sur (source, identifiant natif) ou règle métier vérifiée ; ne pas fusionner deux publications simplement parce qu'elles ont même titre/date.
- Provenance et URL officielle préservées ; validation des schémas URL HTTP(S), échappement HTML et aucune injection via descriptions externes.
- Aucun faux 'impact' pour événements dont la source n'en fournit pas : afficher « Non évalué ».
- Une erreur FED ne doit pas vider CME, ni inversement ; état de santé et dernière synchro indépendants.

## 4. Flux technique et sécurité

Frontend Fundamental -> routes Core authentifiées existantes -> collecteurs FED/CME existants.
Aucun accès direct du navigateur au port interne Fundamental, aucune nouvelle permission permissive, aucun contournement Router CP/1 ou Auth21. L'adaptateur ne déclenche pas de synchronisation implicite en boucle à chaque changement de filtre/mois. Réutiliser cache/backend existants et borner les requêtes.

Garder par défaut les identifiants DOM publics/contrats intégrés requis, ou introduire une couche de compatibilité pour ne pas casser événements, tests ou consommateurs historiques. Nettoyer écouteurs/timers lors des remounts, éviter doubles fetchs et courses réponses obsolètes.

## 5. Travaux

- [ ] Auditer la branche cible, chemins de fichiers, endpoints FED/CME, schémas réels et protections Auth21/CP1.
- [ ] Documenter les conventions d'événements et des dates des deux sources.
- [ ] Ajouter adaptateur de normalisation côté UI/Core selon code existant ; couverture tests.
- [ ] Implémenter calendrier unifié mois et agenda du jour ; fiche détaillée.
- [ ] Implémenter filtres Tous/FED/CME, catégories, sélection des jours, navigation, retour Aujourd'hui, fuseau horaire.
- [ ] Ajuster thèmes, contrastes, responsive, clavier, états vides/erreur et performances.
- [ ] Garantir fonctionnement des collecteurs et diagnostics préexistants, aucune modification destructive.
- [ ] Documenter wiki, noter changements réellement livrés dans CHANGELOG, valider packaging et déploiement.

## 6. Critères d'acceptation (bloquants)

1. FED seul, CME seul et Tous affichent exactement les événements réellement reçus ; filtrage source+catégorie réversible, sans disparition intempestive.
2. Un événement à date limite de mois et un passage DST Europe/Paris se placent le bon jour ; all-day sans conversion arbitraire.
3. Sélection du jour, changement de mois, retour Aujourd'hui, ouverture/fermeture détail, rafraîchissement et chargement restent stables après changements répétés.
4. Échec, timeout ou réponse vide d'une source n'empêchent pas l'autre de s'afficher ; état d'erreur source visible.
5. Les anciens endpoints et collecteurs restent inchangés ; aucune régression d'authentification, permissions, provenance, fréquence de collecte et CP/1.
6. Test manuel Firefox/Linux sur résolution ~1280x800 correspondant à la capture ; plus tests responsive tablette/mobile.
7. Tests automatisés sur adaptateur, déduplication, tri, filtres, date et sécurité du rendu ; tests intégration backend et smoke tests UI.
8. Aucune valeur, impact ou événement factice affiché comme réel ; maquette non utilisée comme donnée.
9. Checklist, documentation et build validés avant passage des cases ROADMAP à [x] et déclaration de version livrée.

## 7. Hors périmètre v2.2.5 (future évolution distincte)

Graphique Trading IA synchronisé sur événement, alertes/notifications, historique d'impact marché et exploitation analytique automatique par Supervisor. Ces éléments demandent contrats, autorisations et tests indépendants.
