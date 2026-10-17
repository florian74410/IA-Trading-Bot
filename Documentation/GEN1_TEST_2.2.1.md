# Recette IA-TB 2.2.1 sur GEN-1

La version est une préversion TEST. Les commandes suivantes concernent une
nouvelle stack de recette ; aucun volume existant ne doit lui être directement
monté. Ne pas remplacer l'image d'une stack 2.1.1 en fonctionnement.

## 1. Source et sauvegarde

Récupérer le tag `v2.2.1` après publication GitHub et vérifier `SHA256SUMS` pour
l'archive fournie. `qualification.json` donne le commit testé et le run CI.
Arrêter les writers de l'installation source le temps d'une sauvegarde complète
cohérente : data, runtime, state, annexes, updates, configurations et clés.
Conserver l'image et le commit précédents. Préparer ensuite une **copie privée**
dans une nouvelle racine appartenant à `iatbadmin`, avec les sous-répertoires :

```text
data/       Database/clients.sqlite, Security/*.key, User Data/...
runtime/    configuration et état de runtime copiés
state/      état persistant copié
annexes/    annexes copiées
updates/    historique copié
tls/        cert.pem et key.pem de la stack de recette
```

Conserver notamment `client_master.key` et `wallet_master.key` d'origine.
Ne pas générer de clé de remplacement. Le certificat TLS doit être valide pour
localhost (liaison Core/UI et tunnel) ; clé TLS privée 0600, certificat public
approuvé par le navigateur. Les fichiers SQLite et clés privées sont en 0600.
Ne pas supprimer un WAL : une copie incluant un WAL non vide doit être ouverte
et checkpointée uniquement dans la copie, writers arrêtés, avant l'inventaire.

## 2. Environnement et inventaire

Depuis le checkout 2.2.1, en tant que propriétaire non-root :

```sh
export IATB_UID="$(id -u)"
export IATB_GID="$(id -g)"
export IATB_V22_ROOT=/var/lib/iatb/v22-gen1-test
export IATB_AUTH_ORIGIN=https://localhost:8443
umask 077
python3 Tools/Deploy/user_management_inventory.py "$IATB_V22_ROOT/data"
docker compose -f compose.v2.2.gen1-test.yml config --quiet
docker compose -f compose.v2.2.gen1-test.yml build router
```

L'inventaire n'affiche ni identité, ni clé, ni secret. Il refuse les liens
symboliques, fichiers privés d'un autre propriétaire et WAL non checkpointés.
Il indique les fichiers manquants, l'intégrité SQLite et les migrations présentes.
Il n'établit pas la propriété des historiques et ne vérifie pas le déchiffrement ;
cette vérification avec la clé originale est effectuée par `migrate`.
Si le déploiement utilise d'autres chemins ou un autre utilisateur de données,
adapter l'inventaire à ces chemins au lieu de conclure que des fichiers manquent.

## 3. Migration sur la copie arrêtée

La CLI doit avoir un vrai terminal, sans sudo dans le conteneur, avec l'UID
propriétaire des fichiers. Aucun secret ne se passe en argument ou en variable.

```sh
docker compose -f compose.v2.2.gen1-test.yml run --rm --no-deps core node CLI/users.js migrate
docker compose -f compose.v2.2.gen1-test.yml run --rm --no-deps core node CLI/users.js list
```

Confirmer `MIGRATE USER MANAGEMENT V1` uniquement sur la copie, tous writers
arrêtés. La migration sauvegarde SQLite, vérifie la clé et révoque les anciennes
sessions. Si aucun ADMIN actif n'existe, utiliser `create-first-admin` avant
`list`. Un SUPERADMIN historique converti reste associé à ses identifiants
originaux ; il n'y a aucun compte ou mot de passe par défaut.

Les commandes `import-legacy-vault`, `import-legacy-portfolio`,
`import-legacy-setting` et `import-legacy-definition` sont détaillées dans
`USER_MANAGEMENT_V1.md`. Les exécuter **avant** le démarrage et attribuer chaque
source au seul compte désigné. Préserver les fichiers source et leurs clés.

## 4. Démarrage et accès

```sh
docker compose -f compose.v2.2.gen1-test.yml up -d
docker compose -f compose.v2.2.gen1-test.yml ps
```

13 services doivent tourner. Depuis le poste client, remplacer GEN1 par l'hôte :

```sh
ssh -N -L 8443:/var/lib/iatb/v22-gen1-test/runtime/ssh-ui.sock iatbadmin@GEN1
```

Ouvrir https://localhost:8443/login. Le Compose utilise le véritable transport
fournisseur, aucun preload QA. Les lectures/IA peuvent consommer les quotas des
clés que l'opérateur configure ; l'exécution financière reste désactivée.

## 5. Recette à enregistrer

Créer deux USER et un GUEST avec la CLI, puis vérifier : connexion email, Profil,
changement d'email et mot de passe, révocation, désactivation et changement de rôle ;
absence de secrets et données de l'autre compte ; même ID de wallet sans accès
croisé ; indicateurs/stratégies/Mosaïques privés ; réglages et crédits IA privés ;
lectures de marchés et calculs ; accès GUEST restreint ; administration réservée
à ADMIN avec confirmation. Vérifier les imports sur la copie et le redémarrage.
Enregistrer commit, heure, rôle, écran, opération, résultat attendu et obtenu,
sans mot de passe, token ni clé privée dans les captures ou journaux partagés.

Les fonctions indisponibles listées dans `RELEASE_2.2.1.md` ne sont pas des tests
positifs d'exécution. Ne pas les compter comme fonctionnalités migrées.

## 6. Arrêt et retour arrière

```sh
docker compose -f compose.v2.2.gen1-test.yml stop
```

Conserver les écritures de recette séparément. Reprendre l'ancienne stack sur
ses volumes originaux et son image précédente. Ne pas ouvrir une base migrée
avec l'ancien code, restaurer un seul fichier à chaud, supprimer les volumes,
ou écraser les clés. Une promotion de production attend la recette GEN-1.
