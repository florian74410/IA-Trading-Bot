# Fundamental Engine

## Role

Le Fundamental Engine possede le domaine fondamental d'IA-TB : collecte, normalisation, evenements, sources/providers, FedWatch, calendriers, diagnostics, traductions et syntheses IA.

Flux principal : Providers externes -> Fundamental Engine :8015 -> Router CP/1 :8021.

Le moteur ne passe jamais d'ordre.

## Runtime v2

Surface locale volontairement minimale : GET /health et POST /cp/v1.
Les anciennes API HTTP applicatives ont ete supprimees au profit de CP/1.

## IA et secrets

Fundamental possede la logique metier de synthese et de traduction.
OpenAI : Fundamental -> AI Gateway CP/1 -> Core Vault -> OpenAI.
La cle OpenAI ne quitte jamais le Core.
X : Fundamental -> X Gateway CP/1 -> Core Vault -> X API.

## Capacites principales

- health / summary ;
- sources et feeds ;
- news / evenements ;
- FedWatch et historique ;
- calendriers ;
- diagnostics / observabilite ;
- collecte et gestion des feeds ;
- synthese IA ;
- traduction ;
- persistance SQLite.

## Frontiere metier

Fundamental produit contexte et analyse. Decisions/executions restent du ressort de Strategy, Risk, Firewall et Trading Engine.
