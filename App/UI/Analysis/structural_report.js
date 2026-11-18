'use strict';

const fs = require('node:fs');
const path = require('node:path');
const build = require('../../Core/Shared/build_info');
const { revision } = require('../../manifest.json');

const pagePath = '/admin/analyse/structurelle';
const reportPath = pagePath + '/rapport';
const originalPath = pagePath + '/explorateur';
const originalTemplate = fs.readFileSync(path.join(__dirname, 'atlas_original.html'), 'utf8');

function load() {
  return {
    schema: 'iatb.admin.structural-report/1',
    report: require('./atlas-3.0.2-rev-x.json'),
    installed: { version: build.version, revision },
    deployed: null,
    capabilities: { dynamicAnalysis: false }
  };
}

function original(nonce) {
  const report = JSON.stringify(load().report).replace(/</g, '\\u003c');
  return originalTemplate
    .replace('__IATB_ATLAS_NONCE__', () => nonce)
    .replace('__IATB_ATLAS_JSON__', () => report);
}

module.exports = { pagePath, reportPath, originalPath, load, original };
