'use strict';
function valid(args){
 const i=args?.metadata?.trade_intent;
 return !!(i&&i.source==='supervisor.chatbot.manual'&&i.mode==='LIVE_GUARDED'&&i.exchange==='OKX'&&i.market_type==='SPOT'&&i.orderType==='MARKET'&&args.exchange===i.exchange&&args.market_type===i.market_type&&args.symbol===i.symbol&&args.side===i.action&&args.order_type===i.orderType&&args.account===i.metadata?.account&&args.client_order_id===i.metadata?.client_order_id&&args.metadata.plan_id===i.metadata?.plan_id&&typeof i.metadata?.ownerClientId==='string'&&!args.reduce_only&&!args.leverage&&!args.price&&!args.stop_price&&!args.position_side&&
 ((i.size!==undefined&&Number.isFinite(i.size)&&i.size>0&&Number(args.quantity)===i.size&&args.quote_quantity==null)||(i.quoteQuantity!==undefined&&Number.isFinite(i.quoteQuantity)&&i.quoteQuantity>0&&Number(args.quote_quantity)===i.quoteQuantity&&args.quantity==null)));
}
module.exports={valid};
