# Scénarios AdvancedOKX — état récupéré

**Catalogue des tests, pas rapport de qualification final.**

Les sources contiennent 65 scénarios obligatoires T01–T65 et 12 scénarios complémentaires Q01–Q12. La session précédente a rapporté un passage complet T01–T65 à 65/65, avec 66 tests TAP réussis parent inclus. Les fichiers JSON/TAP bruts de cette exécution ont disparu avec `/tmp` ; des modifications ont été réalisées ensuite. Aucun scénario n'a été réexécuté pendant la sauvegarde.

Le dernier lot complémentaire signalait l'échec Q12 `MANUAL_CONFLICT_RECONCILIATION_REQUIRED`. Voir [l'inventaire de reprise](Recovery-2026-11-18/RECOVERY_INVENTORY.md) et [la transcription des sorties survivantes](Recovery-2026-11-18/recovered-session-evidence.json).

| ID | Scénario défini | État du commit sauvegardé |
|---|---|---|
| T01 | Market Buy | Non réexécuté |
| T02 | Market Sell | Non réexécuté |
| T03 | Limit Buy OPEN | Non réexécuté |
| T04 | Limit Sell later FILLED | Non réexécuté |
| T05 | Post only rejection | Non réexécuté |
| T06 | IOC partial fill | Non réexécuté |
| T07 | FOK rejection | Non réexécuté |
| T08 | Cancel open order | Non réexécuté |
| T09 | Cancel filled order | Non réexécuté |
| T10 | Amend price | Non réexécuté |
| T11 | Amend size refused | Non réexécuté |
| T12 | Independent Take Profit | Non réexécuté |
| T13 | Independent Stop Loss | Non réexécuté |
| T14 | Parent attached TP SL | Non réexécuté |
| T15 | Parent partial protection inactive | Non réexécuté |
| T16 | Parent filled protection verified | Non réexécuté |
| T17 | Trailing ratio | Non réexécuté |
| T18 | Trailing spread | Non réexécuté |
| T19 | Trailing deferred activation | Non réexécuté |
| T20 | Cancel algo | Non réexécuté |
| T21 | Unsupported trailing amendment | Non réexécuté |
| T22 | Triggered child rejected | Non réexécuté |
| T23 | Read leverage | Non réexécuté |
| T24 | Leverage verified independently | Non réexécuté |
| T25 | Leverage broker reject | Non réexécuté |
| T26 | LONG open | Non réexécuté |
| T27 | SHORT open | Non réexécuté |
| T28 | Partial close | Non réexécuté |
| T29 | Full close verified | Non réexécuté |
| T30 | Hedge mode close | Non réexécuté |
| T31 | Isolated vs cross | Non réexécuté |
| T32 | Contract quantity exact | Non réexécuté |
| T33 | Invalid Auth21 session | Non réexécuté |
| T34 | Other owner account | Non réexécuté |
| T35 | Missing confirmation | Non réexécuté |
| T36 | Mutated confirmation | Non réexécuté |
| T37 | Confirmation replay | Non réexécuté |
| T38 | Approval bound to exact spec | Non réexécuté |
| T39 | Firewall unavailable | Non réexécuté |
| T40 | Emergency halt | Non réexécuté |
| T41 | Cognitive gateway cannot mutate | Non réexécuté |
| T42 | Real OKX network denied | Non réexécuté |
| T43 | Timeout after accepted submission | Non réexécuté |
| T44 | Lost broker response | Non réexécuté |
| T45 | Crash before send | Non réexécuté |
| T46 | Crash after send before ACK | Non réexécuté |
| T47 | Late broker result | Non réexécuté |
| T48 | Core coordinator reopen reconciliation | Non réexécuté |
| T49 | Portfolio unavailable durable queue | Non réexécuté |
| T50 | Portfolio events idempotent | Non réexécuté |
| T51 | Concurrent same balance | Non réexécuté |
| T52 | Same order simultaneous confirmations | Non réexécuté |
| T53 | Independent request after rejection | Non réexécuté |
| T54 | Essential step rejects dependent chain | Non réexécuté |
| T55 | Batch partial acceptance per item | Non réexécuté |
| T56 | LOCAL Limit | Non réexécuté |
| T57 | LOCAL TP SL | Non réexécuté |
| T58 | LOCAL trailing 2 percent | Non réexécuté |
| T59 | LOCAL leverage | Non réexécuté |
| T60 | Missing target clarification | Non réexécuté |
| T61 | Unknown metrics remain null | Non réexécuté |
| T62 | Exact confirmation and risk consent | Non réexécuté |
| T63 | Rejection notification | Non réexécuté |
| T64 | Partial execution notification | Non réexécuté |
| T65 | History exact owner and states | Non réexécuté |
| Q01 | MARGIN account-mode and currency | Non réexécuté |
| Q02 | FUTURES linear contracts | Non réexécuté |
| Q03 | Trigger amendment | Non réexécuté |
| Q04 | Fees unavailable accepted only after consent | Non réexécuté |
| Q05 | Known insufficient funds remain mandatory | Non réexécuté |
| Q06 | Known fee reserve prevents overspending | Non réexécuté |
| Q07 | Account instrument unavailable | Non réexécuté |
| Q08 | Price precision mandatory | Non réexécuté |
| Q09 | Unknown position never substituted | Non réexécuté |
| Q10 | Distinct leverage and LONG plan | Non réexécuté |
| Q11 | Dependent protection waits for fill | Non réexécuté |
| Q12 | Portfolio derivative contract multiplier | Non réexécuté |
