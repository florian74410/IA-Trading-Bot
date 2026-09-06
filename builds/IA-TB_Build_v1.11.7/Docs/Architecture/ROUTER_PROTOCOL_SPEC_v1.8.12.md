# IA-TB Router Protocol Specification — v1.8.12

## But
Normaliser les communications backend sans modifier le visuel. Tout Engine/Module métier actif échange avec le Communication Router via CP/1 ou via un bridge de sécurité explicitement documenté.

## Enveloppe commune
Request: `protocol`, `request_id`, `timestamp`, `target`, `action`, `detail`, `arguments`.
Response: `protocol`, `request_id`, `engine`, `action`, `status`, `schema`, `generated_at`, `duration_ms`, `data_hash`, `data`, `warnings`.

## Sécurité
Transport local 127.0.0.1, secret CP/1 partagé, signature HMAC-SHA256, protection replay du Router, actions et arguments déclarés dans ProtocolRegistry. Aucun shell/path/URL arbitraire.

## Composants normalisés CP/1
- Indicator Engine
- Trading Engine
- Risk Engine
- Portfolio Engine
- Market Data
- Liquidity Engine
- Fundamental Engine

## Composants spéciaux
- Trading Firewall: bridge de sécurité, reste volontairement hors routage métier direct.
- Strategy Engine: RESERVED, contrat préparé mais aucun service runtime n'existe encore.
- Supervisor IA: RESERVED, aucun service runtime CP/1 autonome n'existe encore.

## Règle d'évolution
Un nouveau composant doit avoir un manifeste `Core/Communication/ProtocolRegistry/<id>.json`, déclarer ses commandes CP/1 et s'enregistrer auprès du Router. Le Router ne doit jamais dépendre de l'implémentation interne du composant.
