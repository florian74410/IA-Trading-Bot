# Audit de la base et intégration dev.5

Base contrôlée : commit dev.4 `1296471ca890ced81f653290f216a331caa3c8cb`, arborescence `8344dc8ced7931646b217fd59c4465ba17bf1a51`. Elle contient la consolidation CP1, les grants par agent, Router/Firewall, les snapshots Portfolio et Risk, Auth21, le transport OpenAI propriétaire et le compagnon cognitif. La dev.5 les prolonge dans leurs points d’entrée existants.

Le code conserve `supervisor_core`, `owner_supervisor`, `companion_cognitive_bridge`, AgentEngineGateway et le fournisseur OpenAI existants. Il ajoute quatre commandes propriétaires Supervisor : message hybride, historique, confirmation et annulation. Ces handlers restent inaccessibles au catalogue générique agent ; Core les appelle sous délégation Auth21. Les 28 commandes agent qualifiées de dev.4 restent les seules admises après grant. Aucune des nouvelles commandes ne qualifie un ordre financier.

Modifications d’intégration : préférences chiffrées dans le profil existant, rattachement opaque de session agent ANALYZE, validation du prompt/contexte dans le transport Core, routes protégées de réglage et d’annulation/confirmation, et affichage dans les assets du compagnon. Le correctif CSRF du compagnon obtient le jeton Auth21 pour ses écritures authentifiées. Il ne crée pas un autre endpoint public pour un chatbot autonome.

La version, le manifeste, la release courante et les registres générés portent dev.5. La qualification CP1 est recalculée après les changements d’implémentation et validée par les processus isolés. Les documents historiques dev.4 restent des preuves de leur propre release ; les résultats actuels sont sous Documentation/ChatBot.

Limites conservées : LIVE désactivé, mutations Trading non qualifiées, aucun remplissage d’ordre, aucun résultat financier inventé. Un modèle n’a aucune autorité de contournement ; son intention est traitée comme celle du résolveur local.
