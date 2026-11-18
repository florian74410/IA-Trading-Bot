# Second audit global et contrôle après nettoyage

L’audit examine tous les fichiers actifs au-delà du diff ; les comptes exacts JavaScript/JSON/Python/Shell/YAML et imports sont dans les rapports JSON du dernier passage et du workflow final. Les contrôles JavaScript et imports sont consignés séparément.

Résultat : aucun échec de syntaxe ou de disposition, aucun ancien point d’entrée actif détecté, aucun ancien fichier exécutable d’Engine conservé. La référence Git historique du benchmark Risk est volontairement conservée : elle désigne un fichier dans un commit immuable, pas un module actif.

Les reprises de données LegacyEngineData sont des chemins persistants, pas des wrappers ou services concurrents. Le test SQLite ouvre une base préexistante ; les Custom/Quarantine Indicators conservent leur emplacement. Les chemins de code, données et archives sont distingués.

| Anomalie d’audit | Correction | Validation |
|---|---|---|
| Chemins privés déplacés avec les sources | Restauration et séparation des racines | Test SQLite et définitions préexistantes |
| Racines dérivées Indicators | Racine App explicite et données séparées | Tests ciblés et services CP1 réels |
| Séparateur de protocole réécrit | Restauration par comparaison AST et filtre précis | 56 tests ciblés, puis régression complète |
| Descriptions CP1 modifiées | Restauration exacte et JSON structuré | Comparaison stricte des 258 contrats |
| Anciennes références dans listes de tests | Calcul depuis les fichiers appelants | Contrôle Auth21 conservé, aucun import introuvable |
| Rapports générés dans App et snapshots répétitifs | Suppressions documentées, checkpoint récupérable | Publication du registre et build complet |

Les fonctions à consommation uniquement dynamique ne sont pas déclarées inutiles sur la seule absence d’import statique. Aucun nouveau développement métier n’est engagé pour masquer une fonctionnalité non qualifiée. Le traitement statique ne constitue pas une preuve formelle d’absence de tout code mort.

La suite complète après corrections réussit localement ; la CI répète les vérifications et teste le paquet extrait. Aucun déploiement VPS ni ordre financier réel/Demo.

Le contrôle élargi des tests anciens a exposé ERR-010 (assertions obsolètes) puis ERR-011 (initialisation d’outbox avec journal inaccessible). La correction de disponibilité conserve le blocage financier et fait l’objet d’IMPACT-002 avant application ; un test multiprocessus fictif atteint désormais la reprise, le diagnostic ERROR et le refus 503. La qualification complète est répétée après cette dernière correction.

ERR-012 : la revue des exclusions Docker trouve un module de sécurité et des helpers Compose retirés par des globs trop larges. IMPACT-003 précède leur correction. Les sources restent identiques ; la CI construit réellement les deux images et contrôle le contenu complet, hors réseau d’exécution. Le build Docker n’est pas présenté comme exécuté localement.
