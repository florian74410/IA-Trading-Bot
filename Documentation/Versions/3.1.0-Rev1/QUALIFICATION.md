# Qualification 3.1.0 Rev1

Les comptes, historiques, clés et brokers des tests sont fictifs. Version de test locale Node 22.23.0. Les compteurs de suites peuvent se recouper.

| Contrôle | Commande ou preuve | Résultat |
| --- | --- | --- |
| Requalification des contrats et services réels isolés | `node App/Tools/qualify_cp1_control.js` | 93 tests réussis. Les signatures de contrat CP1 restent identiques. |
| Dix Engines | `node App/Tools/qualify_engine_units.js <rapport>` | 133 tests réussis, 69 fichiers testés, réseau limité au loopback. |
| ChatBot | `node --test App/Engines/Supervisor/ChatBot/Tests/hybrid.test.js` | 11 tests réussis en LOCAL, HYBRID et OPENAI simulé, dont les nouvelles consultations et l’analyse croisée. |
| Roles ADMIN et accès au rapport | `node --test App/Tools/Tests/user_management_v1.test.js` | Accès vérifié via Auth21/Core/Gateway TLS avec ADMIN, USER, GUEST et anonyme. Le test TTY multi-UID est ignoré par ce conteneur. |
| Audit du code et préflight | `node Tools/Architecture/Rev3/check.js`, `python3 Tools/Architecture/Rev3/audit.py <rapport>`, `node Tools/Architecture/Rev3/check_yaml.js`, `bash Deploy/VPS/preflight.sh --source-only` | Vérifications source et cohérence de version. |
| Chromium | `IATB_ATLAS_BROWSER=1 node --test App/Tools/Tests/user_management_v1.test.js` | Démarrage local bloqué sur le socket de profil. Test navigateur ajouté au workflow de CI. |
| Firefox et Docker | Navigateur Firefox et moteur Docker absents dans l’environnement local | Essais Firefox et builds/validation Compose Docker non exécutés localement. |
| Recette financière réelle | Aucun lancement avec un compte réel | Mode Demo ChatBot et capacité de chaque compte réel à qualifier séparément. |

La [CI 3.1.0 Rev1](https://github.com/florian74410/IA-Trading-Bot/actions/workflows/iatb-310-rev1.yml) inclut Compose, les images Docker, les suites Auth21/CP1/Trading et les interactions Atlas sous Chromium. Elle vérifie aussi le ZIP par deux constructions et une exécution depuis l’extraction.
