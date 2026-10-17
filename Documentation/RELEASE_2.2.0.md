# IA-TB 2.2.0 — User Management V1, recette GEN-1

Cette version livre l'authentification email, les comptes administrés par CLI,
les sessions persistantes et l'isolation des espaces privés sur la base 2.1.1.
Elle est publiée en **préversion pour la recette GEN-1**, sans promotion de main
ou de la stack de production. La validation fonctionnelle de GEN-1 reste à faire.

## Changements

- ADMIN, USER et GUEST contrôlés par Core ; aucune administration HTTP des comptes.
- Profils, préférences, wallets, Mosaïques, définitions Custom, stratégies,
  Portfolio et consommation IA associés au propriétaire de la session.
- Capacités signées entre moteurs, liées aux arguments et à une session vivante.
- Imports historiques explicites hors ligne, sauvegarde et conservation des clés.
- Administration technique MarketData/Fundamental avec mot de passe et confirmation.
- Refus immédiat des modifications de clés API par GUEST.
- Retrait des secrets des métadonnées fournisseurs, y compris camelCase et erreurs.
- Version 2.2.0 cohérente dans runtime, health Core/UI, manifeste et Paramètres.
- Compose authentifié dédié à la recette, 13 services, volumes distincts,
  accès navigateur par tunnel SSH, sans publication de ports ni Trading Engine.
- Inventaire hors ligne des fichiers originaux sans déchiffrement ni attribution.

## Qualification requise avant publication

Le workflow `IA-TB 2.2 qualification and publication` publie uniquement après :
suite complète sécurité/CLI/navigateur sans échec ni test ignoré, contrôles RBAC,
tests d'inventaire, contrôle du Compose et recette Docker à 13 services avant et
après redémarrage. Le fichier `qualification.json` joint lie ces résultats au
commit et au run GitHub exacts ; `SHA256SUMS` couvre l'archive et cette preuve.

La matrice des 75 routes teste les permissions et le contexte propriétaire.
Ce contrôle de frontière ne constitue pas une recette de chaque opération métier.
La sonde réelle ajoute les pages authentifiées, bougies/Firewall/Indicator,
Strategy, Portfolio historique, chats, test OpenAI personnel, notifications et
commandes techniques ADMIN. Les transports Binance/OpenAI sont fictifs ; aucun
ordre, appel fournisseur facturé ni donnée GEN-1 n'est utilisé en CI.

## Limites présentes dans cette version

L'exécution Trading, les transferts et swaps signés restent indisponibles dans
le mode authentifié. Leur refus ne constitue pas une migration fonctionnelle.
REMOTE_LLM, l'envoi email et les snapshots expérimentaux à chaud ne sont pas
qualifiés. La récupération de compte passe par la CLI ADMIN. Les données
historiques réelles nécessitent un inventaire et une attribution explicite par
l'opérateur ; elles ne sont jamais adoptées automatiquement.

Ces limites sont consultables dans `/auth21/capabilities` après connexion. La
livraison ne revendique pas la qualification exhaustive de tous les écrans et de
toute la chaîne d'exécution financière. Le statut TEST doit être conservé jusqu'à
la recette et à la décision de promotion.

## Installation et retour arrière

Utiliser le code/l'image et les dépendances Node 22 de cette version sur une copie
privée des volumes. **Ne pas utiliser l'updater HTTP pour cette migration de
schéma et de runtime.** Suivre `Documentation/GEN1_TEST_2.2.0.md` et conserver les
clés originales ainsi qu'une sauvegarde complète cohérente. Aucun déploiement
GEN-1 n'est effectué par le workflow de publication.
