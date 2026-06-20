(function () {
  'use strict';

  var STORAGE_KEY = 'gigi_chatbot';
  var SESSION_TTL_MS = 24 * 60 * 60 * 1000;
  var script = document.currentScript;
  var apiBase = (script && script.getAttribute('data-api-url')) || '';

  var APPT_TYPES = [
    { id: 'WELL_CHILD_VISIT', label: 'Well-Child Visit' },
    { id: 'SICK_VISIT', label: 'Sick Visit' },
    { id: 'FOLLOW_UP', label: 'Follow-Up' },
    { id: 'CONSULTATION', label: 'New Patient Consultation' },
    { id: 'OTHER', label: 'Other' },
  ];

  var PROVIDERS = [
    { id: 'dr-tamas', label: 'Dr. Jonathan Tomas (APRN)' },
    { id: 'dr-richards', label: 'Dr. Peaches Richards' },
    { id: 'no-preference', label: 'No Preference' },
  ];

  var QUICK_ACTIONS = [
    { label: 'Book an Appointment', action: 'calendar' },
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
  var root, bubble, panel, messagesEl, inputEl, sendBtn, typingEl;
  var calendarState = null;

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
      return raw;
    } catch (_err) {
      return {};
    }
  }

  function saveState() {
    state.lastActive = Date.now();
    if (!state.sessionId) state.sessionId = uuid();
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

  function todayStr() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function addDays(dateStr, days) {
    var d = new Date(dateStr + 'T00:00:00');
    d.setDate(d.getDate() + days);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function dayLabel(dateStr) {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  function to12Hour(hhmm) {
    var parts = hhmm.split(':');
    var h = parseInt(parts[0], 10);
    var m = parts[1];
    var suffix = h >= 12 ? 'pm' : 'am';
    var hour = h % 12 || 12;
    return hour + ':' + m + suffix;
  }

  function injectStyles() {
    if (document.getElementById('gigi-chatbot-styles')) return;
    var style = document.createElement('style');
    style.id = 'gigi-chatbot-styles';
    style.textContent =
      '#gigi-chatbot-root{font-family:Inter,-apple-system,BlinkMacSystemFont,sans-serif;z-index:99999}' +
      '#gigi-bubble{position:fixed;bottom:24px;right:24px;width:70px;height:70px;border-radius:50%;border:3px solid #fff;cursor:pointer;box-shadow:0 8px 24px rgba(124,58,237,.35);background:#7C3AED;color:#fff;font-size:28px;display:flex;align-items:center;justify-content:center;overflow:hidden;transition:transform .2s ease}' +
      '#gigi-bubble:hover{transform:scale(1.1)}' +
      '#gigi-bubble img{width:100%;height:100%;object-fit:cover}' +
      '#gigi-bubble .gigi-badge{position:absolute;top:2px;right:2px;width:12px;height:12px;background:#EF4444;border-radius:50%;border:2px solid #fff;display:none}' +
      '#gigi-bubble.has-unread .gigi-badge{display:block}' +
      '#gigi-panel{position:fixed;bottom:104px;right:24px;width:400px;height:600px;background:#fff;border-radius:16px;box-shadow:0 16px 48px rgba(0,0,0,.18);display:none;flex-direction:column;overflow:hidden}' +
      '#gigi-panel.open{display:flex}' +
      '.gigi-header{background:linear-gradient(135deg,#7C3AED,#A855F7);color:#fff;padding:14px 16px;display:flex;align-items:center;gap:12px}' +
      '.gigi-header-avatar{width:40px;height:40px;border-radius:50%;background:#fff;overflow:hidden;flex-shrink:0}' +
      '.gigi-header-avatar img{width:100%;height:100%;object-fit:cover}' +
      '.gigi-header-info{flex:1;min-width:0}' +
      '.gigi-header-title{font-size:16px;font-weight:600;line-height:1.2}' +
      '.gigi-header-sub{font-size:12px;opacity:.9;display:flex;align-items:center;gap:6px}' +
      '.gigi-online-dot{width:8px;height:8px;background:#4ADE80;border-radius:50%}' +
      '.gigi-close{background:transparent;border:none;color:#fff;font-size:22px;cursor:pointer;line-height:1;padding:4px}' +
      '.gigi-tabs{display:flex;border-bottom:1px solid #EDE9FE;background:#FAFAFA}' +
      '.gigi-tab{flex:1;padding:10px 8px;border:none;background:transparent;font-size:13px;font-weight:500;color:#6B7280;cursor:pointer;border-bottom:2px solid transparent}' +
      '.gigi-tab.active{color:#7C3AED;border-bottom-color:#7C3AED;background:#fff}' +
      '.gigi-tab.locked{opacity:.7}' +
      '.gigi-body{flex:1;overflow:auto;padding:12px;background:#F9FAFB}' +
      '.gigi-msg{display:flex;gap:8px;margin:8px 0;max-width:92%}' +
      '.gigi-msg.user{margin-left:auto;flex-direction:row-reverse}' +
      '.gigi-msg-avatar{width:28px;height:28px;border-radius:50%;background:#EDE9FE;flex-shrink:0;overflow:hidden;font-size:14px;display:flex;align-items:center;justify-content:center}' +
      '.gigi-msg-avatar img{width:100%;height:100%;object-fit:cover}' +
      '.gigi-msg-bubble{padding:10px 12px;border-radius:14px;font-size:14px;line-height:1.5;white-space:pre-wrap;word-break:break-word}' +
      '.gigi-msg.bot .gigi-msg-bubble{background:#F3F0FF;color:#1F2937;border-bottom-left-radius:4px}' +
      '.gigi-msg.user .gigi-msg-bubble{background:#7C3AED;color:#fff;border-bottom-right-radius:4px}' +
      '.gigi-msg-time{font-size:11px;color:#6B7280;margin-top:4px}' +
      '.gigi-msg.user .gigi-msg-time{text-align:right}' +
      '.gigi-chips{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}' +
      '.gigi-chip{border:1px solid #C4B5FD;background:#fff;color:#7C3AED;border-radius:999px;padding:8px 12px;font-size:12px;cursor:pointer;min-height:44px}' +
      '.gigi-chip:hover{background:#EDE9FE}' +
      '.gigi-typing{display:flex;gap:4px;padding:8px 12px;background:#F3F0FF;border-radius:14px;width:fit-content;margin:8px 0}' +
      '.gigi-typing span{width:6px;height:6px;background:#7C3AED;border-radius:50%;animation:gigi-dot 1.2s infinite}' +
      '.gigi-typing span:nth-child(2){animation-delay:.2s}' +
      '.gigi-typing span:nth-child(3){animation-delay:.4s}' +
      '@keyframes gigi-dot{0%,80%,100%{opacity:.3;transform:translateY(0)}40%{opacity:1;transform:translateY(-3px)}}' +
      '.gigi-footer{border-top:1px solid #EDE9FE;padding:10px 12px;background:#fff;display:flex;gap:8px;align-items:flex-end}' +
      '.gigi-input{flex:1;border:1px solid #D1D5DB;border-radius:12px;padding:10px 12px;font-size:14px;resize:none;min-height:44px;max-height:100px;font-family:inherit}' +
      '.gigi-send{width:44px;height:44px;border:none;border-radius:12px;background:#7C3AED;color:#fff;cursor:pointer;font-size:18px;flex-shrink:0}' +
      '.gigi-send:disabled{opacity:.5;cursor:not-allowed}' +
      '.gigi-locked-panel{padding:24px 16px;text-align:center;color:#1F2937}' +
      '.gigi-locked-panel h3{margin:0 0 8px;font-size:16px}' +
      '.gigi-locked-panel p{margin:0;font-size:14px;color:#6B7280;line-height:1.5}' +
      '.gigi-cal-card{background:#fff;border:1px solid #EDE9FE;border-radius:12px;padding:12px;margin:8px 0;box-shadow:0 2px 8px rgba(124,58,237,.08)}' +
      '.gigi-cal-steps{display:flex;gap:6px;justify-content:center;margin-bottom:12px}' +
      '.gigi-cal-dot{width:8px;height:8px;border-radius:50%;background:#E5E7EB}' +
      '.gigi-cal-dot.active{background:#7C3AED}' +
      '.gigi-cal-dot.done{background:#A855F7}' +
      '.gigi-cal-title{font-size:14px;font-weight:600;margin-bottom:10px;color:#1F2937}' +
      '.gigi-cal-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}' +
      '.gigi-cal-option{border:1px solid #D1D5DB;border-radius:10px;padding:12px;font-size:13px;cursor:pointer;min-height:44px;text-align:center;background:#fff}' +
      '.gigi-cal-option.selected,.gigi-cal-option:hover{border-color:#7C3AED;background:#EDE9FE}' +
      '.gigi-week-strip{display:flex;gap:8px;overflow-x:auto;padding-bottom:4px}' +
      '.gigi-day-btn{min-width:72px;border:1px solid #D1D5DB;border-radius:10px;padding:8px;font-size:12px;cursor:pointer;background:#fff;min-height:44px;flex-shrink:0}' +
      '.gigi-day-btn.selected{border-color:#7C3AED;background:#EDE9FE}' +
      '.gigi-day-btn .dot{font-size:10px;color:#7C3AED}' +
      '.gigi-time-group{margin-bottom:10px}' +
      '.gigi-time-label{font-size:12px;color:#6B7280;margin-bottom:6px}' +
      '.gigi-time-pills{display:flex;flex-wrap:wrap;gap:6px}' +
      '.gigi-time-pill{border:1px solid #D1D5DB;border-radius:999px;padding:8px 12px;font-size:13px;cursor:pointer;min-height:44px;background:#fff}' +
      '.gigi-time-pill.selected{border-color:#7C3AED;background:#7C3AED;color:#fff}' +
      '.gigi-field{margin-bottom:10px}' +
      '.gigi-field label{display:block;font-size:12px;color:#6B7280;margin-bottom:4px}' +
      '.gigi-field input{width:100%;box-sizing:border-box;border:1px solid #D1D5DB;border-radius:8px;padding:10px;font-size:14px;min-height:44px}' +
      '.gigi-hp{position:absolute;left:-9999px;opacity:0;height:0;width:0;overflow:hidden}' +
      '.gigi-cal-nav{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}' +
      '.gigi-cal-nav button{border:1px solid #D1D5DB;background:#fff;border-radius:8px;padding:6px 10px;cursor:pointer;min-height:44px}' +
      '.gigi-cal-actions{display:flex;gap:8px;margin-top:12px}' +
      '.gigi-btn{flex:1;border:none;border-radius:10px;padding:10px;font-size:14px;cursor:pointer;min-height:44px}' +
      '.gigi-btn.primary{background:#7C3AED;color:#fff}' +
      '.gigi-btn.ghost{background:#F3F4F6;color:#374151}' +
      '.gigi-confirm{text-align:center;padding:8px 0}' +
      '.gigi-confirm .check{font-size:32px;margin-bottom:8px}' +
      '@media (prefers-reduced-motion:no-preference){#gigi-bubble.gigi-animate{animation:gigi-bounce 3s ease-in-out infinite}#gigi-bubble.gigi-pulse{animation:gigi-pulse 2s ease-out 5}#gigi-panel.open{animation:gigi-slide-up .25s ease-out}@keyframes gigi-bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}@keyframes gigi-pulse{0%{box-shadow:0 0 0 0 rgba(124,58,237,.4)}70%{box-shadow:0 0 0 15px rgba(124,58,237,0)}100%{box-shadow:0 0 0 0 rgba(124,58,237,0)}}@keyframes gigi-slide-up{from{opacity:0;transform:translateY(20px) scale(.95)}to{opacity:1;transform:translateY(0) scale(1)}}}' +
      '@media (max-width:768px){#gigi-bubble{width:60px;height:60px;bottom:16px;right:16px}#gigi-panel{bottom:0;right:0;left:0;width:100%;height:100vh;border-radius:0;max-height:100vh;padding-bottom:env(safe-area-inset-bottom)}.gigi-footer{padding-bottom:calc(10px + env(safe-area-inset-bottom))}.gigi-cal-grid{grid-template-columns:1fr}}';

    document.head.appendChild(style);
  }

  function avatarImg(className) {
    var wrap = el('div', className || 'gigi-msg-avatar');
    var img = document.createElement('img');
    img.src = apiUrl('/gigi-avatar.png');
    img.alt = 'GIGI';
    img.onerror = function () {
      wrap.textContent = '🦒';
      wrap.style.fontSize = className ? '14px' : '28px';
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
    if (type === 'bot' && !open) {
      bubble.classList.add('has-unread');
    }
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
    if (typingEl) {
      typingEl.remove();
      typingEl = null;
    }
    if (!show) return;
    typingEl = el('div', 'gigi-typing');
    typingEl.appendChild(el('span'));
    typingEl.appendChild(el('span'));
    typingEl.appendChild(el('span'));
    messagesEl.appendChild(typingEl);
    scrollMessages();
  }

  function renderQuickActions() {
    var wrap = el('div', 'gigi-chips');
    QUICK_ACTIONS.forEach(function (qa) {
      var chip = el('button', 'gigi-chip', qa.label);
      chip.type = 'button';
      chip.onclick = function () {
        if (qa.action === 'calendar') {
          openCalendar();
        } else if (qa.message) {
          sendUserMessage(qa.message);
        }
      };
      wrap.appendChild(chip);
    });
    messagesEl.appendChild(wrap);
    scrollMessages();
  }

  function showGreetingIfNeeded() {
    ensureMessages();
    if (state.hasSeenGreeting && state.messages.length > 0) {
      state.messages.forEach(renderMessage);
      scrollMessages();
      return;
    }
    state.hasSeenGreeting = true;
    saveState();
    appendMessage('bot', GREETING);
    renderQuickActions();
  }

  function sendUserMessage(text) {
    var trimmed = (text || '').trim();
    if (!trimmed) return;
    appendMessage('user', trimmed);
    inputEl.value = '';
    sendBtn.disabled = true;
    showTyping(true);

    saveState();
    fetch(apiUrl('/api/chatbot/message'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: state.sessionId,
        message: trimmed,
        previousChatId: state.vapiChatId || undefined,
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
        if (data.chatId) {
          state.vapiChatId = data.chatId;
          saveState();
        }
        appendMessage('bot', data.reply || '');
        if (data.action === 'show_calendar' || /\b(book|schedule)\b/i.test(data.reply || '')) {
          openCalendar();
        }
      })
      .catch(function (err) {
        showTyping(false);
        appendMessage('bot', err.message || 'Sorry, something went wrong. Please try again or call (253) 400-4479.');
      })
      .finally(function () {
        sendBtn.disabled = false;
        inputEl.focus();
      });
  }

  function openCalendar() {
    calendarState = {
      step: 0,
      appointmentType: '',
      providerId: '',
      weekStart: todayStr(),
      date: '',
      time: '',
      availability: {},
      childName: '',
      childDob: '',
      parentName: '',
      parentPhone: '',
      parentEmail: '',
      isNewPatient: false,
    };
    renderCalendarCard();
  }

  function renderCalendarCard() {
    var existing = document.getElementById('gigi-calendar-card');
    if (existing) existing.remove();

    var card = el('div', 'gigi-cal-card');
    card.id = 'gigi-calendar-card';

    var steps = el('div', 'gigi-cal-steps');
    for (var i = 0; i < 6; i++) {
      var dot = el('div', 'gigi-cal-dot' + (i === calendarState.step ? ' active' : i < calendarState.step ? ' done' : ''));
      steps.appendChild(dot);
    }
    card.appendChild(steps);

    var titles = [
      'What type of visit?',
      'Choose a provider',
      'Pick a date',
      'Pick a time',
      'Patient details',
      'Confirmed!',
    ];
    card.appendChild(el('div', 'gigi-cal-title', titles[calendarState.step] || ''));

    if (calendarState.step === 0) renderStepType(card);
    else if (calendarState.step === 1) renderStepProvider(card);
    else if (calendarState.step === 2) renderStepDate(card);
    else if (calendarState.step === 3) renderStepTime(card);
    else if (calendarState.step === 4) renderStepDetails(card);
    else if (calendarState.step === 5) renderStepConfirm(card);

    messagesEl.appendChild(card);
    scrollMessages();
  }

  function calBack() {
    if (calendarState.step > 0) {
      calendarState.step -= 1;
      renderCalendarCard();
    }
  }

  function calNext() {
    calendarState.step += 1;
    renderCalendarCard();
  }

  function renderStepType(card) {
    var grid = el('div', 'gigi-cal-grid');
    APPT_TYPES.forEach(function (t) {
      var btn = el('button', 'gigi-cal-option' + (calendarState.appointmentType === t.id ? ' selected' : ''), t.label);
      btn.type = 'button';
      btn.onclick = function () {
        calendarState.appointmentType = t.id;
        calNext();
      };
      grid.appendChild(btn);
    });
    card.appendChild(grid);
  }

  function renderStepProvider(card) {
    var grid = el('div', 'gigi-cal-grid');
    PROVIDERS.forEach(function (p) {
      var btn = el('button', 'gigi-cal-option' + (calendarState.providerId === p.id ? ' selected' : ''), p.label);
      btn.type = 'button';
      btn.onclick = function () {
        calendarState.providerId = p.id;
        calNext();
      };
      grid.appendChild(btn);
    });
    addBackButton(card);
  }

  function fetchWeekAvailability() {
    var params = new URLSearchParams({
      date: calendarState.weekStart,
      range: '7',
      duration: '30',
    });
    if (calendarState.providerId && calendarState.providerId !== 'no-preference') {
      var prov = PROVIDERS.find(function (p) { return p.id === calendarState.providerId; });
      if (prov && prov.id === 'dr-tamas') params.set('provider', 'Dr. Jonathan Tamas');
      if (prov && prov.id === 'dr-richards') params.set('provider', 'Dr. Peaches Richards');
    }
    return fetch(apiUrl('/api/chatbot/availability?' + params.toString()))
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var days = data.days || [data];
        days.forEach(function (d) {
          calendarState.availability[d.date] = d.availableSlots || [];
        });
        return days;
      });
  }

  function renderStepDate(card) {
    var nav = el('div', 'gigi-cal-nav');
    var prev = el('button', null, '←');
    prev.type = 'button';
    prev.onclick = function () {
      calendarState.weekStart = addDays(calendarState.weekStart, -7);
      loadDates();
    };
    var next = el('button', null, '→');
    next.type = 'button';
    next.onclick = function () {
      calendarState.weekStart = addDays(calendarState.weekStart, 7);
      loadDates();
    };
    nav.appendChild(prev);
    nav.appendChild(el('span', null, 'Select a day'));
    nav.appendChild(next);
    card.appendChild(nav);

    var strip = el('div', 'gigi-week-strip');
    strip.id = 'gigi-week-strip';
    card.appendChild(strip);
    addBackButton(card);
    loadDates();
  }

  function loadDates() {
    var strip = document.getElementById('gigi-week-strip');
    if (!strip) return;
    strip.textContent = 'Loading…';
    fetchWeekAvailability().then(function (days) {
      strip.innerHTML = '';
      days.forEach(function (d) {
        var slots = d.availableSlots || [];
        var btn = el('button', 'gigi-day-btn' + (calendarState.date === d.date ? ' selected' : ''), '');
        btn.type = 'button';
        btn.appendChild(el('div', null, dayLabel(d.date)));
        btn.appendChild(el('div', 'dot', slots.length ? '● ' + slots.length + ' slots' : '○ none'));
        btn.disabled = slots.length === 0;
        btn.onclick = function () {
          calendarState.date = d.date;
          calendarState.time = '';
          calNext();
        };
        strip.appendChild(btn);
      });
    }).catch(function () {
      strip.textContent = 'Could not load availability.';
    });
  }

  function renderStepTime(card) {
    var dayData = calendarState.availability[calendarState.date];
    if (!dayData) {
      fetchWeekAvailability().then(function () {
        renderCalendarCard();
      });
      card.appendChild(el('div', null, 'Loading times…'));
      addBackButton(card);
      return;
    }

    var morning = [];
    var afternoon = [];
    dayData.forEach(function (slot) {
      var hour = parseInt(slot.startTime.split(':')[0], 10);
      if (hour < 12) morning.push(slot);
      else afternoon.push(slot);
    });

    function renderGroup(label, slots) {
      if (!slots.length) return;
      var group = el('div', 'gigi-time-group');
      group.appendChild(el('div', 'gigi-time-label', label));
      var pills = el('div', 'gigi-time-pills');
      slots.forEach(function (slot) {
        var pill = el('button', 'gigi-time-pill' + (calendarState.time === slot.startTime ? ' selected' : ''), to12Hour(slot.startTime));
        pill.type = 'button';
        pill.onclick = function () {
          calendarState.time = slot.startTime;
          calNext();
        };
        pills.appendChild(pill);
      });
      group.appendChild(pills);
      card.appendChild(group);
    }

    renderGroup('Morning', morning);
    renderGroup('Afternoon', afternoon);
    if (!morning.length && !afternoon.length) {
      card.appendChild(el('div', null, 'No times available this day.'));
    }
    addBackButton(card);
  }

  function renderStepDetails(card) {
    var hp = el('input');
    hp.type = 'text';
    hp.name = 'website';
    hp.className = 'gigi-hp';
    hp.tabIndex = -1;
    hp.autocomplete = 'off';
    card.appendChild(hp);

    function field(label, key, type) {
      var wrap = el('div', 'gigi-field');
      wrap.appendChild(el('label', null, label));
      var input = el('input');
      if (type) input.type = type;
      input.value = calendarState[key] || '';
      input.oninput = function () { calendarState[key] = input.value; };
      wrap.appendChild(input);
      return wrap;
    }

    card.appendChild(field("Child's name", 'childName'));
    card.appendChild(field("Child's date of birth", 'childDob', 'date'));
    card.appendChild(field('Parent / guardian name', 'parentName'));
    card.appendChild(field('Parent phone', 'parentPhone', 'tel'));
    card.appendChild(field('Parent email (optional)', 'parentEmail', 'email'));

    var checkWrap = el('div', 'gigi-field');
    var checkLabel = el('label');
    var check = document.createElement('input');
    check.type = 'checkbox';
    check.checked = calendarState.isNewPatient;
    check.onchange = function () { calendarState.isNewPatient = check.checked; };
    checkLabel.appendChild(check);
    checkLabel.appendChild(document.createTextNode(' This is a new patient'));
    checkWrap.appendChild(checkLabel);
    card.appendChild(checkWrap);

    var actions = el('div', 'gigi-cal-actions');
    var back = el('button', 'gigi-btn ghost', 'Back');
    back.type = 'button';
    back.onclick = calBack;
    var submit = el('button', 'gigi-btn primary', 'Book Appointment');
    submit.type = 'button';
    submit.onclick = function () {
      submit.disabled = true;
      submit.textContent = 'Booking…';
      fetch(apiUrl('/api/chatbot/book'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentType: calendarState.appointmentType,
          providerId: calendarState.providerId,
          date: calendarState.date,
          time: calendarState.time,
          childName: calendarState.childName,
          childDob: calendarState.childDob,
          parentName: calendarState.parentName,
          parentPhone: calendarState.parentPhone,
          parentEmail: calendarState.parentEmail || undefined,
          isNewPatient: calendarState.isNewPatient,
          sessionId: state.sessionId,
          honeypot: hp.value,
        }),
      })
        .then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.error || 'Booking failed'); return d; }); })
        .then(function (data) {
          calendarState.confirmation = data.confirmation;
          calNext();
          var c = data.confirmation;
          appendMessage('bot', '✅ Booked! ' + c.dateLabel + ' at ' + c.time + ' with ' + c.provider + '.');
        })
        .catch(function (err) {
          alert(err.message || 'Booking failed');
          submit.disabled = false;
          submit.textContent = 'Book Appointment';
        });
    };
    actions.appendChild(back);
    actions.appendChild(submit);
    card.appendChild(actions);
  }

  function renderStepConfirm(card) {
    var c = calendarState.confirmation;
    var box = el('div', 'gigi-confirm');
    box.appendChild(el('div', 'check', '✅'));
    if (c) {
      box.appendChild(el('div', null, c.patientName));
      box.appendChild(el('div', null, c.dateLabel + ' at ' + c.time));
      box.appendChild(el('div', null, c.provider));
    }
    card.appendChild(box);

    var actions = el('div', 'gigi-cal-actions');
    var again = el('button', 'gigi-btn ghost', 'Book Another');
    again.type = 'button';
    again.onclick = openCalendar;
    var close = el('button', 'gigi-btn primary', 'Close');
    close.type = 'button';
    close.onclick = function () {
      var cardEl = document.getElementById('gigi-calendar-card');
      if (cardEl) cardEl.remove();
    };
    actions.appendChild(again);
    actions.appendChild(close);
    card.appendChild(actions);
  }

  function addBackButton(card) {
    var back = el('button', 'gigi-btn ghost', 'Back');
    back.type = 'button';
    back.style.marginTop = '12px';
    back.onclick = calBack;
    card.appendChild(back);
  }

  function renderLockedTab(container) {
    container.innerHTML = '';
    var box = el('div', 'gigi-locked-panel');
    box.appendChild(el('h3', null, '🔒 Secure Patient Messaging'));
    box.appendChild(
      el(
        'p',
        null,
        "This feature is coming soon. Soon you'll be able to securely message your provider here. For now, call (253) 400-4479 or ask GIGI!"
      )
    );
    container.appendChild(box);
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
      if (msgView) {
        msgView.style.display = '';
        renderLockedTab(msgView);
      }
      if (footer) footer.style.display = 'none';
    }
  }

  function togglePanel() {
    open = !open;
    panel.classList.toggle('open', open);
    if (open) {
      bubble.classList.remove('has-unread');
      showGreetingIfNeeded();
      inputEl.focus();
    }
  }

  function mountWidget() {
    if (!apiBase) {
      console.warn('[GIGI] data-api-url is required on the script tag.');
      return;
    }

    if (!state.sessionId) state.sessionId = uuid();
    saveState();

    injectStyles();

    root = el('div');
    root.id = 'gigi-chatbot-root';

    bubble = el('button');
    bubble.id = 'gigi-bubble';
    bubble.className = 'gigi-animate gigi-pulse';
    bubble.setAttribute('aria-label', 'Chat with GIGI');
    bubble.onclick = togglePanel;

    var badge = el('span', 'gigi-badge');
    bubble.appendChild(avatarImg());
    bubble.appendChild(badge);

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
    var tabMsg = el('button', 'gigi-tab locked', 'Messaging 🔒');
    tabMsg.type = 'button';
    tabMsg.setAttribute('data-tab', 'messaging');
    tabMsg.onclick = function () { switchTab('messaging'); };
    tabs.appendChild(tabGigi);
    tabs.appendChild(tabMsg);
    panel.appendChild(tabs);

    var gigiView = el('div', 'gigi-body');
    gigiView.id = 'gigi-tab-gigi';
    messagesEl = gigiView;
    panel.appendChild(gigiView);

    var msgView = el('div', 'gigi-body');
    msgView.id = 'gigi-tab-messaging';
    msgView.style.display = 'none';
    panel.appendChild(msgView);

    var footer = el('div', 'gigi-footer');
    inputEl = el('textarea', 'gigi-input');
    inputEl.placeholder = 'Type a message…';
    inputEl.rows = 1;
    inputEl.onkeydown = function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendUserMessage(inputEl.value);
      }
    };

    sendBtn = el('button', 'gigi-send', '→');
    sendBtn.type = 'button';
    sendBtn.onclick = function () { sendUserMessage(inputEl.value); };

    footer.appendChild(inputEl);
    footer.appendChild(sendBtn);
    footer.className = 'gigi-footer';
    panel.appendChild(footer);

    root.appendChild(bubble);
    root.appendChild(panel);
    document.body.appendChild(root);

    setTimeout(function () {
      bubble.classList.remove('gigi-pulse');
    }, 10000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountWidget);
  } else {
    mountWidget();
  }
})();
