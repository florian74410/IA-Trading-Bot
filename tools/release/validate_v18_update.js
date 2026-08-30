'use strict';
var fs=require('fs'),path=require('path'),crypto=require('crypto'),child=require('child_process'),os=require('os');
var ROOT=process.cwd(),ARCHIVE=path.join(ROOT,'archives','IA-Trading-Bot_V1.7.9.zip'),PATCH=path.join(ROOT,'updates','Patch_v1.7.9_to_v1.8.0','Crypto Chart Viewer IA Trader.zip'),TARGET=path.join(ROOT,'builds','v1.8');
function rm(p){try{fs.rmSync(p,{recursive:true,force:true});}catch(e){}}
function mkdir(p){if(!fs.existsSync(p))fs.mkdirSync(p,{recursive:true});}
function sha(p){var h=crypto.createHash('sha256'),b=fs.readFileSync(p);h.update(b);return h.digest('hex');}
function walk(root,out,rel){out=out||{};rel=rel||'';fs.readdirSync(path.join(root,rel)).forEach(function(n){var r=rel?rel+'/'+n:n,p=path.join(root,r),s=fs.lstatSync(p);if(s.isSymbolicLink())throw new Error('SYMLINK:'+r);if(s.isDirectory())walk(root,out,r);else if(s.isFile())out[r]=sha(p);});return out;}
var exact={'secrets_v2.dat':1,'user.dat':1,'config_v1.0.dat':1,'logs.dat':1,'ai_settings_v2.dat':1,'user_data.db':1,'UserData/local_username.dat':1,'UserData/sync_agent.pid':1,'Parametres/ActiveAppSettings.dat':1,'Updates/launcher_state.dat':1,'Updates/launcher_control.dat':1};
function ignored(r){r=String(r).replace(/\\/g,'/');if(exact[r])return true;if(r.indexOf('user_data.db-')===0)return true;if(r==='Fundamental/fundamental.log'||r==='Fundamental/sqlite_install.log')return true;if(r.indexOf('Fundamental/Data/')===0||r.indexOf('Fundamental/node_modules/')===0||r.indexOf('UserData/node_modules/')===0)return true;if(r.indexOf('Parametres/')===0||r.indexOf('Annexes/')===0)return true;if(r.indexOf('Updates/Backups/')===0||r.indexOf('Updates/Inbox/')===0||r.indexOf('Updates/Staging/')===0||r.indexOf('Updates/AI-Generated/')===0)return true;if(r==='Updates/update_history.dat'||r==='Updates/pending_activation.dat')return true;return false;}
function locateBase(dir){var found=[];function scan(d){fs.readdirSync(d).forEach(function(n){var p=path.join(d,n),s=fs.lstatSync(p);if(s.isDirectory())scan(p);else if(n==='VERSION'){var root=path.dirname(p);if(fs.existsSync(path.join(root,'Core','Updates','update_manager_v1.0.js')))found.push(root);}});}scan(dir);if(found.length!==1)throw new Error('BASE_ROOT_COUNT_'+found.length);return found[0];}
function copyTree(src,dst){mkdir(dst);fs.readdirSync(src).forEach(function(n){var a=path.join(src,n),b=path.join(dst,n),s=fs.lstatSync(a);if(s.isSymbolicLink())throw new Error('BASE_SYMLINK:'+a);if(s.isDirectory())copyTree(a,b);else fs.copyFileSync(a,b);});}
function fail(e){console.error(e&&e.stack||e);process.exit(1);}
try{
 if(!fs.existsSync(ARCHIVE)||!fs.existsSync(PATCH)||!fs.existsSync(TARGET))throw new Error('VALIDATION_INPUT_MISSING');
 var temp=fs.mkdtempSync(path.join(os.tmpdir(),'iatb-v18-'));
 child.execFileSync('/usr/bin/unzip',['-q',ARCHIVE,'-d',path.join(temp,'extract')]);
 var base=locateBase(path.join(temp,'extract')),work=path.join(temp,'work');copyTree(base,work);
 if(fs.readFileSync(path.join(work,'VERSION'),'utf8').trim()!=='1.7.9')throw new Error('BASE_VERSION_NOT_1.7.9');
 var UpdateManager=require(path.join(work,'Core','Updates','update_manager_v1.0.js'));
 if(typeof UpdateManager!=='function'&&UpdateManager&&typeof UpdateManager.UpdateManager==='function')UpdateManager=UpdateManager.UpdateManager;
 if(typeof UpdateManager!=='function')throw new Error('UPDATE_MANAGER_EXPORT_INVALID');
 var mgr=new UpdateManager(work,'1.7.9');
 mgr.inspectArchive(PATCH,'ci',function(err,preview){
  if(err)return fail(err);
  if(!preview||!preview.compatibility||preview.compatibility.ok!==true)return fail(new Error('PREVIEW_NOT_COMPATIBLE'));
  console.log('PREVIEW_OK files='+preview.compatibility.fileCount+' sha256='+preview.archiveSha256);
  mgr.install(preview.token,function(instErr,result){
   if(instErr)return fail(instErr);
   try{
    var version=fs.readFileSync(path.join(work,'VERSION'),'utf8').trim();if(version!=='1.8.0')throw new Error('RESULT_VERSION_'+version);
    var pointer=JSON.parse(fs.readFileSync(path.join(work,'Updates','current_release.dat'),'utf8'));
    if(String(pointer.version)!=='1.8.0'||pointer.server!=='Core/Server/server_v1.8.js')throw new Error('RELEASE_POINTER_INVALID');
    ['Risk/Engine/risk_engine.js','Risk/Engine/risk_service.js','Risk/Tests/risk_engine.test.js','Core/Server/server_v1.8.js'].forEach(function(r){if(!fs.existsSync(path.join(work,r)))throw new Error('RESULT_MISSING_'+r);});
    child.execFileSync(process.execPath,['--check',path.join(work,'Risk','Engine','risk_engine.js')],{stdio:'inherit'});
    child.execFileSync(process.execPath,['--check',path.join(work,'Risk','Engine','risk_service.js')],{stdio:'inherit'});
    child.execFileSync(process.execPath,[path.join(work,'Risk','Tests','risk_engine.test.js')],{stdio:'inherit'});
    var a=walk(work),b=walk(TARGET),diff=[];
    Object.keys(a).concat(Object.keys(b)).filter(function(x,i,z){return z.indexOf(x)===i;}).sort().forEach(function(r){if(ignored(r))return;if(r==='Updates/current_release.dat')return;if(a[r]!==b[r])diff.push({path:r,installed:a[r]||null,target:b[r]||null});});
    if(diff.length)throw new Error('INSTALLED_BUILD_MISMATCH '+JSON.stringify(diff.slice(0,30)));
    var report={schema:1,status:'PASS',fromVersion:'1.7.9',toVersion:'1.8.0',updateManager:'Core/Updates/update_manager_v1.0.js',patchSha256:sha(PATCH),fileCount:preview.compatibility.fileCount,entrypoint:'Core/Server/server_v1.8.js',riskPureTest:'PASS',installedBuildMatchesTarget:true,validatedAt:new Date().toISOString()};
    var reportPath=path.join(ROOT,'updates','Patch_v1.7.9_to_v1.8.0','VALIDATION_REPORT.json');fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify(report,null,2));rm(temp);
   }catch(e){fail(e);}
  });
 });
}catch(e){fail(e);}
