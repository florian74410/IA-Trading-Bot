'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const calendar=require('../App/Frontend/JS/calendar_events_v2_2_5.js');
const globe=require('../App/Frontend/JS/fundamental_globe_expanded_v2_2_5.js');
test('FED/CME canonical payload retains dates, converts US zone and keeps forecast/actual',()=>{
 const events=calendar.fromCalendars({fed:{events:[
  {date:'2026-10-17',title:'FOMC announcement',timeLabel:'14:00 ET'},
  {date:'2026-10-25',title:'Meeting date only'}
 ]},cme:{events:[{date:'2026-10-17',title:'US CPI',timeLabel:'12:30 UTC',forecast:'1%',actual:'2%',countryCode:'US'}]}});
 assert.equal(events.length,3);
 const fomc=events.find(e=>e.title==='FOMC announcement');
 assert.equal(fomc.startAtUtc,'2026-10-17T18:00:00.000Z');
 assert.equal(fomc.countryCode,'US');
 const allDay=events.find(e=>e.title==='Meeting date only');
 assert.equal(allDay.startAtUtc,null);assert.equal(allDay.localDate,'2026-10-25');
 const cpi=events.find(e=>e.title==='US CPI');
 assert.equal(cpi.forecast,'1%');assert.equal(cpi.actual,'2%');
 assert.equal(calendar.chartMarkers(events,calendar.optionsFromSettings({})).length,2);
 assert.deepEqual(calendar.chartMarkers(events,calendar.optionsFromSettings({chartEconomicEvents:false})),[]);
});
test('timezone conversion respects winter EST and summer EDT',()=>{
 assert.equal(calendar.whenFromLocalDate('2026-01-15','14:00 ET'),'2026-01-15T19:00:00.000Z');
 assert.equal(calendar.whenFromLocalDate('2026-07-15','14:00 ET'),'2026-07-15T18:00:00.000Z');
 assert.equal(calendar.whenFromLocalDate('2026-07-15','horaire non publié'),null);
});
test('globe filtered categories and time windows only use real timestamps',()=>{
 const news=[{id:'n1',title:'Macro',category:'MACRO',publishedAt:'2026-10-17T16:00:00Z',latitude:50,longitude:10,countryCode:'DE'},
 {id:'n2',title:'Security',category:'SECURITY',publishedAt:'2026-10-15T16:00:00Z'},
 {id:'n3',title:'Malformed date',category:'CRYPTO',publishedAt:'2026-10-17'},
 {id:'n1',title:'Duplicate',category:'MACRO',publishedAt:'2026-10-17T15:00:00Z'}];
 const items=globe.unique(news);assert.equal(items.length,2);
 const day=globe.filter(items,{category:'TOP',period:'today'},Date.parse('2026-10-17T21:00:00Z'));
 assert.equal(day.length,1);assert.equal(day[0].title,'Macro');
 assert.equal(globe.filter(items,{category:'SECURITY',period:'week'},Date.parse('2026-10-17T21:00:00Z')).length,1);
 assert.equal(globe.summary(day).pins,1);
});
test('page wiring preserves separate News area and shares data across both globes',()=>{
 const fundamental=read('App/Frontend/Pages/fundamental_v3.html');
 const app=read('App/Frontend/Pages/app_v1.0.html');
 const settings=read('App/Frontend/Pages/settings.html');
 const controller=read('App/Frontend/JS/fundamental_controller_v3.js');
 const chart=read('App/Frontend/JS/chart_controller_native_v1.2.js');
 const globeBridge=read('App/Frontend/JS/fundamental_globe_bridge_v2_2_5.js');
 assert.match(fundamental,/id="fundamentalGlobeWebGL"/);
 assert.match(fundamental,/fundamental_globe_bridge_v2_2_5\.js/);
 assert.match(fundamental,/id="calendarUnifiedEvents"/);
 assert.match(fundamental,/data-view="news"/);
 assert.match(fundamental,/overviewIndicatorPanel/);
 assert.match(controller,/iatb-fundamental-news/);
 assert.match(globeBridge,/iatb-fundamental-news/);
 assert.match(globeBridge,/IATBExpandedGlobe\.mount/);
 assert.match(app,/chart_economic_events_v2_2_5\.js/);
 assert.match(settings,/data-econ-setting="enabled"/);
 assert.match(settings,/data-econ-setting="showFlags"/);
 assert.match(settings,/data-econ-setting="showValues"/);
 assert.match(chart,/setEconomicMarkers/);
});

test('Fundamental bridge classifies securely, resolves grounded regions and refuses invalid dates',()=>{
 const bridge=require('../App/Frontend/JS/fundamental_globe_bridge_v2_2_5.js');
 assert.equal(bridge.category({category:'SECURITY',title:'SEC approves exchange reporting'}),'SECURITY');
 assert.equal(bridge.category({category:'REGULATION',title:'Crypto exchange compliance'}),'REGULATION');
 assert.equal(bridge.category({title:'Major protocol exploit affecting DeFi lending'}),'SECURITY');
 assert.equal(bridge.locate({title:'New Fed regulation from Washington'}).cc,'US');
 assert.equal(bridge.locate({title:'BCE décision à Bruxelles'}).cc,'EU');
 assert.equal(bridge.locate({title:'Random crypto asset without a location'}).pos,null);
 assert.equal(bridge.timestamp({timestamp:1e30}),null);
 const row=bridge.adapt({id:'news1',title:'FED decision in Washington',category:'MACRO',published_at:'2026-10-17T18:00:00Z',country_code:'US'},0);
 assert.equal(row.category,'MACRO');
 assert.equal(row.latitude,39.8);
 assert.equal(row.longitude,-98.6);
 assert.equal(row.countryCode,'US');
 assert.equal(bridge.adapt({id:'bad',title:'Undated event'},1),null);
});


test('Fundamental collector refresh uses the shared single-flight button and avoids destructive purge',()=>{
 const page=read('App/Frontend/Pages/fundamental_v3.html');
 const controller=read('App/Frontend/JS/fundamental_controller_v3.js');
 assert.ok(page.includes('/assets/sync_button_state_v2_2_5.js?v=225'));
 assert.ok(page.indexOf('sync_button_state_v2_2_5.js')<page.indexOf('fundamental_controller_v3.js'));
 assert.match(controller,/IATBSyncButtonState\.bind\(b,collect/);
 assert.match(controller,/cpWrite\('fundamental\.collect',\{all:true\}\)/);
 const collectBody=controller.split('function collect(){')[1].split('function bindCollectButton(){')[0];
 assert.doesNotMatch(collectBody,/fundamental\.news\.purge/);
});
