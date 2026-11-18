# Qualification — 3.0.1 Rev3 consolidée

La qualification locale complète du working tree a réussi : **414 exécutions PASS, 0 FAIL, 1 SKIP**. Les 80 scénarios avancés sont inclus et tous PASS. Le SKIP concerne l’identité OS non privilégiée indisponible dans ce conteneur ; la CI Ubuntu exécute ce cas. Les décomptes sont des exécutions, certaines suites se recoupent.

Les **133 exécutions complémentaires de 69 fichiers de tests Engine** passent, avec garde réseau loopback-only et stores isolés. Les 23 tests calendrier complémentaires passent. Ces suites peuvent recouper la qualification principale ; leurs nombres ne sont pas additionnés comme des cas uniques. Les tests Chromium sont obligatoires dans la CI : le navigateur local est bloqué par la politique de sockets Unix et n’a pas été présenté comme PASS. Les preuves locales et les empreintes des sources testées sont conservées dans Results/.

Le workflow `.github/workflows/iatb-301-consolidation.yml` valide le commit publié exact : audit complet, JavaScript/JSON/Python/Shell/YAML, imports, version, préflight source, qualification CP1/Auth21/Risk/Firewall/Trading/Portfolio/Supervisor, 80 scénarios, deux parcours Chromium desktop/mobile, double build identique et empreintes. Il vérifie les trois configurations Compose et construit réellement les deux Dockerfiles ; l’image complète est inspectée sans réseau ni démarrage de service. Il extrait ensuite l’archive et lance la suite CP1 existante depuis ces sources extraites et les dépendances épinglées.

**La qualification finale est le résultat de ce workflow et du test du ZIP extrait pour le commit indiqué dans BUILD.json.** Les résumés CI JSON/TAP/captures sont attachés au run. Aucune publication comme release qualifiée ne doit précéder la réussite de ces contrôles.

La qualification financière est exclusivement fictive. Les capacités régionales/instruments d’un compte OKX EU réel ne sont pas prouvées par les fixtures. Les restrictions de la matrice OKX Rev2 sont conservées ; aucune nouvelle autonomie financière n’est ajoutée.
