# Extension native requise par IA-TB-CLI 1.4.2 — proposition, hors tag 2.2.1

La 2.2.1 exige des noms non vides pour les créations administratives et ne
permet pas l'édition administrative des identités. La CLI XFCE ne contourne
pas cette limite avec du SQL.

Cette PR serveur distincte prépare :

- prénom et nom volontairement vides, chiffrés comme tels, à la création ;
- `Auth21AdminStore.updateIdentity` : prénom, nom, email et username, avec
  session ADMIN vivante, preuve d'opérateur local, transaction, chiffrement,
  contrôle des collisions et audit ;
- révocation des sessions et incrément de security_version après édition ;
- verbe natif `modify-profile CL...`, prompts et confirmation natifs ;
- aucun endpoint HTTP administratif nouveau, aucune suppression, aucun Wallet.

Le modèle n'a pas de champ « nom affiché » distinct : ne pas inventer un champ
ou confondre username et prénom. Un tel champ nécessite une décision de modèle
supplémentaire. Ce correctif n'est pas publié sous v2.2.1 et modifie les
empreintes natives : le contrat CLI doit être explicitement qualifié pour une
future release avant utilisation. La CLI 1.4.2 refuse cet ensemble si on tente
simplement de le faire passer pour le tag 2.2.1.

Validation locale : 36 tests natifs réussis sur 37, un vrai PTY non-root ignoré
car le mapping d'UID n'est pas disponible dans cet environnement. La suite
inclut la création avec noms neutres, chiffrement des identités, collisions,
refus sans ADMIN et invalidation des sessions. Aucune recette GEN-1 effectuée.
