# Fundamental Engine V3

## Rôle

**Fundamental :8015** transforme des publications hétérogènes en information structurée : sources → items bruts → événements → preuves → score/corroboration → timeline → synthèse.

Il est explicitement **INFORMATION_ONLY** : aucune commande de trading n'est émise.

## Pipeline

```text
RSS / Web / X providers
        │
        ▼
     Collector
        │
   Raw publications
        │
        ▼
   Event Engine ──► regroupement
        │
        ├──► détection assets/domaines
        ├──► Bias heuristic
        ├──► Corroboration scoring
        └──► timeline / evidence
        │
        ▼
  Fundamental CP/1
        │
        ├──► UI Fundamental
        ├──► Strategy
        └──► Synthèse IA OpenAI à la demande
```

## Event Engine

Il extrait des tokens, détecte des actifs (BTC, ETH, SOL, etc.), classe des domaines (sécurité, régulation, macro, monétaire, adoption, réseau crypto) et rapproche une nouvelle publication d'événements récents. Un seuil de similarité et le recouvrement d'actifs aident au regroupement.

## Corroboration

Le score tient compte de la qualité des sources, du nombre de groupes indépendants, du nombre de sources et des contradictions. Les états incluent **UNCLASSIFIED, UNCONFIRMED, CONFIRMED, CONTRADICTED**.

Plusieurs articles ne sont pas automatiquement considérés comme des confirmations indépendantes.

## Bias

Une heuristique lexicale peut produire BULL/BEAR/NEUTRAL/MIXED/UNKNOWN avec confiance. C'est une **aide informationnelle UI**, pas un signal de trading ni une prévision.

## Synthèse IA

La synthèse OpenAI est appelée à la demande. Le contexte externe est marqué comme **UNTRUSTED_FUNDAMENTAL_DATA**. Le prompt interdit d'exécuter les instructions trouvées dans les publications et demande de distinguer qualité de source, vérité, tonalité et limites.

La réponse structurée contient headline, overview, marketTone, confidence, thèmes, points à surveiller et limitations.

## CP/1

Le registre expose health/status/capabilities, news, events/evidence, sources/feeds, collecte, synthèses, historique, observabilité/logs, analyse, timeline et discovery/diagnostic.

Les événements CP/1 incluent promotion/confirmation d'événement, changement de bias et changement de qualité des données.
