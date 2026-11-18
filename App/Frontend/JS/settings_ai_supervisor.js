(() => {
  'use strict';

  const byId = id => document.getElementById(id);
  const supervisor = byId('supervisorSettingsFields');
  const chatbot = byId('chatbotSettingsFields');
  const provider = byId('supervisorProvider');
  const model = byId('supervisorModel');
  const timeout = byId('supervisorTimeout');
  const fallbackEnabled = byId('supervisorFallbackEnabled');
  const fallbackProvider = byId('supervisorFallbackProvider');
  const mode = byId('chatbotMode');
  const autoFallback = byId('chatbotFallback');
  let activeProfile;
  let loaded = false;
  let loading = false;

  async function request(url, body) {
    const init = { cache: 'no-store', credentials: 'same-origin' };
    if (body) {
      init.method = 'POST';
      init.headers = { 'Content-Type': 'application/json' };
      init.body = JSON.stringify(body);
    }
    const response = await fetch(url, init);
    const data = await response.json();
    if (!response.ok || data.error) throw Error(data.error || 'HTTP ' + response.status);
    return data;
  }

  function status(section, message, ok = false) {
    const output = byId(section + 'SettingsStatus');
    output.textContent = message;
    output.classList.toggle('ok', ok);
  }

  function syncSupervisorFallback() {
    fallbackProvider.disabled = !fallbackEnabled.checked;
    fallbackProvider.required = fallbackEnabled.checked;
  }

  function syncChatbotFallback() {
    autoFallback.disabled = mode.value !== 'HYBRID';
  }

  fallbackEnabled.addEventListener('change', syncSupervisorFallback);
  mode.addEventListener('change', syncChatbotFallback);

  document.addEventListener('iatb:settings-view', async event => {
    if (event.detail !== 'ai-supervisor' || loaded || loading) return;
    loading = true;
    status('supervisor', 'Chargement…');
    status('chatbot', 'Chargement…');
    await Promise.all([
      request('/api/settings').then(data => {
        if (data.settingsAvailable === false) throw Error('Profil indisponible');
        const llm = data.supervisor?.llm || {};
        activeProfile = data.appSettings?.activeFile;
        provider.value = llm.provider || 'OPENAI_API';
        model.value = llm.openai?.model || data.openaiModel || 'gpt-5.6';
        timeout.value = llm.openai?.timeoutMs || 45000;
        fallbackEnabled.checked = llm.fallbackEnabled === true;
        fallbackProvider.value = llm.fallbackProvider || 'MOCK';
        syncSupervisorFallback();
        supervisor.disabled = false;
        status('supervisor', provider.value ? '' : 'Sélectionnez un fournisseur disponible pour remplacer la configuration actuelle.');
      }).catch(error => status('supervisor', 'Chargement impossible : ' + error.message)),
      request('/api/settings/chatbot').then(({ settings }) => {
        mode.value = settings.mode;
        autoFallback.checked = settings.autoFallback;
        syncChatbotFallback();
        chatbot.disabled = false;
        status('chatbot', '');
      }).catch(error => status('chatbot', 'Chargement impossible : ' + error.message))
    ]);
    loaded = !supervisor.disabled && !chatbot.disabled;
    loading = false;
  });

  byId('supervisorSettingsForm').addEventListener('submit', async event => {
    event.preventDefault();
    if (supervisor.disabled) return;
    const body = {
      provider: provider.value,
      fallbackEnabled: fallbackEnabled.checked,
      fallbackProvider: fallbackProvider.value || 'MOCK',
      openai: { model: model.value.trim(), timeoutMs: Number(timeout.value) }
    };
    if (activeProfile) body.profileFile = activeProfile;
    supervisor.disabled = true;
    status('supervisor', 'Enregistrement…');
    try {
      await request('/api/settings/supervisor/brains', body);
      status('supervisor', 'Réglages du Supervisor enregistrés.', true);
    } catch (error) {
      status('supervisor', 'Enregistrement refusé : ' + error.message);
    } finally {
      supervisor.disabled = false;
    }
  });

  byId('chatbotSettingsForm').addEventListener('submit', async event => {
    event.preventDefault();
    if (chatbot.disabled) return;
    chatbot.disabled = true;
    status('chatbot', 'Enregistrement…');
    try {
      await request('/api/settings/chatbot', { mode: mode.value, autoFallback: !autoFallback.disabled && autoFallback.checked });
      if (mode.value !== 'HYBRID') autoFallback.checked = false;
      status('chatbot', 'Réglages du ChatBot enregistrés.', true);
    } catch (error) {
      status('chatbot', 'Enregistrement refusé : ' + error.message);
    } finally {
      chatbot.disabled = false;
    }
  });
})();
