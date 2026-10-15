'use strict';
// Close legacy Engine ingress in the isolated Auth21 runtime. This boundary
// deliberately grants no business permissions: those require operation-level
// policy and a verified principal, not a legacy service token or browser role.
const http = require('node:http');
const {active} = require('./auth21_service_boundary');

function createServer(handler, env = process.env) {
  const isolated = active(env);
  let snapshotControl = null;
  if (env.IATB_AUTH21_SNAPSHOT_IPC_TRIAL === '1') {
    if (!isolated) throw Error('AUTH21_SNAPSHOT_REQUIRES_ISOLATED_MODE');
    const trial = require('../Backup/auth21_engine_snapshot_trial').currentEngineSnapshotTrial();
    if (!trial) throw Error('AUTH21_SNAPSHOT_WRITER_NOT_BOUND');
    snapshotControl = require('../Backup/auth21_snapshot_control').createSnapshotControl({env,trial});
  }
  const server = http.createServer(function(req, res) {
    if (!isolated) return handler(req, res);
    if (snapshotControl && req.url === '/auth21/snapshot/control')
      return snapshotControl(req,res);
    res.writeHead(403, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Connection': 'close'
    });
    res.end(JSON.stringify({error: 'AUTH21_ENGINE_OPERATION_DENIED'}));
  });
  // Upgrade/CONNECT bypass the HTTP request callback in Node. Reject both
  // before any legacy protocol handler can interpret a message.
  if (isolated) {
    const denySocket = (req, socket) => {
      socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\nContent-Length: 0\r\n\r\n');
    };
    server.on('upgrade', denySocket);
    server.on('connect', denySocket);
  }
  return server;
}

module.exports = {createServer};
