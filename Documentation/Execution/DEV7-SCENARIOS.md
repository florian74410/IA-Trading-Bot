# IA-TB 2.6.0-dev.7 — simulations de refus et d’incidents

Périmètre : demandes manuelles OKX Spot Market confirmées, configuration LIVE conservée à true. Aucun compte réel, aucune clé réelle, aucun ordre réel ; les fournisseurs externes sont simulés.

## Ce qui a été simulé

41 cas de demandes et de confirmations : précision du montant, ambiguïté achat/vente, montant négatif, solde insuffisant, frais non couverts, solde inconnu, frais inconnus, vente sans crypto disponible, minimum d’instrument, taille de position, spread, profondeur du carnet, données périmées, décision REVIEW, indisponibilité Risk, historique null, type Limit non pris en charge, compte Demo, lecture seule, expiration, digest modifié, annulation, modification du compte, révocation de session, baisse de solde, variation du prix, identifiants manquants, arrêt Trading, Firewall désactivé, jeton Risk expiré, paramètres altérés, rejet OKX, timeout réseau, HTTP 503, code OKX 50004, réponse vide, ACK sans ordId, confirmations concurrentes, reprise après ACK, reprise après résultat inconnu et isolation entre propriétaires.

Le résolveur local, l’état du ChatBot, les calculs Risk, le Gate, la liaison d’intention, le moteur Trading, l’adaptateur OKX et les bases SQLite sont les modules réels. La suite ciblée injecte les fautes aux frontières des services et du broker ; elle ne prétend pas que ses appels de pont en mémoire sont du transport réseau réel.

Cette suite est complétée par le test entre vrais processus Core/Auth21 TLS, Supervisor, Router, Risk, Portfolio, Firewall et Trading. Celui-ci vérifie le parcours accepté puis trois cas négatifs : fonds insuffisants avant envoi, rejet explicite du broker et résultat inconnu avec code 50004. Les requêtes broker signées et leur nombre sont vérifiés par le fournisseur fictif. Le cycle Trading est RUNNING dans cette fixture isolée ; les contrôles ADMIN START sont testés séparément. Pour les cas devant atteindre le broker, le test laisse expirer le cache réel de carnet avant chaque nouvelle vérification : il ne modifie ni l’horloge ni les limites de fraîcheur de Risk.

## Défauts reproduits puis corrigés

La première exécution des 41 nouveaux scénarios sur la base dev.6 donnait 30 succès et 11 attentes non satisfaites. Cela ne signifie pas 11 ordres indus : certains problèmes concernaient la clarté de la réponse et la qualification d’un refus.

- Solde insuffisant : le refus existait, mais son explication était trop générique. Une réponse française indique maintenant que le solde doit couvrir montant et frais ; les motifs techniques restent disponibles pour le diagnostic.
- Préparation annulée : une confirmation tardive retourne maintenant CANCELLED, au lieu d’un résultat inconnu.
- Blocages certains avant envoi : arrêt Trading, identifiants indisponibles, Firewall désactivé, autorisation expirée et liaison d’ordre altérée sont distingués des timeouts après tentative. Ils restent BLOCKED, sans requête broker.
- Réponses broker ambiguës : HTTP 503, code 50004, réponse vide et succès sans identifiant d’ordre sont UNKNOWN, et non des rejets certains. La réservation est conservée, sans retry automatique ; une nouvelle préparation du même compte reste bloquée jusqu’à réconciliation.
- Rejet explicite entre processus : le Router supprimait le détail structuré de la réponse d’erreur du moteur. Il transmet désormais uniquement les champs bornés utiles d’un résultat d’ordre manuel CP1 validé, avec contrôle de hash, identifiant de demande, action et Engine. Une réponse malformée reste ambiguë ; aucune réponse brute, clé, signature ou en-tête fournisseur n’est transmise.
- Journaux : le cycle de vie Trading utilise le même classificateur de réponse que l’adaptateur OKX et conserve UNCERTAIN pour les résultats inconnus. Un ACK ou un résultat inconnu ne crée pas une position exécutée dans Portfolio.
- Interface : les erreurs de confirmation utilisent le message français fourni par Core. L’échec n’entraîne pas de retry automatique.
- Historique : les refus d’expiration, de digest et de révision de compte sont tracés pour une préparation connue. Une session révoquée ou une préparation d’un autre utilisateur ne permet pas de lire son journal.

