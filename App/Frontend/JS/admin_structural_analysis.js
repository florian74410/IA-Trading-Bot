(() => {
  'use strict';

  const route = '/admin/analyse/structurelle';
  if (location.pathname.replace(/\/$/, '') !== route) return;

  const byId = id => document.getElementById(id);
  const atlas = byId('structuralAnalysis');
  document.body.classList.add('atlasPage');
  atlas.hidden = false;
  const nav = byId('navStructuralAnalysis');
  nav.classList.add('active');
  nav.setAttribute('aria-current', 'page');

  const view = byId('atlasView');
  const search = byId('atlasSearch');
  const engine = byId('atlasEngine');
  const group = byId('atlasGroup');
  const status = byId('atlasFeatureStatus');
  const tree = byId('atlasTree');
  const rows = byId('atlasRows');
  const collator = new Intl.Collator('fr', { sensitivity: 'base', numeric: true });
  let report;
  let selectedDomain = '';
  let sort = { key: 'name', ascending: true };
  let openId = null;

  function element(tag, content, parent) {
    const node = document.createElement(tag);
    if (content !== undefined) node.textContent = content;
    if (parent) parent.append(node);
    return node;
  }

  function entries(target, pairs) {
    const list = byId(target);
    list.replaceChildren();
    for (const [label, value] of pairs) {
      const item = element('div', undefined, list);
      element('dt', label, item);
      element('dd', value, item);
    }
  }

  function options(select, pairs) {
    const previous = select.value;
    select.replaceChildren(new Option('Tous', ''));
    for (const [id, label] of pairs) select.add(new Option(label, id));
    if ([...select.options].some(option => option.value === previous)) select.value = previous;
  }

  function unique(values) {
    return Array.from(new Set(values)).sort(collator.compare);
  }

  function selectTree(domain, engineId, groupId) {
    selectedDomain = domain;
    engine.value = engineId;
    updateGroups();
    group.value = groupId;
    view.value = 'features';
    openId = null;
    render();
  }

  function folder(parent, title, count) {
    const details = element('details', undefined, parent);
    element('summary', title + ' · ' + count, details);
    return details;
  }

  function treeButton(parent, text, domain, engineId = '', groupId = '') {
    const button = element('button', text, parent);
    button.type = 'button';
    button.onclick = () => selectTree(domain, engineId, groupId);
  }

  function renderTree() {
    tree.replaceChildren();
    treeButton(tree, 'Tous les composants', '');
    for (const domain of unique(report.features.map(row => row.domain))) {
      const domainRows = report.features.filter(row => row.domain === domain);
      const branch = folder(tree, domain, domainRows.length);
      treeButton(branch, 'Voir ' + domain, domain);
      for (const name of unique(domainRows.map(row => row.engine))) {
        const engineRows = domainRows.filter(row => row.engine === name);
        const child = folder(branch, name, engineRows.length);
        treeButton(child, 'Voir ' + name, domain, name);
        for (const label of unique(engineRows.map(row => row.group))) {
          treeButton(child, label, domain, name, label);
        }
      }
    }
  }

  function updateGroups() {
    const groups = unique(report.features.filter(row =>
      (!selectedDomain || row.domain === selectedDomain) &&
      (!engine.value || row.engine === engine.value)).map(row => row.group));
    options(group, groups.map(label => [label, label]));
  }

  function matchText(values, query) {
    return values.join(' ').normalize('NFD').replace(/\p{Diacritic}/gu, '')
      .toLowerCase().includes(query);
  }

  function addSource(parent, label, url) {
    if (typeof url !== 'string' ||
        !url.startsWith('https://github.com/florian74410/IA-Trading-Bot/')) return;
    const link = element('a', label, element('p', undefined, parent));
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
  }

  function showLinked(parent, ids, targetView) {
    for (const id of ids) {
      const button = element('button', id, parent);
      button.type = 'button';
      button.className = 'btn small';
      button.onclick = () => {
        view.value = targetView;
        selectedDomain = '';
        engine.value = status.value = '';
        updateGroups();
        group.value = '';
        search.value = id;
        openId = id;
        render();
        document.getElementById('atlas-detail-' + id)?.focus();
      };
    }
  }

  function details(parent, row, issues) {
    parent.id = 'atlas-detail-' + row.id;
    parent.tabIndex = -1;
    element('strong', row.id, parent);
    const fields = issues ? [
      ['État', row.state], ['Nature', row.kind], ['Correction / suivi', row.fix]
    ] : [
      ['État', report.statusLabels[row.status]], ['Accès', row.access],
      ['Preuves', row.evidence], ['Niveau de preuve', row.confidence],
      ['Travail restant', row.work], ['Notes', row.notes]
    ];
    const list = element('dl', undefined, parent);
    for (const [name, value] of fields) {
      if (!value) continue;
      element('dt', name, list);
      element('dd', value, list);
    }
    addSource(parent, 'Source', row.source);
    addSource(parent, 'Justificatif', row.proof);
    showLinked(parent, (issues ? row.feature_ids : row.error_ids) || [],
      issues ? 'features' : 'issues');
  }

  function render() {
    const issues = view.value === 'issues';
    const remaining = view.value === 'remaining';
    const watch = byId('atlasWatch');
    watch.hidden = !remaining;
    watch.replaceChildren();
    if (remaining) {
      element('h3', 'Points à vérifier', watch);
      const list = element('ul', undefined, watch);
      for (const [id, title, feature, work] of report.watch) {
        element('li', [id, title, feature, work].join(' · '), list);
      }
    }
    const query = search.value.trim().normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
    for (const select of [engine, group, status]) select.disabled = issues;
    const columns = issues ? [['priority', 'Priorité'], ['title', 'Anomalie'], ['state', 'État']] :
      [['name', 'Fonctionnalité'], ['engine', 'Composant'], ['group', 'Groupe'],
        ['status', 'Statut'], [remaining ? 'work' : 'confidence', remaining ? 'Travail restant' : 'Niveau de preuve']];
    const tableData = (issues ? report.issues : report.features).filter(row => issues ?
      matchText([row.id, row.title, row.state, row.fix, ...row.feature_ids], query) :
      (!remaining || row.status !== 'C') &&
      (!selectedDomain || row.domain === selectedDomain) &&
      (!engine.value || row.engine === engine.value) &&
      (!group.value || row.group === group.value) &&
      (!status.value || row.status === status.value) &&
      matchText([row.id, row.name, row.domain, row.engine, row.group, row.work, row.access,
        report.statusLabels[row.status], ...(row.error_ids || [])], query));
    const key = columns.some(([id]) => id === sort.key) ? sort.key : columns[0][0];
    const value = (row, column) => column === 'status' ? report.statusLabels[row.status] : row[column];
    tableData.sort((a, b) => collator.compare(value(a, key) || '', value(b, key) || '') *
      (sort.ascending ? 1 : -1));
    byId('atlasCount').textContent = tableData.length + ' résultat(s)';
    rows.replaceChildren();
    if (!tableData.length) return;
    const table = element('table', undefined, rows);
    const header = table.createTHead().insertRow();
    for (const [id, label] of columns) {
      const cell = element('th', undefined, header);
      cell.scope = 'col';
      if (id === key) cell.setAttribute('aria-sort', sort.ascending ? 'ascending' : 'descending');
      const button = element('button', label + (id === key ? (sort.ascending ? ' ↑' : ' ↓') : ''), cell);
      button.type = 'button';
      button.onclick = () => {
        sort = { key: id, ascending: id !== key || !sort.ascending };
        render();
        rows.querySelectorAll('th button')[columns.findIndex(column => column[0] === id)]?.focus();
      };
    }
    const body = table.createTBody();
    for (const row of tableData) {
      const tr = body.insertRow();
      let detailCell;
      for (const [id] of columns) {
        const cell = tr.insertCell();
        if (id === 'name' || id === 'title') {
          const button = element('button', value(row, id), cell);
          button.type = 'button';
          button.setAttribute('aria-expanded', String(openId === row.id));
          button.onclick = () => {
            openId = openId === row.id ? null : row.id;
            render();
            if (openId) document.getElementById('atlas-detail-' + openId)?.focus();
            else rows.querySelectorAll('tbody button')[tableData.indexOf(row)]?.focus();
          };
        } else {
          cell.textContent = value(row, id) || '—';
          if (id === 'status') cell.dataset.status = row.status;
        }
      }
      if (openId === row.id) {
        detailCell = body.insertRow().insertCell();
        detailCell.colSpan = columns.length;
        detailCell.className = 'atlasDetail';
        details(detailCell, row, issues);
      }
    }
  }

  async function load() {
    const message = byId('atlasStatus');
    const reload = byId('atlasReload');
    reload.disabled = true;
    message.textContent = 'Chargement du rapport…';
    byId('atlasReport').hidden = true;
    try {
      const response = await fetch(route + '/rapport', { cache: 'no-store' });
      if (!response.ok) throw Error('ATLAS_UNAVAILABLE');
      const data = await response.json();
      if (data.schema !== 'iatb.admin.structural-report/1') throw Error('ATLAS_SCHEMA');
      report = data.report;
      byId('version').textContent = window.IATBRuntimeBuild.label(data.installed);
      entries('atlasMeta', [
        ['Version auditée', report.meta.revision], ['Commit audité', report.meta.commit],
        ['Date du rapport', report.meta.audit_date],
        ['Version installée', window.IATBRuntimeBuild.label(data.installed)],
        ['Version déployée', data.deployed?.revision || 'Non vérifiée']
      ]);
      entries('atlasStats', [
        ['Engines inventoriés', report.meta.engines.length],
        ['Contrats CP1 inventoriés', report.meta.cp1_contracts],
        ['Anomalies historiques', report.issues.length],
        ...Object.entries(report.statusLabels).map(([id, label]) =>
          [label, report.features.filter(row => row.status === id).length])
      ]);
      options(engine, unique(report.features.map(row => row.engine)).map(name => [name, name]));
      options(status, Object.entries(report.statusLabels));
      updateGroups();
      renderTree();
      render();
      byId('atlasReport').hidden = false;
      message.textContent = 'Rapport statique. Analyse dynamique indisponible.';
    } catch (_) {
      byId('atlasReport').hidden = true;
      message.textContent = 'Impossible de charger le rapport structurel.';
    } finally {
      reload.disabled = false;
    }
  }

  const refresh = () => { openId = null; render(); };
  search.oninput = view.onchange = group.onchange = status.onchange = refresh;
  engine.onchange = () => { selectedDomain = ''; updateGroups(); refresh(); };
  byId('atlasReload').onclick = load;
  load();
})();
