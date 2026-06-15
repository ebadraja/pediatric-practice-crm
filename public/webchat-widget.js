(function () {
  'use strict';

  var STORAGE_KEY = 'kids018_webchat';
  var POLL_MS = 5000;
  var script = document.currentScript;
  var apiBase = (script && script.getAttribute('data-api-base')) || '';

  function apiUrl(path) {
    return apiBase.replace(/\/$/, '') + path;
  }

  function loadState() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch (e) {
      return {};
    }
  }

  function saveState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {}
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function formatReason(value) {
    var labels = {
      SCHEDULING: 'Scheduling',
      REFILL: 'Refill request',
      QUESTION: 'General question',
      URGENT: 'Urgent',
      INSURANCE: 'Insurance',
      RECORDS: 'Medical records',
      OTHER: 'Other',
    };
    return labels[value] || value;
  }

  function formatTime(iso) {
    try {
      return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  }

  var config = null;
  var state = loadState();
  var pollTimer = null;
  var root = null;
  var panel = null;
  var messagesEl = null;
  var formEl = null;
  var open = false;

  function injectStyles(color) {
    if (document.getElementById('kids018-webchat-styles')) return;
    var style = document.createElement('style');
    style.id = 'kids018-webchat-styles';
    style.textContent =
      '#kids018-webchat-root{position:fixed;z-index:2147483000;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}' +
      '#kids018-webchat-bubble{width:56px;height:56px;border-radius:9999px;border:none;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.18);color:#fff;font-size:22px}' +
      '#kids018-webchat-panel{position:fixed;bottom:88px;right:20px;width:min(360px,calc(100vw - 24px));height:min(520px,calc(100vh - 120px));background:#fff;border-radius:16px;box-shadow:0 12px 40px rgba(0,0,0,.2);display:none;flex-direction:column;overflow:hidden}' +
      '#kids018-webchat-panel.open{display:flex}' +
      '.kw-header{padding:14px 16px;color:#fff;font-weight:600;font-size:15px}' +
      '.kw-body{flex:1;overflow:auto;padding:12px;background:#f8fafc}' +
      '.kw-msg{max-width:85%;margin:6px 0;padding:10px 12px;border-radius:14px;font-size:14px;line-height:1.4;word-break:break-word}' +
      '.kw-msg.patient{margin-left:auto;background:' +
      color +
      ';color:#fff;border-bottom-right-radius:4px}' +
      '.kw-msg.staff{background:#fff;border:1px solid #e2e8f0;border-bottom-left-radius:4px}' +
      '.kw-meta{font-size:10px;opacity:.75;margin-top:4px}' +
      '.kw-footer{border-top:1px solid #e2e8f0;padding:12px;background:#fff}' +
      '.kw-field{margin-bottom:8px}' +
      '.kw-field label{display:block;font-size:12px;color:#64748b;margin-bottom:4px}' +
      '.kw-field input,.kw-field select,.kw-field textarea{width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:8px;padding:10px;font-size:14px}' +
      '.kw-actions{display:flex;gap:8px;margin-top:8px}' +
      '.kw-btn{flex:1;border:none;border-radius:8px;padding:10px 12px;font-size:14px;cursor:pointer}' +
      '.kw-btn.primary{background:' +
      color +
      ';color:#fff}' +
      '.kw-btn.ghost{background:#f1f5f9;color:#334155}' +
      '.kw-offline{background:#fff7ed;color:#9a3412;font-size:13px;padding:10px 12px;border-bottom:1px solid #fed7aa}';
    document.head.appendChild(style);
  }

  function renderMessages(messages) {
    if (!messagesEl) return;
    messagesEl.innerHTML = '';
    (messages || []).forEach(function (msg) {
      var isPatient = msg.senderType === 'PATIENT';
      var bubble = el('div', 'kw-msg ' + (isPatient ? 'patient' : 'staff'));
      bubble.appendChild(el('div', null, msg.content));
      bubble.appendChild(el('div', 'kw-meta', formatTime(msg.createdAt)));
      messagesEl.appendChild(bubble);
    });
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function fetchMessages() {
    return fetch(apiUrl('/api/webchat/message'), { credentials: 'include' })
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        if (data.conversationId) {
          state.conversationId = data.conversationId;
          saveState(state);
        }
        renderMessages(data.messages || []);
      })
      .catch(function () {});
  }

  function startPolling() {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(fetchMessages, POLL_MS);
  }

  function buildIntakeForm(onSubmit) {
    formEl.innerHTML = '';
    var name = el('input');
    name.placeholder = 'Your name';
    name.value = state.visitorName || '';

    var phone = el('input');
    phone.type = 'tel';
    phone.placeholder = 'Phone number';
    phone.value = state.visitorPhone || '';

    var reason = el('select');
    ['SCHEDULING', 'REFILL', 'QUESTION', 'URGENT', 'INSURANCE', 'RECORDS', 'OTHER'].forEach(function (r) {
      var opt = el('option');
      opt.value = r;
      opt.textContent = formatReason(r);
      reason.appendChild(opt);
    });
    if (state.reason) reason.value = state.reason;

    var message = el('textarea');
    message.rows = 3;
    message.placeholder = 'How can we help?';

    function field(label, input) {
      var wrap = el('div', 'kw-field');
      wrap.appendChild(el('label', null, label));
      wrap.appendChild(input);
      return wrap;
    }

    formEl.appendChild(field('Name', name));
    formEl.appendChild(field('Phone', phone));
    formEl.appendChild(field('Reason', reason));
    formEl.appendChild(field('Message', message));

    var actions = el('div', 'kw-actions');
    var send = el('button', 'kw-btn primary', 'Send message');
    send.onclick = function () {
      onSubmit({
        visitorName: name.value.trim(),
        phone: phone.value.trim(),
        reason: reason.value,
        content: message.value.trim(),
      });
    };
    actions.appendChild(send);
    formEl.appendChild(actions);
  }

  function buildChatComposer(onSubmit) {
    formEl.innerHTML = '';
    var message = el('textarea');
    message.rows = 2;
    message.placeholder = 'Type a message...';
    var actions = el('div', 'kw-actions');
    var send = el('button', 'kw-btn primary', 'Send');
    send.onclick = function () {
      var text = message.value.trim();
      if (!text) return;
      message.value = '';
      onSubmit(text);
    };
    formEl.appendChild(message);
    actions.appendChild(send);
    formEl.appendChild(actions);
  }

  function sendMessage(payload) {
    return fetch(apiUrl('/api/webchat/message'), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then(function (r) {
      return r.json().then(function (data) {
        if (!r.ok) throw new Error(data.error || 'Send failed');
        return data;
      });
    });
  }

  function mountWidget() {
    var color = (config && config.primaryColor) || '#2563eb';
    injectStyles(color);

    root = el('div', null);
    root.id = 'kids018-webchat-root';

    var position = (config && config.position) === 'bottom-left' ? 'left:20px' : 'right:20px';
    root.style.cssText = position + ';bottom:20px';

    var bubble = el('button', null, '💬');
    bubble.id = 'kids018-webchat-bubble';
    bubble.style.background = color;
    bubble.setAttribute('aria-label', 'Open chat');
    bubble.onclick = togglePanel;

    panel = el('div', null);
    panel.id = 'kids018-webchat-panel';
    if ((config && config.position) === 'bottom-left') {
      panel.style.left = '20px';
      panel.style.right = 'auto';
    }

    var header = el('div', 'kw-header', (config && config.practiceName) || 'Chat with us');
    header.style.background = color;

    if (config && !config.isOnline) {
      panel.appendChild(el('div', 'kw-offline', config.offlineMessage));
    }

    panel.appendChild(header);
    messagesEl = el('div', 'kw-body');
    if (config && config.welcomeMessage && !(state.conversationId)) {
      var welcome = el('div', 'kw-msg staff', config.welcomeMessage);
      messagesEl.appendChild(welcome);
    }
    panel.appendChild(messagesEl);

    formEl = el('div', 'kw-footer');
    panel.appendChild(formEl);

    if (state.conversationId && state.visitorName && state.visitorPhone) {
      buildChatComposer(function (text) {
        sendMessage({
          visitorName: state.visitorName,
          phone: state.visitorPhone,
          reason: state.reason || 'OTHER',
          content: text,
        })
          .then(function () {
            fetchMessages();
          })
          .catch(function (err) {
            alert(err.message || 'Could not send message');
          });
      });
      fetchMessages().then(startPolling);
    } else {
      buildIntakeForm(function (data) {
        if (!data.visitorName || !data.phone || !data.content) {
          alert('Please complete all fields.');
          return;
        }
        state.visitorName = data.visitorName;
        state.visitorPhone = data.phone;
        state.reason = data.reason;
        saveState(state);
        sendMessage(data)
          .then(function () {
            buildChatComposer(function (text) {
              sendMessage({
                visitorName: state.visitorName,
                phone: state.visitorPhone,
                reason: state.reason || 'OTHER',
                content: text,
              }).then(fetchMessages);
            });
            fetchMessages().then(startPolling);
          })
          .catch(function (err) {
            alert(err.message || 'Could not send message');
          });
      });
    }

    root.appendChild(bubble);
    root.appendChild(panel);
    document.body.appendChild(root);
  }

  function togglePanel() {
    open = !open;
    panel.classList.toggle('open', open);
    if (open && state.conversationId) fetchMessages();
  }

  fetch(apiUrl('/api/webchat/init'))
    .then(function (r) {
      return r.json();
    })
    .then(function (data) {
      if (data.enabled === false) return;
      config = data;
      mountWidget();
    })
    .catch(function () {});
})();
