# IA-Trading-Bot — 2.5.3 DEV

Branche de développement depuis `2.5.2`. Arrêt d'urgence persistant P4 intégré,
P5 SAFE/CLOSE qualifié sur fixtures uniquement. Les mutations broker réelles et
la reprise restent désactivées ; la mission complète n'est pas déclarée acceptée.
Les nettoyages 2.4.2-R1, Auth21, RiskGate et ChartViewer sont conservés.

[Rapport, résultats et limites](Documentation/Consolidation/2.5.3-DEV.md) ·
[Maintenance](Documentation/Trading/MAINTENANCE_2.5.3.md) ·
[Matrice broker](Documentation/Trading/BROKER_CAPABILITIES_2.5.3.md)

## Arborescence maintenue

| Dossier | Contenu |
| --- | --- |
| `App/` | Source exécutable, moteurs, UI, migrations, configurations et tests |
| `Tools/` | Audits, contrôles CI et outils de déploiement encore utilisés |
| `tests/` | Régressions partagées des modules de la 2.4 |
| `Documentation/` | Contrats, guides, Wiki et preuves du nettoyage |
| `Infrastructure/` | Documentation des environnements séparés |
| `Assets/` | Schémas d'architecture conservés |
| `.github/` | Qualification et gouvernance du code courant |

Les anciens builds, copies de rapports, maquettes inutilisées et archives de
patch ne sont plus embarqués. Leurs versions restent consultables dans
[l'historique Git de la base](https://github.com/florian74410/IA-Trading-Bot/tree/189e9c09f1549dd8f2f73bb62c62fc19d6f31d15).
Les suffixes historiques des modules conservés désignent leurs interfaces ;
ils n'impliquent pas qu'ils soient obsolètes. Les composants Bank suspendus en
2.4.1 restent présents et bloqués.

## Recette locale

Prérequis : Node.js 22, npm et le répertoire privé Auth21 existant contenant
comptes, clé maître et certificats. Arrêter proprement l'ancienne instance.

```bash
git clone --depth 1 --single-branch --branch 2.4.2-R1 \
  https://github.com/florian74410/IA-Trading-Bot.git IA-TB_2.4.2-R1
cd IA-TB_2.4.2-R1/App
npm ci --omit=dev --no-audit --no-fund
bash start_auth21_local_safe.command
```

Interface : **https://localhost:8000**. Le lanceur conserve Auth21/TLS,
Trading LIVE=0 et le répertoire privé `~/IA-TB-v23-Auth21-private` (surcharge
possible par `IATB_AUTH21_LOCAL_PRIVATE`). Ctrl+C arrête les processus de cette
console ; aucun service d'une autre instance n'est tué.

Le déploiement de cette révision se fait par copie source propre. Le format
historique d'UpdateManager ne supprime pas les fichiers obsolètes : aucun ZIP
incrémental incompatible n'est présenté comme installable. Les données et
historiques réels d'une autre installation ne sont pas nettoyés par cette tâche.

## Architecture et intégrité

Les modules échangent par Router CP/1 ; Risk et Firewall contrôlent les flux
financiers. Les parseurs/collecteurs alimentent les produits normalisés utilisés
par Supervisor. Cette révision conserve les contrats CP/1, les migrations SQL,
les built-ins Indicator, Auth21 et les protections financières.

![Architecture IA-TB](Assets/app_architecture.jpg)

Le workflow `v24-finance-trading-logs.yml` vérifie versions, syntaxe et portée
lexicale, imports et assets, empreintes des contrats protégés, tests métier,
snapshots/ingress et UI Firefox. Les dépendances d'audit restent extérieures aux
dépendances de production. Consulter les guides techniques du Wiki pour chaque
moteur ; les sources officielles du Wiki restent dans `Documentation/wiki/`.
