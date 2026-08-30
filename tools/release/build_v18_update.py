#!/usr/bin/env python3
from pathlib import Path
import hashlib, json, shutil, sys, zipfile

APP='Crypto Chart Viewer IA Trader'
FROM='1.7.9'
TO='1.8.0'
ENTRY='Core/Server/server_v1.8.js'
PATCH_DIR=Path('updates/Patch_v1.7.9_to_v1.8.0')
PATCH_ZIP=PATCH_DIR/'Crypto Chart Viewer IA Trader.zip'

PROTECTED_EXACT={
 'secrets_v2.dat','user.dat','config_v1.0.dat','logs.dat','ai_settings_v2.dat','user_data.db',
 'UserData/local_username.dat','UserData/sync_agent.pid',
 'Parametres/ActiveAppSettings.dat','Updates/current_release.dat','Updates/pending_activation.dat',
 'Updates/launcher_state.dat','Updates/launcher_control.dat'
}

def protected(rel):
    r=rel.replace('\\','/')
    if r in PROTECTED_EXACT: return True
    if r.startswith('user_data.db-'): return True
    if r in {'Fundamental/fundamental.log','Fundamental/sqlite_install.log'}: return True
    if r.startswith('Fundamental/Data/') or r.startswith('Fundamental/node_modules/') or r.startswith('UserData/node_modules/'): return True
    return r.startswith('Parametres/') or r.startswith('Annexes/') or r.startswith('Updates/Backups/') or r.startswith('Updates/Inbox/') or r.startswith('Updates/AI-Generated/') or r=='Updates/update_history.dat'

def sha256(p):
    h=hashlib.sha256()
    with open(p,'rb') as f:
        for c in iter(lambda:f.read(1024*1024),b''): h.update(c)
    return h.hexdigest()

def files(root):
    out={}
    for p in root.rglob('*'):
        if p.is_file() and not p.is_symlink():
            rel=p.relative_to(root).as_posix()
            out[rel]=p
    return out

def locate_base(extract_root):
    candidates=[]
    for p in extract_root.rglob('VERSION'):
        root=p.parent
        if (root/'Core/Updates/update_manager_v1.0.js').is_file(): candidates.append(root)
    if len(candidates)!=1:
        raise SystemExit('Unable to identify exactly one v1.7.9 application root: '+repr([str(x) for x in candidates]))
    return candidates[0]

def main():
    repo=Path.cwd()
    archive=repo/'archives/IA-Trading-Bot_V1.7.9.zip'
    target=repo/'builds/v1.8'
    if not archive.is_file(): raise SystemExit('official v1.7.9 archive missing')
    if not target.is_dir(): raise SystemExit('builds/v1.8 missing')
    tmp=repo/'.tmp-v18-update-build'
    shutil.rmtree(tmp,ignore_errors=True); tmp.mkdir()
    with zipfile.ZipFile(archive) as z: z.extractall(tmp/'base')
    base=locate_base(tmp/'base')
    if (base/'VERSION').read_text().strip()!='1.7.9': raise SystemExit('baseline VERSION is not 1.7.9')
    b=files(base); t=files(target)
    deletions=[r for r in b if r not in t and not protected(r)]
    if deletions:
        raise SystemExit('UpdateManager v1 cannot reproduce file deletions: '+', '.join(deletions[:50]))
    changed=[]
    for r,p in sorted(t.items()):
        if protected(r):
            # Protected files may not be present in the payload. They must stay compatible with the stable base.
            continue
        bp=b.get(r)
        if bp is None or sha256(bp)!=sha256(p): changed.append(r)
    if ENTRY not in changed:
        changed.append(ENTRY)
    stage=tmp/APP
    payload=stage/'payload'; payload.mkdir(parents=True)
    entries=[]
    for r in sorted(set(changed)):
        src=target/r
        if not src.is_file(): raise SystemExit('target payload file missing: '+r)
        dst=payload/r; dst.parent.mkdir(parents=True,exist_ok=True); shutil.copy2(src,dst)
        entries.append({'path':r,'sha256':sha256(dst)})
    manifest={
      'schema':1,'application':APP,'package_type':'UPDATE','from_version':FROM,'to_version':TO,
      'payload_root':'payload','entrypoint':ENTRY,
      'description':'IA-Trading-Bot v1.8.0 DEV — Risk Engine et intégrations v1.8 appliqués sur v1.7.9 STABLE',
      'files':entries
    }
    (stage/'update_manifest.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
    PATCH_DIR.mkdir(parents=True,exist_ok=True)
    if PATCH_ZIP.exists(): PATCH_ZIP.unlink()
    with zipfile.ZipFile(PATCH_ZIP,'w',zipfile.ZIP_DEFLATED) as z:
        for p in sorted(stage.rglob('*')):
            if p.is_file(): z.write(p,p.relative_to(tmp).as_posix())
    digest=sha256(PATCH_ZIP)
    (PATCH_DIR/'Crypto Chart Viewer IA Trader.zip.sha256').write_text(digest+'  Crypto Chart Viewer IA Trader.zip\n')
    (PATCH_DIR/'update_manifest.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
    meta={'baselineArchive':'archives/IA-Trading-Bot_V1.7.9.zip','baselineSha256':sha256(archive),'patchSha256':digest,'fileCount':len(entries),'entrypoint':ENTRY}
    (PATCH_DIR/'BUILD_INFO.json').write_text(json.dumps(meta,indent=2)+'\n')
    print(json.dumps(meta,indent=2))
    print('BASE_ROOT='+str(base))
    print('PATCH='+str(PATCH_ZIP))

if __name__=='__main__': main()
