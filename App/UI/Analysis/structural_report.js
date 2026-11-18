'use strict';

const build = require('../../Core/Shared/build_info');
const { revision } = require('../../manifest.json');

const pagePath = '/admin/analyse/structurelle';
const reportPath = pagePath + '/rapport';

function load() {
  return {
    schema: 'iatb.admin.structural-report/1',
    report: require('./atlas-3.0.2-rev-x.json'),
    installed: { version: build.version, revision },
    deployed: null,
    capabilities: { dynamicAnalysis: false }
  };
}

module.exports = { pagePath, reportPath, load };
