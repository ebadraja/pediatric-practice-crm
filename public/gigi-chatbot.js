(function () {
  'use strict';

  var STORAGE_KEY = 'gigi_chatbot';
  var SESSION_TTL_MS = 24 * 60 * 60 * 1000;

  function findScriptTag() {
    if (document.currentScript) return document.currentScript;
    var scripts = document.getElementsByTagName('script');
    for (var i = scripts.length - 1; i >= 0; i--) {
      var s = scripts[i];
      if (s.src && /gigi-chatbot\.js(\?|$)/.test(s.src)) return s;
    }
    return null;
  }

  var script = findScriptTag();
  var apiBase =
    (script && (script.getAttribute('data-api-url') || script.getAttribute('data-api-base'))) || '';
  if (!apiBase && script && script.src) {
    apiBase = script.src.replace(/\/gigi-chatbot\.js(\?.*)?$/, '');
  }

  var QUICK_ACTIONS = [
    { label: 'Book an Appointment', action: 'book' },
    { label: 'Insurance Questions', message: 'I have a question about insurance coverage.' },
    { label: 'Office Hours', message: 'What are your office hours?' },
    { label: 'Contact Us', message: 'How can I contact the office?' },
  ];

  var GREETING =
    "Hi there! 🦒 I'm GIGI, the virtual assistant for Kids 0 to 18 Integrative Pediatrics. I can help with:\n\n" +
    '• Scheduling appointments\n' +
    '• Insurance & billing questions\n' +
    '• Office hours & location\n' +
    '• Services we offer\n\n' +
    'How can I help you today?';

  var state = loadState();
  var open = false;
  var mounted = false;
  var bubble, panel, messagesEl, inputEl, sendBtn, typingEl;
  var bookingFlow = null;

  function apiUrl(path) {
    return apiBase.replace(/\/$/, '') + path;
  }

  function uuid() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return 'gigi-' + Date.now() + '-' + Math.random().toString(16).slice(2);
  }

  function loadState() {
    try {
      var raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      if (raw.lastActive && Date.now() - raw.lastActive > SESSION_TTL_MS) {
        localStorage.removeItem(STORAGE_KEY);
        return {};
      }
      if (raw.messages && raw.messages.length) {
        var deduped = [];
        raw.messages.forEach(function (m) {
          var prev = deduped[deduped.length - 1];
          if (prev && prev.type === m.type && prev.content === m.content) return;
          deduped.push(m);
        });
        raw.messages = deduped;
      }
      if (raw.bookingFlow) bookingFlow = raw.bookingFlow;
      return raw;
    } catch (_err) {
      return {};
    }
  }

  function saveState() {
    state.lastActive = Date.now();
    if (!state.sessionId) state.sessionId = uuid();
    state.bookingFlow = bookingFlow;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_err) {}
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function formatTime(ts) {
    try {
      return new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    } catch (_err) {
      return '';
    }
  }

  function injectStyles() {
    if (document.getElementById('gigi-chatbot-styles')) return;
    var style = document.createElement('style');
    style.id = 'gigi-chatbot-styles';
    style.textContent =
      '#gigi-bubble{position:fixed!important;bottom:24px;right:24px;z-index:2147483646!important;width:72px;height:72px;border:none!important;border-radius:50%;cursor:pointer;background:transparent!important;box-shadow:0 4px 20px rgba(0,0,0,.18);display:flex;align-items:center;justify-content:center;overflow:visible;margin:0;padding:0}' +
      '#gigi-bubble:hover{transform:scale(1.08)}' +
      '#gigi-bubble .gigi-avatar-img{width:72px;height:72px;border-radius:50%;object-fit:contain;display:block;background:transparent}' +
      '#gigi-bubble .gigi-badge{position:absolute;top:0;right:0;width:14px;height:14px;background:#EF4444;border-radius:50%;border:2px solid #fff;display:none}' +
      '#gigi-bubble.has-unread .gigi-badge{display:block}' +
      '#gigi-panel{position:fixed!important;bottom:108px;right:24px;z-index:2147483647!important;width:400px;height:600px;max-height:calc(100vh - 120px);background:#fff;border-radius:16px;box-shadow:0 16px 48px rgba(0,0,0,.18);display:none;flex-direction:column;overflow:hidden;margin:0;font-family:Inter,-apple-system,BlinkMacSystemFont,sans-serif}' +
      '#gigi-panel.open{display:flex}' +
      '.gigi-header{background:linear-gradient(135deg,#7C3AED,#A855F7);color:#fff;padding:14px 16px;display:flex;align-items:center;gap:12px;flex-shrink:0}' +
      '.gigi-header-avatar{width:40px;height:40px;border-radius:50%;overflow:hidden;flex-shrink:0;background:transparent}' +
      '.gigi-header-avatar img{width:100%;height:100%;object-fit:contain}' +
      '.gigi-header-info{flex:1;min-width:0}' +
      '.gigi-header-title{font-size:16px;font-weight:600}' +
      '.gigi-header-sub{font-size:12px;opacity:.9;display:flex;align-items:center;gap:6px}' +
      '.gigi-online-dot{width:8px;height:8px;background:#4ADE80;border-radius:50%}' +
      '.gigi-close{background:transparent;border:none;color:#fff;font-size:22px;cursor:pointer;padding:4px}' +
      '.gigi-tabs{display:flex;border-bottom:1px solid #EDE9FE;background:#FAFAFA;flex-shrink:0}' +
      '.gigi-tab{flex:1;padding:10px 8px;border:none;background:transparent;font-size:13px;font-weight:500;color:#6B7280;cursor:pointer;border-bottom:2px solid transparent}' +
      '.gigi-tab.active{color:#7C3AED;border-bottom-color:#7C3AED;background:#fff}' +
      '.gigi-body{flex:1;overflow:auto;padding:12px;background:#F9FAFB}' +
      '.gigi-msg{display:flex;gap:8px;margin:8px 0;max-width:92%}' +
      '.gigi-msg.user{margin-left:auto;flex-direction:row-reverse}' +
      '.gigi-msg-avatar{width:28px;height:28px;border-radius:50%;flex-shrink:0;overflow:hidden;display:flex;align-items:center;justify-content:center}' +
      '.gigi-msg-avatar img{width:100%;height:100%;object-fit:contain}' +
      '.gigi-msg-bubble{padding:10px 12px;border-radius:14px;font-size:14px;line-height:1.5;white-space:pre-wrap;word-break:break-word}' +
      '.gigi-msg.bot .gigi-msg-bubble{background:#F3F0FF;color:#1F2937;border-bottom-left-radius:4px}' +
      '.gigi-msg.user .gigi-msg-bubble{background:#7C3AED;color:#fff;border-bottom-right-radius:4px}' +
      '.gigi-msg-time{font-size:11px;color:#6B7280;margin-top:4px}' +
      '.gigi-chips{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}' +
      '.gigi-chip{border:1px solid #C4B5FD;background:#fff;color:#7C3AED;border-radius:999px;padding:8px 12px;font-size:12px;cursor:pointer;min-height:44px}' +
      '.gigi-chip:hover{background:#EDE9FE}' +
      '.gigi-typing{display:flex;gap:4px;padding:8px 12px;background:#F3F0FF;border-radius:14px;width:fit-content;margin:8px 0}' +
      '.gigi-typing span{width:6px;height:6px;background:#7C3AED;border-radius:50%;animation:gigi-dot 1.2s infinite}' +
      '.gigi-typing span:nth-child(2){animation-delay:.2s}' +
      '.gigi-typing span:nth-child(3){animation-delay:.4s}' +
      '@keyframes gigi-dot{0%,80%,100%{opacity:.3}40%{opacity:1;transform:translateY(-3px)}}' +
      '.gigi-footer{border-top:1px solid #EDE9FE;padding:10px 12px;background:#fff;display:flex;gap:8px;align-items:flex-end;flex-shrink:0}' +
      '.gigi-input{flex:1;border:1px solid #D1D5DB;border-radius:12px;padding:10px 12px;font-size:14px;resize:none;min-height:44px;font-family:inherit}' +
      '.gigi-send{width:44px;height:44px;border:none;border-radius:12px;background:#7C3AED;color:#fff;cursor:pointer;font-size:18px}' +
      '.gigi-locked-panel{padding:24px 16px;text-align:center}' +
      '.gigi-book-card{background:#fff;border:1px solid #EDE9FE;border-radius:12px;padding:14px;margin:8px 0}' +
      '.gigi-book-title{font-size:14px;font-weight:600;margin-bottom:10px;color:#1F2937}' +
      '.gigi-book-row{display:flex;gap:8px;margin-bottom:10px}' +
      '.gigi-book-btn{flex:1;border:1px solid #C4B5FD;border-radius:10px;padding:12px;font-size:13px;cursor:pointer;background:#fff;min-height:44px}' +
      '.gigi-book-btn.primary{background:#7C3AED;color:#fff;border-color:#7C3AED}' +
      '.gigi-book-btn:hover{background:#EDE9FE}' +
      '.gigi-book-btn.primary:hover{background:#6D28D9}' +
      '.gigi-field{margin-bottom:8px}' +
      '.gigi-field label{display:block;font-size:12px;color:#6B7280;margin-bottom:4px}' +
      '.gigi-field input{width:100%;box-sizing:border-box;border:1px solid #D1D5DB;border-radius:8px;padding:10px;font-size:14px;min-height:44px}' +
      '.gigi-slots-card{background:#fff;border:1px solid #EDE9FE;border-radius:12px;padding:12px;margin:8px 0}' +
      '.gigi-slots-day{font-size:12px;font-weight:600;color:#374151;margin:8px 0 6px}' +
      '.gigi-slots-pills{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:4px}' +
      '.gigi-slot-pill{border:1px solid #C4B5FD;border-radius:999px;padding:8px 12px;font-size:12px;cursor:pointer;background:#fff;min-height:40px}' +
      '.gigi-slot-pill:hover{background:#7C3AED;color:#fff;border-color:#7C3AED}' +
      '@media (max-width:768px){#gigi-bubble{width:64px;height:64px;bottom:16px;right:16px}#gigi-bubble .gigi-avatar-img{width:64px;height:64px}#gigi-panel{bottom:0;right:0;left:0;width:100%;height:100vh;max-height:100vh;border-radius:0}}';

    document.head.appendChild(style);
  }

  function avatarImg(className) {
    var wrap = el('div', className || 'gigi-msg-avatar');
    var img = document.createElement('img');
    img.src = apiUrl('/gigi-avatar.png');
    img.alt = 'GIGI';
    img.className = className ? '' : 'gigi-avatar-img';
    img.onerror = function () {
      wrap.textContent = '🦒';
    };
    wrap.appendChild(img);
    return wrap;
  }

  function ensureMessages() {
    if (!state.messages) state.messages = [];
  }

  function appendMessage(type, content) {
    ensureMessages();
    var msg = { type: type, content: content, timestamp: Date.now() };
    state.messages.push(msg);
    saveState();
    renderMessage(msg);
    scrollMessages();
    if (type === 'bot' && !open && bubble) bubble.classList.add('has-unread');
  }

  function renderMessage(msg) {
    if (!messagesEl) return;
    var row = el('div', 'gigi-msg ' + (msg.type === 'user' ? 'user' : 'bot'));
    if (msg.type === 'bot') row.appendChild(avatarImg('gigi-msg-avatar'));
    var wrap = el('div');
    wrap.appendChild(el('div', 'gigi-msg-bubble', msg.content));
    wrap.appendChild(el('div', 'gigi-msg-time', formatTime(msg.timestamp)));
    row.appendChild(wrap);
    messagesEl.appendChild(row);
  }

  function scrollMessages() {
    if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function showTyping(show) {
    if (!messagesEl) return;
    if (typingEl) { typingEl.remove(); typingEl = null; }
    if (!show) return;
    typingEl = el('div', 'gigi-typing');
    typingEl.appendChild(el('span'));
    typingEl.appendChild(el('span'));
    typingEl.appendChild(el('span'));
    messagesEl.appendChild(typingEl);
    scrollMessages();
  }

  function renderQuickActions() {
    if (!messagesEl || messagesEl.querySelector('.gigi-chips')) return;
    var wrap = el('div', 'gigi-chips');
    QUICK_ACTIONS.forEach(function (qa) {
      var chip = el('button', 'gigi-chip', qa.label);
      chip.type = 'button';
      chip.onclick = function () {
        if (qa.action === 'book') startBookingFlow();
        else if (qa.message) sendUserMessage(qa.message);
      };
      wrap.appendChild(chip);
    });
    messagesEl.appendChild(wrap);
    scrollMessages();
  }

  function renderThreadFromState() {
    if (!messagesEl) return;
    messagesEl.innerHTML = '';
    ensureMessages();
    state.messages.forEach(renderMessage);
    if (state.messages.length === 1 && state.messages[0].type === 'bot' && state.messages[0].content === GREETING) {
      renderQuickActions();
    }
    scrollMessages();
  }

  function showGreetingIfNeeded() {
    ensureMessages();
    if (state.hasSeenGreeting && state.messages.length > 0) {
      renderThreadFromState();
      return;
    }
    state.hasSeenGreeting = true;
    saveState();
    appendMessage('bot', GREETING);
    renderQuickActions();
  }

  function getBookingContext() {
    if (!bookingFlow || !bookingFlow.active) return undefined;
    return {
      active: true,
      patientType: bookingFlow.patientType,
      contactName: bookingFlow.contactName,
      contactPhone: bookingFlow.contactPhone,
    };
  }

  function renderSlotPicker(slots) {
    if (!messagesEl || !slots || !slots.length) return;
    var existing = document.getElementById('gigi-slot-picker');
    if (existing) existing.remove();

    var card = el('div', 'gigi-slots-card');
    card.id = 'gigi-slot-picker';
    card.appendChild(el('div', 'gigi-book-title', 'Tap a time to continue booking:'));

    slots.forEach(function (day) {
      if (!day.times || !day.times.length) return;
      card.appendChild(el('div', 'gigi-slots-day', day.dateLabel));
      var pills = el('div', 'gigi-slots-pills');
      day.times.forEach(function (t) {
        var pill = el('button', 'gigi-slot-pill', t.label);
        pill.type = 'button';
        pill.onclick = function () {
          var msg =
            'Please book an appointment on ' + day.dateLabel + ' (' + day.date + ') at ' + t.label +
            ' for ' + (bookingFlow.contactName || 'the patient') +
            '. Contact phone: ' + (bookingFlow.contactPhone || 'not provided') + '.';
          sendUserMessage(msg, true);
        };
        pills.appendChild(pill);
      });
      card.appendChild(pills);
    });

    messagesEl.appendChild(card);
    scrollMessages();
  }

  function sendUserMessage(text, skipUserBubble) {
    var trimmed = (text || '').trim();
    if (!trimmed) return;
    if (!apiBase) {
      appendMessage('bot', 'Chat is not configured (missing data-api-url on the script tag).');
      return;
    }
    if (!skipUserBubble) appendMessage('user', trimmed);
    if (inputEl) inputEl.value = '';
    if (sendBtn) sendBtn.disabled = true;
    showTyping(true);

    fetch(apiUrl('/api/chatbot/message'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: state.sessionId,
        message: trimmed,
        previousChatId: state.vapiChatId || undefined,
        bookingContext: getBookingContext(),
      }),
    })
      .then(function (r) {
        return r.json().then(function (data) {
          if (!r.ok) throw new Error(data.error || 'Send failed');
          return data;
        });
      })
      .then(function (data) {
        showTyping(false);
        if (data.chatId) { state.vapiChatId = data.chatId; saveState(); }
        appendMessage('bot', data.reply || '');
        if (data.slots && data.slots.length) renderSlotPicker(data.slots);
      })
      .catch(function (err) {
        showTyping(false);
        appendMessage('bot', err.message || 'Sorry, something went wrong. Please call (253) 400-4479.');
      })
      .finally(function () {
        if (sendBtn) sendBtn.disabled = false;
        if (inputEl) inputEl.focus();
      });
  }

  function removeBookingCard() {
    var card = document.getElementById('gigi-booking-card');
    if (card) card.remove();
  }

  function startBookingFlow() {
    removeBookingCard();
    bookingFlow = { active: false, step: 'type' };
    saveState();

    var card = el('div', 'gigi-book-card');
    card.id = 'gigi-booking-card';
    card.appendChild(el('div', 'gigi-book-title', 'Book an appointment'));

    function showTypeStep() {
      card.innerHTML = '';
      card.appendChild(el('div', 'gigi-book-title', 'Is this for a new or existing patient?'));
      var row = el('div', 'gigi-book-row');
      var newBtn = el('button', 'gigi-book-btn', 'New Patient');
      var existBtn = el('button', 'gigi-book-btn', 'Existing Patient');
      newBtn.type = 'button';
      existBtn.type = 'button';
      newBtn.onclick = function () { bookingFlow.patientType = 'new'; showContactStep(); };
      existBtn.onclick = function () { bookingFlow.patientType = 'existing'; showContactStep(); };
      row.appendChild(newBtn);
      row.appendChild(existBtn);
      card.appendChild(row);
    }

    function showContactStep() {
      card.innerHTML = '';
      card.appendChild(el('div', 'gigi-book-title', 'Your contact info'));
      card.appendChild(el('div', null, 'Name and phone for the person booking (parent/guardian).'));

      var nameField = el('div', 'gigi-field');
      nameField.appendChild(el('label', null, 'Your name'));
      var nameInput = el('input');
      nameInput.placeholder = 'Full name';
      nameField.appendChild(nameInput);

      var phoneField = el('div', 'gigi-field');
      phoneField.appendChild(el('label', null, 'Mobile phone'));
      var phoneInput = el('input');
      phoneInput.type = 'tel';
      phoneInput.placeholder = '(555) 555-5555';
      phoneField.appendChild(phoneInput);

      card.appendChild(nameField);
      card.appendChild(phoneField);

      var row = el('div', 'gigi-book-row');
      var back = el('button', 'gigi-book-btn', 'Back');
      var start = el('button', 'gigi-book-btn primary', 'Start with GIGI');
      back.type = 'button';
      start.type = 'button';
      back.onclick = showTypeStep;
      start.onclick = function () {
        var name = nameInput.value.trim();
        var phone = phoneInput.value.trim();
        if (!name || !phone) {
          alert('Please enter your name and phone number.');
          return;
        }
        bookingFlow.contactName = name;
        bookingFlow.contactPhone = phone;
        bookingFlow.active = true;
        saveState();
        removeBookingCard();

        var intro =
          bookingFlow.patientType === 'new'
            ? 'I would like to book an appointment. I am a NEW patient.'
            : 'I would like to book an appointment. I am an EXISTING patient — please look up my record.';
        sendUserMessage(intro);
      };
      row.appendChild(back);
      row.appendChild(start);
      card.appendChild(row);
    }

    showTypeStep();
    messagesEl.appendChild(card);
    scrollMessages();
  }

  function switchTab(tab) {
    var tabs = panel.querySelectorAll('.gigi-tab');
    tabs.forEach(function (t) {
      t.classList.toggle('active', t.getAttribute('data-tab') === tab);
    });
    var gigiView = document.getElementById('gigi-tab-gigi');
    var msgView = document.getElementById('gigi-tab-messaging');
    var footer = document.querySelector('.gigi-footer');
    if (tab === 'gigi') {
      if (gigiView) gigiView.style.display = '';
      if (msgView) msgView.style.display = 'none';
      if (footer) footer.style.display = '';
    } else {
      if (gigiView) gigiView.style.display = 'none';
      if (msgView) { msgView.style.display = ''; msgView.innerHTML = ''; renderLockedTab(msgView); }
      if (footer) footer.style.display = 'none';
    }
  }

  function renderLockedTab(container) {
    var box = el('div', 'gigi-locked-panel');
    box.appendChild(el('h3', null, '🔒 Secure Patient Messaging'));
    box.appendChild(el('p', null, "Coming soon. For now, call (253) 400-4479 or ask GIGI!"));
    container.appendChild(box);
  }

  function togglePanel() {
    open = !open;
    panel.classList.toggle('open', open);
    if (open) {
      bubble.classList.remove('has-unread');
      showGreetingIfNeeded();
      if (inputEl) inputEl.focus();
    }
  }

  function mountWidget() {
    if (mounted || document.getElementById('gigi-bubble')) return;
    mounted = true;
    if (!state.sessionId) state.sessionId = uuid();
    saveState();
    injectStyles();

    bubble = el('button');
    bubble.id = 'gigi-bubble';
    bubble.setAttribute('aria-label', 'Chat with GIGI');
    bubble.onclick = togglePanel;
    bubble.appendChild(avatarImg());
    bubble.appendChild(el('span', 'gigi-badge'));

    panel = el('div');
    panel.id = 'gigi-panel';

    var header = el('div', 'gigi-header');
    var headerAvatar = el('div', 'gigi-header-avatar');
    var hImg = document.createElement('img');
    hImg.src = apiUrl('/gigi-avatar.png');
    hImg.alt = 'GIGI';
    hImg.onerror = function () { headerAvatar.textContent = '🦒'; };
    headerAvatar.appendChild(hImg);
    var headerInfo = el('div', 'gigi-header-info');
    headerInfo.appendChild(el('div', 'gigi-header-title', 'GIGI'));
    var sub = el('div', 'gigi-header-sub');
    sub.appendChild(el('span', 'gigi-online-dot'));
    sub.appendChild(document.createTextNode('AI Assistant · Online'));
    headerInfo.appendChild(sub);
    var closeBtn = el('button', 'gigi-close', '×');
    closeBtn.onclick = togglePanel;
    header.appendChild(headerAvatar);
    header.appendChild(headerInfo);
    header.appendChild(closeBtn);
    panel.appendChild(header);

    var tabs = el('div', 'gigi-tabs');
    var tabGigi = el('button', 'gigi-tab active', 'GIGI');
    tabGigi.type = 'button';
    tabGigi.setAttribute('data-tab', 'gigi');
    tabGigi.onclick = function () { switchTab('gigi'); };
    var tabMsg = el('button', 'gigi-tab', 'Messaging 🔒');
    tabMsg.type = 'button';
    tabMsg.setAttribute('data-tab', 'messaging');
    tabMsg.onclick = function () { switchTab('messaging'); };
    tabs.appendChild(tabGigi);
    tabs.appendChild(tabMsg);
    panel.appendChild(tabs);

    messagesEl = el('div', 'gigi-body');
    messagesEl.id = 'gigi-tab-gigi';
    panel.appendChild(messagesEl);

    var msgView = el('div', 'gigi-body');
    msgView.id = 'gigi-tab-messaging';
    msgView.style.display = 'none';
    panel.appendChild(msgView);

    var footer = el('div', 'gigi-footer');
    inputEl = el('textarea', 'gigi-input');
    inputEl.placeholder = 'Type a message…';
    inputEl.rows = 1;
    inputEl.onkeydown = function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendUserMessage(inputEl.value); }
    };
    sendBtn = el('button', 'gigi-send', '→');
    sendBtn.type = 'button';
    sendBtn.onclick = function () { sendUserMessage(inputEl.value); };
    footer.appendChild(inputEl);
    footer.appendChild(sendBtn);
    panel.appendChild(footer);

    document.body.appendChild(bubble);
    document.body.appendChild(panel);
    console.log('[GIGI] Widget mounted. API base:', apiBase || '(none)');
  }

  function bootGigi() {
    try { mountWidget(); } catch (err) { console.error('[GIGI] mount failed:', err); }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootGigi);
  } else {
    bootGigi();
  }
})();
