# Qualification — 3.0.2 Rev-X

Cette version ne réutilise pas automatiquement le statut du candidat 3.0.1. La qualification complète est relancée après l’adaptation de version et le dernier audit. Les rapports locaux correspondent au working tree et leurs sources sont vérifiables ; la CI valide le commit publié exact indiqué dans BUILD.json.

Le workflow `.github/workflows/iatb-302-revx.yml` exige : audit global, aucune référence active ancienne ni import introuvable, mêmes 258 contrats/51 handlers qualifiés, tests Auth21/Risk/Firewall/CP1 et reprises, 80 scénarios avancés fictifs, Chromium desktop/mobile, 133 unités Engine, configs Compose, deux images Docker inspectées sans réseau d’exécution, double ZIP identique, empreintes et requalification du ZIP extrait.

Le test de changement de version d’application interdit une modification implicite des versions de contrat et permissions. Le test graphique conserve toutes ses assertions et attend une condition observable de synchronisation ; aucun test défaillant n’est désactivé. La suite Firefox est aussi exécutée par le workflow Chart workspace.

Le statut final est celui des workflows du commit livré ; résultats JSON/TAP/captures et mesures sont fournis dans leurs artifacts. Les limites d’environnement locales ne sont pas déclarées PASS. Aucun ordre réel, aucun VPS.

Résultat local après dernières corrections : **417 PASS, 0 FAIL, 1 SKIP** (UID non privilégié non disponible), 80/80 scénarios, 258 contrats strictement comparés et 51 handlers qualifiés conservés. Les sources de chaque groupe et les TAP sont dans Results/final-local/. La CI du commit livré reste impérative.

Les 133 exécutions complémentaires des 69 fichiers Engine passent aussi sans échec ni SKIP, sous garde loopback-only et stores fictifs isolés. Ces suites recoupent certains groupes précédents ; les totaux ne sont pas des cas uniques additionnables.
