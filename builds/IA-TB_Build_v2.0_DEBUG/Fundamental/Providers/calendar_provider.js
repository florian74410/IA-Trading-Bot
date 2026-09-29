'use strict';
/* IA-TB normalized calendars
   - FED: official FOMC meeting calendar from Federal Reserve
   - CME: public Economic Release Calendar page
   INFORMATION_ONLY. No authenticated/private CME endpoints are used.
*/
var WEB=require('./web_provider'),FedWatch=require('./fedwatch_provider');
var CACHE_MS=10*60*1000,last={at:0,data:null};
function strip(s){return String(s||'').replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&#39;/g,"'").replace(/&quot;/gi,'"').replace(/\s+/g,' ').trim();}
function uniq(a,keyFn){var seen={},out=[];(a||[]).forEach(function(x){var k=keyFn(x);if(!k||seen[k])return;seen[k]=1;out.push(x)});return out;}
function impactNorm(s){s=String(s||'').toUpperCase();if(/HIGH|MARKET MOVER/.test(s))return'HIGH';if(/MERITS|MEDIUM|EXTRA ATTENTION/.test(s))return'MEDIUM';if(/LOW|MINIMAL/.test(s))return'LOW';return'UNKNOWN';}
var MONTH={Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11,January:0,February:1,March:2,April:3,May:4,June:5,July:6,August:7,September:8,October:9,November:10,December:11};
function parseCme(html){
 var txt=strip(html),out=[],year=new Date().getUTCFullYear();
 var re=/(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(20\d{2}))?[\s\S]{0,500}?((?:\d{1,2}:\d{2}\s*(?:AM|PM))|(?:\d{1,2}\s*(?:AM|PM))|N\/A)?\s*(Australia|Brazil|Canada|China|EMU|France|Germany|Global|Hong Kong|India|Italy|Japan|New Zealand|Singapore|South Korea|Switzerland|Taiwan|United Kingdom|United States)[\s:|-]+([^|]{4,120}?)(?=(?:High Impact|Low Impact|Minimal Impact|Merits Extra Attention|Other Key Indicator|\d{1,2}:\d{2}\s*(?:AM|PM)|N\/A|$))/gi,m;
 while((m=re.exec(txt))){
  var monKey=m[1],mo=MONTH[monKey] != null ? MONTH[monKey] : MONTH[monKey.slice(0,3)],day=+m[2],yy=+(m[3]||year),time=String(m[4]||'').trim(),country=String(m[5]||'').trim(),event=String(m[6]||'').replace(/\s+/g,' ').trim(),dt=new Date(Date.UTC(yy,mo,day,0,0,0));
  if(!event||isNaN(dt.getTime()))continue;
  var tail=txt.slice(m.index,m.index+700),imp=(tail.match(/High Impact|Low Impact|Minimal Impact|Merits Extra Attention|Other Key Indicator/i)||[])[0]||'UNKNOWN';
  out.push({id:'CME:'+yy+'-'+String(mo+1).padStart(2,'0')+'-'+String(day).padStart(2,'0')+':'+event.toUpperCase().replace(/[^A-Z0-9]+/g,'_').slice(0,80),calendar:'CME_ECONOMIC_RELEASES',date:dt.toISOString().slice(0,10),timeLabel:time||null,country:country,event:event,impact:impactNorm(imp),source:'CME Group',url:'https://www.cmegroup.com/education/events/economic-releases-calendar'});
  if(out.length>=120)break;
 }
 if(!out.length){
  var dRe=/Showing ['"]?undefined['"]? Matching Events for ["']?(\d{1,2})(?:st|nd|rd|th)\s+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)[\s,]+(20\d{2})/i,dm=txt.match(dRe);
  if(dm){return{events:[],status:'NO_EVENTS_FOR_CURRENT_DATE',pageDate:dm[3]+'-'+String(MONTH[dm[2]]+1).padStart(2,'0')+'-'+String(+dm[1]).padStart(2,'0')};}
 }
 out=uniq(out,function(x){return x.id});
 out.sort(function(a,b){return String(a.date).localeCompare(String(b.date))||String(a.timeLabel||'').localeCompare(String(b.timeLabel||''))});
 return{events:out,status:out.length?'OK':'PARSE_EMPTY',pageDate:null};
}
function fedEvents(packet){
 var c=(packet&&packet.calendar)||[];
 return c.map(function(x){return{id:'FED:FOMC:'+x.date,calendar:'FED_FOMC',date:x.date,timeLabel:null,country:'United States',event:'FOMC Meeting / Rate Decision',impact:'HIGH',source:'Federal Reserve',url:'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm'};});
}
function collectCme(cb){var url='https://www.cmegroup.com/education/events/economic-releases-calendar';WEB._fetchUrl(url,function(e,html,transport){if(e)return cb(null,{ok:false,status:'UNAVAILABLE',error:String(e.message||e),transport:transport||null,events:[],url:url});var p=parseCme(html);cb(null,{ok:p.status==='OK'||p.status==='NO_EVENTS_FOR_CURRENT_DATE',status:p.status,error:p.status==='PARSE_EMPTY'?'CME_CALENDAR_PARSE_EMPTY':null,transport:transport||'web',events:p.events,pageDate:p.pageDate,url:url});});}
exports.collect=function(cb){
 if(last.data&&Date.now()-last.at<CACHE_MS)return process.nextTick(function(){cb(null,last.data)});
 var done=0,fed=null,cme=null;
 function finish(){if(++done<2)return;var all=(fed&&fed.events||[]).concat(cme&&cme.events||[]).sort(function(a,b){return String(a.date).localeCompare(String(b.date))});var data={ok:!!((fed&&fed.ok)||(cme&&cme.ok)),generatedAt:new Date().toISOString(),calendars:{fed:fed,cme:cme},events:all};last={at:Date.now(),data:data};cb(null,data);}
 FedWatch.collect(function(e,p){fed=e?{ok:false,status:'UNAVAILABLE',error:String(e.message||e),events:[]}:{ok:true,status:'OK',events:fedEvents(p),url:'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm'};finish();});
 collectCme(function(e,p){cme=e?{ok:false,status:'UNAVAILABLE',error:String(e.message||e),events:[]}:p;finish();});
};
exports.invalidate=function(){last={at:0,data:null}};
exports._parseCme=parseCme;
