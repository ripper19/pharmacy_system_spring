// Differential Diagnosis — frontend page logic.
// Talks to POST /diagnosis/differential (Spring proxies the local dx shim).
// Stateless multi-turn: every send re-submits the accumulated transcript;
// assistant follow-up questions are echoed back verbatim (with their hidden
// [code:…] markers) so the engine knows what has already been asked.

const AVATAR_ASSISTANT =
    '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>';
const AVATAR_USER =
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="3.6"/><path d="M4 20c0-3.6 3.6-6 8-6s8 2.4 8 6"/></svg>';

const LIKELIHOOD_COLORS = { HIGH: '#16a34a', MEDIUM: '#d97706', LOW: '#64748b' };
const dxTranscript = [];   // raw lines: user inputs + echoed follow-up questions
let busy = false;

// ===== Auth + role gate (mirrors staff.js / dash.js) =====
async function loadUserData() {
    const user = localStorage.getItem('user');
    if (!user) {
        localStorage.clear();
        sessionStorage.clear();
        fetch(API_BASE + '/logout', { credentials: 'include', method: 'POST' }).catch(() => {});
        setTimeout(() => { window.location.href = 'index.html'; }, 1000);
        return;
    }
    await checkRole();
}

async function checkRole() {
    try {
        const res = await fetch(API_BASE + '/auth/me', { credentials: 'include' });
        if (res.status === 401) { window.location.href = 'index.html'; return; }
        if (!res.ok) {
            localStorage.clear();
            sessionStorage.clear();
            setTimeout(() => { window.location.href = 'index.html'; }, 1000);
            return;
        }
        const { name, email: bemail, role } = await res.json();
        localStorage.removeItem('user');
        localStorage.setItem('user', JSON.stringify({ name, bemail, role }));

        document.getElementById('userName').textContent = name;
        document.getElementById('userRole').textContent = role;
        const initials = name.split(' ').map(w => (w[0] ? w[0].toUpperCase() : '')).join('');
        document.getElementById('userAvatar').textContent = initials;

        if (role !== 'ADMIN' && role !== 'SUPERADMIN') {
            PharmUI.toast('Not enough privileges', 'error');
            setTimeout(() => { window.location.href = 'dash.html'; }, 900);
        }
    } catch (e) {
        PharmUI.toast('Session check failed', 'error');
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = 'index.html';
    }
}

// ===== Chat UI =====
const messagesEl = () => document.getElementById('chatMessages');
const textarea = () => document.getElementById('chatTextarea');
const sendBtn = () => document.getElementById('chatSend');
const form = () => document.getElementById('chatForm');

function scrollToBottom() {
    const el = messagesEl();
    el.scrollTop = el.scrollHeight;
}

function appendMessage(role, text) {
    const wrap = document.createElement('div');
    wrap.className = 'chat-msg chat-msg-' + role;

    const avatar = document.createElement('div');
    avatar.className = 'chat-avatar' + (role === 'user' ? ' user' : '');
    avatar.setAttribute('aria-hidden', 'true');
    avatar.innerHTML = role === 'user' ? AVATAR_USER : AVATAR_ASSISTANT;

    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble';
    bubble.textContent = text;

    wrap.append(avatar, bubble);
    messagesEl().appendChild(wrap);
    scrollToBottom();
    return wrap;
}

function appendTyping() {
    const wrap = document.createElement('div');
    wrap.className = 'chat-msg chat-msg-assistant';

    const avatar = document.createElement('div');
    avatar.className = 'chat-avatar';
    avatar.setAttribute('aria-hidden', 'true');
    avatar.innerHTML = AVATAR_ASSISTANT;

    const typing = document.createElement('div');
    typing.className = 'chat-typing';
    typing.setAttribute('aria-label', 'Assistant is typing');
    typing.innerHTML = '<span></span><span></span><span></span>';

    wrap.append(avatar, typing);
    messagesEl().appendChild(wrap);
    scrollToBottom();
    return wrap;
}

function renderIntro() {
    const intro = document.createElement('div');
    intro.className = 'chat-intro';
    intro.innerHTML =
        '<div class="chat-intro-icon">' + AVATAR_ASSISTANT + '</div>' +
        '<h3>Differential Diagnosis assistant</h3>' +
        '<p>Describe a patient\'s symptoms and context. Ranked differentials and red flags will appear here once the diagnosis engine is connected.</p>';
    messagesEl().appendChild(intro);
}

function setBusy(b) {
    busy = b;
    sendBtn().disabled = b || textarea().value.trim() === '';
}

function stripMarker(text) {
    return (text || '').replace(/\s*\[code:[^\]]+\]/g, '');
}

