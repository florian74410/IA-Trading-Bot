'use strict';
const messages={
 AVAILABLE_BALANCE_INSUFFICIENT_OR_UNKNOWN:'Fonds insuffisants ou solde disponible non vérifiable pour couvrir le montant et les frais.',
 AVAILABLE_BASE_INSUFFICIENT_OR_UNKNOWN:'Quantité de crypto disponible insuffisante ou non vérifiable pour cette vente.',
 POSITION_SIZE_LIMIT:'Le montant dépasse la limite de taille de position définie par Risk.',
 EXPOSURE_LIMIT:'Cet ordre dépasse la limite d’exposition du portefeuille.',
 SPREAD_LIMIT:'L’écart entre les prix acheteur et vendeur est trop élevé.',
 SLIPPAGE_LIMIT:'Le glissement de prix estimé dépasse la limite autorisée.',
 LIQUIDITY_LIMIT:'La liquidité vérifiée ne suffit pas pour cet ordre.',
 EXCHANGE_CONSTRAINTS_UNVERIFIED:'Le montant ne respecte pas les contraintes vérifiées de l’instrument, ou ces contraintes sont indisponibles.',
 'execution.fee_rate':'Les frais du compte ne sont pas disponibles. Une nouvelle vérification est nécessaire.',
 LIVE_ACCOUNT_NOT_AUTHORIZED:'Ce compte ne permet pas cet ordre réel : vérifie son activation, ses permissions et le mode Demo/Live.',
 LIVE_EXECUTION_DISABLED:'L’exécution réelle est désactivée dans la configuration.',
 MANUAL_SPOT_MARKET_ONLY:'Cette version accepte uniquement les achats et ventes Spot Market simples, sans levier ni protections attachées.',
 ORDER_RECONCILIATION_REQUIRED:'Une demande précédente a un résultat inconnu. Vérifie son résultat sur OKX avant de préparer un nouvel ordre.',
 ORDER_CHANGED_RECONFIRM_REQUIRED:'Le prix ou les frais ont changé. Prépare et confirme un nouveau récapitulatif.',
 PREPARATION_EXPIRED_OR_BLOCKED:'Cette préparation est expirée ou bloquée. Demande un nouveau récapitulatif.',
 PREPARATION_NOT_FOUND:'Cette préparation ne correspond pas à ta session ou à la confirmation reçue.',
 ACCOUNT_CHANGED:'Le compte a été modifié depuis la préparation. Demande un nouveau récapitulatif.',
 OWNER_REQUIRED:'Ta session est expirée ou révoquée. Reconnecte-toi avant de continuer.',
 TRADING_ENGINE_RUNTIME_LOCKED:'Le moteur Trading est arrêté ou verrouillé. Aucun ordre n’a été envoyé à OKX.',
 TRADING_ENGINE_DISABLED:'Le moteur Trading est désactivé. Aucun ordre n’a été envoyé à OKX.',
 TRADING_CREDENTIALS_INCOMPLETE:'Les identifiants du compte sont indisponibles ou incomplets. Aucun ordre n’a été envoyé à OKX.',
 MUTATING_TRADING_BLOCKED_IN_FIREWALL_BYPASS:'Le pare-feu est désactivé : l’ordre est bloqué.',
 MANUAL_ORDER_BINDING_MISMATCH:'Les paramètres ne correspondent plus à l’ordre approuvé. L’envoi est refusé.',
 RISK_ORDER_BLOCKED:'Risk ne permet plus cet ordre après la nouvelle vérification.',
 ORDER_ALREADY_RESERVED:'La demande est déjà en cours ou terminée ; elle ne peut plus être annulée comme une simple préparation.'
};
const preSend=new Set(['LIVE_EXECUTION_DISABLED','TRADING_ENGINE_RUNTIME_LOCKED','TRADING_ENGINE_DISABLED','TRADING_CREDENTIALS_INCOMPLETE','TRADING_ACCOUNT_TICKET_REQUIRED','TRADING_ACCOUNT_NOT_ASSIGNED','TRADING_ACCOUNT_REVOKED','TRADING_ACCOUNT_UNAUTHORIZED','TRADING_VAULT_ACCESS_DENIED','MANUAL_ORDER_BINDING_REQUIRED','MANUAL_ORDER_BINDING_MISMATCH','MUTATING_TRADING_BLOCKED_IN_FIREWALL_BYPASS','FIREWALL_FORWARD_REQUIRED','RISK_APPROVAL_REQUIRED','RISK_APPROVAL_INVALID','RISK_APPROVAL_NOT_FOUND_OR_EXPIRED','RISK_APPROVAL_INTENT_MISMATCH','RISK_APPROVAL_ALREADY_CONSUMED','PERMISSION_DENIED']);
function message(code){return messages[code]||(/^RISK_APPROVAL_/.test(code||'')?'L’autorisation Risk est invalide ou expirée. Aucun ordre n’a été envoyé.':'La demande ne peut pas être exécutée pour le moment.');}
function riskMessage(s){const codes=[...(s.reasons||[]),...(s.required_missing_metrics||[])];if(s.decision==='REVIEW')return 'Risk demande une révision : cet ordre ne peut pas être confirmé.';const code=codes.find(c=>messages[c]);if(code)return message(code)+' Aucun ordre n’a été envoyé.';if(codes.some(c=>/STALE|EXPIRED|UNDATED/.test(c)))return 'Les données sont trop anciennes ou non datées. Une nouvelle vérification est nécessaire ; aucun ordre n’a été envoyé.';return 'Risk ne permet pas cet ordre : des données indispensables sont manquantes ou une limite est dépassée. Aucun ordre n’a été envoyé.';}
module.exports={message,riskMessage,isPreSendFailure:code=>preSend.has(code)};
