'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { readBuild } = require('../../Shared/build_info');

test('Rev1, Rev2 and missing metadata agree across the runtime loader and shared UI', async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'iatb-runtime-build-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const app = path.join(root, 'App');
  fs.mkdirSync(app);
  const version = '3.1.0';
  const source_commit = 'a'.repeat(40);
  const browserSource = fs.readFileSync(path.resolve(__dirname, '../../../Frontend/JS/runtime_build.js'), 'utf8');
  const node = { textContent: '', removeAttribute() { delete this.title; } };
  async function render(build, expected) {
    const sandbox = { window: {}, document: { querySelectorAll: () => [node] },
      fetch: async url => {
        assert.equal(url, '/api/health');
        return { ok: true, json: async () => ({ version: '2.0.0', build }) };
      }
    };
    await vm.runInNewContext(browserSource, sandbox);
    await new Promise(setImmediate);
    assert.equal(node.textContent, expected);
    assert.equal(node.title, build.source_commit || undefined);
  }
  fs.writeFileSync(path.join(app, 'VERSION'), version);
  for (const revision of ['3.1.0_Rev1', '3.1.0_Rev2']) {
    fs.writeFileSync(path.join(app, 'REVISION'), revision);
    fs.writeFileSync(path.join(app, 'manifest.json'), JSON.stringify({ version, revision }));
    fs.writeFileSync(path.join(root, 'BUILD.json'), JSON.stringify({ version, revision, source_commit }));
    const build = readBuild(app);
    assert.deepEqual(build, { version, revision, source_commit });
    await render(build, revision);
  }
  fs.writeFileSync(path.join(app, 'REVISION'), '3.1.0_Rev1');
  assert.deepEqual(readBuild(app), { version, revision: null, source_commit: null });
  for (const file of fs.readdirSync(app)) fs.unlinkSync(path.join(app, file));
  const missing = readBuild(app);
  assert.deepEqual(missing, { version: null, revision: null, source_commit: null });
  await render(missing, 'Version indisponible');
});
