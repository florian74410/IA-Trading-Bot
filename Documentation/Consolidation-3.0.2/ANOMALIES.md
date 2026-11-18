# Anomalies complémentaires

Les douze anomalies de consolidation et leurs identifiants restent dans le rapport 3.0.1. ERR-012 a passé la construction et l’inspection réelles des deux images Docker dans la CI 44296193948 ; ces contrôles sont répétés pour 3.0.2.

ERR-013 (P2) : le test de redimensionnement Firefox lit parfois un rendu avant l’autre après 100 ms fixes. Le log initial est conservé. L’attente est remplacée par une condition sur les timestamps et géométries réellement affichés ; toutes les égalités et assertions d’alignement sont conservées. La CI du commit 3.0.2 doit confirmer le correctif ; aucun test n’est ignoré.

ERR-014 (P1) : représentation minimale de certaines clés générées, reproduite déterministement. La correction EVM seule ne suffisait pas : le test Bitcoin révèle le même défaut de largeur WIF. Après normalisation des deux représentations nouvelles, références ethers et réimport WIF conservent clé/adresse. Les tests refusent toujours les imports invalides ; les coffres existants ne sont pas modifiés. IMPACT-004 a précédé la correction. Les dépendances concernées sont ajoutées aux empreintes des parcours financiers, puis toute la qualification est répétée.

La première tentative 3.0.2 a passé les groupes métier mais manqué les modules Acorn isolés pour les tests de migration ; l’environnement a été corrigé, sans modifier ces tests. Le rapport d’échec est conservé.
