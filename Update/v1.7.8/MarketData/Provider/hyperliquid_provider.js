'use strict';

/* IA-Trading-Bot v1.7.8 - Hyperliquid market-data provider
 * Transport: SOCKET (WebSocket)
 * Default public endpoint: wss://api.hyperliquid.xyz/ws
 */

var SocketProvider = require('./socket_provider');

function HyperliquidProvider(options) {
  options = options || {};
  this.name = 'HYPERLIQUID';
  this.type = 'SOCKET';
  this.coin = String(options.coin || 'BTC').toUpperCase();
  this.socket = new SocketProvider({
    name: this.name,
    url: options.url || 'wss://api.hyperliquid.xyz/ws',
    reconnectMs: options.reconnectMs || 3000,
    maxReconnectMs: options.maxReconnectMs || 30000
  });
  this.handlers = [];
  this.lastEventAt = 0;
  this.lastError = '';
  this._wire();
}

HyperliquidProvider.prototype._wire = function () {
  var self = this;
  this.socket.on('open', function () {
    self.lastError = '';
    self.subscribeTrades(self.coin);
  });
  this.socket.on('message', function (raw) {
    var msg;
    try { msg = JSON.parse(String(raw)); } catch (_) { return; }
    self.lastEventAt = Date.now();
    self.handlers.forEach(function (fn) {
      try { fn(msg); } catch (_) {}
    });
  });
  this.socket.on('error', function (err) {
    self.lastError = err && err.message ? err.message : String(err || 'SOCKET_ERROR');
  });
};

HyperliquidProvider.prototype.connect = function () {
  this.socket.connect();
};

HyperliquidProvider.prototype.close = function () {
  this.socket.close();
};

HyperliquidProvider.prototype.onEvent = function (fn) {
  if (typeof fn === 'function') this.handlers.push(fn);
  return this;
};

HyperliquidProvider.prototype.subscribeTrades = function (coin) {
  this.coin = String(coin || this.coin || 'BTC').toUpperCase();
  return this.socket.sendJSON({
    method: 'subscribe',
    subscription: { type: 'trades', coin: this.coin }
  });
};

HyperliquidProvider.prototype.subscribeBook = function (coin) {
  var c = String(coin || this.coin || 'BTC').toUpperCase();
  return this.socket.sendJSON({
    method: 'subscribe',
    subscription: { type: 'l2Book', coin: c }
  });
};

HyperliquidProvider.prototype.status = function () {
  var s = this.socket.status();
  s.coin = this.coin;
  s.lastEventAt = this.lastEventAt || null;
  s.lastError = this.lastError || null;
  return s;
};

module.exports = HyperliquidProvider;
