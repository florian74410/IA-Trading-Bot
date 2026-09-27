# Fundamental Engine V3 — renseignement, News Query et synthèses

> **À retenir : Fundamental V3 est le centre de renseignement d’IA‑TB. Il collecte les informations, les conserve avec leur provenance, construit des événements et des synthèses, puis permet au Supervisor de demander uniquement les informations utiles. Il reste `INFORMATION_ONLY` : il ne passe aucun ordre.**

<details>
<summary><strong>Voir les détails techniques</strong></summary>

Le consommateur métier est le **Supervisor**. Les échanges passent par **Router / CP/1** : le Supervisor ne lit pas directement SQLite. Cela conserve une frontière claire entre les Engines et rend les requêtes auditables.

</details>

---

## 1. Vue d’ensemble

```text
 Sources / flux
      │
      ▼
┌─────────────────────┐
│   FUNDAMENTAL V3    │
│ collecte + stockage │
└──────────┬──────────┘
           │
     ┌─────┴─────┐
     ▼           ▼
 Event Engine   News Query
     │           │
     ▼           ▼
 Synthèses    Sélection
     └─────┬─────┘
           ▼
       Router / CP1
           │
           ▼
       Supervisor
```

**Le but n’est pas d’envoyer toutes les news au modèle IA.** Fundamental effectue d’abord une sélection déterministe. Cela réduit le volume de contexte, les tokens consommés et le bruit informationnel.

---

## 2. De la source à la news

Fundamental collecte plusieurs types de flux (RSS, Atom, Web et sources sociales prises en charge), puis normalise les éléments dans son stockage privé.

Une news conserve notamment :
- titre et résumé ;
- URL et auteur lorsqu’ils existent ;
- date de publication et date de collecte ;
- langue ;
- source et feed ;
- classe/rôle du contenu ;
- importance de base du feed ;
- grade et fiabilité de la source.

> **Provenance :** une information garde son origine. Les données de sources différentes ne doivent pas être fusionnées silencieusement.

---

## 3. News Query Engine

### Pour débuter

**Le News Query Engine agit comme un documentaliste.** Le Supervisor ne dit plus seulement « donne-moi les dernières news ». Il peut demander « donne-moi les news BTC récentes, suffisamment fiables, et classe-les par pertinence ».

### Filtres actuellement exposés via CP/1

| Paramètre | Rôle |
|---|---|
| `query` | recherche textuelle |
| `asset` | recherche d’un actif dans titre/résumé |
| `category` | filtre sur les classifications disponibles du feed |
| `source` | source précise |
| `feed` | flux précis |
| `minGrade` | grade minimum de source |
| `minReliability` | fiabilité minimale |
| `minImportance` | importance minimale du feed |
| `since` / `until` | fenêtre temporelle |
| `sort` | ordre de classement |
| `limit` | nombre maximal de résultats |

### Modes de tri

- `DATE_DESC` — plus récent en premier ;
- `DATE_ASC` — plus ancien en premier ;
- `IMPORTANCE_DESC` — importance du feed ;
- `RELIABILITY_DESC` — fiabilité de la source ;
- `RELEVANCE_DESC` — classement déterministe combinant actuellement importance du feed et fiabilité de la source, puis récence.

> **Important : `RELEVANCE_DESC` n’est pas encore un jugement sémantique complet de l’IA.** C’est un classement déterministe basé sur les métadonnées actuellement disponibles.

### Exemple conceptuel

```text
Supervisor :
« BTC, 24 dernières heures,
  sources fiables,
  12 résultats maximum,
  pertinence décroissante »

             ↓

fundamental.news.search
             ↓
       News Query Engine
             ↓
       12 éléments max.
```

---

## 4. Supervisor : comment il utilise Fundamental

**Le Supervisor reçoit désormais trois niveaux d’information fondamentale :**

1. l’analyse Fundamental générale ;
2. une sélection de news ;
3. l’historique récent des synthèses.

Dans son contexte automatique, le Supervisor peut préciser notamment la fenêtre de news, le nombre de résultats, la catégorie/source, les seuils et le tri. Le comportement par défaut utilise une fenêtre récente et `RELEVANCE_DESC`.

```text
Market Data ──────┐
Indicators ───────┤
Liquidity ────────┤
Strategy ─────────┤
Risk ─────────────┤
Portfolio ────────┤
Fundamental ──────┤
News sélectionnées├──► SUPERVISOR
Synthèses ────────┘
```

Cela évite de faire du LLM le moteur de recherche de la base Fundamental.

---

## 5. News, Event, Evidence et Synthèse

Ces objets ne représentent pas la même chose.

