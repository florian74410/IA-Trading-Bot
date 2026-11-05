'use strict';
// Minimal deterministic scrubbing, applied before LLM transport and persistence.
// Defense in depth: do not put sensitive data in prompts. Not a complete DLP system.
function redactSecrets(input){
 return String(input||'')
  .replace(/\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{12,}\b/g,'[REDACTED_OPENAI_KEY]')
  .replace(/\b(?:Bearer\s+)[A-Za-z0-9._~+/-]{12,}/gi,'Bearer [REDACTED]')
  .replace(/\b((?:api[_-]?key|secret|password|token|access[_-]?key)\s*[:=]\s*)("[^"]+"|'[^']+'|[^\s,;]+)/gi,'$1[REDACTED]')
  .replace(/-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----[\s\S]*?-----END (?:[A-Z ]+ )?PRIVATE KEY-----/g,'[REDACTED_PRIVATE_KEY]');
}
module.exports={redactSecrets};
