# 🏦 Banque IA-TB — wallets et services crypto

## Pour débuter

**La Banque IA-TB est une surcouche qui rassemble les wallets d’un utilisateur et simplifie leur utilisation dans une seule interface. L’utilisateur n’a pas besoin d’une extension de navigateur pour consulter et administrer les wallets créés par IA-TB. Chaque wallet reste rattaché à son propriétaire : il peut afficher sa clé publique et, après un avertissement de sécurité explicite, récupérer sa clé privée.**

<small>🔧 Build actif : V2.0 DEBUG. Les fonctions réellement branchées sont distinguées des services encore planifiés.</small>

<p align="center"><img src="../../assets/bank-wallet-architecture.svg" alt="Architecture Banque IA-TB et wallets utilisateur" width="100%"/></p>

## 1. Compte utilisateur et propriété des wallets

Le modèle produit prévoit des utilisateurs inscrits **sur invitation**. Un compte donne accès aux services IA-TB autorisés et la Banque devient le point central pour les actifs crypto.

À la première utilisation, l’utilisateur peut créer un ou plusieurs wallets dans **Banque → Mes Portefeuilles**. Un wallet est associé à l’identité de session par un identifiant propriétaire `ownerId`. Les métadonnées du wallet sont enregistrées dans la base SQLite de l’application sous un espace propre au propriétaire.

> **État V2.0 DEBUG :** l’association wallet → utilisateur et le stockage SQLite sont branchés. Le build local actuel utilise encore le mode d’authentification locale/bypass ; le workflow complet d’invitation multi-utilisateur reste à raccorder à cette identité.

## 2. Mes Portefeuilles

**Cette page rassemble uniquement les wallets du compte courant.** Elle sert de tableau de bord : création, consultation de l’adresse, clé publique, demande de clé privée, historique futur, transferts et retrait de l’interface.

### Création multi-réseaux

**Un Wallet IA-TB n’est plus limité à un réseau.** Une création produit une identité de portefeuille logique qui regroupe plusieurs comptes blockchain sous un même nom. L’utilisateur manipule donc `Wallet Principal`, `Wallet Trading`, etc., et choisit ensuite le réseau/compte nécessaire à l’action.

```text
Wallet IA-TB
├── Compte EVM (une même identité secp256k1)
│   ├── Ethereum
│   ├── Arbitrum
│   ├── Polygon
│   ├── BNB Chain
│   └── Base
├── Compte Bitcoin (secp256k1 / adresse BTC)
└── Compte Solana (Ed25519 / adresse SOL)
```

Les réseaux EVM partagent la même identité EVM et donc la même adresse EVM. Bitcoin et Solana possèdent des comptes cryptographiques distincts, car leurs formats et mécanismes de clés ne sont pas interchangeables avec EVM.

Les secrets de **chaque famille blockchain** sont chiffrés séparément en **AES-256-GCM** avant stockage. Une clé maître locale est créée avec des permissions fichier restrictives. SQLite conserve le wallet logique, son `ownerId`, ses comptes, ses réseaux et les enveloppes chiffrées. La liste publique de l’API ne renvoie jamais les secrets.

<details><summary><b>➕ En savoir plus — dérivation EVM</b></summary>

`Bank/Core/evm_wallet.js` gère l’identité EVM avec secp256k1 et Keccak-256. `Bank/Core/multichain_wallet.js` orchestre les familles : EVM, Bitcoin et Solana. Le code reste sans dépendance npm afin de limiter mémoire, surface de dépendances et coût de déploiement sur le runtime Node.js du projet.

</details>

### Retirer un wallet

**Retirer n’est pas détruire.** Quand l’utilisateur retire un wallet, IA-TB le marque comme archivé et le masque de l’interface active. La paire de clés et les données chiffrées ne sont pas supprimées. Cette distinction évite de présenter une suppression d’interface comme une destruction blockchain : une adresse blockchain continue naturellement d’exister.

## 3. Affichage de la clé privée

Les clés publiques peuvent être consultées par famille blockchain. Pour un wallet multi-réseaux, l’utilisateur choisit d’abord **EVM**, **Bitcoin** ou **Solana** avant de récupérer le secret correspondant. La **clé privée / donnée de récupération** suit un parcours plus strict :

```text
Utilisateur
   ↓
« Clé privée »
   ↓
Notification MOYENNE de sécurité
   ↓
Disclaimer + risque + confirmation explicite
   ↓
Choix de la famille (EVM / Bitcoin / Solana)
   ↓
API /api/security/wallets/reveal
   ↓
Déchiffrement temporaire de cette famille uniquement
   ↓
Affichage limité dans une box sensible
```

Le serveur journalise l’événement de révélation et ajoute une notification de sécurité. La clé privée n’est pas incluse dans l’historique de notifications.

## 4. Système de notifications

IA-TB dispose désormais de trois formats visuels réutilisables :

