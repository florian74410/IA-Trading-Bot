# Qualification — IA-TB 3.0.1 Rev2

Source de reprise : `0f1e4ec7dc15b7567838faf4a2b5bd841cc28313`. La branche Rev1 et ses sauvegardes restent conservées. Branche de livraison : `feature/iatb-3.0.1-Rev2-advanced-okx-orders`.

## Résultats locaux

Node **22.23.0**, dépendances applicatives épinglées : **408 exécutions PASS, 0 FAIL, 1 SKIP**. Le SKIP concerne une vérification de permissions avec UID non privilégié indisponible dans le conteneur local. Le rapport référence le commit de départ car les corrections se trouvaient encore dans le working tree pendant cette validation ; leurs empreintes sont consignées séparément. Ce résultat n'est pas attribué rétroactivement à la Rev1.

| Groupe | PASS | FAIL | SKIP |
|---|---:|---:|---:|
| Qualification CP1, owner pipelines et 80 scénarios avancés | 93 | 0 | 0 |
| Foundation et context recovery | 53 | 0 | 0 |
| Mémoire et runtime cognitif | 13 | 0 | 0 |
| Auth21 et isolation | 67 | 0 | 1 |
| Non-régression générale, ChatBot, Firewall, Trading, Risk, Portfolio | 170 | 0 | 0 |
| Contrats avancés, outbox et projection Portfolio | 12 | 0 | 0 |
| **Total des exécutions** | **408** | **0** | **1** |

Ce sont des exécutions de tests, et non un nombre de cas uniques : certains fichiers participent à plusieurs groupes. Les 80 scénarios sont inclus dans la première ligne ; le test parent est également compté dans TAP. Les 65 scénarios obligatoires et les 15 complémentaires sont tous réussis.

Une vérification CI complémentaire du calendrier a identifié une ancienne assertion sur un conteneur remplacé par les deux panneaux FED et Finance Calendar. Le contrat a été aligné sur les conteneurs et les renderers réellement présents ; les **23 tests** de cette suite passent localement, en complément du total ci-dessus. Rapport : [calendar-regression.tap](Results-Rev2/local/calendar-regression.tap).

## CI et navigateur

Le workflow [IA-TB 3.0.1 Rev2](https://github.com/florian74410/IA-Trading-Bot/actions/workflows/iatb-301-rev2.yml) est obligatoire pour valider le commit publié. Il installe Node 22, les dépendances épinglées et Chromium, puis exécute la même suite, l'interface héritée et les nouveaux contrôles de consentement au clavier, d'empreinte exacte, de notification et d'affichage mobile. Il vérifie aussi les scripts VPS, le paquet complet, son inventaire et sa reproductibilité dans le runner.

Chromium ne peut pas démarrer dans le conteneur local : la création du socket Unix de son profil est interdite. Ce blocage n'est pas assimilé à un PASS d'interface. Les résultats du navigateur et les captures sont publiés dans l'artifact CI. Le commit distribué et le résultat effectif du workflow doivent être contrôlés avant de considérer la livraison qualifiée.

## Preuves et sécurité

- [Audit des correctifs et points de contrôle](REVISION_2_AUDIT.md)
- [Résumé local complet](Results-Rev2/local/rev2-summary.json)
- [Scénarios détaillés](ADVANCED_ORDER_SCENARIOS.md)
- [Rapport Auth21](Results-Rev2/local/auth21.json)
- [Empreintes de qualification des contrats](../../App/Core/FunctionRegistry/Control/qualification.json)

Les nouvelles mutations restent `hard_deny` pour les agents cognitifs. Une confirmation est liée au propriétaire, au compte, à la session, au plan, à l'opération exacte, aux diagnostics et à l'expiration. Risk demeure une barrière technique d'activation ; ses métriques analytiques sont informatives et peuvent être acceptées explicitement. L'arrêt d'urgence, les ressources concurrentes incompatibles, une cible absente et une ambiguïté pouvant dupliquer un ordre ne sont pas contournables.

Les opérations réelles/Demo et le déploiement VPS n'ont pas été effectués. Les coûts, frais, funding, liquidation et conversions de devises manquants restent N/C. Les limites de marchés et de types d'ordres sont décrites dans la matrice. La qualification simulée ne prouve pas la disponibilité d'un marché sur un compte OKX EU réel.

## Distribution

Archive complète : `IA-TB-3.0.1_Rev2_FULL-SOURCE_VPS.zip` avec son fichier `.sha256`. `BUILD.json` contient le commit distribué et les empreintes de chaque source. Les résultats générés et les bases privées ne sont pas inclus dans le ZIP ; les tests et simulateurs sont conservés dans les sources. La procédure de déploiement et le rollback sont décrits dans l'audit ; aucun de ces gestes n'est exécuté pendant cette livraison.
