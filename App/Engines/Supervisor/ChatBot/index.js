"use strict";
const { Catalog, normalize } = require("./catalog"),
  { Resolver } = require("./Resolver"),
  Contracts = require("./Contracts"),
  { State, digest } = require("./state"),
  Procedures = require("./procedures"),
  { redactSecrets } = require("../../../Core/Shared/cognitive_text_safety");
const questions = {
  asset: "Quel actif souhaites-tu utiliser ?",
  amount: "Quel montant ou quelle quantité souhaites-tu engager ?",
  amount_unit: "Dans quelle devise est exprimé ce montant ?",
  account: "Quel compte de ton profil OKX souhaites-tu utiliser ?",
  environment:
    "Souhaites-tu le mode Demo ou Live ? Un ordre réel nécessite ta confirmation et les contrôles Risk.",
  market: "Quel marché : Spot, marge, Futures, SWAP ou options ?",
  order_type: "Souhaites-tu un ordre Market ou Limit ?",
  instrument_candidate:
    "Quelle paire ou quel instrument exact souhaites-tu utiliser ?",
  timeframe: "Quelle unité de temps souhaites-tu utiliser ?",
  limit_price: "Quel prix limite souhaites-tu utiliser ?",
  order_id: "Quel est l’identifiant exact de l’ordre à annuler ou modifier ?",
  position_id: "Quel est l’identifiant exact de la position ?",
  position_side: "Souhaites-tu ouvrir LONG ou SHORT ?",
};
function scrub(text) {
  return redactSecrets(text).replace(
    /\b(passphrase|api.?secret|cp1.?proof|session.?token)\s*[:=]\s*("[^"]+"|'[^']+'|[^\s,;]+)/gi,
    "$1=[REDACTED]",
  );
}
class HybridChatBot {
  constructor({
    root,
    catalog = new Catalog(),
    state = new State(root),
    now = Date.now,
  } = {}) {
    this.catalog = catalog;
    this.resolver = new Resolver(catalog);
    this.state = state;
    this.now = now;
    this.busy = new Set();
  }
  async message(
    input,
    auth,
    { gateway = null, accounts = [], settings = {}, llm = null } = {},
  ) {
    if (
      !input ||
      typeof input.message !== "string" ||
      !input.message.trim() ||
      input.message.length > 1400 ||
      Object.keys(input).some(
        (k) =>
          !["message", "forceOpenAI", "conversation_id", "model"].includes(k),
      )
    )
      throw Error("CHATBOT_MESSAGE_INVALID");
    if (
      input.forceOpenAI !== undefined &&
      typeof input.forceOpenAI !== "boolean"
    )
      throw Error("CHATBOT_MESSAGE_INVALID");
    const room = input.conversation_id || "default",
      key = this.state.key(auth, room).join(":");
    if (this.busy.has(key)) throw Error("CHATBOT_BUSY");
    this.busy.add(key);
    try {
      this.catalog.reload();
      const config = Contracts.settings(settings),
        state = this.state.load(auth, room),
        message = scrub(input.message.trim()),
        force =
          input.forceOpenAI === true ||
          /^\s*(\/openai\b|openai\s*:|avec openai\b|demande a openai\b|ask openai\b)/.test(
            normalize(message),
          );
      let source = "LOCAL",
        intent;
      try {
        intent = this.resolver.resolve(message, {
          pending: state.pending,
          accounts,
        });
      } catch (e) {
        state.preparation = null;
        state.pending = null;
        state.revision++;
        this.state.save(auth, room, state);
        return {
          ok: true,
          mode: "LOCAL",
          execution: "NONE",
          status: "INVALID_PARAMETERS",
          message:
            "Un paramètre est invalide. Précise un montant positif et des paramètres cohérents.",
        };
      }
      const needsLLM =
        force ||
        config.mode === "OPENAI" ||
        (config.mode === "HYBRID" &&
          config.autoFallback &&
          intent.status === "UNKNOWN");
      if (needsLLM) {
        source = "OPENAI";
        if (!llm) {
          state.preparation = null;
          state.pending = null;
          state.revision++;
          this.state.save(auth, room, state);
          return {
            ok: true,
            mode: source,
            execution: "NONE",
            status: "LLM_UNAVAILABLE",
            message:
              "OpenAI est indisponible. Aucun appel métier n’a été effectué.",
          };
        }
        try {
          const context = {
            user_prompt: message,
            recent_messages: state.messages
              .slice(-6)
              .map((m) => ({
                role: m.role,
                content: m.private_data
                  ? "[Résultat métier privé omis du contexte LLM.]"
                  : scrub(m.content),
              })),
            pending: state.pending
              ? {
                  intent_id: state.pending.intent_id,
                  parameters: Object.fromEntries(
                    Object.entries(state.pending.parameters).filter(
                      ([k]) => k !== "account",
                    ),
                  ),
                }
              : null,
          };
          intent = {
            ...Contracts.fromModel(await llm(message, context), this.catalog),
            status: "RECOGNIZED",
          };
        } catch (e) {
          state.preparation = null;
          state.pending = null;
          state.revision++;
          this.state.save(auth, room, state);
          return {
            ok: true,
            mode: source,
            execution: "NONE",
            status: "LLM_INVALID_OR_UNAVAILABLE",
            message:
              "La réponse OpenAI est indisponible ou ne respecte pas le contrat d’intention. Aucune opération n’a été exécutée.",
          };
        }
      }
      let response;
      if (intent.intent_id === "UNKNOWN") {
        state.pending = null;
        state.preparation = null;
        state.revision++;
        response = {
          ok: true,
          mode: source,
          execution: "NONE",
          intent_id: "UNKNOWN",
          status: intent.status === "AMBIGUOUS" ? "AMBIGUOUS" : "UNKNOWN",
          message:
            source === "OPENAI" && intent.reply
              ? scrub(intent.reply)
              : intent.status === "AMBIGUOUS"
                ? "La demande est ambiguë. Précise une seule opération, son sens et son marché."
                : "Je ne reconnais pas cette demande localement. Précise la commande ou demande explicitement OpenAI.",
        };
      } else {
        const p = intent.parameters;
        if (p.asset && p.quote && !p.instrument_candidate)
          p.instrument_candidate = p.asset + "-" + p.quote;
        const eligible = accounts.filter(
          (a) =>
            a.enabled &&
            a.exchange === "OKX" &&
            (!p.environment ||
              p.environment === (a.demoMode ? "DEMO" : "LIVE")),
        );
        if (!p.account && eligible.length === 1) p.account = eligible[0].id;
        const clean = Contracts.validate(
            {
              intent_id: intent.intent_id,
              parameters: intent.parameters,
              reply: intent.reply || "",
            },
            this.catalog,
          ),
          changed =
            digest({
              intent_id: state.pending?.intent_id,
              parameters: state.pending?.parameters,
            }) !==
            digest({
              intent_id: clean.intent_id,
              parameters: clean.parameters,
            });
        if (changed) {
          state.revision++;
          state.preparation = null;
        }
        state.pending = clean;
        const def = this.catalog.get(clean.intent_id),
          missing = def.required.filter(
            (k) => clean.parameters[k] === undefined,
          );
        if (
          ["LIMIT","POST_ONLY","IOC","FOK"].includes(clean.parameters.order_type) &&
          clean.parameters.limit_price === undefined &&
          !missing.includes("limit_price")
        )
          missing.push("limit_price");
        if(clean.intent_id==='plans.execute')for(const [i,step]of p.steps.entries()){const def=this.catalog.get(step.intent_id);for(const key of def.required)if(step.parameters[key]===undefined)missing.push('étape '+(i+1)+' : '+key);}
        if(Procedures.financial.has(clean.intent_id)&&p.market&&p.market!=='SPOT'&&!p.margin_mode)missing.push('margin_mode');
        if(clean.intent_id==='algorithms.place'){
         if(!p.algo_type)missing.push('algo_type');
         if(p.algo_type==='move_order_stop'&&p.callback_ratio===undefined&&p.callback_spread===undefined)missing.push('callback_ratio');
         if(p.algo_type==='trigger'&&p.trigger_price===undefined)missing.push('trigger_price');
         if(['conditional','oco'].includes(p.algo_type)&&p.take_profit===undefined&&p.stop_loss===undefined)missing.push('take_profit');
         if(!p.position_id&&!p.side)missing.push('side');
        }
        if(clean.intent_id==='orders.amend'&&p.amount===undefined&&p.limit_price===undefined)missing.push('limit_price');
        if (
          Procedures.financial.has(clean.intent_id) &&
          p.amount_unit &&
          p.asset &&
          p.quote &&
          ![p.asset, p.quote,...(["SWAP","FUTURES"].includes(p.market)?["CONTRACTS"]:[])].includes(p.amount_unit)
        ) {
          response = {
            status: "INVALID_PARAMETERS",
            message:
              "Le montant doit être exprimé en " +
              p.asset +
              " ou en " +
              p.quote +
              ". Aucune conversion implicite n’est effectuée.",
          };
        } else if (
          (clean.parameters.market === "SPOT" &&
            clean.parameters.position_side) ||
          (clean.intent_id === "positions.open" &&
            clean.parameters.market === "SPOT")
        ) {
          response = {
            status: "AMBIGUOUS",
            message:
              "Une ouverture LONG/SHORT n’est pas un achat Spot. Précise le marché dérivé ou demande un achat/une vente Spot.",
          };
        } else if (missing.length) {
          response = {
            status: "NEEDS_CLARIFICATION",
            missing_parameters: missing,
            message: questions[missing[0]] || "Précise " + missing[0] + ".",
          };
        } else {
          try {
            if (
              state.preparation &&
              state.preparation.digest === digest(clean) &&
              state.preparation.expires_at > this.now() &&
              state.preparation.state === "PREPARED"
            )
              response = {
                status: "PREPARED_UNAVAILABLE",
                execution: "NONE",
                message:
                  "Cette préparation existe déjà et reste non exécutable.",
                preparation: state.preparation,
              };
            else
              response = await Procedures.run(clean, {
                gateway,
                accounts,
                now: this.now,
              });
          } catch (e) {
            response = {
              status: /PERMISSION/.test(e.message)
                ? "PERMISSION_REQUIRED"
                : "UNAVAILABLE",
              execution: "NONE",
              message: /PERMISSION/.test(e.message)
                ? "La permission CP1 requise n’est pas accordée à cet agent."
                : "La commande n’est pas disponible ou ses données ne sont pas vérifiées.",
              reason: /^[A-Z0-9_:]+$/.test(e.message)
                ? e.message
                : "COMMAND_UNAVAILABLE",
            };
          }
        }
        response = {
          ok: true,
          mode: source,
          execution: "NONE",
          intent_id: clean.intent_id,
          parameters: clean.parameters,
          ...response,
          operation: this.catalog.operations.get(def.okx_operation) || null,
        };
        if (response.preparation){response.preparation.conversation_id=room;state.preparation=response.preparation;}
      }
      response.message = scrub(response.message);
      state.messages.push(
        { role: "user", content: message, at: this.now() },
        {
          role: "assistant",
          content: response.message,
          private_data:
            !!response.result || !!response.preparation?.sources?.length,
          at: this.now(),
        },
      );
      state.messages = state.messages.slice(-40);
      this.state.save(auth, room, state);
      return response;
    } finally {
      this.busy.delete(key);
    }
  }
  history(auth, room = "default") {
    return { ok: true, messages: this.state.load(auth, room).messages };
  }
  confirm(input, auth) {
    return this.state.confirm(
      auth,
      input.conversation_id || "default",
      input.preparation_id,
      input.digest,
      input.claim === true,
    );
  }
  cancel(input, auth) {
    return this.state.cancel(
      auth,
      input.conversation_id || "default",
      input.preparation_id,
    );
  }
  close() {
    this.state.close();
  }
}
module.exports = { HybridChatBot, scrub };
