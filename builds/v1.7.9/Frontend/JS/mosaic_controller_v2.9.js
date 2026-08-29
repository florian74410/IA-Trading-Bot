/* IA-TB v2.9 - Mosaïque controller
 * Declarative layout only: no arbitrary HTML/CSS/JS may be supplied by the AI.
 */
(function (global) {
  'use strict';

  const ALLOWED_COMMANDS = new Set([
    'mosaic.move',
    'mosaic.resize',
    'mosaic.show',
    'mosaic.hide',
    'mosaic.swap',
    'mosaic.apply',
    'mosaic.reset'
  ]);

  function integer(value, min, max, name) {
    const n = Number(value);
    if (!Number.isInteger(n) || n < min || n > max) throw new Error(name + ' invalide.');
    return n;
  }

  class IATBMosaicController {
    constructor(options) {
      const o = options || {};
      this.container = o.container;
      this.onChange = typeof o.onChange === 'function' ? o.onChange : null;
      this.defaultLayout = JSON.parse(JSON.stringify(o.defaultLayout || {}));
      this.layout = JSON.parse(JSON.stringify(o.layout || o.defaultLayout || {}));
      this.modules = new Map();
      this.overlayObserver = null;
      if (!this.container) throw new Error('Conteneur Mosaïque manquant.');
      this.scan();
      this.apply(this.layout, false);
      this.bindOverlayVisibility();
    }

    bindOverlayVisibility() {
      const self = this;
      const overlays = ['settingsPage', 'strategyPage', 'updatePage']
        .map((id) => document.getElementById(id))
        .filter(Boolean);
      if (!overlays.length || typeof MutationObserver === 'undefined') return;

      const sync = function () {
        const overlayOpen = overlays.some((el) => !el.classList.contains('hide'));
        self.container.style.visibility = overlayOpen ? 'hidden' : '';
        self.container.setAttribute('aria-hidden', overlayOpen ? 'true' : 'false');
      };

      this.overlayObserver = new MutationObserver(sync);
      overlays.forEach((el) => this.overlayObserver.observe(el, { attributes: true, attributeFilter: ['class'] }));
      sync();
    }

    scan() {
      this.modules.clear();
      this.container.querySelectorAll('[data-mosaic-id]').forEach((el) => {
        const id = String(el.getAttribute('data-mosaic-id') || '').trim();
        if (id) this.modules.set(id, el);
      });
    }

    assertModule(id) {
      const safe = String(id || '').trim();
      if (!safe || !this.modules.has(safe)) throw new Error('Module Mosaïque inconnu: ' + safe);
      return safe;
    }

    normalizeItem(id, item) {
      this.assertModule(id);
      const src = item || {};
      return {
        col: integer(src.col == null ? 1 : src.col, 1, 12, 'col'),
        row: integer(src.row == null ? 1 : src.row, 1, 100, 'row'),
        w: integer(src.w == null ? 4 : src.w, 1, 12, 'w'),
        h: integer(src.h == null ? 4 : src.h, 1, 40, 'h'),
        visible: src.visible !== false,
        order: integer(src.order == null ? 0 : src.order, -100, 100, 'order')
      };
    }

    normalizeLayout(layout) {
      if (!layout || typeof layout !== 'object' || Array.isArray(layout)) throw new Error('Layout invalide.');
      const out = {};
      for (const id of Object.keys(layout).slice(0, 40)) {
        if (!this.modules.has(id)) continue;
        out[id] = this.normalizeItem(id, layout[id]);
      }
      return out;
    }

    render() {
      for (const [id, el] of this.modules.entries()) {
        const item = this.layout[id];
        if (!item) continue;
        el.hidden = item.visible === false;
        el.style.setProperty('--mosaic-col', String(item.col));
        el.style.setProperty('--mosaic-row', String(item.row));
        el.style.setProperty('--mosaic-w', String(item.w));
        el.style.setProperty('--mosaic-h', String(item.h));
        el.style.order = String(item.order || 0);
      }
    }

    persist() {
      if (this.onChange) this.onChange(JSON.parse(JSON.stringify(this.layout)));
      this.container.dispatchEvent(new CustomEvent('ia-tb:mosaic-change', {
        detail: { layout: JSON.parse(JSON.stringify(this.layout)) }
      }));
    }

    apply(layout, persist) {
      this.layout = this.normalizeLayout(layout);
      this.render();
      if (persist !== false) this.persist();
    }

    patch(id, changes) {
      const safeId = this.assertModule(id);
      const current = this.layout[safeId] || { col: 1, row: 1, w: 4, h: 4, visible: true, order: 0 };
      this.layout[safeId] = this.normalizeItem(safeId, Object.assign({}, current, changes || {}));
      this.render();
      this.persist();
    }

    swap(a, b) {
      const idA = this.assertModule(a);
      const idB = this.assertModule(b);
      const A = this.layout[idA];
      const B = this.layout[idB];
      if (!A || !B) throw new Error('Layout incomplet pour swap.');
      this.layout[idA] = Object.assign({}, A, { col: B.col, row: B.row, w: B.w, h: B.h, order: B.order });
      this.layout[idB] = Object.assign({}, B, { col: A.col, row: A.row, w: A.w, h: A.h, order: A.order });
      this.render();
      this.persist();
    }

    handleCommand(command) {
      if (!command || typeof command !== 'object') throw new Error('Commande Mosaïque invalide.');
      const type = String(command.type || '');
      if (!ALLOWED_COMMANDS.has(type)) throw new Error('Commande Mosaïque refusee: ' + type);

      switch (type) {
        case 'mosaic.move':
          this.patch(command.module, { col: command.col, row: command.row, order: command.order == null ? 0 : command.order });
          break;
        case 'mosaic.resize':
          this.patch(command.module, { w: command.w, h: command.h });
          break;
        case 'mosaic.show':
          this.patch(command.module, { visible: true });
          break;
        case 'mosaic.hide':
          this.patch(command.module, { visible: false });
          break;
        case 'mosaic.swap':
          this.swap(command.a, command.b);
          break;
        case 'mosaic.apply':
          this.apply(command.layout, true);
          break;
        case 'mosaic.reset':
          this.apply(this.defaultLayout, true);
          break;
        default:
          throw new Error('Commande Mosaïque non prise en charge.');
      }
      return { ok: true, layout: JSON.parse(JSON.stringify(this.layout)) };
    }
  }

  global.IATBMosaicController = IATBMosaicController;
})(window);

