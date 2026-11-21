# Recette VPS du candidat 3.1.0_FINAL

Le service systemd lance le Gateway sur le VPS. Dans son environnement, définir `IATB_AUTH_ORIGIN=https://trading.iatb.duckdns.org` et `IATB_AUTH21_LOCAL_PRIVATE` avec la racine privée inventoriée. Le lanceur de recette utilise Node 22 et maintient Live désactivé.

Avant la permutation, appliquer les sections inventaire, sauvegarde cohérente SQLite et vérification de restauration du [guide GEN-1](README-3.1.0_Rev2.md). Relever le SHA de la release réellement active pour le retour. Extraire le ZIP vérifié dans un nouveau répertoire et exécuter `bash Deploy/VPS/prepare_vps.sh`, puis `bash Deploy/VPS/preflight.sh` avec une copie des données. Tester le redémarrage sur cette copie.

Le vhost Trading de Caddy utilise HTTPS sur l’amont privé 127.0.0.1:8000. Configurer le nom TLS amont `localhost` et la confiance dans le certificat de cette instance. Vérifier la configuration complète avec `caddy validate` avant rechargement. Adapter l’unité systemd fournie au chemin de la release et à l’identité système inventoriée. Vérifier son activation au démarrage. La bascule en production fait l’objet d’une opération distincte.

Après bascule autorisée, exécuter `IATB_AUTH_TLS_CERT=/chemin/vers/localhost.crt bash Deploy/VPS/check-build.sh` depuis l’extraction sur le VPS. Depuis Firefox, ouvrir le domaine public, vérifier la connexion USER, la persistance du compte et du mode ainsi que les refus GUEST. Rejouer après redémarrage du service, poste Mint éteint. En cas d’écart, arrêter le candidat et rétablir l’unité, la release et l’amont précédents. En cas de migration, préserver les écritures postérieures avant de restaurer la sauvegarde cohérente.
