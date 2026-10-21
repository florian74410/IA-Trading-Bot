'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {firefox}=require('playwright');
const ROOT=path.resolve(__dirname,'../..');
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
test('Risk settings render and ADMIN can persist modules via authenticated API',async()=>{
 const browser=await firefox.launch({headless:true,firefoxUserPrefs:process.env.IATB_FIREFOX_CONTAINER==='1'?{'security.sandbox.content.level':0,'security.sandbox.gpu.level':0,'dom.ipc.forkserver.enable':false}:{}});
 let saved=null;const page=await browser.newPage({viewport:{width:1200,height:900}});
 const current={enabled:true,riskLevel:'BALANCED',autoSuggestions:true,r1:{capital:true,stopLoss:true,budget:true,resize:true},r2:{equity:true,drawdown:true,concentration:true,correlation:true,margin:true,volatility:true,stopBudget:true,freshness:true}};
 try{
  await page.route('**/*',async route=>{
   const req=route.request(),url=new URL(req.url),p=url.pathname;
   if(p==='/settings')return route.fulfill({status:200,contentType:'text/html',body:read('Frontend/Pages/settings.html')});
   if(p==='/assets/settings.js')return route.fulfill({contentType:'application/javascript',body:read('Frontend/JS/settings.js')});
   if(p==='/assets/settings.css')return route.fulfill({contentType:'text/css',body:read('Frontend/CSS/settings.css')});
   if(p.startsWith('/assets/'))return route.fulfill({contentType:'application/javascript',body:''});
   if(p==='/api/admin/risk/settings'){
    if(req.method()==='POST'){saved=JSON.parse(req.postData()||'{}');Object.assign(current,saved.management||{});}
    return route.fulfill({json:{ok:true,settings:{management:current}}});
   }
   if(p==='/router-health')return route.fulfill({json:{ok:true,dependencies:{}}});
   return route.fulfill({json:{ok:true,data:{},items:[],providers:[],registry:{},threads:[],settings:{}}});
  });
  await page.goto('http://iatb.test/settings?section=Risk%20Manager');
  await page.locator('#rmStatus').filter({hasText:'CHARGÉE'}).waitFor({timeout:10000});
  assert(await page.locator('#view-risk').isVisible(),'real Risk view visible');
  assert.equal(await page.locator('#rmR1 input[type=checkbox]').count(),4);
  assert.equal(await page.locator('#rmR2 input[type=checkbox]').count(),8);
  await page.locator('#rmLevel').selectOption('LOW');
  await page.locator('[data-rm-group="r2"][data-rm-module="margin"]').uncheck();
  await page.locator('#rmSave').click();
  await page.waitForFunction(()=>document.querySelector('#rmNotice')?.textContent?.includes('enregistrés'));
  assert.equal(saved.management.riskLevel,'LOW');
  assert.equal(saved.management.r2.margin,false);
 }finally{await page.close();await browser.close();}
});
