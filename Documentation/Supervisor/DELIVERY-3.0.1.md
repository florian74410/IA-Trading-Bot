# Livraison Supervisor Engine 3.0.1 — rapport final

Candidat DEBUG `3.0.1-dev.1`. Validation locale : **PASS**, zéro échec obligatoire. Aucun déploiement, ordre LIVE ou appel IA payant.

Source produit : `88d6796ccbc7038c63dce80b0f74fb76b389e138` sur `feature/iatb-3.0.0-dev.1-supervisor-foundation`. Commit de code testé : `79f1869d3dbdc69a80a27594d991b896b696630b`. La livraison ajoute les registres requalifiés, les preuves et le paquet. Branche : `fix/iatb-3.0.1-supervisor-foundation`.

[Branche GitHub](https://github.com/florian74410/IA-Trading-Bot/tree/fix/iatb-3.0.1-supervisor-foundation) · [Correctifs, migration, installation et rollback](FOUNDATION-3.0.1.md) · [Résumé machine](Results-3.0.1/final/summary.json) · [Fichiers modifiés](Results-3.0.1/final/changed-files.json)

## Résultats réels

| Groupe | Réussis | Échecs | Ignorés | Durée (s) |
|---|---:|---:|---:|---:|
| qualification | 12 | 0 | 0 | 31.6 |
| foundation | 53 | 0 | 0 | 1.2 |
| cognitive | 13 | 0 | 0 | 3.6 |
| auth21 | 67 | 0 | 1 | 39.7 |
| regression | 169 | 0 | 0 | 119.9 |

Total : 314 exécutions réussies, 0 échec, 1 test ignoré. Les suites de qualification, cognitive et régression se recouvrent : ce total ne correspond pas à un nombre de cas uniques. Chaque cas et son statut se trouvent dans les JSON/TAP du groupe.

Le test ignoré est le test de CLI TTY administrateur sous identité système non privilégiée : ce conteneur ne fournit que l’identité système UID 0. Les autres tests de sessions, permissions, TLS et CSRF sont exécutés. Il ne compte pas comme succès.

## Capacités démontrées

- Objectif et espace propriétaire conservés après fermeture/réouverture SQLite, redémarrage du service et renouvellement de session.
- Types JSON conservés, filtrage récursif et limites d’entrée ; migration transactionnelle et sauvegarde privée avant v2.
- Historique des objectifs, isolation entre propriétaires et contextes ; réponses tardives refusées après changement d’objectif.
- Métadonnées et TTL distincts ; FRESH, STALE et UNKNOWN séparés dans la mémoire et dans la requête CognitiveRuntime MOCK.
- Découverte et observation via les vrais transports Auth21 HTTPS, Core, Router, Supervisor, Gateway et Engines, avec refus par défaut, révocation, timeouts et source qualifiée.
- Trois lectures concurrentes, 100 écritures, quatre écrivains SQLite, intégrité après SIGKILL et rollback d’une transaction interrompue.
- Aucun changement de fournisseur ne réinitialise la mémoire ; les données des Engines ne sont pas injectées dans les instructions système.
- Les quatre commandes Supervisor Engine restent OWNER-only. Les commandes financières ne sont pas accordées à cet agent.

## Registres et CI

La qualification garde les empreintes d’implémentation et de contrats pour les commandes agent et renforce aussi celles des commandes propriétaire natives. Les permissions restent DENY par défaut ; les écritures mémoire et les évaluations sont identifiées dans les manifestes. Les quatre routes Engine sont testées par HTTP Auth21 puis CP1.

Le workflow `.github/workflows/supervisor-v3-audit.yml` ne contient plus `continue-on-error`. Un groupe obligatoire échoué impose un code de sortie non nul et un job FAILED ; les rapports restent téléversés avec `if: always()`. Seuls JSON/TAP et le build source sont publiés, aucune base privée. Le statut distant est celui de l’exécution GitHub Actions associée au commit de livraison ; le présent tableau atteste les exécutions locales.

## Erreurs héritées et limites

L’ancien MACHINE_PROOF_INVALID n’est pas reproduit dans les deux essais isolés conservés, la qualification ni la régression finale. Son origine historique n’est pas établie ; aucune vérification de signature, d’identité ou de destination n’est affaiblie. Une collision EADDRINUSE a été constatée séparément dans l’allocateur de ports des fixtures puis corrigée avec un test déterministe. Ne pas confondre ce fait avec une preuve de cause du défaut cryptographique historique.

La récupération est explicite avec `discover(recover=true)`, elle ne constitue pas une boucle autonome. Les valeurs historiques dev.1 déjà doublement encodées restent des chaînes de type incertain et sont UNKNOWN ; elles ne sont pas devinées. La mémoire persistante nécessite de conserver le volume privé runtime. Le filtrage de secrets est déterministe, pas une garantie universelle de détection de texte sensible. Aucune stratégie autonome, sous-agent, commande financière du Supervisor ni validation de broker réel.

## Nettoyage et build

Aucun test ou module produit historique n’est supprimé. L’inventaire décrit les fixtures et rapports ; les sorties générées `App/artifacts/` sont ignorées. Deux assertions expérimentales sont adaptées à la nouvelle politique de continuité et au schéma v2, avec maintien des vérifications d’isolation. L’assertion statique d’entrée HTTP reconnaît le wrapper sécurisé actuel et est complétée par les dix services réellement démarrés.

Le build complet est `IA-TB-3.0.1-dev.1-debug-source.zip`, avec inventaire SHA-256 et fichier `.sha256`. Le reçu `Results-3.0.1/build-verification.json` est volontairement externe au ZIP pour éviter une auto-référence de hash. Le build est reconstruit deux fois puis vérifié membre par membre. Les versions App, package, manifestes et registres portent le candidat DEBUG ; aucune release stable ni modification de main.