function renderDifferential(data) {
    if (data.followUpQuestion) {
        appendMessage('assistant', stripMarker(data.followUpQuestion));
        return;
    }
    if ((data.status === 'abstain') && (!data.differentials || data.differentials.length === 0)) {
        const reasons = (data.abstainReasons || []).map(r => '• ' + r).join('\n');
        appendMessage('assistant', "I can't narrow this down responsibly yet.\n" + reasons +
            "\n\nAdd more details about how you feel.");
        return;
    }

    if (data.needsUrgentCare) {
        const urgent = document.createElement('div');
        urgent.className = 'chat-urgent';
        urgent.innerHTML = '<strong>⚠ Urgent — refer now.</strong> ' +
            (data.redFlags || []).map(stripMarker).join(' · ');
        messagesEl().appendChild(urgent);
    } else if ((data.redFlags || []).length) {
        const warn = document.createElement('div');
        warn.className = 'chat-warn';
        warn.textContent = '⚠ Red flags: ' + data.redFlags.map(stripMarker).join(' · ');
        messagesEl().appendChild(warn);
    }

    (data.differentials || []).forEach(d => {
        const name = d.conditionName || d.condition || '?';
        const pct = d.probability != null ? Math.round(d.probability * 100) + '%' : '';
        const lik = d.likelihood || '';
        const color = LIKELIHOOD_COLORS[lik] || '#64748b';
        const wrap = document.createElement('div');
        wrap.className = 'chat-msg chat-msg-assistant';
        wrap.innerHTML =
            '<div class="chat-avatar">' + AVATAR_ASSISTANT + '</div>' +
            '<div class="chat-bubble">' +
            '<div style="display:flex;justify-content:space-between;gap:12px;align-items:baseline;">' +
            '<strong>' + name + '</strong>' +
            '<span style="color:' + color + ';font-weight:600;white-space:nowrap;">' + pct +
            (lik ? ' · ' + lik : '') + '</span></div>' +
            (d.reasoning ? '<div style="margin-top:6px;font-size:.92em;">' + d.reasoning + '</div>' : '') +
            ((d.suggestedActions || []).length ?
                '<div style="margin-top:6px;"><em>Do:</em> ' + d.suggestedActions.join('; ') + '</div>' : '') +
            ((d.suggestedMedicines || []).length ?
                '<div style="margin-top:2px;"><em>Consider:</em> ' + d.suggestedMedicines.join('; ') + '</div>' : '') +
            '</div>';
        messagesEl().appendChild(wrap);
    });

    if (data.disclaimer) {
        const disc = document.createElement('div');
        disc.className = 'chat-disclaimer-inline';
        disc.style.cssText = 'font-size:.8em;opacity:.75;margin:8px 0 0 44px;';
        disc.textContent = data.disclaimer;
        messagesEl().appendChild(disc);
    }
    scrollToBottom();
}

async function send(text) {
    if (busy) return;

    const intro = messagesEl().querySelector('.chat-intro');
    if (intro) intro.remove();

    appendMessage('user', text);
    dxTranscript.push(text);
    setBusy(true);

    const typing = appendTyping();
    try {
        const res = await fetch(API_BASE + '/diagnosis/differential', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ symptoms: dxTranscript.join('\n') })
        });
        typing.remove();
        if (!res.ok) {
            appendMessage('assistant',
                'The diagnosis engine is unreachable right now (' + res.status +
                '). It may still be starting — try again in a moment.');
        } else {
            const data = await res.json();
            if (data.followUpQuestion) dxTranscript.push(data.followUpQuestion); // echo w/ marker
            renderDifferential(data);
        }
    } catch (e) {
        typing.remove();
        appendMessage('assistant', 'Network error reaching the diagnosis engine. Is the local service running?');
    }

    setBusy(false);
    textarea().focus();
}

function autoGrow() {
    const ta = textarea();
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 140) + 'px';
}

document.addEventListener('DOMContentLoaded', function () {
    loadUserData();
    renderIntro();

    // Mic dictation (Web Speech API — Chrome/Edge; requires HTTPS or localhost)
    const micBtn = document.getElementById('chatMic');
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR && micBtn) {
        micBtn.hidden = false;
        let rec = null;
        micBtn.addEventListener('click', function () {
            if (rec) { rec.stop(); return; }
            rec = new SR();
            rec.lang = 'en-US'; rec.interimResults = false; rec.continuous = true;
            rec.onresult = function (e) {
                for (let i = e.resultIndex; i < e.results.length; i++) {
                    if (e.results[i].isFinal) {
                        textarea().value = (textarea().value + ' ' + e.results[i][0].transcript).trim();
                        autoGrow();
                        sendBtn().disabled = busy || textarea().value.trim() === '';
                    }
                }
            };
            rec.onend = function () { rec = null; micBtn.classList.remove('listening'); };
            rec.onerror = function () { rec = null; micBtn.classList.remove('listening'); };
            micBtn.classList.add('listening');
            rec.start();
        });
    }

    // Send on Enter, newline on Shift+Enter.
    textarea().addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            form().requestSubmit();
        }
    });

    textarea().addEventListener('input', function () {
        autoGrow();
        sendBtn().disabled = busy || this.value.trim() === '';
    });

    form().addEventListener('submit', function (e) {
        e.preventDefault();
        const text = textarea().value.trim();
        if (!text || sendBtn().disabled) return;
        textarea().value = '';
        autoGrow();
        send(text);
    });

    sendBtn().disabled = true;
});
