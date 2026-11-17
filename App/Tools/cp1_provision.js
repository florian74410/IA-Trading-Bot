'use strict';
// Provision isolated control-plane identities. Print paths only, never key material.
const path=require('node:path');
if(require.main===module){const root=process.argv[2];if(!root)throw Error('Usage: node App/Tools/cp1_provision.js /absolute/private/control-root');console.log(JSON.stringify(require('../Core/FunctionRegistry/Control/identity').provision(path.resolve(root))));}
