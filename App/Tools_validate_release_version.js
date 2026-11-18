'use strict';
var fs=require('fs'),path=require('path');
var root=__dirname;
function clean(v){return String(v||'').trim().replace(/^v/,'');}
function fail(m){console.error('[VERSION-GUARD] '+m);process.exit(2);}
var version=clean(fs.readFileSync(path.join(root,'VERSION'),'utf8'));
var manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));
var release=JSON.parse(fs.readFileSync(path.join(root,'Updates','current_release.dat'),'utf8'));
var mv=clean(manifest.version),rv=clean(release.version);
if(!version||version!==mv||version!==rv)fail('incoherence: VERSION='+version+' manifest='+mv+' current_release='+rv);
var build=require('./Core/Shared/build_info').build;
var revisionFile=path.join(root,'REVISION'),receiptFile=path.join(root,'../BUILD.json');
if(fs.existsSync(revisionFile)){
 var revision=fs.readFileSync(revisionFile,'utf8').trim();
 if(revision!==build.revision||revision!==manifest.revision||revision!==release.revision)fail('incoherence de révision');
}
if(fs.existsSync(receiptFile)&&!build.source_commit)fail('BUILD.json ne correspond pas à la source');
console.log('[VERSION-GUARD] OK '+(build.revision||version)+(build.source_commit?' · '+build.source_commit:''));
