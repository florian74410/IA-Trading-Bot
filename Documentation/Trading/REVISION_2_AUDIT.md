# IA-TB 3.0.1 — révision 2 : audit et correctifs

Révision de départ préservée : `0f1e4ec7dc15b7567838faf4a2b5bd841cc28313`, branche AdvancedOKX Rev1. Branche de correction : `feature/iatb-3.0.1-Rev2-advanced-okx-orders`. Le runtime conserve la version `3.0.1-dev.1` et le statut DEBUG ; `App/REVISION` et le manifeste identifient la distribution `3.0.1_Rev2`.

## Erreurs confirmées et corrigées

| Défaut | Correction | Preuve prévue dans la qualification |
|---|---|---|
| Q12 : réservation d'un enfant de plan non réconciliée | Réconciliation en lecture des enfants et de la racine ; verrou commun avec l'avancement du plan | Suite T01–T65 et Q01–Q12, notamment Q11 suivi de Q12 |
| Enfant financier accessible sans vérifier la confirmation du plan | Liaison persistante enfant/parent ; vérification propriétaire/session/empreinte/expiration du plan avant exécution | Parcours du plan, confirmations exactes et contrôles Core |
| Erreur d'une étape indépendante interrompant la boucle | Échec explicite persistant de l'étape, poursuite des indépendantes, annulation des dépendantes | Tests de plans et refus |
| Événements écrits uniquement dans le Portfolio global | Projection dans le namespace propriétaire existant, dans une transaction, dédupliquée ; retry après écriture partielle | Tests `manual_projection` et Q12 utilisant la lecture privée Auth21 |
| Positions mélangées entre comptes/propriétaires | Clé de reconstruction incluant propriétaire et compte | Test privé multi-propriétaire et multi-compte |
| `posSide=net` affiché comme une direction | Direction reconstruite depuis le sens effectif, sans position fictive NET | Test positions LONG/SHORT réelles issues des fills |
| Vente Spot recréant une position SHORT | Réduction de l'inventaire suivi ; réduction sans coût d'entrée conservée en événement et métriques agrégées N/C | Test vente Spot sans historique et achat/vente suivis |
| Frais OKX de signe opposé à un coût | Coût normalisé, signe broker conservé ; conversion actif de base vers quote uniquement avec prix du fill connu | Frais débités, rebates, frais en base, valeur manquante |
| Addition de devises sans conversion vérifiée | N/C sur les agrégats lorsque la devise de valorisation manque ; prix et frais de position conservent leur devise | Tests `FX_RATE_UNAVAILABLE`, métriques null |
| Fills duplicables par un plan de gestion différent | Identité stable propriétaire/compte/ordre/trade indépendante du plan d'observation | Test de déduplication inter-plans |
| Ordre enfant d'algorithme confondu avec son identifiant parent | Lien broker durable, vérification du lien puis lecture du résultat/fills ; identifiant algo conservé | T22 et suivi algorithmique |
| ACK algo/levier pris pour une réponse d'ordre standard inconnue | État technique obtenu depuis la réponse typée ; réconciliation met à jour le journal d'opérations | Levier vérifié et journal `RECONCILED` ; ambiguïtés conservées |
| Nouvelles commandes exécutables sans empreintes qualifiées | Barrière de qualification native dans Core et Trading ; preuves de compilation couvrant les dépendances de sécurité partagées | Qualification CP1, contrat inconnu refusé, agents toujours DENY |
| Test de crash T45 trop précoce | Injection exclusivement au transport fictif, après réservation durable et avant HTTP ; SIGKILL réel | T45, zéro mutation reçue, état incertain préservé après reprise |
| Rapports perdus dans `/tmp` | Résultats dans le dépôt/artifacts et écriture incrémentale après chaque scénario | JSON/TAP conservés et artifact CI |
| Consentement inaccessible au clavier | Navigation dans les contrôles actifs de la boîte de dialogue | Test Chromium clavier/checkbox/empreinte/double clic |
| Tests de non-régression trop liés au format | Reconnaissance Auth21 insensible aux espaces/guillemets ; exception OWNER explicitement limitée au nouveau contrat Risk | Tests statiques conservés et barrières réseau réelles |
| Rejeu d'un ticket libéré classé seulement invalide | Empreintes bornées des tickets consommés jusqu'à leur expiration | Test de rejeu historique conservé |

## Périmètre conservé et limites

Aucun Engine ou Supervisor parallèle. Core/Auth21, Router CP1, Risk, Firewall, Trading et les stores existants restent les autorités. Les agents cognitifs restent interdits de mutation financière. Les avertissements analytiques peuvent être acceptés explicitement ; les autorisations, confirmations, règles d'instrument, arrêt d'urgence et ambiguïtés pouvant dupliquer un ordre restent impératifs.

Les capacités qualifiées restent limitées à celles décrites dans la matrice : dérivés linéaires, Margin mode 2 vérifié, batch Spot explicite sur un même instrument, 20 étapes/ordres au maximum. Les réservations de ressources partagées restent conservatrices et peuvent imposer une sérialisation des demandes. Pas de Trailing amend, contrats inverses, Options, changement de mode du compte, compensation financière automatique ou taille future de protection devinée.

La qualification est exclusivement simulée avec identités, clés, prix et broker fictifs. Le préchargement du simulateur redirige le transport OKX vers un serveur HTTP loopback, bloque les autres connexions réseau dans les processus testés et contrôle les signatures fictives. Les tests de navigateur bloquent les requêtes hors de la page locale. Cela ne prouve pas l'accès d'un compte OKX EU réel à chaque marché.

## Livraison et retour arrière

Le constructeur complet existant produit `IA-TB-3.0.1_Rev2_FULL-SOURCE_VPS.zip`, son SHA-256 et un `BUILD.json` listant le commit et les empreintes de tous les fichiers distribués. Sources des tests, assets, infrastructure, interfaces et scripts VPS sont conservés ; secrets, dépendances, bases runtime et sorties générées des tests sont exclus du ZIP.

Le déploiement n'est pas exécuté. Pour une installation ultérieure, utiliser un répertoire de release distinct, vérifier le SHA-256 et `verify_source_bundle.py`, installer Node 22 et les dépendances épinglées avec les scripts VPS existants, puis le préflight. Les données Auth21 doivent rester hors des sources. Le démarrage SAFE et l'arrêt d'urgence doivent être vérifiés avant toute nouvelle autorisation manuelle.

Le rollback consiste à arrêter la nouvelle release et repointer vers le répertoire Rev1 conservé. Les ajouts SQLite sont compatibles avec les anciens lecteurs ; ne pas supprimer les journaux et réservations ni restaurer aveuglément une base antérieure si une opération broker était incertaine. Cette procédure reste documentaire : aucun VPS n'est modifié pendant la mission.

La CI Rev2 fixe Ubuntu 24.04 : le premier essai sur `ubuntu-latest` a révélé Ubuntu 26.04, incompatible avec la version Playwright épinglée. Ce correctif de reproductibilité conserve la version testée du navigateur.

Non-régression complémentaire : l’ancien test du calendrier exigeait `calendarUnifiedEvents`, remplacé dans l’interface existante par les panneaux FED et Finance Calendar. L’assertion contrôle maintenant leurs grilles, listes et appels de rendu. Aucun changement de l’interface du calendrier ; les 23 tests associés passent.
