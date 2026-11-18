# Scénarios — IA-TB 3.0.1 Rev2

Qualification locale Node 22 : **80 scénarios réussis, aucun échec**. Les scénarios T01–T65 de la mission sont conservés ; Q01–Q15 complètent les régressions, les contrôles des comptes et les plans.

Les mutations passent par les modules réels Core/Auth21, Supervisor, Risk, Router, Firewall, Trading et Portfolio, avec un broker HTTP OKX fictif, des clés fictives et des données déterministes. Chaque requête reçue est conservée dans le rapport. Les sockets externes sont bloquées dans les services simulés. T45 interrompt effectivement Trading après réservation durable, avant HTTP ; T46 l'interrompt après réception par le broker fictif, avant ACK. Aucun renvoi financier automatique.

- [Rapport JSON avec requêtes reçues](Results-Rev2/local/scenarios.json)
- [TAP de qualification CP1 et scénarios](Results-Rev2/local/qualification.tap)
- [Rapport de validation complet](Results-Rev2/local/rev2-summary.json)

Les fichiers locaux correspondent au working tree testé ; la CI valide ensuite le commit publié, y compris le navigateur. Le résumé CI et les captures sont disponibles dans l'artifact du workflow Rev2.

| ID | Scénario | Résultat local |
|---|---|---|
| T01 | Market Buy | PASS |
| T02 | Market Sell | PASS |
| T03 | Limit Buy OPEN | PASS |
| T04 | Limit Sell later FILLED | PASS |
| T05 | Post only rejection | PASS |
| T06 | IOC partial fill | PASS |
| T07 | FOK rejection | PASS |
| T08 | Cancel open order | PASS |
| T09 | Cancel filled order | PASS |
| T10 | Amend price | PASS |
| T11 | Amend size refused | PASS |
| T12 | Independent Take Profit | PASS |
| T13 | Independent Stop Loss | PASS |
| T14 | Parent attached TP SL | PASS |
| T15 | Parent partial protection inactive | PASS |
| T16 | Parent filled protection verified | PASS |
| T17 | Trailing ratio | PASS |
| T18 | Trailing spread | PASS |
| T19 | Trailing deferred activation | PASS |
| T20 | Cancel algo | PASS |
| T21 | Unsupported trailing amendment | PASS |
| T22 | Triggered child rejected | PASS |
| T23 | Read leverage | PASS |
| T24 | Leverage verified independently | PASS |
| T25 | Leverage broker reject | PASS |
| T26 | LONG open | PASS |
| T27 | SHORT open | PASS |
| T28 | Partial close | PASS |
| T29 | Full close verified | PASS |
| T30 | Hedge mode close | PASS |
| T31 | Isolated vs cross | PASS |
| T32 | Contract quantity exact | PASS |
| T33 | Invalid Auth21 session | PASS |
| T34 | Other owner account | PASS |
| T35 | Missing confirmation | PASS |
| T36 | Mutated confirmation | PASS |
| T37 | Confirmation replay | PASS |
| T38 | Approval bound to exact spec | PASS |
| T39 | Firewall unavailable | PASS |
| T40 | Emergency halt | PASS |
| T41 | Cognitive gateway cannot mutate | PASS |
| T42 | Real OKX network denied | PASS |
| T43 | Timeout after accepted submission | PASS |
| T44 | Lost broker response | PASS |
| T45 | Crash after durable reservation before HTTP send | PASS |
| T46 | Crash after send before ACK | PASS |
| T47 | Late broker result | PASS |
| T48 | Core coordinator reopen reconciliation | PASS |
| T49 | Portfolio unavailable durable queue | PASS |
| T50 | Portfolio events idempotent | PASS |
| T51 | Concurrent same balance | PASS |
| T52 | Same order simultaneous confirmations | PASS |
| T53 | Independent request after rejection | PASS |
| T54 | Essential step rejects dependent chain | PASS |
| T55 | Batch partial acceptance per item | PASS |
| T56 | LOCAL Limit | PASS |
| T57 | LOCAL TP SL | PASS |
| T58 | LOCAL trailing 2 percent | PASS |
| T59 | LOCAL leverage | PASS |
| T60 | Missing target clarification | PASS |
| T61 | Unknown metrics remain null | PASS |
| T62 | Exact confirmation and risk consent | PASS |
| T63 | Rejection notification | PASS |
| T64 | Partial execution notification | PASS |
| T65 | History exact owner and states | PASS |
| Q01 | MARGIN account-mode and currency | PASS |
| Q02 | FUTURES linear contracts | PASS |
| Q03 | Trigger amendment | PASS |
| Q04 | Fees unavailable accepted only after consent | PASS |
| Q05 | Known insufficient funds remain mandatory | PASS |
| Q06 | Known fee reserve prevents overspending | PASS |
| Q07 | Account instrument unavailable | PASS |
| Q08 | Price precision mandatory | PASS |
| Q09 | Unknown position never substituted | PASS |
| Q10 | Distinct leverage and LONG plan | PASS |
| Q11 | Dependent protection waits for fill | PASS |
| Q12 | Portfolio derivative contract multiplier | PASS |
| Q13 | Independent plan step continues after broker rejection | PASS |
| Q14 | Child cannot bypass unconfirmed parent and conversation is preserved | PASS |
| Q15 | Unqualified Margin account mode refuses before broker submission | PASS |
