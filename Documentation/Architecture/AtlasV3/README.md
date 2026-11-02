# Architecture Atlas V3 · Vitrine publique IA-TB

## Vision produit

À terme, **https://architecture.iatb.duckdns.org** présente l'ensemble du projet IA-TB à des prospects, partenaires et clients, sans exposer son plan de contrôle ou ses services d'exploitation.

Ce dépôt contient une **première version client** conçue sur React Flow 12 / ELK.js / Vite. Contrairement aux anciennes versions HTML, son graphe est interactif et éditable en environnement privé. Le site publique ne possède pas de fonction de publication ni d'accès direct aux serveurs.

La version publique est volontairement statique et indépendante de RELEASE et DEBUG.

## Expérience visiteur

- Page d'accueil éditoriale expliquant la mission d'IA-TB.
- Présentation des principaux domaines : analyse, collecte de données, CP/1, contrôle des risques.
- Aperçu interactif de l'architecture avec navigation, zoom, minimap et filtres.
- **Plein écran** pour explorer le diagramme en détail.
- 8 moteurs représentés séparément, dont les satellites ne s'affichent qu'à la demande.
- Liens protocolaires colorés et légendés directement sur les routes.
- Inspecteur technique à droite pour chaque bloc et ses communications.
- Auto-layout ELK sur commande pour retrouver une disposition hiérarchique.
- Mentions explicites de la nature conceptuelle des exemples (pas d'ordres LIVE, pas de données de comptes).

## Public / privé : règle fondamentale

La version publique est une **vitrine en lecture seule**, sans authentification ni backend mutable. Le graphe public est chargé depuis \`src/data/public-architecture.json\` qui contient des descriptions nettoyées.

Pour préparer un diagramme manuellement :

1. Tester localement avec un navigateur et \`npm run dev\`.
2. L'éditeur n'est activé **qu'en développement privé** avec \`VITE_ENABLE_EDITOR=true npm run dev -- --mode editor\`.
3. En éditeur : déplacer les systèmes à la souris, ajouter des connexions, modifier les libellés, recalculer le placement, enregistrer le brouillon local et exporter un JSON.
4. La persistance locale du navigateur ne constitue **ni** une sauvegarde serveur **ni** une publication.
5. Faire revoir le JSON exporté, puis l'intégrer par commit / PR, qualification et construction d'un artefact public.
6. **Ne jamais publier un build éditeur sur l'hôte public** sans une authentification serveur forte, une isolation réseau et une revue complète de sécurité.

\`VITE_ENABLE_EDITOR\` n'est **pas** une protection de serveur : c'est un réglage du build et non un contrôle d'accès. La future administration distante doit être protégée côté serveur (OAuth/identité et contrôle des autorisations), et déployée séparément de la vitrine. Tant qu'un backend sécurisé n'est pas en place, seule l'édition **locale + export Git** est autorisée.

## Installation sur un poste Linux

Node.js 22 minimum recommandé :

\`\`\`bash
cd Documentation/Architecture/AtlasV3
npm install
npm run test
npm run dev
\`\`\`

Puis ouvrir \`http://127.0.0.1:5173\`.

Build client **sans éditeur** :

\`\`\`bash
npm run build
# sortie: dist/
\`\`\`

Les bundles générés sont statiques et peuvent être déployés derrière Caddy. Un workflow GitHub Actions sur la branche \`feature/architecture-atlas-v3-reactflow\` compile et vérifie l'artefact public ; **il ne déploie pas sur le VPS**.

## Versions de base

- \`@xyflow/react\` 12.12.0 (MIT)
- \`elkjs\` 0.12.1 (EPL-2.0 / GPL-3.0-or-later, respecter les obligations de distribution)
- \`lucide-react\` (ISC)
- React 19 et Vite 7

Aucune composante React Flow Pro n'est nécessaire pour le système de superblocs.

## Catalogue et statut de l'architecture

Les noms de moteurs et satellites reflètent des responsabilités observées dans le dépôt IA-TB 2.5.3. **Il ne s'agit pas d'un inventaire dynamique de services en exécution.**

Les numéros et statuts de production, capacités commerciales et performances doivent être vérifiés avant de figurer sur une offre client.

## Évolutions de la vitrine

Parcours de présentation, pages de capacités, démonstrations non transactionnelles, sécurité, actualités et cas d'usage peuvent être ajoutés progressivement, mais toute fonction de connexion client ou d'administration devra suivre une architecture indépendante du runtime financier.

Voir \`DEPLOYMENT_ACCESS.md\` pour l'isolation VPS, la publication et les accès MCP.
