'use strict';
// Close legacy Engine ingress in the isolated Auth21 runtime. This boundary
// deliberately grants no business permissions: those require operation-level
// policy and a verified principal, not a legacy service token or browser role.
const http = require('node:http');
const {active} = require('./auth21_service_boundary');

function createServer(handler, env = process.env) {
  const isolated = active(env);
  const server = http.createServer(function(req, res) {
    if (!isolated) return handler(req, res);
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
