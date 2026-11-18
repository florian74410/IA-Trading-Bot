"use strict";
class DeliveryOutbox {
 constructor(db){this.db=db;db.exec('CREATE TABLE IF NOT EXISTS trading_delivery(id TEXT PRIMARY KEY,event TEXT NOT NULL,result TEXT NOT NULL,history_done INTEGER NOT NULL DEFAULT 0,portfolio_done INTEGER NOT NULL DEFAULT 0,last_error TEXT);');this.busy=false;}
 persist(id,event,result){this.db.prepare('INSERT OR IGNORE INTO trading_delivery(id,event,result) VALUES(?,?,?)').run(id,JSON.stringify(event),JSON.stringify(result));return this.db.prepare('SELECT * FROM trading_delivery WHERE id=?').get(id);}
 async flush(history,publish){if(this.busy)return;this.busy=true;try{
  for(const r of this.db.prepare('SELECT * FROM trading_delivery WHERE history_done=0 OR portfolio_done=0 ORDER BY rowid LIMIT 50').all()){
   const errors=[];if(!r.history_done)try{if(history.append(JSON.parse(r.event))===false)throw Error('HISTORY_PENDING');this.db.prepare('UPDATE trading_delivery SET history_done=1 WHERE id=?').run(r.id);}catch(_){errors.push('HISTORY_PENDING');}
   if(!r.portfolio_done)try{await publish(JSON.parse(r.event));this.db.prepare('UPDATE trading_delivery SET portfolio_done=1 WHERE id=?').run(r.id);}catch(_){errors.push('PORTFOLIO_PENDING');}
   this.db.prepare('UPDATE trading_delivery SET last_error=? WHERE id=?').run(errors.length?errors.join(','):null,r.id);
  }
 }finally{this.busy=false;}}
}
module.exports={DeliveryOutbox};
