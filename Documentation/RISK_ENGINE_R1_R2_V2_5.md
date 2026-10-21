# IA-TB 2.5 — Risk Management R1/R2 (développement)

## Provenance

Branche `feature/v2.5-risk-engine-r1-r2` dérivée de `2.4.2-R1`, lui-même descendant de `feature/v2.4.1-bank-calendar-cp1` (base 2.4.1). **Aucune modification du VPS / RELEASE / trading LIVE.** Nettoyage de Work et rapport `Documentation/Cleanup/2.4.2-R1/RESULTS.md` préservés.

## Modules livrés

Code : `App/Risk/Engine/risk_management_modules_v2_5.js`, JavaScript déterministe, aucun appel API/LLM.

**R1 — contrôle unitaire d'une intention** :
- A : `capital` — equity et notionnel ;
- B : `stopLoss` — distance et perte estimée (stop + frais + réserve slippage) ;
- C : `budget` — pourcentage par trade et dépassement du plafond ;
- D : `resize` — quantité maximale théorique compatible avec le budget, sans création automatique d'ordre.

**R2 — surveillance de portefeuille, sur snapshot fourni** :
- `equity`, `drawdown`, `concentration`, `stopBudget` : calculs de mesures ;
- `correlation`, `margin`, `volatility`, `freshness` : entrées de métriques vérifiées attendues d'autres moteurs ; **DEGRADED** si absentes, pas de calcul inventé.
- Lors d'un dépassement, une liste compacte de codes d'alerte et `requiresSupervisorAttention` est renvoyée. Aucune notification LLM active tant que le scheduler sécurisé n'est pas raccordé.

**Contrats CP/1** de Risk : `risk.r1.evaluate` avec `{intent,account}`, et `risk.r2.snapshot` avec `{snapshot}`. Les résultats sont des diagnostics `risk.r1/1.0` / `risk.r2/1.0` pour le Supervisor, **pas** des autorisations de trading. Pas de consommation API OpenAI. Le Supervisor expose aussi `supervisor.risk.r1.preview` et `supervisor.risk.r2.snapshot` pour consulter ces diagnostics via le Router. Ces actions ne sont pas utilisées automatiquement dans les intentions exécutables et ne créent aucune autorisation de trading.

**Paramètres** : section dédiée Risk Engine 2.5, niveau très prudent/prudent/équilibré/dynamique/agressif, activation analytique générale, interrupteurs par module, choix de simulations. Persistance sous `risk.settings` existant, accessible via routes CP/1 authentifiées (droits d'écriture existants). Les plafonds sont provisoires et doivent être configurables selon profils et utilisateurs après validation multi-tenant.

## Garanties de sécurité et limites

- **Le Risk Gate existant et les protections du Trading Firewall sont inchangés**. Désactiver le module analytique ne constitue **pas** une permission de trading ; désactiver l'Engine existant est fail-closed au Gate.
- R1 travaille actuellement sur des valeurs passées par l'appelant. **Avant tout raccordement à l'approbation exécutable**, equity/prix/frais/positions doivent être récupérés côté service depuis les fournisseurs et comptes autorisés, via CP/1. Les données soumises par un LLM ne peuvent pas faire autorité pour un risque exécutable.
- Aucun scheduler R2 automatique, aucune notification autonome au Supervisor et aucun moteur de scénarios de liquidation branché à ce stade.
- Les valeurs de budget R1/R2 sont des contrôles analytiques distincts des autorisations `risk_approval_id`; les calculs ne doivent **pas** être pris pour une qualification LIVE.
- Arrondis et règles exactes d'exchange, perpétuels, cross/isolated, instruments inverses/quanto, frais complexes et netting multi-position restent hors du premier prototype.
- Les profils chiffrés sont des **hypothèses de conception**, pas des réglages validés pour trader.

## Tests

```sh
node App/Risk/Tests/test_risk_management_modules_v2_5.js
```

Assertions sur notionnel, stop, frais, dimensionnement, refus des entrées manquantes, profils et détection de concentration. Tests de contrats de l'interface et des routes Supervisor dans `App/tests/test_risk_25_ui_cp1_contracts.js`. CI complète hérite de `v24-finance-trading-logs.yml` activée sur la branche v2.5. **Vérifier le statut CI avant toute déclaration de conformité.**

## Suite indispensable avant intégration exécutable

1. Validation du contrat `risk.settings.set` pour les droits Auth21 et isolation par utilisateur : ne jamais permettre à un USER de modifier les limites globales de Risk Gate.
2. Alimenter R1/R2 depuis Portfolio/Market Data par CP/1 avec validation de provenance, d'âge et de scope utilisateur ; interdire les chiffres fournis par le LLM dans l'approbation finale.
3. Connecter le hook Supervisor à chaque intention de trading puis revalider au Risk Gate avant création de `risk_approval_id`.
4. Faire le suivi R2 périodique côté moteur, avec déduplication des alertes et limitation des demandes LLM ; notifier uniquement changements importants.
5. Ajouter un choix de scénarios neutres sur demande, jamais d'ordre de liquidation autonome.
6. Recette Firefox Linux et tests bout en bout multiutilisateur/Auth21 + Trading Firewall.

## Vérification des sources de capital (point bloquant pour l'exécution)

L'implémentation actuelle `App/Portfolio/Engine/portfolio_engine.js` renvoie un snapshot avec `analysis_mode: 'TRADING_ONLY'`. Dans ce mode, son champ `equity` est calculé à partir des PnL de trading, **et non d'un solde total de compte validé**. Il ne doit donc pas servir à fixer automatiquement les budgets R1 ou les limites de drawdown R2. L'adaptateur doit exiger une `account_equity` confirmée par le compte/exchange autorisé, avec sa devise, sa fraîcheur et son périmètre utilisateur. En absence de cette donnée, l'évaluation doit rester dégradée/non exécutable. Les entrées `account.equity` et `snapshot.equity` des contrats CP/1 actuels sont **informatives et non fiables pour un ordre LIVE** tant que cet adaptateur n'est pas implémenté.