## Résultats attendus

| Situation | Réaction attendue | Appels broker |
|---|---|---:|
| Montant manquant ou demande ambiguë | Clarification, aucune exécution | 0 |
| Fonds insuffisants, y compris les frais | Refus compréhensible, bouton non confirmable | 0 |
| Donnée indispensable null, périmée ou invalide | Préparation bloquée | 0 |
| Historique statistique absent | Null conservés ; les autres contrôles restent obligatoires | 0 avant confirmation |
| Refus Risk, REVIEW ou limites dépassées | Aucun contournement par confirmation utilisateur | 0 |
| Compte/session/confirmation invalides | Refus | 0 |
| Annulation avant confirmation | CANCELLED | 0 |
| Refus certain avant envoi | BLOCKED | 0 |
| Rejet explicite OKX | REJECTED, conservé sans retry | 1 |
| Réponse perdue ou ambiguë | UNKNOWN_RECONCILIATION_REQUIRED, pas de nouvel envoi | 1 tentative simulée |
| Double confirmation ou redémarrage après ACK | Même résultat conservé, un seul ordre | 1 au total |

Les résultats détaillés, les réponses utilisateur observées et les traces par cas sont dans `Results-dev7/order-scenarios.json` et le tableau `SCENARIO-MATRIX.md`. Les 5 tests supplémentaires de journal durable couvrent ACK, rejet, 50004, HTTP 503 et réponse vide. Le test de transport vérifie également que les détails d’un rejet malformé ou appartenant à une autre demande ne sont jamais considérés comme une preuve de rejet.

## Reproduction

Avec Node 22 et les dépendances de App :

```sh
node --test --test-reporter=tap App/Core/Execution/order_scenarios.test.js
node --test --test-reporter=tap App/Core/Execution/rejection_transport.test.js
node --test --test-reporter=tap App/Portfolio/Tests/manual_order_pipeline.integration.test.js
node App/Tools/qualify_cp1_control.js
node App/Tools/Tests/SupervisorSimulator/run_validation.js /tmp/iatb-dev7-validation
```

Pour enregistrer les 41 cas ciblés seuls, définir `IATB_ORDER_SCENARIO_REPORT` vers le JSON de sortie. Le lanceur de régression le fait automatiquement dans son répertoire de résultats.

## Limites

Les montants, soldes et incidents des tests sont fictifs. La simulation confirme les réactions du logiciel dans les cas exercés, pas toutes les erreurs possibles d’un broker réel. Aucun appel OpenAI payant ni ordre OKX réel. La recette visuelle Chromium n’est pas refaite ici ; les vrais assets JavaScript sont exercés dans un DOM simulé. La réconciliation automatique des états inconnus reste hors périmètre : il faut vérifier OKX avant toute reprise.

Référence officielle pour 50004 : https://www.okx.com/en-eu/help/api-faq-eea — un timeout peut correspondre à une demande réussie ou échouée ; il ne faut pas en déduire un rejet certain.

## Validation finale de ce build

- Suite complète : **168/168 tests**, 38 fichiers, Node v22.23.5 ; zéro échec, ignoré ou annulé.
- Matrice utilisateur : **41/41 cas** ; 5 tests supplémentaires vérifient le journal durable Trading.
- Qualification CP1 : **12/12 tests** avec vrais processus isolés.
- Test réel des services : scénario accepté, fonds insuffisants, refus explicite OKX et résultat 50004 ambigu ; signature et nombre de requêtes vérifiés.
- Frontend : **4/4 tests** dans le DOM simulé, dont message d’erreur compréhensible et absence de double confirmation. Ces tests font partie de la régression complète.
- Aucun ordre broker réel, aucun déploiement VPS, aucune consommation OpenAI.

La version à utiliser pour les prochains essais est dev.7 : elle inclut les corrections révélées par ces simulations.

Livraison réalisée dans un checkout isolé pour exclure les modifications simultanées d’un autre chantier. Aucune fonction d’acceptation de dépassement Risk n’est incluse dans ce build : BLOCK et REVIEW restent bloquants. Les rapports de tests sont régénérés pour ce contenu exact.
