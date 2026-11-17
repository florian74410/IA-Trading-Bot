# Simulation des demandes utilisateur — dev.7

**41/41 scénarios validés.** Broker fictif ; aucun ordre réel.

La colonne requêtes compte les tentatives observées par le transport broker simulé sur tout le scénario. Une tentative avec résultat inconnu ne prouve pas un fill.

| Cas | Réponse observée | Requêtes broker | Vérification |
|---|---|---:|---|
| Demande incomplète : demander le montant, sans ordre ni préparation | Quel montant ou quelle quantité souhaites-tu engager ? | 0 | PASS |
| Acheter ou vendre : demander une clarification sans exécuter | La demande est ambiguë. Précise une seule opération, son sens et son marché. | 0 | PASS |
| Montant négatif : invalider la demande sans réutiliser un ancien montant | Un paramètre est invalide. Précise un montant positif et des paramètres cohérents. | 0 | PASS |
| Fonds insuffisants : bloquer et expliquer le manque de solde | Cette préparation est expirée ou bloquée. Demande un nouveau récapitulatif. | 0 | PASS |
| Montant disponible égal à l’achat, sans réserve pour les frais : bloquer | Fonds insuffisants ou solde disponible non vérifiable pour couvrir le montant et les frais. Aucun ordre n’a été envoyé. | 0 | PASS |
| Solde null : ne pas inventer un solde disponible | Fonds insuffisants ou solde disponible non vérifiable pour couvrir le montant et les frais. Aucun ordre n’a été envoyé. | 0 | PASS |
| Frais null : rendre la préparation non confirmable | Les frais du compte ne sont pas disponibles. Une nouvelle vérification est nécessaire. Aucun ordre n’a été envoyé. | 0 | PASS |
| Vente sans assez de crypto : bloquer sans envoyer de vente | Quantité de crypto disponible insuffisante ou non vérifiable pour cette vente. Aucun ordre n’a été envoyé. | 0 | PASS |
| Montant inférieur au minimum d’instrument : bloquer | Le montant ne respecte pas les contraintes vérifiées de l’instrument, ou ces contraintes sont indisponibles. Aucun ordre n’a été envoyé. | 0 | PASS |
| Limite de taille/exposition Risk dépassée : refuser | Le montant dépasse la limite de taille de position définie par Risk. Aucun ordre n’a été envoyé. | 0 | PASS |
| Spread excessif : refus Risk | L’écart entre les prix acheteur et vendeur est trop élevé. Aucun ordre n’a été envoyé. | 0 | PASS |
| Carnet sans profondeur suffisante : aucune exécution partielle implicite | Risk ne permet pas cet ordre : des données indispensables sont manquantes ou une limite est dépassée. Aucun ordre n’a été envoyé. | 0 | PASS |
| Carnet périmé : demander des données vérifiables | Les données sont trop anciennes ou non datées. Une nouvelle vérification est nécessaire ; aucun ordre n’a été envoyé. | 0 | PASS |
| Risk demande une révision : la confirmation utilisateur ne vaut pas autorisation | Risk demande une révision : cet ordre ne peut pas être confirmé. | 0 | PASS |
| Risk indisponible : aucun accord de remplacement | La demande ne peut pas être exécutée pour le moment. | 0 | PASS |
| Premier ordre sans historique : null conservés et préparation possible | Ordre Spot réel préparé ; confirmation requise. | 0 | PASS |
| Ordre Limit hors périmètre : refus explicite sans changement silencieux en Market | Cette version accepte uniquement les achats et ventes Spot Market simples, sans levier ni protections attachées. | 0 | PASS |
| Compte Demo sélectionné pour une demande Live : bloquer | Ce compte ne permet pas cet ordre réel : vérifie son activation, ses permissions et le mode Demo/Live. | 0 | PASS |
| Compte en lecture seule : aucune demande d’ordre | Ce compte ne permet pas cet ordre réel : vérifie son activation, ses permissions et le mode Demo/Live. | 0 | PASS |
| Préparation expirée : confirmation refusée | Cette préparation est expirée ou bloquée. Demande un nouveau récapitulatif. | 0 | PASS |
| Digest modifié : refus et aucune mutation | Cette préparation ne correspond pas à ta session ou à la confirmation reçue. | 0 | PASS |
| Préparation annulée : répondre Annulée, sans prétendre à un résultat inconnu | Préparation annulée. Aucun ordre n’a été envoyé. | 0 | PASS |
| Compte modifié après préparation : nouvelle préparation requise | Le compte a été modifié depuis la préparation. Demande un nouveau récapitulatif. | 0 | PASS |
| Session révoquée : refus de confirmer | Ta session est expirée ou révoquée. Reconnecte-toi avant de continuer. | 0 | PASS |
| Solde diminué entre préparation et confirmation : nouveau Risk refuse | Fonds insuffisants ou solde disponible non vérifiable pour couvrir le montant et les frais. Aucun ordre n’a été envoyé. | 0 | PASS |
| Prix devenu trop différent : nouvelle confirmation nécessaire | Le prix ou les frais ont changé. Prépare et confirme un nouveau récapitulatif. | 0 | PASS |
| Identifiants indisponibles : blocage avant envoi au broker | Les identifiants du compte sont indisponibles ou incomplets. Aucun ordre n’a été envoyé à OKX. | 0 | PASS |
| Trading arrêté : blocage certain avant envoi, pas un ordre inconnu | Le moteur Trading est arrêté ou verrouillé. Aucun ordre n’a été envoyé à OKX. | 0 | PASS |
| Firewall désactivé : ordre refusé | Le pare-feu est désactivé : l’ordre est bloqué. | 0 | PASS |
| Autorisation Risk expirée avant Firewall : refus sans ordre | L’autorisation Risk est invalide ou expirée. Aucun ordre n’a été envoyé. | 0 | PASS |
| Montant altéré entre Risk et Trading : liaison refusée | Les paramètres ne correspondent plus à l’ordre approuvé. L’envoi est refusé. | 0 | PASS |
| Refus explicite OKX après vérification locale : REJECTED, sans retry | Ordre rejeté par OKX. | 1 | PASS |
| Résultat broker ambigu (timeout) : bloquer les retries et conserver l’état inconnu | Résultat à réconcilier avec OKX ; aucun renvoi automatique. | 1 | PASS |
| Résultat broker ambigu (http503) : bloquer les retries et conserver l’état inconnu | Résultat à réconcilier avec OKX ; aucun renvoi automatique. | 1 | PASS |
| Résultat broker ambigu (ambiguous50004) : bloquer les retries et conserver l’état inconnu | Résultat à réconcilier avec OKX ; aucun renvoi automatique. | 1 | PASS |
| Résultat broker ambigu (empty) : bloquer les retries et conserver l’état inconnu | Résultat à réconcilier avec OKX ; aucun renvoi automatique. | 1 | PASS |
| Résultat broker ambigu (noOrderId) : bloquer les retries et conserver l’état inconnu | Résultat à réconcilier avec OKX ; aucun renvoi automatique. | 1 | PASS |
| Deux confirmations concurrentes : un seul ordre | Ordre accepté par OKX. Cela ne confirme pas encore son exécution complète. | 1 | PASS |
| Redémarrage après ACK : résultat conservé, aucun renvoi | Ordre accepté par OKX. Cela ne confirme pas encore son exécution complète. | 1 | PASS |
| Redémarrage après réponse perdue : compte bloqué jusqu’à réconciliation | Résultat à réconcilier avec OKX ; aucun renvoi automatique. | 1 | PASS |
| Un autre utilisateur ne confirme ni ne consulte cet ordre | Ordre Spot réel préparé ; confirmation requise. | 0 | PASS |

Le résolveur, le ChatBot, Risk, Trading, l’adaptateur OKX et SQLite sont réels. Les ponts de cette matrice sont injectés en mémoire ; un test complémentaire entre vrais processus couvre aussi les refus et réponses ambiguës. [Rapport de livraison](DEV7-SCENARIOS.md) · [Résultats JSON](Results-dev7/order-scenarios.json).
