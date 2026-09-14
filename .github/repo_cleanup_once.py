from pathlib import Path

root = Path(__file__).resolve().parents[1]
build = root / "builds" / "IA-TB_Build_v1.11.7"

# Core server: remove retired booster Admin routes and restore the normal
# restart/stop lifecycle with no external system tuning dependency.
p = build / "Core" / "Server" / "server_v1.0.js"
s = p.read_text(encoding="utf-8")

start = s.index(" if(req.method==='GET'&&p==='/api/admin/ultra/status')")
end = s.index(" if(req.method==='POST'&&p==='/api/admin/system/restart')", start)
s = s[:start] + s[end:]

restart_start = s.index(" if(req.method==='POST'&&p==='/api/admin/system/restart')")
stop_start = s.index(" if(req.method==='POST'&&p==='/api/admin/system/stop-total')", restart_start)
restart = """ if(req.method==='POST'&&p==='/api/admin/system/restart')return body(req,function(e,b){
  if(e||!b||b.confirmed!==true)return json(res,400,{ok:false,error:'CONFIRMATION_REQUIRED'});
  if(process.env.IATB_SUPERVISED!=='1')return json(res,409,{ok:false,error:'SUPERVISOR_REQUIRED'});
  if(!fs.existsSync(path.join(ROOT,'Core','Admin','restart_all.js')))return json(res,500,{ok:false,error:'RESTART_HELPER_MISSING'});
  json(res,200,{ok:true,message:'Full IA-TB restart scheduled',components:['core','router','kraken','indicators','marketdata','liquidity','fundamental','trading','firewall','strategy','risk','portfolio']});
  setTimeout(function(){try{scheduleAdminFullRestart();}catch(x){log('ADMIN','Redemarrage global impossible',x.message);}},180);
 });
"""
s = s[:restart_start] + restart + s[stop_start:]
s = s.replace(
    "json(res,200,{ok:true,message:'Arrêt Total programmé',ultraWillStop:true,preferencePreserved:true,helperPid:helper.helperPid});",
    "json(res,200,{ok:true,message:'Arrêt Total programmé',helperPid:helper.helperPid});",
)
p.write_text(s, encoding="utf-8")

# Remove the now-unused sidebar icon class that existed only for the retired mode.
p = build / "Frontend" / "CSS" / "admin_v1.0.css"
s = p.read_text(encoding="utf-8")
s = s.replace(".pulseIcon{color:#a789f6}", "")
p.write_text(s, encoding="utf-8")

# Remove the retired feature from the current roadmap navigation description.
p = root / "ROADMAP.md"
s = p.read_text(encoding="utf-8")
s = s.replace("Maintenance, ULTRA, Logs", "Maintenance, Logs")
p.write_text(s, encoding="utf-8")