| Format | Usage | Capacité indicative |
|---|---|---|
| **Petit** | confirmation, succès, information courte | environ 4 lignes de 50 caractères |
| **Moyen** | avertissement, disclaimer, action sensible | texte + image éventuelle + boutons |
| **Grand** | procédure ou information riche | contenu long + image + plusieurs actions |

Les notifications ont un rendu sombre/futuriste légèrement transparent. Elles peuvent recevoir du texte, une image et des boutons d’action. **La récupération d’une clé privée utilise le format Moyen.**

## 5. Transferts

La Banque doit proposer deux chemins :

- **wallet interne → wallet interne** : transfert direct si les deux wallets utilisent un réseau compatible ;
- **wallet interne → adresse externe** : transfert vers une adresse saisie/validée par l’utilisateur.

> **État V2.0 DEBUG :** l’interface de transfert interne existe, mais l’exécution blockchain signée n’est pas encore raccordée. Le futur Signer/Wallet Service devra construire, vérifier, signer et diffuser la transaction sans exposer la clé privée au Supervisor.

## 6. Swap et Bridge

**Swap** échange rapidement un token contre un autre. **Bridge** transfère une valeur entre deux réseaux. La page Swap & Bridge choisit d’abord le **wallet logique** source et le wallet de réception. Le réseau source et le réseau destination sont ensuite sélectionnés parmi les comptes/réseaux réellement disponibles dans ces wallets. Un bridge peut ainsi effectuer `Wallet Principal / Ethereum → Wallet Principal / Arbitrum`, ou utiliser deux wallets IA-TB différents. Le moteur doit ensuite comparer plusieurs routes/providers avant signature.

La règle d’architecture est :

```text
Wallet source
  → Quote / Route
  → Risk checks
  → Wallet Service
  → Signer interne
  → Réseau blockchain
  → Tracker
  → Wallet destination
```

La clé privée ne doit jamais être transmise à un provider de Swap/Bridge.

## 7. Services bancaires prévus

La Banque est conçue pour concentrer progressivement des services comparables à ceux d’un établissement financier, adaptés aux crypto-actifs :

- **Dépôt / prêt** — prévu ;
- **Pools** — prévu/en cours de conception ;
- **Vault Strategies** — infrastructure de Vault déjà amorcée, exécution on-chain complète à valider ;
- comptabilité et historique consolidés ;
- intégration future avec le Supervisor sous permissions strictes.

## 8. Principe de sécurité

**Le Supervisor demande une action ; il ne récupère pas la clé privée.** Les secrets restent dans le Wallet Service/Signer. Une révélation manuelle est une action utilisateur distincte, volontaire, confirmée et journalisée.

La Banque simplifie l’expérience mais ne doit jamais masquer la différence entre :
1. posséder une clé ;
2. afficher une clé ;
3. signer une transaction ;
4. diffuser une transaction ;
5. archiver un wallet dans l’interface.

Ces étapes restent séparées afin que l’interface reste simple sans affaiblir le modèle de sécurité.


## 9. Modèle de données multi-réseaux et montée en charge

Le modèle sépare volontairement **l’identité utilisateur**, le **wallet logique**, les **comptes cryptographiques**, les **réseaux** et, à terme, les **actifs**. Cette séparation évite de dupliquer un wallet entier pour chaque blockchain et permet d’ajouter un réseau sans casser les wallets existants.

```text
User / ownerId
  └── Wallet logique
       ├── Account EVM ──► plusieurs réseaux EVM
       ├── Account Bitcoin ──► Bitcoin
       └── Account Solana ──► Solana
            └── Actifs / soldes / transactions (indexation future)
```

Les anciens wallets mono-réseau restent lisibles comme `LEGACY_SINGLE_CHAIN` : ils ne sont pas transformés silencieusement et leurs clés ne sont pas remplacées. Les nouveaux wallets sont marqués `MULTICHAIN` avec `schemaVersion: 2`. Cette compatibilité est importante pour les migrations futures.

### Règles de performance

- les secrets ne sont pas déchiffrés pour afficher une liste de wallets ;
- la liste publique ne transporte que métadonnées, adresses et clés publiques ;
- un secret n’est déchiffré qu’à la demande explicite de récupération/signature ;
- un seul compte EVM représente plusieurs réseaux EVM, ce qui évite les duplications inutiles ;
- le registre de réseaux est centralisé afin que l’ajout futur d’une chaîne soit indépendant de l’UI ;
- les historiques, soldes et tokens devront être indexés séparément des secrets pour permettre cache, pagination et synchronisation asynchrone.

> **Limite actuelle V2.0 DEBUG :** la structure multi-réseaux, la génération locale et le stockage chiffré sont intégrés. L’indexation live des soldes/tokens, le Signer de transactions et les adapters RPC Bitcoin/Solana/EVM restent à raccorder avant toute utilisation avec des fonds réels.
