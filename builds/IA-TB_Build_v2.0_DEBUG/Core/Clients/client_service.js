'use strict';

function cleanName(v){return String(v==null?'':v).trim().replace(/\s+/g,' ').slice(0,80);}
function cleanEmail(v){var e=String(v==null?'':v).trim().toLowerCase().slice(0,254);if(e&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))throw new Error('CLIENT_EMAIL_INVALID');return e;}
function splitName(username){
  var s=cleanName(username);if(!s||s==='Utilisateur')return{firstName:s||'',lastName:''};
  var p=s.split(' ');return{firstName:p.shift()||'',lastName:p.join(' ')};
}
function ClientService(repository,crypto,store){
  this.repo=repository;this.crypto=crypto;this.store=store;this.bindingScope='client_identity';this.bindingKey='active_client_id';
}
ClientService.prototype._public=function(x){
  if(!x)return null;
  return{clientId:x.clientId,firstName:this.crypto.open(x.firstNameEnc),lastName:this.crypto.open(x.lastNameEnc),email:this.crypto.open(x.emailEnc),status:x.status,securityVersion:x.securityVersion,createdAt:x.createdAt,updatedAt:x.updatedAt};
};
ClientService.prototype._externalRef=function(sess){
  if(sess&&sess.userId)return'user:'+sess.userId;
  if(sess&&sess.email)return'email:'+String(sess.email).toLowerCase();
  if(sess&&sess.username)return'username:'+String(sess.username).toLowerCase();
  return'local-admin';
};
ClientService.prototype.resolveSession=function(sess){
  this.repo.assertReady();
  var explicit=String(sess&&sess.clientId||'').trim(),x=null,bound='';
  if(explicit)x=this.repo.byId(explicit);
  if(!x&&this.store){bound=String(this.store.get(this.bindingScope,this.bindingKey,'')||'');if(bound)x=this.repo.byId(bound);}
  var email=cleanEmail(sess&&sess.email||'');
  if(!x&&email)x=this.repo.byEmailHash(this.crypto.lookupHash(email));
  var extHash=this.crypto.externalHash(this._externalRef(sess));
  if(!x)x=this.repo.byExternalHash(extHash);
  if(!x){
    var n=splitName(sess&&sess.username||'Utilisateur'),now=new Date().toISOString();
    x=this.repo.insert({clientId:this.repo.nextClientId(),externalRefHash:extHash,firstNameEnc:this.crypto.seal(n.firstName),lastNameEnc:this.crypto.seal(n.lastName),emailEnc:this.crypto.seal(email),emailHash:email?this.crypto.lookupHash(email):'',status:'ACTIVE',securityVersion:1,createdAt:now,updatedAt:now});
    this.repo.audit(x.clientId,'CLIENT_CREATED',null,this.crypto.seal(JSON.stringify({source:'session-bootstrap'})));
  }
  if(this.store)this.store.set(this.bindingScope,this.bindingKey,x.clientId);
  if(sess)sess.clientId=x.clientId;
  return this._public(x);
};
ClientService.prototype.update=function(sess,input){
  var me=this.resolveSession(sess),cur=this.repo.byId(me.clientId),n=splitName(input&&input.username||''),first=cleanName(input&&input.firstName!=null?input.firstName:n.firstName),last=cleanName(input&&input.lastName!=null?input.lastName:n.lastName),email=cleanEmail(input&&input.email!=null?input.email:me.email),emailHash=email?this.crypto.lookupHash(email):'';
  if(emailHash){var other=this.repo.byEmailHash(emailHash);if(other&&other.clientId!==me.clientId)throw new Error('CLIENT_EMAIL_ALREADY_USED');}
  var out=this.repo.updateIdentity(me.clientId,{firstNameEnc:this.crypto.seal(first),lastNameEnc:this.crypto.seal(last),emailEnc:this.crypto.seal(email),emailHash:emailHash,updatedAt:new Date().toISOString()});
  this.repo.audit(me.clientId,'CLIENT_PROFILE_UPDATED',null,this.crypto.seal(JSON.stringify({fields:['firstName','lastName','email']})));
  if(sess){sess.clientId=me.clientId;sess.email=email;sess.username=(first+' '+last).trim()||sess.username;}
  return this._public(out);
};
ClientService.prototype.active=function(){if(!this.store)return null;var id=String(this.store.get(this.bindingScope,this.bindingKey,'')||'');if(!id)return null;var x=this.repo.byId(id);return x?this._public(x):null;};
ClientService.prototype.me=function(sess){var p=this.resolveSession(sess);p.walletIds=this.repo.walletIds(p.clientId,true);return p;};
ClientService.prototype.listAdmin=function(){var self=this;return this.repo.list().map(function(x){var p=self._public(x);p.walletIds=self.repo.walletIds(p.clientId,true);return p;});};
ClientService.prototype.linkWallet=function(sess,walletId){var me=this.resolveSession(sess);this.repo.linkWallet(me.clientId,walletId);this.repo.audit(me.clientId,'WALLET_LINKED',walletId,'');return me.clientId;};
ClientService.prototype.archiveWallet=function(sess,walletId){var me=this.resolveSession(sess);this.repo.archiveWallet(me.clientId,walletId);this.repo.audit(me.clientId,'WALLET_ARCHIVED',walletId,'');return me.clientId;};
ClientService.prototype.status=function(){var s=this.repo.status();return{ready:s.ready,schemaVersion:s.schemaVersion,backend:s.backend,lastError:s.lastError};};
module.exports=ClientService;
