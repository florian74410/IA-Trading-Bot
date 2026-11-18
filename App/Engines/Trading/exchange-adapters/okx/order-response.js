'use strict';
// An ACK, an explicit business rejection and an ambiguous response are distinct.
// In particular OKX 50004 does not prove that an order failed.
function classifyOrderResponse(res){
 const body=res?.body,rows=Array.isArray(body?.data)?body.data:[],first=rows.length===1&&rows[0]&&typeof rows[0]==='object'?rows[0]:null;
 const httpOk=Number.isInteger(res?.statusCode)&&res.statusCode>=200&&res.statusCode<300;
 const code=body?.code==null?null:String(body.code),sCode=first?.sCode==null?null:String(first.sCode);
 const orderId=typeof first?.ordId==='string'&&first.ordId.trim()?first.ordId:null;
 const accepted=!!(httpOk&&code==='0'&&sCode==='0'&&orderId);
 const rejected=!!(httpOk&&first&&sCode&&sCode!=='0'&&sCode!=='50004'&&code!=='50004'&&!orderId);
 return {ok:accepted,status:accepted?'ACCEPTED':rejected?'REJECTED':'UNKNOWN',first,code,sCode,orderId:accepted?orderId:null};
}
module.exports={classifyOrderResponse};
