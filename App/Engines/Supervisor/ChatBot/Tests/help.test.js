'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { HybridChatBot } = require('..');
const { Catalog } = require('../catalog');

function fixture(t, catalog) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'iatb-help-'));
  const bot = new HybridChatBot({ root, catalog });
  t.after(() => { bot.close(); fs.rmSync(root, { recursive: true, force: true }); });
  const auth = { principal: { clientId: 'CLhelp', role: 'USER' }, sessionHash: 'a'.repeat(64) };
  const calls = [];
  const options = {
    gateway: {
      async list_available_commands() {
        calls.push('catalog');
        return [{ engine: 'marketdata', id: 'marketdata.candles', decision: 'ALLOW', online: true }];
      },
      async execute_authorized_command() { calls.push('mutation'); throw Error('UNEXPECTED_DISPATCH'); }
    },
    async llm() { calls.push('llm'); throw Error('UNEXPECTED_LLM'); }
  };
  return { bot, auth, options, calls };
}

test('help lists the entire owner catalogue locally in all three modes, even with explicit OpenAI fallback', async t => {
  const { bot, auth, options, calls } = fixture(t);
  for (const [index, message] of [' HELP ', '/AIDE', '  aIdE ', ' /HeLp '].entries()) {
    const reply = await bot.message({ message, forceOpenAI: true }, auth, {
      ...options, settings: { mode: ['LOCAL', 'HYBRID', 'OPENAI'][index % 3], autoFallback: true }
    });
    assert.equal(reply.status, 'HELP');
    assert.equal(reply.mode, 'LOCAL');
    assert.equal(reply.execution, 'NONE');
    assert.equal(reply.preparation, undefined);
    const intents = reply.help.groups.flatMap(group => group.intents);
    assert.equal(intents.length, bot.catalog.intents.size);
    assert(intents.every(row => row.id && row.description && row.phrase));
    assert(!intents.find(row => row.id === 'market.candles').prerequisites.length);
    assert(intents.find(row => row.id === 'market.book').prerequisites.some(x => x.includes('Permission CP1')));
  }
  assert.deepEqual(calls, ['catalog', 'catalog', 'catalog', 'catalog']);
  assert.deepEqual(bot.history(auth).messages, []);
});

test('aide shows the contract, conditional fields, confirmation and related matches without a broker or model', async t => {
  const { bot, auth } = fixture(t);
  const ask = message => bot.message({ message }, auth);
  const buy = (await ask(' /AIDE   Trading.BUY')).help.detail;
  assert.equal(buy.id, 'trading.buy');
  assert.equal(buy.confirmation, true);
  assert(buy.required.find(x => x.name === 'order_type').values.includes('LIMIT'));
  assert(buy.optional.some(x => x.name === 'limit_price'));
  assert(buy.conditional.some(x => x.includes('Prix limite')));
  assert(buy.prerequisites.some(x => x.includes('Compte OKX')));
  assert.deepEqual(buy.modes, ['LOCAL', 'HYBRID', 'OPENAI']);
  assert(buy.examples.length);
  const read = (await ask('help orders.history')).help.detail;
  assert.equal(read.confirmation, false);
  assert.match(read.effect, /Consulte/);
  assert.match(read.prerequisites.join(' '), /Live/);
  assert.equal((await ask('aide market.candless')).help.suggestions[0], 'market.candles');
  assert.deepEqual((await ask('help xyzxyz')).help.suggestions, []);
  assert.equal((await ask('help GET /api/v5/public/instruments')).status, 'HELP_DETAIL');
});

test('new catalogue entries appear on reload and help respects the authenticated role', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'iatb-help-catalog-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  fs.cpSync(path.join(__dirname, '../Intents'), dir, { recursive: true });
  const catalog = new Catalog(dir);
  const { bot, auth } = fixture(t, catalog);
  const file = path.join(dir, 'engines.json');
  const doc = JSON.parse(fs.readFileSync(file));
  doc.intents.push({ ...doc.intents[0], id: 'platform.fixture', description: 'Catalogue de test', help: { roles: ['ADMIN'] } });
  fs.writeFileSync(file, JSON.stringify(doc));
  assert.equal((await bot.message({ message: 'help platform.fixture' }, auth)).status, 'HELP_UNKNOWN');
  assert(!(await bot.message({ message: 'aide platform.fixture' }, auth)).help.suggestions.includes('platform.fixture'));
  auth.principal.role = 'ADMIN';
  const adminReply = await bot.message({ message: 'help' }, auth);
  assert(adminReply.help.groups.some(group => group.intents.some(row => row.id === 'platform.fixture')));
  assert.equal((await bot.message({ message: 'help platform.fixture' }, auth)).help.detail.id, 'platform.fixture');
  auth.principal.role = 'GUEST';
  await assert.rejects(bot.message({ message: '/help' }, auth), /CHATBOT_OWNER_REQUIRED/);
});
