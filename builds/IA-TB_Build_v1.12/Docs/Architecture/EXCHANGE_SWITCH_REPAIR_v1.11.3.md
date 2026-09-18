# IA-TB v1.11.3 — Exchange Switch Repair

Le panneau latéral Exchanges utilise désormais le contrôle canonique `#exchangeSelect`.
GMX et KRAKEN sont les deux sources activables supportées par l'UI actuelle.
Un clic sur une ligne ou son interrupteur déclenche l'événement `change` du sélecteur, donc réutilise `switchExchange()` et le pipeline Market Data existant.
Les sources `PRÉVU` restent inactives afin de ne pas simuler une connexion non implémentée.
