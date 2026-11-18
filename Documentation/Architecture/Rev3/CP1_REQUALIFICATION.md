# Requalification Function Registry et CP1 — IA-TB 3.0.1 Rev3

Base Rev2 : `ef425e04182619e9992aa8a7368db2a30b2a0f87`. Les résultats intermédiaires ne remplacent pas la qualification finale après le second audit.

| Engine | Commandes avant | Commandes après | Empreintes recalculées | Tests CP1 | Résultat |
|---|---:|---:|---|---|---|
| Trading | 20 (11 qualifiées) | 20 | Oui — générateur existant | 93 PASS, 0 FAIL | PASS intermédiaire |
| Firewall | 3 (1 qualifiées) | À vérifier | PENDING | PENDING | PENDING |
| Fundamental | 63 (2 qualifiées) | À vérifier | PENDING | PENDING | PENDING |
| Indicators | 26 (3 qualifiées) | À vérifier | PENDING | PENDING | PENDING |
| Liquidity | 15 (2 qualifiées) | À vérifier | PENDING | PENDING | PENDING |
| MarketData | 42 (5 qualifiées) | À vérifier | PENDING | PENDING | PENDING |
| Portfolio | 20 (2 qualifiées) | À vérifier | PENDING | PENDING | PENDING |
| Risk | 18 (8 qualifiées) | À vérifier | PENDING | PENDING | PENDING |
| Strategy | 13 (3 qualifiées) | À vérifier | PENDING | PENDING | PENDING |
| Supervisor | 38 (14 qualifiées) | À vérifier | PENDING | PENDING | PENDING |

Chaque comparaison JSON contrôle tous les identifiants, schémas, handlers sources, empreintes, permissions, hard_deny, qualifications agents et autorisations. Seuls le chemin source et son empreinte peuvent différer ; aucune autorisation ne peut être élargie. Les empreintes proviennent du mécanisme existant, puis des tests réels Core TLS → Router → Engine → réponse et des scénarios avec broker fictif.

Les commandes non qualifiées en Rev2 restent non qualifiées. Une empreinte recalculée ne constitue pas seule une preuve de réussite. Les rapports de chaque étape et les tentatives échouées sont conservés dans `Results/`.

## Condition finale bloquante

Aucune validation finale si un handler manque, un contrat est désynchronisé, une empreinte est incorrecte, une permission est élargie, une commande qualifiée de Rev2 régresse, une protection Auth21/Risk/Firewall est désactivée ou un test obligatoire échoue.

Après les corrections du second audit global, tous les registres et empreintes doivent être régénérés et la qualification complète répétée sur le commit publié et dans le paquet distribué. **Qualification finale après second audit : PENDING.**
