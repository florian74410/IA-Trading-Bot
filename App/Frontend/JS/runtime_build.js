(function(){
'use strict';
if(window.IATBRuntimeBuild)return;
var unavailable='Version indisponible', current=null;
function label(build){
 return build&&build.version&&typeof build.revision==='string'&&/^[0-9A-Za-z._-]+$/.test(build.revision)?build.revision:unavailable;
}
function apply(node){
 node.textContent=label(current);
 if(current&&current.source_commit)node.title=current.source_commit;
 else node.removeAttribute('title');
}
function update(response){
 current=response&&response.build||null;
 document.querySelectorAll('[data-runtime-build]').forEach(apply);
}
window.IATBRuntimeBuild={label:label,apply:apply,update:update};
fetch('/api/health',{credentials:'same-origin',cache:'no-store'})
 .then(function(response){return response.ok?response.json():null})
 .then(update).catch(function(){update(null)});
})();
