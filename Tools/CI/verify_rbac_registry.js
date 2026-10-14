#!/usr/bin/env node
'use strict';

/*
  IA-TB RBAC registry governance — source-only check (no runtime imports).
  Supported baseline: Core/Gateway/Router explicit "req.method==='X'&&p==='Y'"
  + Router UI_READ_ACTIONS/UI_WRITE_ACTIONS literal declarations.
  This is a CI *coverage* gate, not proof of runtime authorization or dynamic routes.
*/
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');
const MATRIX_PATH = 'Documentation/Architecture/AUTH_DEBUG_2.1_RBAC_MATRIX_PROPOSAL.json';
const INVENTORY_PATH = 'Documentation/Security/AUTH_ENDPOINT_INVENTORY_v1.json';
const SOURCES = {
  'Core': 'App/Core/Server/server.js',
  'UI Gateway': 'App/UI/Gateway/ui_service.js',
  'Router': 'App/Core/Router/router.js'
};
const HUMAN_ROLES = new Set(['ADMIN', 'USER', 'GUEST']);
const PRINCIPALS = new Set(['ANONYMOUS', 'SERVICE', ...HUMAN_ROLES]);

function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }
function sortedUnique(values) { return [...new Set(values)].sort(); }
function equals(a, b) { return JSON.stringify(sortedUnique(a)) === JSON.stringify(sortedUnique(b)); }

function explicitHttpRoutes(src) {
  const matcher = /req\.method==='(GET|POST|PUT|DELETE|PATCH|HEAD)'\s*&&\s*p==='([^']+)'/g;
  return [...src.matchAll(matcher)].map(m => m[1] + ' ' + m[2]);
}
function subBlock(router, marker) {
  const start = router.indexOf(marker);
  if (start < 0) throw new Error('RBAC_SOURCE_MARKER_MISSING: ' + marker);
  const first = start + marker.length;
  const end = router.indexOf('\n};', first);
  if (end < 0) throw new Error('RBAC_SOURCE_BLOCK_END_MISSING: ' + marker);
  return router.slice(first, end);
}
function routerActions(router) {
  const readBlock = subBlock(router, 'var UI_READ_ACTIONS={');
  const writeBlock = subBlock(router, 'var UI_WRITE_ACTIONS={');
  const reads = [...readBlock.matchAll(/^\s*'([^']+)'\s*:\s*1\s*,?\s*$/gm)].map(m => m[1]);
  const writes = [...writeBlock.matchAll(/^\s*'([^']+)'\s*:\s*\{/gm)].map(m => m[1]);
  // Guard against unrecognized quote styles / literal syntax changes. Changes
  // must be reviewed before parser updates; do not silently ignore new actions.
  const rDecl = [...readBlock.matchAll(/^\s*['"]([^'"]+)['"]\s*:/gm)].map(m => m[1]);
  const wDecl = [...writeBlock.matchAll(/^\s*['"]([^'"]+)['"]\s*:/gm)].map(m => m[1]);
  if (!equals(reads, rDecl) || !equals(writes, wDecl))
    throw new Error('RBAC_UNRECOGNIZED_SOURCE_ACTION_SYNTAX');
  if (/UI_(?:READ|WRITE)_ACTIONS\s*(?:\.[A-Za-z_$][\w$]*|\[[^\]]+\])\s*=/.test(router))
    throw new Error('RBAC_DYNAMIC_SOURCE_ACTION_DECLARATION');
  if (new Set([...reads, ...writes]).size !== reads.length + writes.length)
    throw new Error('RBAC_DUPLICATE_SOURCE_ACTION');
  return {reads, writes};
}
function verify(sources, inventory, matrix) {
  const errors = [];
  const fail = message => errors.push(message);
  if (matrix.schema !== 'iatb.auth.rbac-matrix-proposal/1') fail('RBAC_MATRIX_SCHEMA_UNKNOWN');
  if (!String(matrix.status || '').includes('DESIGN_APPROVED')) fail('RBAC_MATRIX_NOT_APPROVED_DESIGN');
  if (matrix.default_decision !== 'DENY') fail('RBAC_DEFAULT_NOT_DENY');
  if (!Array.isArray(inventory.entries) || !Array.isArray(matrix.route_review.entries))
    throw new Error('RBAC_ROUTE_REGISTRY_MISSING');
  const declarations = new Set(matrix.route_review.entries.map(x => x.service + '|' + x.method + '|' + x.path));
  for (const item of matrix.route_review.entries) {
    const c = matrix.classifications[item.classification];
    if (!c) { fail('RBAC_MISSING_CLASS:' + item.service + ':' + item.path); continue; }
    if (!Array.isArray(c.roles) || c.roles.some(r => !PRINCIPALS.has(r))) fail('RBAC_INVALID_ROLES:' + item.path);
    if (!c.scope || !c.condition) fail('RBAC_UNDEFINED_SCOPE_OR_GUARD:' + item.path);
    if (item.classification === 'OWN_WRITE' && c.roles.includes('GUEST')) fail('RBAC_GUEST_HAS_OWNER_WRITE');
    if (item.classification === 'ADMIN' && !equals(c.roles, ['ADMIN'])) fail('RBAC_ADMIN_POLICY_UNSAFE');
  }
  const invSet = inventory.entries.map(x => x.service + '|' + x.method + '|' + x.path);
  const reviewSet = matrix.route_review.entries.map(x => x.service + '|' + x.method + '|' + x.path);
  if (!equals(invSet, reviewSet) || inventory.entries.length !== matrix.route_review.entries.length)
    fail('RBAC_INVENTORY_MATRIX_OUT_OF_SYNC');
  for (const [service, src] of Object.entries(sources)) {
    for (const route of explicitHttpRoutes(src)) {
      const split = route.indexOf(' ');
      const method = route.slice(0, split), pathname = route.slice(split + 1);
      if (!declarations.has(service + '|' + method + '|' + pathname))
        fail('RBAC_UNREGISTERED_HTTP_ROUTE:' + service + ':' + method + ':' + pathname);
    }
  }
  const {reads, writes} = routerActions(sources.Router);
  const groups = matrix.cp1_action_review?.groups;
  if (!groups) throw new Error('RBAC_CP_ACTION_GROUPS_MISSING');
  const byGroup = new Map();
  for (const [groupName, group] of Object.entries(groups)) {
    if (!Array.isArray(group.actions) || !Array.isArray(group.roles) || !group.guard)
      fail('RBAC_ACTION_GROUP_INVALID:' + groupName);
    for (const action of group.actions || []) {
      if (byGroup.has(action)) fail('RBAC_DUPLICATE_POLICY_ACTION:' + action);
      else byGroup.set(action, groupName);
    }
  }
  const allSource = [...reads, ...writes];
  for (const action of allSource)
    if (!byGroup.has(action)) fail('RBAC_UNREGISTERED_CP_ACTION:' + action);
  for (const action of byGroup.keys())
    if (!allSource.includes(action)) fail('RBAC_STALE_CP_ACTION_POLICY:' + action);
  if ((groups.GLOBAL_ADMIN_WRITE?.roles || []).join(',') !== 'ADMIN')
    fail('RBAC_WRITES_MUST_BE_ADMIN_ONLY_UNTIL_TENANT_MIGRATED');
  for (const action of writes)
    if (byGroup.get(action) !== 'GLOBAL_ADMIN_WRITE')
      fail('RBAC_GLOBAL_WRITE_NOT_ADMIN:' + action);
  if (groups.PUBLIC_SHARED_READ?.roles?.includes('ANONYMOUS'))
    fail('RBAC_PUBLIC_DATA_REQUIRES_GUEST_SESSION');
  return {ok: errors.length === 0, errors, count: {
    declared_routes: matrix.route_review.entries.length,
    explicit_routes_checked: Object.values(sources).reduce((n,s)=>n+explicitHttpRoutes(s).length,0),
    router_ui_read: reads.length, router_ui_write: writes.length
  }};
}

