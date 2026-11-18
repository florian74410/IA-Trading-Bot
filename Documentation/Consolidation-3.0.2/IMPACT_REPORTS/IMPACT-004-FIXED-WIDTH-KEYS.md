# IMPACT-004 — représentation des scalaires secp256k1 générés

Statut avant correction : SECOND_PASS_REQUIRED, besoin démontré par la CI Supervisor 44296193894, auth21.tap : création d’un portefeuille fictif refusée avec EVM_PRIVATE_KEY_INVALID. Les autres exécutions du même test réussissent ; le refus n’est pas désactivé.

Cause à tester déterministement : generate() utilise ecdh.getPrivateKey().toString('hex') sans imposer 32 octets. OpenSSL peut retourner une représentation minimale du scalaire, sans les octets zéro de tête. Le validateur EVM attend exactement 64 caractères hexadécimaux. Le constructeur Bitcoin emploie la même représentation pour WIF, qui doit contenir 32 octets. Le scalaire et sa clé publique restent pourtant valides.

Fichiers : App/Bank/Core/evm_wallet.js et multichain_wallet.js ; consommateurs : création de portefeuille propriétaire, bundles multi-chaînes, import/export WIF existant. Données existantes non modifiées, aucun nouvel accès aux secrets ni export ajouté. Ne pas normaliser des imports invalides : conserver leur validation stricte.

Deuxième passe proposée : compléter seulement la représentation des clés nouvellement générées avec les zéros de tête jusqu’à 32 octets. Même générateur cryptographique, même scalaire et adresse, aucune diminution d’entropie ni nouvelle règle de signature. Préserver les octets et coffres existants ; ne réparer aucune donnée réelle implicitement. Alternative rejetée : retirer la longueur requise du validateur ou faire une boucle de génération éliminant certaines valeurs.

Validation requise : scalaires fictifs publics de référence imposés à un vrai ECDH, contre-exemple avant correction ; adresses EVM comparées à la bibliothèque ethers déjà épinglée ; WIF généré réimporté avec même clé/adresse ; import invalide toujours refusé. Ajouter ces dépendances de sécurité au digest existant des parcours financiers concernés, requalifier et comparer les 258 contrats, puis relancer Auth21 complet, 80 scénarios et package extrait. Aucun réseau blockchain ni clé utilisateur.

Rollback : restauration du code antérieur, sans toucher aux données ; l’ancienne version conserve le défaut et ne doit pas être promue comme correction. Une migration/réparation de clés utilisateur anciennes serait un chantier distinct et non autorisé implicitement par cette normalisation de nouvelles générations.

Seconde passe appliquée : les deux tests échouent avant correction ; EVM seul laisse échouer Bitcoin ; les deux normalisations passent ensuite. Qualification locale complète après audit : 417 PASS / 0 FAIL / 1 SKIP, 80 scénarios. Matrice 258 contrats sans dérive ; nouvelles empreintes financières générées et qualifiées. Aucun contenu de coffre utilisateur ouvert ou modifié.
