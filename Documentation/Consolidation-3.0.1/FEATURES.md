# État des capacités conservées

La qualification utilise des comptes et brokers fictifs. OPERATIONAL décrit le circuit testé, pas un accès prouvé à un compte d’exchange réel.

| Capacité | État | Portée et preuve |
|---|---|---|
| Core/Auth21, sessions, coffre et délégations | OPERATIONAL | Refus, expiration/révocation, isolation, signatures et rejeu : suite foundation/auth21 |
| Router / Function Registry | OPERATIONAL | 258 contrats comparés, 51 handlers qualifiés ; aucun nouvel octroi agent |
| Commandes agent non qualifiées | UNAVAILABLE | Refus explicite conservé ; détails dans FEATURE_MATRIX.json |
| ChatBot LOCAL et contrats HYBRID/OpenAI | OPERATIONAL | Contrats partagés et LLM MOCK ; aucun appel OpenAI payé |
| CognitiveRuntime et mémoire Supervisor | OPERATIONAL | Suites foundation/cognitive et supervisor-recovery |
| Ordres avancés manuels OKX | SIMULATED | 80 scénarios, fonds insuffisants, consentements, incertitudes et réconciliation ; accès régional réel non validé |
| Risk manuel | OPERATIONAL | Blocage initial, acceptation explicite des avertissements, contraintes impératives non contournables, null/N/C |
| Firewall | OPERATIONAL | Passage obligatoire et refus de contournement, signatures, isolation ; client Risk via Router CP1 |
| Portfolio propriétaire, historique et outbox | OPERATIONAL | Projections et reprises fictives, absence de faux succès sur ACK seul |
| MarketData / Fundamental / Indicators / Liquidity | OPERATIONAL | Lectures qualifiées, données fixtures, unités existantes ; persistance Fundamental/Custom testée |
| Strategy | READ_ONLY | Évaluations et statistiques autorisées, jamais d’ordre autonome ; pas une absence de tout effet sur ses statistiques |
| UI/Companion, consentements et notifications | OPERATIONAL | Recette Chromium exigée sur le commit livré ; résultats et captures dans artifacts CI |
| DrainingStop de production et récupération automatique de positions | PARTIAL | Simulation/rejets qualifiés ; provider broker non qualifié reste refusé |
| Création libre d’indicateurs par le Supervisor | NOT_IMPLEMENTED | Pas ajoutée au titre du nettoyage ; chantier distinct |
| Supervision financière autonome génération 3 | NOT_IMPLEMENTED | Aucun nouveau pouvoir d’exécution introduit |
| Installation et recette du compte utilisateur / VPS | UNAVAILABLE | Non exécutées dans cette mission ; sources et procédure documentaire livrées |

Les chemins de tests détaillés, et non seulement les états agrégés, sont dans ENGINE_INVENTORY.json et les rapports JSON/TAP. Une commande owner-only n’est pas déclarée absente du produit du seul fait qu’elle reste interdite aux agents.
