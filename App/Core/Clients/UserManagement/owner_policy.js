'use strict';
const policies=Object.freeze({
 risk:{read:['snapshot.create','snapshot.get','constraints.get','status'],write:[]},
 supervisor:{read:['chatbot.history','health','status','capabilities','context','data.catalog','data.read','cognitive.status','cognitive.history','llm.models'],write:['chatbot.message','chatbot.confirm','chatbot.cancel','reason','structured','cognitive.reason','llm.select']},
 strategy:{read:['health','capabilities','catalog','stats','state'],write:['validate','evaluate','dry_run','reload','pause','resume','reset_stats','definition.save','definition.delete']},
 portfolio:{read:['health','overview','account.snapshot','settings.get','positions','position.health','trades','trade.detail','balances','history','statistics','events'],write:['settings.set','snapshot']}
});
function permission(engine,action){const p=policies[engine];if(!p||typeof action!=='string'||!action.startsWith(engine+'.'))return null;const suffix=action.slice(engine.length+1);return p.read.includes(suffix)?'self.read':p.write.includes(suffix)?'self.write':null;}
module.exports={permission,policies};