| Objet | Signification |
|---|---|
| **News** | information collectée auprès d’une source |
| **Event** | événement construit/normalisé par Fundamental |
| **Evidence** | élément servant de preuve/contexte d’un événement |
| **Timeline** | évolution temporelle des éléments d’un événement |
| **Synthèse** | résumé analytique produit à partir d’un ensemble d’informations |

Une synthèse peut conserver un headline, un aperçu, un ton de marché, une confiance, des thèmes, des éléments à surveiller, des limitations et le nombre d’éléments utilisés.

### Exemple

```text
News A ─┐
News B ─┼──► Event ───► Evidence / Timeline
News C ─┘                    │
                            ▼
                         Synthèse
```

Le Supervisor peut consulter les synthèses existantes au lieu de demander systématiquement une nouvelle analyse.

---

## 6. Mémoire temporelle

Fundamental dispose d’une timeline d’événement. Elle permet de distinguer les nouvelles informations des répétitions et de suivre l’évolution d’un sujet.

**Une dépêche répétée dix fois n’équivaut donc pas automatiquement à dix nouvelles informations.**

La timeline mémorise notamment les evidence et synthèses liées à l’événement et utilise un score de nouveauté pour aider à identifier ce qui a changé.

---

## 7. Globe Fundamental

Le Globe et le Supervisor doivent à terme exploiter le **même catalogue structuré**.

```text
             News enrichie
                  │
       ┌──────────┴──────────┐
       ▼                     ▼
  Géolocalisation      Métadonnées marché
       │                     │
       ▼                     ▼
  Globe Fundamental       Supervisor
```

Le Globe est une représentation visuelle. Le Supervisor est un consommateur analytique. Il ne faut pas créer deux bases de vérité différentes.

---

## 8. Limites actuelles

### Association d’un actif

Le filtre `asset` est actuellement principalement textuel : il cherche l’actif dans le titre/résumé. Une news peut concerner Bitcoin sans contenir littéralement « BTC ».

### Catégories

Le filtre `category` exploite les classifications actuellement disponibles dans les feeds. Il ne constitue pas encore une taxonomie sémantique complète.

### Importance et pertinence

L’importance disponible provient notamment du feed et la fiabilité de la source. Cela ne signifie pas encore que chaque article possède son propre score sémantique d’impact marché.

**Ces limites doivent rester visibles dans la documentation afin de ne pas présenter une capacité future comme déjà opérationnelle.**

---

## 9. Évolution prévue : enrichissement sémantique

La prochaine grande étape envisagée consiste à enrichir chaque information avec des métadonnées plus fines :

```text
NEWS
├── assets[]
├── categories[]
├── entities[]
├── event
├── geolocation
├── importance
├── reliability
├── novelty
└── market relevance
```

Exemple conceptuel :

```text
Publication sur une décision de la Fed
        │
        ▼
Entity      : Federal Reserve
Category    : MACRO
Assets      : BTC / ETH / USD (si relation établie)
Event       : décision de taux
Importance  : score à définir
Location    : lieu vérifié ou niveau GLOBAL
Novelty     : comparaison avec l’historique
```

> Cette section décrit une **évolution**, pas l’état actuel du runtime.

---

## 10. Contrat CP/1 utile au Supervisor

Commandes importantes :

- `fundamental.news.search`
- `fundamental.news.get`
- `fundamental.events.search`
- `fundamental.event.get`
- `fundamental.event.evidence`
- `fundamental.timeline.get`
- `fundamental.timeline.context`
- `fundamental.synthesis.news`
- `fundamental.synthesis.event`
- `fundamental.synthesis.market`
- `fundamental.synthesis.history`

**Règle d’architecture : le Supervisor demande des données par CP/1 ; il ne reçoit pas un accès SQL direct.**

---

## 11. Pourquoi cette architecture ?

### Rapidité
Fundamental filtre avant d’envoyer les informations au Supervisor.

### Coût IA
Moins de texte inutile signifie moins de tokens envoyés au modèle.

### Qualité
Le contexte est plus ciblé et la provenance reste identifiable.

### Sécurité
Le stockage Fundamental reste privé derrière le service.

### Modularité
Le Globe, le Supervisor et les futures interfaces peuvent réutiliser les mêmes objets sans dupliquer la logique.

---

## 12. Résumé du pipeline

```text
INTERNET / APIs
      │
      ▼
COLLECTE
      │
      ▼
NORMALISATION
      │
      ├────────────► NEWS QUERY ─────┐
      │                              │
      ▼                              │
EVENT ENGINE                         │
      │                              │
      ├── Evidence                   │
      ├── Timeline                   │
      └── Synthèses ─────────────────┤
                                     ▼
                                ROUTER / CP1
                                     │
                                     ▼
                                 SUPERVISOR
```

**Fundamental renseigne. Supervisor orchestre. Risk contrôle le risque. Trading exécute.** Ces responsabilités doivent rester séparées.