/* IA-TB v1.7.9 - UserData / SQLite account UI bridge.
 * Username is requested once at registration and is immutable afterwards.
 * Login stays email + password. The account/profile values come from UserData.
 */
(function(global){
  'use strict';
  var originalFetch=global.fetch;
  if(typeof originalFetch!=='function')return;
  function $(id){return document.getElementById(id);}
  function profile(){return originalFetch('/api/userdata/profile',{headers:{Accept:'application/json'}}).then(function(r){return r.json().then(function(j){if(!r.ok)throw new Error(j.error||('HTTP '+r.status));return j;});});}
  function ensureUsernameField(){var form=$('authForm');if(!form||$('username'))return;var input=document.createElement('input');input.id='username';input.type='text';input.placeholder='Username · permanent';input.autocomplete='username';input.minLength=3;input.maxLength=32;input.pattern='[A-Za-z0-9._-]{3,32}';input.title='3 à 32 caractères : lettres, chiffres, point, tiret ou underscore.';var email=$('email');form.insertBefore(input,email||form.firstChild);}
  function ensureSettingsUsername(){var email=$('setSessionEmail');if(!email||$('setUsernameLocked'))return;var row=document.createElement('div');row.className='settingRow';row.style.display='block';row.innerHTML='<div>Username <span class="locked">· non modifiable</span></div><input id="setUsernameLocked" type="text" readonly disabled style="width:100%;margin-top:5px;opacity:.82"><div class="settingHint">Identifiant permanent du compte et du dossier SQLite UserData.</div>';var parent=email.parentNode;parent.parentNode.insertBefore(row,parent);}
  function syncProfile(){ensureUsernameField();ensureSettingsUsername();return profile().then(function(p){var u=$('username'),s=$('setUsernameLocked');if(u){u.classList.toggle('hide',!!p.configured);u.required=!p.configured;if(p.configured)u.value=p.username||'';}if(s)s.value=p.username||'';return p;}).catch(function(){return null;});}
  global.fetch=function(input,init){var url=typeof input==='string'?input:(input&&input.url)||'';if(url==='/api/setup'||/\/api\/setup(?:\?|$)/.test(url)){ensureUsernameField();var username=String($('username')&&$('username').value||'').trim(),email=String($('email')&&$('email').value||'').trim();if(!/^[A-Za-z0-9._-]{3,32}$/.test(username)||username.toLowerCase()==='default'){return Promise.resolve(new Response(JSON.stringify({ok:false,error:'Username invalide : 3-32 caractères, lettres/chiffres/._-.'}),{status:400,headers:{'Content-Type':'application/json'}}));}return originalFetch('/api/userdata/pre-register',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({username:username,email:email})}).then(function(r){if(!r.ok)return r;return originalFetch(input,init).then(function(setupResponse){if(setupResponse.ok)setTimeout(syncProfile,0);return setupResponse;});});}return originalFetch(input,init);};
  function init(){ensureUsernameField();ensureSettingsUsername();syncProfile();var settings=$('settingsPage');if(settings&&typeof MutationObserver!=='undefined'){new MutationObserver(function(){if(!settings.classList.contains('hide'))syncProfile();}).observe(settings,{attributes:true,attributeFilter:['class']});}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})(window);
