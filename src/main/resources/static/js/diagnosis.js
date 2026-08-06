// Differential Diagnosis — frontend page logic.
//
// This is a PLACEHOLDER: the chat surface is wired up so the experience is
// fully usable and styled, but it does NOT yet call the backend. Once the
// diagnosis engine is fully implemented, send() will POST to
//   API_BASE + '/diagnosis/differential'
// and render the returned ranked differentials, red flags and disclaimer.

const AVATAR_ASSISTANT =
    '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>';
const AVATAR_USER =
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="3.6"/><path d="M4 20c0-3.6 3.6-6 8-6s8 2.4 8 6"/></svg>';

const PLACEHOLDER_REPLY =
    "Thanks for the details. The diagnosis engine isn't connected yet — this chat is a preview of what's coming.\n\n" +
    "Once the backend is fully implemented, your message will be sent to the differential-diagnosis service and you'll get back ranked differentials, red flags and a disclaimer here.";

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

async function send(text) {
    if (busy) return;

    const intro = messagesEl().querySelector('.chat-intro');
    if (intro) intro.remove();

    appendMessage('user', text);
    setBusy(true);

    const typing = appendTyping();

    // PLACEHOLDER: simulate assistant think-time, then a fixed reply.
    // Replace this block with a real fetch to /diagnosis/differential later:
    //   const res = await fetch(API_BASE + '/diagnosis/differential', {
    //       method: 'POST', credentials: 'include',
    //       headers: { 'Content-Type': 'application/json' },
    //       body: JSON.stringify({ symptoms, age, sex, duration, notes })
    //   });
    await new Promise(r => setTimeout(r, 1100));
    typing.remove();
    appendMessage('assistant', PLACEHOLDER_REPLY);

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
