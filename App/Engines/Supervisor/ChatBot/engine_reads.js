'use strict';

// Fixed health checks. Each requires the agent's own grant and a qualified CP1 contract.
const checks = {
  marketdata: 'marketdata.health',
  indicator: 'indicator.list_indicators',
  fundamental: 'fundamental.health',
  liquidity: 'liquidity.health',
  strategy: 'strategy.health',
  risk: 'risk.status',
  portfolio: 'portfolio.health',
  firewall: 'firewall.status',
  trading: 'trading.health',
  supervisor: 'supervisor.status'
};

const failures = {
  PERMISSION_REQUIRED: 'permission CP1 requise',
  ENGINE_OFFLINE: 'Engine signalé hors ligne',
  COMMAND_UNQUALIFIED: 'handler non qualifié pour cet agent',
  COMMAND_UNKNOWN: 'commande absente du catalogue'
};

async function run(intent, gateway, available) {
  if (!gateway) throw Error('CP1_CONTROL_UNAVAILABLE');
  if (intent === 'platform.commands') {
    const catalog = await gateway.list_available_commands();
    const result = catalog.filter(row => row.decision === 'ALLOW' && row.online &&
      row.contract.agent_qualified && row.contract.verified_handler && !row.contract.hard_deny)
      .map(row => ({ engine: row.engine, command: row.id, type: row.contract.type }));
    return {
      status: 'COMPLETED',
      message: result.length ? result.map(row => row.engine + ' · ' + row.command).join('\n')
        : 'Aucune commande actuellement disponible avec les permissions de cet agent.',
      result
    };
  }

  const result = await Promise.all(Object.entries(checks).map(async ([engine, command]) => {
    try {
      const response = await available(gateway, engine, command, {});
      return { engine, command, status: 'RESPONDED', request_id: response.request_id };
    } catch (error) {
      return { engine, command, status: 'UNVERIFIED',
        reason: failures[error.message] || 'aucune réponse CP1 vérifiée' };
    }
  }));
  const observed = result.filter(row => row.status === 'RESPONDED').length;
  return {
    status: observed === result.length ? 'COMPLETED' : observed ? 'PARTIAL' : 'UNAVAILABLE',
    message: result.map(row => row.engine + ' · ' + (row.reason || 'réponse CP1 reçue')).join('\n'),
    result
  };
}

async function marketAnalysis(parameters, gateway, available) {
  if (!gateway) throw Error('CP1_CONTROL_UNAVAILABLE');
  const timeframe = parameters.timeframe || '1m';
  const symbol = parameters.instrument_candidate.replace(/-/g, '');
  async function observe(engine, command, args, summarize) {
    try {
      const response = await available(gateway, engine, command, args);
      return { engine, command, request_id: response.request_id, ...summarize(response.data) };
    } catch (error) {
      return { engine, command, status: 'MISSING', reason: failures[error.message] || 'données indisponibles' };
    }
  }
  const market = observe('marketdata', 'marketdata.candles',
    { symbol, timeframe, limit: 100, source: 'OKX' }, ({ candles, providerId, exchange }) => {
      if (!candles?.length || !Number.isFinite(candles.at(-1)[4])) throw Error('INVALID_CANDLES');
      return { status: 'OBSERVED', candles, close: candles.at(-1)[4],
        timestamp: candles.at(-1)[0], provider: providerId || exchange || null };
    });
  const indicators = market.then(result => result.status === 'OBSERVED'
    ? observe('indicator', 'indicator.compute_batch_data',
      { symbol, timeframe, candles: result.candles, requests: [{ id: 'rsi' }] },
      ({ results }) => {
        const value = results.find(row => row.ok && row.result?.id === 'rsi')?.result.latest?.value;
        if (!Number.isFinite(value)) throw Error('RSI_UNAVAILABLE');
        return { status: 'ESTIMATE', indicator: 'RSI', value };
      })
    : { engine: 'indicator', status: 'MISSING', reason: 'bougies nécessaires au calcul du RSI' });
  const liquidity = observe('liquidity', 'liquidity.capabilities', {},
    () => ({ status: 'CAPABILITIES', reason: 'capacité CP1 consultée, zones de liquidité non mesurées' }));
  const risk = parameters.account
    ? observe('risk', 'risk.snapshot.create',
      { portfolio_id: parameters.account, symbol, timeframe, context: 'analysis',
        correlation_id: require('node:crypto').randomUUID() },
      ({ decision }) => {
        if (typeof decision !== 'string') throw Error('RISK_DECISION_UNAVAILABLE');
        return { status: 'EVALUATION', decision };
      })
    : { engine: 'risk', status: 'MISSING', reason: 'compte requis pour le diagnostic Risk' };
  const [marketData, indicator, liquidityData, riskData] = await Promise.all([market, indicators, liquidity, risk]);
  const { candles, ...marketSummary } = marketData;
  const result = [marketSummary, indicator, liquidityData, riskData];
  const observed = result.some(row => row.status !== 'MISSING');
  return {
    status: observed ? 'PARTIAL' : 'UNAVAILABLE',
    result,
    message: [
      parameters.instrument_candidate + ' · ' + timeframe,
      'MarketData · ' + (marketSummary.reason || 'clôture de la dernière bougie reçue : ' + marketSummary.close),
      'Indicators · ' + (indicator.reason || 'RSI calculé sur les bougies reçues : ' + indicator.value.toFixed(2)),
      'Liquidity · ' + liquidityData.reason,
      'Risk · ' + (riskData.reason || 'diagnostic : ' + riskData.decision),
      'Pour préparer un ordre, précise le compte, le sens, la quantité et le type d’ordre. Une confirmation séparée sera requise.'
    ].join('\n')
  };
}

module.exports = { run, marketAnalysis };
