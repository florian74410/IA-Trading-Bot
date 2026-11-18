'use strict';

const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const versionPattern = /^\d+\.\d+(?:\.\d+)?(?:-[0-9A-Za-z.-]+)?$/;

function readText(file) {
  try { return fs.readFileSync(file, 'utf8').trim(); }
  catch { return ''; }
}

function readJson(file) {
  try { return JSON.parse(readText(file)) || {}; }
  catch { return {}; }
}

function readBuild(appRoot) {
  const manifest = readJson(path.join(appRoot, 'manifest.json'));
  const receipt = readJson(path.join(appRoot, '..', 'BUILD.json'));
  const versionFile = readText(path.join(appRoot, 'VERSION'));
  const revisionFile = readText(path.join(appRoot, 'REVISION'));
  const version = versionFile || manifest.version;
  const revision = revisionFile || manifest.revision;
  const validVersion = typeof version === 'string' && versionPattern.test(version) && (!manifest.version || version === manifest.version);
  const validRevision = validVersion && typeof revision === 'string' &&
    revision.startsWith(version.split('-')[0] + '_') && /^[0-9A-Za-z._-]+$/.test(revision) &&
    (!manifest.revision || revision === manifest.revision);
  const sourceCommit = validRevision && receipt.version === version && receipt.revision === revision &&
    /^[a-f0-9]{40}$/.test(receipt.source_commit) ? receipt.source_commit : null;

  return {
    version: validVersion ? version : null,
    revision: validRevision ? revision : null,
    source_commit: sourceCommit
  };
}

const build = Object.freeze(readBuild(root));
const manifest = readJson(path.join(root, 'manifest.json'));
const application = manifest.application || 'IA-Trading-Bot';
const status = String(manifest.status || '').toUpperCase();
const label = application + ' · ' + (build.revision || build.version || 'Version indisponible');

module.exports = { root, application, status, label, version: build.version, build, readBuild };
