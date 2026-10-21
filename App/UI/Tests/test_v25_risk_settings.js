'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..'),firefox=require('playwright').firefox;
let browser;const read=p=>fs.readFileSync(path.join(root,p),'utf8');
test.before(async()=>{browser=await firefox.launch({headless:true,firefoxUserPrefs:process.env.IATB_FIREFOX_CONTAINER==='1'?{'security.sandbox.content.level':0,'security.sandbox.gpu.level':0,'dom.ipc.forkserver.enable':false}:{}});});
test.after(async()=>{if(browser)await browser.close();});
test('Risk v2.5 actual settings markup renders 12 toggles, profiles, responsive columns, persists only via ADMIN endpoint',async()=>{
 const page=await browser.newPage();try{
  let html=read('Frontend/Pages/settings.html').replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'').replace(/<link\b[^>]*>/g,'');
  await page.setContent(html);
  await page.addStyleTag({content:read('Frontend/CSS/settings.css')});
  const s=read('Frontend/JS/settings.js'),chunk=s.slice(s.indexOf('// Risk Engine v2.5'),s.indexOf('function init(){'));
  assert(chunk.includes('bindRisk25'));
  const config={enabled:true,level:'BALANCED',r1:{enabled:true,modules:{capital:true,stop:true,budget:true,resize:true}},r2:{enabled:true,alertsEnabled:true,monitorIntervalSec:30,modules:{equity:true,drawdown:true,concentration:true,correlation:true,margin:true,stress:true,stopRisk:true,integrity:true}}};
  await page.addScriptTag({content:`var $=id=>document.getElementById(id);var api=function(path,opt){window.__lastApi={path:path,opt:opt||{}};return Promise.resolve(path.endsWith('settings')?{data:{settings:window.__saved||window.__config}}:{data:{at:0,status:'OK',alerts:[]}});};window.__config=${JSON.stringify(config)};\n`+chunk});
  await page.evaluate(()=>{document.getElementById('view-risk').classList.remove('hide');bindRisk25();loadRisk25()});
  await page.locator('#riskSaveStatus').getByText('Configuration chargée', {exact:false}).waitFor();
  assert.equal(await page.locator('[data-risk-module]').count(),12);
  await page.locator('#riskLevel').selectOption('PRUDENT');
  await page.locator('input[data-risk-module="r2:correlation"]').uncheck();
  await page.locator('#riskSave').click();
  const saved=await page.evaluate(()=>window.__lastApi);
  assert.equal(saved.path,'/api/admin/risk/settings');
  assert.equal(saved.opt.method,'POST');
  assert.equal(saved.opt.body.level,'PRUDENT');
  assert.equal(saved.opt.body.r2.modules.correlation,false);
  for(const width of [1280,768,390]){
   await page.setViewportSize({width,height:900});
   let widthInfo=await page.evaluate(()=>({full:document.documentElement.scrollWidth,viewport:innerWidth}));
   assert(widthInfo.full<=widthInfo.viewport+2,JSON.stringify(widthInfo));
  }
 }finally{await page.close();}
});
