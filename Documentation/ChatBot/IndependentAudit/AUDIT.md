# Audit indépendant — ChatBot hybride dev.5

Date : 17 novembre 2026. Base : 86fa02f53835e710b75085706dcbe3199043b54d.

Verdict : première version hybride DEBUG qualifiée par tests locaux, sous réserve de la recette visuelle et des connexions réelles. Aucun déploiement ni ordre réel.

## Défauts corrigés

- Reproduction : une préparation BTC-USDT suivie de « ETH » conservait BTC-USDT. Le changement d’actif reconstruit désormais la paire Spot, efface l’instrument dérivé à repréciser, les prix et protections obsolètes et les quantités exprimées dans l’ancien actif.
- Le contrat commun refuse désormais un actif ou une cotation contradictoire avec l’instrument fourni, y compris pour une réponse OpenAI.
- Une saisie numérique négative invalide le contexte de préparation au lieu de réutiliser silencieusement les anciens paramètres.
- Le lanceur force le format TAP pour rendre les compteurs de tests reproductibles.
- Qualification CP1 et registres Supervisor régénérés après correction du code.

## Vérification

Node v22.23.5, dépendances installées depuis App/package-lock.json. Suite complète : 109/109 tests, 32 fichiers, zéro échec, ignoré ou annulé. Qualification : 12/12 tests avec vrais processus isolés, TLS Auth21, Router, Gateway, Engines et réponses externes fictives. Les 9 tests ciblés ChatBot passent. Les résultats finaux figurent dans ce dossier. Une première exécution avant régénération des empreintes CP1 échouait sur COMMAND_UNAVAILABLE ; la qualification puis la suite finale passent. La première installation Node 24 hors version requise ne constitue pas une preuve de validation.

Lecture du résolveur, contrats local/modèle, état SQLite, procédures, pont propriétaire OpenAI, délégations Auth21/CP1, routes et assets Companion, tests et scripts de build. Autorité métier fixée dans le code ; catalogue descriptif ; permissions et révocation contrôlées côté serveur ; confirmation financière bloquée côté serveur.

## Limites

Chromium local ne démarre pas : socket système refusé par l’environnement (EPERM). Les tests frontend avec DOM simulé passent dans la suite finale. Le run GitHub Actions 44134896994 a été vérifié comme successful pour le commit antérieur 5b58803 ; ses captures ne sont pas une nouvelle recette du code corrigé. UI inchangée par cet audit.

OpenAI et OKX externes restent simulés. Aucun démarrage global de production, essai VPS, ordre réel ou validation de déploiement. Le build livré est un paquet source DEBUG avec installation des dépendances Node 22 requise ; ce n’est pas une image autonome préinstallée.
