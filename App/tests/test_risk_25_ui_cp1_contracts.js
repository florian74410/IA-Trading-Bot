'use strict';
const assert=require('node:assert/strict');
const test=require('node:test');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
function read(p){return fs.readFileSync(path.join(ROOT,p),'utf8');}
test('Risk 2.5 UI module controls, CP1 contracts and no LLM calls',()=>{
 const html=read('Frontend/Pages/settings.html');
 const js=read('Frontend/JS/settings.js');
 const risk=read('Risk/Engine/risk_service.js');
 const supervisor=read('Supervisor/supervisor_service.js');
 const core=read('Supervisor/Core/supervisor_core.js');
 assert.match(html,/id="view-risk"/);
 for(const key of ['rmEnabled','rmLevel','rmR1','rmR2','rmSuggestions','rmSave'])assert.ok(html.includes('id="'+key+'"'),key);
 for(const action of ['risk.settings.get','risk.settings.set'])assert.ok(js.includes(action),action);
 for(const action of ['risk.r1.evaluate','risk.r2.snapshot']){assert.ok(risk.includes(action),action);assert.ok(core.includes(action),action);}
 for(const action of ['supervisor.risk.r1.preview','supervisor.risk.r2.snapshot'])assert.ok(supervisor.includes(action),action);
 assert.doesNotMatch(read('Risk/Engine/risk_management_modules_v2_5.js'),/openai|chat\.completions|responses\.create/i);
});
