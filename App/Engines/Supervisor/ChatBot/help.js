'use strict';

const { normalize } = require('./catalog');
const { properties } = require('./Contracts');
const { financial } = require('./procedures');
const { READ_INTENTS } = require('../../../Core/Execution/manual_contract');

const modes = ['LOCAL', 'HYBRID', 'OPENAI'];
const effects = {
  READ_GATEWAY_PROCEDURE: 'Consulte des données.',
  BOUNDED_PREPARATION_ONLY: 'Prépare une action. L’exécution exige une confirmation Auth21 et les contrôles du Core.',
  RECOGNITION_ONLY: 'Intention reconnue. L’exécution de cette opération reste indisponible.',
  DESCRIPTIVE_ONLY: 'Référence du catalogue OKX. Cette commande fournit une description de l’opération.'
};

function parseHelp(message) {
  return /^\/?(?:help|aide)(?: (.+))?$/.exec(normalize(message));
}

function visible(definition, role) {
  return (definition.help?.roles || ['USER', 'ADMIN']).includes(role);
}

function prerequisites(definition, commands) {
  const requirements = [...(definition.help?.prerequisites || [])];
  if (definition.required.includes('account')) requirements.push('Compte OKX activé dans le profil.');
  if (financial.has(definition.id)) {
    requirements.push('Ce parcours Core requiert un compte OKX Live et une activation explicite de l’exécution manuelle.');
  } else if (definition.required.includes('environment')) {
    requirements.push('Choisir Démo avec un compte Démo, ou Live avec un compte Live lorsque ce mode est autorisé.');
  }
  if (definition.cp1 && definition.implementation === 'READ_GATEWAY_PROCEDURE') {
    const {engine, command} = definition.cp1;
    const row = commands.find(item => item.engine === engine && item.id === command);
    if (row?.decision !== 'ALLOW') requirements.push('Permission CP1 supplémentaire pour cette lecture.');
    else if (row.online === false) requirements.push('Engine en ligne pour cette lecture.');
  }
  return requirements;
}

function parameter(name) {
  const schema = properties[name];
  return { name, values: schema.enum, type: schema.type };
}

function summary(definition, commands) {
  return {
    id: definition.id,
    description: definition.description,
    phrase: definition.examples[0] || definition.id,
    prerequisites: prerequisites(definition, commands)
  };
}

function detail(definition, commands) {
  const manual = financial.has(definition.id);
  const manualRead = Object.hasOwn(READ_INTENTS, definition.id);
  const effect = manualRead ? effects.READ_GATEWAY_PROCEDURE : manual ? effects.BOUNDED_PREPARATION_ONLY : effects[definition.implementation];
  return {
    ...summary(definition, commands),
    examples: definition.examples,
    modes,
    effect,
    confirmation: (manual && !manualRead) || definition.confirmation === 'AUTHENTICATED_EXACT_PREPARATION',
    required: definition.required.map(parameter),
    optional: (definition.optional || []).filter(key => properties[key] && !definition.required.includes(key)).map(parameter),
    conditional: definition.help?.conditional || []
  };
}

function matchScore(definition, query) {
  const words = query.split(/[ ._-]+/).filter(word => word.length > 1);
  const id = definition.id.replace(/^api\./, '');
  const searchable = normalize([id, definition.description, ...definition.examples].join(' '));
  return words.reduce((score, word) => {
    if (id.includes(word)) return score + 4;
    if (word.length >= 5 && id.includes(word.slice(0, -1))) return score + 2;
    if (searchable.includes(word)) return score + 1;
    return score;
  }, 0);
}

async function answer(catalog, query, { role, gateway }) {
  const definitions = [...catalog.intents.values()].filter(definition => visible(definition, role));
  // The agent catalog reports permissions without dispatching a business command.
  let commands = [];
  if (gateway?.list_available_commands) {
    try {
      commands = await gateway.list_available_commands();
    } catch {
      // An unavailable registry leaves the CP1 prerequisite in place.
    }
  }
  const base = { ok: true, mode: 'LOCAL', execution: 'NONE' };
  if (!query) {
    const groups = new Map();
    for (const definition of definitions) {
      const domain = (definition.implementation === 'DESCRIPTIVE_ONLY' ? 'Référence OKX · ' : '') + definition.category;
      if (!groups.has(domain)) groups.set(domain, []);
      groups.get(domain).push(summary(definition, commands));
    }
    return { ...base, status: 'HELP', message: 'Aide du ChatBot. Ouvre un domaine ou saisis aide <intention>.',
      help: { groups: [...groups].map(([domain, intents]) => ({ domain, intents })) } };
  }

  const exact = definitions.find(definition => definition.id === query);
  const alias = catalog.exactOperation(query);
  const examples = definitions.filter(definition => definition.examples.some(example => normalize(example) === query));
  const match = exact || (alias && definitions.includes(alias) ? alias : null) || (examples.length === 1 ? examples[0] : null);
  if (match) {
    return { ...base, status: 'HELP_DETAIL', message: 'Aide · ' + match.id, help: { detail: detail(match, commands) } };
  }
  const suggestions = definitions.map(definition => ({ id: definition.id, score: matchScore(definition, query) }))
    .filter(candidate => candidate.score > 0).sort((a, b) => b.score - a.score).slice(0, 5).map(candidate => candidate.id);
  return { ...base, status: 'HELP_UNKNOWN', message: 'Intention inconnue. Ouvre l’aide générale ou choisis une suggestion.',
    help: { suggestions } };
}

module.exports = { parseHelp, answer };
