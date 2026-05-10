const handleTune = (request, sendResponse) => {
  if (request.type !== 'CLAUDE_TUNE') return false;
  fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-api-key':         request.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model:      'claude-sonnet-4-20250514',
      max_tokens: request.maxTokens || 512,
      messages:   [{ role: 'user', content: request.prompt }],
    }),
  })
  .then(r => {
    if (!r.ok) return r.text().then(t => { throw new Error('API ' + r.status + ': ' + t.slice(0,200)); });
    return r.json();
  })
  .then(data => {
    console.log('[BG] Claude OK | tokens in:' + (data.usage?.input_tokens||'?') + ' out:' + (data.usage?.output_tokens||'?'));
    sendResponse({ success: true, data });
  })
  .catch(err => {
    console.error('[BG] Claude error:', err.message);
    sendResponse({ success: false, error: err.message });
  });
  return true;
};

// From content scripts (ISOLATED world)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'INJECT_HELPER') {
    injectClaudeHelper(sender.tab.id);
    sendResponse({ ok: true });
    return false;
  }
  return handleTune(request, sendResponse);
});

// From MAIN world (webpage context — requires extId in sendMessage)
chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
  return handleTune(request, sendResponse);
});

const injectClaudeHelper = (tabId) => {
  chrome.scripting.executeScript({
    target: { tabId },
    world:  'MAIN',
    func:   (extId) => {
      if (window.__claudeCall) return;
      window.__rbExtId = extId;
      window.__claudeCall = (apiKey, prompt, maxTokens) => new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          extId,
          { type: 'CLAUDE_TUNE', apiKey, prompt, maxTokens: maxTokens || 512 },
          (response) => {
            if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
            if (!response) return reject(new Error('No response from background'));
            if (!response.success) return reject(new Error(response.error));
            resolve(response.data);
          }
        );
      });
      console.warn('[RBBot] __claudeCall injected ✅ extId:' + extId.slice(0, 8));
    },
    args: [chrome.runtime.id],
  }).catch(e => console.log('[BG] inject error:', e.message));
};

// Inject on tab load
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return;
  if (!tab.url || !tab.url.includes('rainbet.com')) return;
  injectClaudeHelper(tabId);
});

// Inject on tab activation
chrome.tabs.onActivated.addListener(({ tabId }) => {
  chrome.tabs.get(tabId, (tab) => {
    if (!tab.url || !tab.url.includes('rainbet.com')) return;
    injectClaudeHelper(tabId);
  });
});

console.log('[BG] Service worker started ✅');
