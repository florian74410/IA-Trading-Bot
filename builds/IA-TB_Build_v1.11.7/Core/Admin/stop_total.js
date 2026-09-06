'use strict';
/* IA-TB v1.5.1 — Total Stop Helper.
   Action fixe uniquement: laisse le Core répondre, force ensuite l'arrêt des
   processus IA-TB connus si nécessaire, puis désactive ULTRA Mode.
*/
var fs=require('fs'),path=require('path'),child=require('child_process'),UltraManager=require('../Booster/ultra_mode/ultra_manager');
var ROOT=path.resolve(__dirname,'../..'),LOG=path.join(ROOT,'Core','Admin','stop_total.log'),ultra=new UltraManager(ROOT,{stabilizationMs:2000,startTimeoutMs:10000});
function log(s){var line=new Date().toISOString()+' '+s+'\n';try{fs.appendFileSync(LOG,line,'utf8');}catch(e){}try{ultra.note('ARRÊT TOTAL: '+s);}catch(x){}}
function finish(code){setTimeout(function(){process.exit(code||0);},80);}
log('=== ARRÊT TOTAL IA-TB ===');
/* Laisser le temps à la réponse HTTP et au launcher/start.command de fermer proprement. */
setTimeout(function(){
 var stopScript=path.join(ROOT,'stop.command');
 if(!fs.existsSync(stopScript)){log('WARN stop.command introuvable; poursuite avec STOP ULTRA.');return stopUltra();}
 child.execFile('/bin/bash',[stopScript],{cwd:ROOT,timeout:14000,maxBuffer:256*1024},function(e,stdout,stderr){
  if(e)log('WARN stop.command: '+(String(stderr||stdout||e.message).trim()));
  else log('Processus IA-TB arrêtés / vérifiés.');
  stopUltra();
 });
},3200);
function stopUltra(){
 ultra.stop(function(e,o){
  if(e){log('ERREUR STOP ULTRA: '+e.message);return finish(2);}
  log('ULTRA='+((o&&o.active)?'ACTIVE':'INACTIVE')+'. Arrêt total terminé.');
  finish(0);
 });
}