function failResult(result) {
  for (const e of result.errors) console.error('[FAIL] ' + e);
  process.exitCode = 1;
}
function load() {
  return {
    sources: Object.fromEntries(Object.entries(SOURCES).map(([key, rel]) => [key, read(rel)])),
    inventory: JSON.parse(read(INVENTORY_PATH)),
    matrix: JSON.parse(read(MATRIX_PATH))
  };
}

const args = process.argv.slice(2);
if (args.some(arg => arg !== '--self-test')) {
  console.error('Usage: node Tools/CI/verify_rbac_registry.js [--self-test]');
  process.exitCode = 2;
} else {
  try {
    const {sources, inventory, matrix} = load();
    const result = verify(sources, inventory, matrix);
    if (!result.ok) failResult(result);
    else {
      console.log('[OK] RBAC static coverage:', JSON.stringify(result.count));
      if (args.includes('--self-test')) {
        const mutatedAction = {...sources, Router: sources.Router.replace(
          "'indicator.settings.get':1,", "'indicator.settings.get':1,\n  'rbac.unregistered_test_action':1,")};
        const negAction = verify(mutatedAction, inventory, matrix);
        if (negAction.ok || !negAction.errors.some(e => e.includes('RBAC_UNREGISTERED_CP_ACTION')))
          throw new Error('RBAC_SELF_TEST_FAILED: action insertion was not detected');
        const mutatedRoute = {...sources, Core: sources.Core + "\nif(req.method==='POST'&&p==='/api/rbac-unregistered-test'){}"};
        const negRoute = verify(mutatedRoute, inventory, matrix);
        if (negRoute.ok || !negRoute.errors.some(e => e.includes('RBAC_UNREGISTERED_HTTP_ROUTE')))
          throw new Error('RBAC_SELF_TEST_FAILED: route insertion was not detected');
        console.log('[OK] Negative self-tests: unregistered CP action and explicit HTTP route rejected');
      }
    }
  } catch (error) {
    console.error('[FAIL] RBAC_GATE_EXCEPTION:', error.message);
    process.exitCode = 1;
  }
}
