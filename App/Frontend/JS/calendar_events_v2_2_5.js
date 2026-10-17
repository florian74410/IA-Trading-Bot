/* IA-TB 2.2.5 — adaptateur d'événements économiques (sans appels réseau).
 * Sources et contrats externes inchangés. UMD : navigateur et tests Node.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.IATBCalendarEvents = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  var SOURCES = ['FED', 'CME'];
  function validTime(s) {
    if (typeof s !== 'string' || !/(Z|[+-]\d\d:\d\d)$/.test(s)) return null;
    var n = Date.parse(s);
    return Number.isFinite(n) ? new Date(n).toISOString() : null;
  }
  function cleanText(s) { return typeof s === 'string' ? s.trim() : ''; }
  function sourceOf(s) { s = cleanText(s).toUpperCase(); return SOURCES.indexOf(s) >= 0 ? s : null; }
  function safeUrl(s) {
    if (typeof s !== 'string' || !/^https:\/\//i.test(s)) return null;
    try { var u = new URL(s); return u.protocol === 'https:' ? u.href : null; } catch (_) { return null; }
  }
  function normalize(input, forcedSource) {
    if (!input || typeof input !== 'object') return null;
    var source = sourceOf(forcedSource || input.source);
    var sid = cleanText(String(input.sourceId == null ? input.id == null ? '' : input.id : input.sourceId));
    var title = cleanText(input.title);
    if (!source || !sid || !title) return null;
    var instant = validTime(input.startAtUtc || input.dateTime || input.starts_at || '');
    // Never interpret a date-only publication as midnight UTC.
    var dateOnly = typeof input.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input.date) ? input.date : null;
    if (!instant && !dateOnly) return null;
    var imp = cleanText(input.importance).toUpperCase();
    if (!/^(LOW|MEDIUM|HIGH)$/.test(imp)) imp = null;
    return {
      id: source + ':' + sid, source: source, sourceId: sid, title: title,
      startAtUtc: instant, localDate: instant ? null : dateOnly,
      allDay: !instant,
      category: cleanText(input.category) || null,
      country:cleanText(input.country)||null,countryCode:cleanText(input.countryCode).toUpperCase()||null,
      importance: imp, description: cleanText(input.description) || null,
      officialUrl: safeUrl(input.officialUrl || input.url),
      previous: input.previous == null ? null : input.previous,
      forecast: input.forecast == null ? null : input.forecast,
      actual: input.actual == null ? null : input.actual,
      unit: cleanText(input.unit) || null
    };
  }
  function mergeFeeds(feeds) {
    var byId = new Map();
    (feeds || []).forEach(function (feed) {
      if (!feed || !Array.isArray(feed.events)) return;
      feed.events.forEach(function (raw) {
        var e = normalize(raw, feed.source);
        if (e) byId.set(e.id, e);
      });
    });
    return Array.from(byId.values()).sort(function (a, b) {
      var ad = a.startAtUtc || a.localDate, bd = b.startAtUtc || b.localDate;
      return ad < bd ? -1 : ad > bd ? 1 : a.id.localeCompare(b.id);
    });
  }
  /* Shared read-only adapter for the actual FED/CME provider calendar shape.
   * Calendar entries lacking an authoritative time remain date-only and are not
   * placed on the exact trading-candle timeline.
   */
  function whenFromLocalDate(date,label){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(String(date||'')))return null;
    var m=String(label||'').match(/\b(\d{1,2}):(\d{2})\s*(UTC|GMT|Z|ET|EST|EDT|CT|CST|CDT)\b/i);
    if(!m||+m[1]>23)return null;
    var base=Date.parse(date+'T'+m[1].padStart(2,'0')+':'+m[2]+':00Z'),zone=m[3].toUpperCase();
    if(['UTC','GMT','Z'].indexOf(zone)>=0)return new Date(base).toISOString();
    var tz=/^E/.test(zone)?'America/New_York':'America/Chicago';
    try{
      var formatter=new Intl.DateTimeFormat('en-US',{timeZone:tz,timeZoneName:'shortOffset',hour:'2-digit'});
      var offset=(formatter.formatToParts(new Date(base)).find(function(p){return p.type==='timeZoneName'})||{}).value||'';
      var match=offset.match(/^GMT([+-])(\d{1,2})(?::(\d\d))?$/);
      if(!match)return null;
      var delta=(match[1]==='+'?1:-1)*(+match[2]*60+(+match[3]||0));
      return new Date(base-delta*60000).toISOString();
    }catch(_){return null}
  }
  function fromCalendars(cal){
    cal=cal||{};var all=[];
    [['FED',cal.fed],['CME',cal.cme],['CME',cal.cmeExpirations]].forEach(function(pair){
      var source=pair[0],items=pair[1]&&pair[1].events||[];
      items.forEach(function(x,i){
        if(!x||typeof x!=='object')return;
        var date=x.date||null,time=x.startAtUtc||x.start_at_utc||x.dateTime||x.starts_at||whenFromLocalDate(date,x.timeLabel||x.time||'');
        var id=x.sourceId||x.id||x.eventId||[date,x.title||x.label||x.name||x.event||'',i].join(':');
        var e=normalize({source:source,id:id,title:x.title||x.label||x.name||x.event||'Événement économique',startAtUtc:time,date:date,category:x.category,importance:x.importance||x.impact,forecast:x.forecast??x.expected,actual:x.actual??x.real,previous:x.previous,unit:x.unit,country:x.country,countryCode:x.countryCode||x.country_code||(source==='FED'?'US':null),officialUrl:x.officialUrl||x.url},source);
        if(e)all.push(e);
      });
    });
    var ids=new Map();all.forEach(function(e){ids.set(e.id,e)});return Array.from(ids.values()).sort(function(a,b){var t=a.startAtUtc||a.localDate,u=b.startAtUtc||b.localDate;return t<u?-1:t>u?1:a.id.localeCompare(b.id)});
  }
  function dayKey(e, timeZone) {
    if (!e) return null;
    if (e.allDay) return e.localDate;
    try {
      var parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: timeZone || 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit'
      }).formatToParts(new Date(e.startAtUtc));
      var get = function (name) { var p = parts.find(function (x) { return x.type === name; }); return p && p.value; };
      return get('year') + '-' + get('month') + '-' + get('day');
    } catch (_) { return null; }
  }
  function filter(events, opts) {
    opts = opts || {};
    var source = cleanText(opts.source || 'ALL').toUpperCase();
    var category = cleanText(opts.category || '').toLowerCase();
    return (events || []).filter(function (e) {
      return (source === 'ALL' || e.source === source) &&
        (!category || (e.category || '').toLowerCase() === category) &&
        (!opts.day || dayKey(e, opts.timeZone) === opts.day);
    });
  }
  function chartMarkers(events, options) {
    options = options || {};
    if (options.enabled === false) return [];
    return filter(events, options).filter(function (e) {
      return !!e.startAtUtc && (!options.highMediumOnly || e.importance === 'HIGH' || e.importance === 'MEDIUM');
    }).map(function (e) {
      return {id:e.id,time:Math.floor(Date.parse(e.startAtUtc)/1000),source:e.source,
        label:e.title,country:cleanText(e.country)||null,countryCode:cleanText(e.countryCode)||null,importance:e.importance,
        forecast:e.forecast,actual:e.actual,previous:e.previous,unit:e.unit};
    });
  }
  function optionsFromSettings(s) {
    s = s && typeof s === 'object' ? s : {};
    return {
      enabled: s.chartEconomicEvents !== false, // ON by default
      showFlags: s.chartEconomicFlags !== false,
      showValues: s.chartEconomicValues !== false,
      showFed: s.chartEconomicFed !== false,
      showCme: s.chartEconomicCme !== false,
      highMediumOnly: s.chartEconomicHighMediumOnly === true
    };
  }
  return {normalize:normalize,mergeFeeds:mergeFeeds,dayKey:dayKey,filter:filter,
    chartMarkers:chartMarkers,optionsFromSettings:optionsFromSettings,fromCalendars:fromCalendars,whenFromLocalDate:whenFromLocalDate};
});
