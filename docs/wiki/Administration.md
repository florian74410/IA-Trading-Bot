# 🛠️ Administration — Manuel V2.0 DEBUG

> **🟢 En simple : Admin est le tableau de bord technique d’IA-TB. Il sert à voir les services, les logs, le Firewall, les diagnostics, les mises à jour et l’arborescence du projet. Ce n’est pas la page normale de trading.**

> **Accès restreint.** Ne jamais placer de clé API, secret, passphrase, token, mot de passe ou private key dans un log ou une commande de diagnostic.

---

## 🧭 Navigation Admin

**🟢 En simple : Admin conserve volontairement sa barre latérale historique, différente du menu partagé des pages utilisateur.**

Sections actuelles :
- Console ;
- Firewall ;
- Processus ;
- Engines & Services ;
- Maintenance ;
- Diagnostics ;
- Mises à jour ;
- Project Explorer.

L’ancienne navigation Admin a été conservée pour garder sa densité et ses raccourcis propres à l’exploitation.

---

## 🚦 Inventaire runtime

**🟢 En simple : le Process Registry sert d’inventaire officiel des processus installés et activés.**

| Service | Port |
|---|---:|
| UI | 8000 |
| Core | 8001 |
| Kraken Add-On | 8011 |
| Indicator | 8012 |
| Market Data | 8013 |
| Liquidity | 8014 |
| Fundamental | 8015 |
| Trading | 8016 |
| Firewall | 8017 |
| Strategy | 8018 |
| Risk | 8019 |
| Portfolio | 8020 |
| Router | 8021 |
| Supervisor | 3000 |

Les manifests définissent notamment :
- id ;
- label ;
- type ;
- ordre ;
- port ;
- health path ;
- script ;
- log ;
- dépendances ;
- activation par défaut.

Le Process Registry stocke les toggles d’activation dans SQLite.

---

## 🖥️ Console Générale

**🟢 En simple : la Console Admin exécute des commandes prévues et validées, pas un shell système libre.**

Syntaxe de debug :
```text
debug <target> <action> [key=value]
```

Les cibles et actions proviennent des registres Admin/CP1. Les opérations dangereuses doivent utiliser les confirmations et niveaux de risque prévus.

---

## 🔀 Diagnostic CP/1

**🟢 En simple : Admin peut inspecter ce que le Router connaît réellement, pas seulement ce qui existe dans les fichiers.**

Outils :
- Router health ;
- registry list ;
- capabilities ;
- runtime registry ;
- événements ;
- commandes d’observation autorisées.

Cela aide à distinguer :
- manifest installé ;
- process lancé ;
- service enregistré CP/1 ;
- service réellement joignable.

---

## 🔥 Firewall Admin

**🟢 En simple : le panneau Firewall permet d’observer et régler les protections sans modifier directement les fichiers source.**

Il peut afficher :
- état du coordinator ;
- Trading worker ;
- Data worker ;
- statistiques PASS/WARN/REJECT ;
- événements ;
- configuration.

Les routes `/firewall-admin/**` sont protégées par la permission ADMIN côté UI Service.

---

## 🌲 Project Explorer

**🟢 En simple : Admin peut explorer le projet en lecture sans donner au navigateur un accès arbitraire au disque.**

Le UI Service expose :
- arbre projet ;
- preview de fichier ;
- validation du chemin demandé.

L’objectif est le diagnostic, pas un éditeur de fichiers générique.

---

## ⬆️ Update Manager

**🟢 En simple : une mise à jour doit connaître sa version source et vérifier son intégrité avant d’être appliquée.**

Admin intègre la vue Update Manager. Voir [Update Manager](Update-Manager.md) et [Versionnage](Versioning-and-Releases.md).

---

## 🧾 Logs

**🟢 En simple : chaque service important possède son log runtime afin d’éviter une console unique impossible à diagnostiquer.**

Exemples :
- market_data.log ;
- fundamental.log ;
- trading.log ;
- strategy.log ;
- risk.log ;
- portfolio.log ;
- supervisor.log ;
- firewall.log ;
- UI log.

Le démarrage crée `.runtime/logs` et remet en place les fichiers nécessaires.

---

## 🔐 Accès Admin

**🟢 En simple : lorsque l’authentification UI est active, Admin exige un rôle administratif.**

Le UI Service autorise `/admin` et `/admin/vaults` uniquement avec rôle ADMIN/SUPERADMIN selon la configuration.

Le build DEBUG local peut lancer l’UI avec authentification désactivée et un rôle de bypass SUPERADMIN. Ce mode est adapté au développement local, pas à une exposition publique.
