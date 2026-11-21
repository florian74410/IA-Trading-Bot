# IA-TB 3.1.0_FINAL — candidat de recette

Base auditée d2ca5019, après b304f65e et ea4038a2. L’identifiant technique désigne le contenu du ZIP. La décision de publication finale dépend des preuves ci-dessous.

| Entrée | Rôle et environnement | Résultat et preuve |
| --- | --- | --- |
| Paramètres → Trading → compte OKX | USER ou ADMIN | Sélecteur Demo/Live par affectation. Nouveau compte en Demo par défaut. Les préférences et les clés passent par le coffre existant. |
| ChatBot → ordre manuel OKX | Propriétaire, route avancée, broker fictif | Tests T01, T03, T08 et T48. Achat, ouverture, annulation et reprise avec Live désactivé. Le serveur de test exige le marqueur Demo sur chaque requête. |
| Confirmation → Risk → Firewall → Trading → Portfolio | Propriétaire, broker fictif | Suite advanced_orders.integration.test.js. Contrôle de la révision du compte et de l’environnement lors de la préparation et de la confirmation. |
| Flux Fundamental → SQLite | ADMIN, Gateway et quatre Engines isolés | auth21_multi_engine_business_e2e.test.js. Flux retrouvé dans la base résolue par le runtime. Le Core de session utilise une fixture. |
| Paramètres → Risk | ADMIN | Formulaire verrouillé pendant la lecture et après erreur, relecture après sauvegarde. Recette navigateur à recouper avec la CI. |
| Market Data → Registry | Paramètres | Une erreur de lecture SQLite renvoie un nombre inconnu. Le tableau distingue registre vide et première synchronisation. |
| Fundamental → publications et FedWatch | Lecture | Date supérieure pour les publications récentes et la synthèse, conservation des taux manquants, libellé de réunion FOMC. Les sources externes et leur fraîcheur restent à vérifier. |

## Décision

Candidat de développement. La recette sur un véritable compte de démonstration OKX, la lecture privée Live et la comparaison du domaine public avec le reçu attendent un environnement autorisé. Aucune soumission financière réelle. La couverture des commandes individuelles, les intentions de réglage, les données externes, les zones Liquidity, la chaîne Strategy et l’affichage des soldes doivent encore être rapprochés des consommateurs.

Les deux CSV inventorient 258 commandes du code livré et 324 fiches historiques. La qualification d’un contrat décrit son appelant. Les colonnes de preuve individuelle restent ouvertes là où le test métier complet manque. Les scénarios sur transport local identifient leurs opérations par identifiant T ou Q.

[Procédure de préparation et retour VPS](../../../Deploy/VPS/README-3.1.0_FINAL.md)
