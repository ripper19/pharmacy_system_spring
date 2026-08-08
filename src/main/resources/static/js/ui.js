// Shared UI bootstrap: sidebar collapse + instant user hydration from the
// localStorage buffer. The page script still calls /auth/me on load to
// validate the session and refresh these values.
//
// Also exposes window.PharmUI: toast notifications, accessible dialogs
// (confirm/info) and inline form validation, replacing browser
// alert()/confirm() across the app. Styles live in css/base.css.

window.htmlEncode = (function () {
    const div = document.createElement('div');
    return function (str) { div.textContent = String(str ?? ''); return div.innerHTML; };
})();

(function () {
    const KEY = 'sidebarCollapsed';

    function apply(collapsed) {
        document.body.classList.toggle('sidebar-collapsed', collapsed);
    }

    // Paint the cached credentials immediately so the sidebar doesn't flash
    // blank while /auth/me is in flight.
    function hydrateUser() {
        let cached;
        try {
            cached = JSON.parse(localStorage.getItem('user'));
        } catch (e) {
            return;
        }
        if (!cached || !cached.name) return;

        const nameEl = document.getElementById('userName');
        const roleEl = document.getElementById('userRole');
        const avatarEl = document.getElementById('userAvatar');

        if (nameEl) nameEl.textContent = cached.name;
        if (roleEl) roleEl.textContent = cached.role || '';
        if (avatarEl) {
            avatarEl.textContent = cached.name
                .split(' ')
                .map(w => (w[0] ? w[0].toUpperCase() : ''))
                .join('');
        }
    }

    // Reveal admin-only nav items (e.g. Diagnosis) for ADMIN/SUPERADMIN.
    // Reads the cached role set at login; page scripts refresh it via /auth/me.
    function applyRoleGating() {
        let cached;
        try { cached = JSON.parse(localStorage.getItem('user')); } catch (e) { cached = null; }
        const role = cached && cached.role;
        if (role === 'ADMIN' || role === 'SUPERADMIN') {
            document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('admin-only'));
        }
    }

    function init() {
        apply(localStorage.getItem(KEY) === '1');
        hydrateUser();
        applyRoleGating();
    }

    // Exposed for the navbar toggle button's onclick.
    window.toggleSidebarCollapse = function () {
        const collapsed = !document.body.classList.contains('sidebar-collapsed');
        apply(collapsed);
        localStorage.setItem(KEY, collapsed ? '1' : '0');
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

// ===== PharmUI: toasts, dialogs, validation =====
window.PharmUI = (function () {

    // ---- Inline SVG icon set (stroke, currentColor) ----
    const ICONS = {
        info: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>',
        success: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8.5 12.2l2.4 2.4 4.6-5"/></svg>',
        warning: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>',
        error: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/></svg>',
        box: '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8l-9-5-9 5v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/></svg>',
        cart: '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="20" r="1.6"/><circle cx="17" cy="20" r="1.6"/><path d="M3 4h2l2.4 12h10.4l2-8H6"/></svg>',
        pill: '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><g transform="rotate(-45 12 12)"><rect x="3" y="8" width="18" height="8" rx="4"/><line x1="12" y1="8" x2="12" y2="16"/></g></svg>',
        users: '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.5"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 14.5c1.9.9 3 2.6 3 5.5"/></svg>',
        chart: '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h16"/><path d="M7 16v-5M12 16V7M17 16v-8"/></svg>',
        check: '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8.5 12.2l2.4 2.4 4.6-5"/></svg>'
    };

    // ---- Toasts ----
    function toastRegion() {
        let region = document.querySelector('.ui-toast-region');
        if (!region) {
            region = document.createElement('div');
            region.className = 'ui-toast-region';
            region.setAttribute('role', 'status');
            region.setAttribute('aria-live', 'polite');
            document.body.appendChild(region);
        }
        return region;
    }

    /**
     * Show a toast notification.
     * @param {string} message
     * @param {'info'|'success'|'error'|'warning'} [type]
     * @param {number} [timeout] ms before auto-dismiss (0 = sticky)
     */
    function toast(message, type = 'info', timeout = 4000) {
        const el = document.createElement('div');
        el.className = `ui-toast ${type}`;
        const icon = document.createElement('span');
        icon.className = 'ui-toast-icon';
        icon.setAttribute('aria-hidden', 'true');
        icon.innerHTML = ICONS[type] || ICONS.info;
        const msg = document.createElement('span');
        msg.className = 'ui-toast-msg';
        msg.textContent = message;
        const close = document.createElement('button');
        close.className = 'ui-toast-close';
        close.setAttribute('aria-label', 'Dismiss notification');
        close.textContent = '×';
        close.onclick = () => el.remove();
        el.append(icon, msg, close);
        toastRegion().appendChild(el);
        if (timeout > 0) setTimeout(() => el.remove(), timeout);
        return el;
    }

    // ---- Dialogs ----
    const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

    /**
     * Generic accessible dialog. Returns a promise resolving to the value of
     * the clicked button. Escape / backdrop click resolve with `dismissValue`.
     * @param {{title?: string, message?: string, html?: string,
     *          buttons?: Array<{label: string, value: any, variant?: string}>,
     *          dismissValue?: any}} opts
     */
    function dialog(opts = {}) {
        return new Promise(resolve => {
            const previouslyFocused = document.activeElement;
            const overlay = document.createElement('div');
            overlay.className = 'ui-dialog-overlay';

            const box = document.createElement('div');
            box.className = 'ui-dialog';
            box.setAttribute('role', 'dialog');
            box.setAttribute('aria-modal', 'true');

            if (opts.title) {
                const h = document.createElement('h3');
                h.id = 'uiDialogTitle';
                if (opts.dangerIcon) {
                    const warn = document.createElement('span');
                    warn.className = 'ui-dialog-warn';
                    warn.setAttribute('aria-hidden', 'true');
                    warn.innerHTML = ICONS.warning;
                    h.appendChild(warn);
                }
                h.appendChild(document.createTextNode(opts.title));
                box.setAttribute('aria-labelledby', h.id);
                box.appendChild(h);
            }

            const body = document.createElement('div');
            body.className = 'ui-dialog-body';
            if (opts.html) body.innerHTML = opts.html;
            else body.textContent = opts.message || '';
            box.appendChild(body);

            const actions = document.createElement('div');
            actions.className = 'ui-dialog-actions';
            const buttons = opts.buttons || [{ label: 'OK', value: true, variant: 'primary' }];

            function done(value) {
                document.removeEventListener('keydown', onKey, true);
                overlay.remove();
                if (previouslyFocused && previouslyFocused.focus) previouslyFocused.focus();
                resolve(value);
            }

            buttons.forEach(b => {
                const btn = document.createElement('button');
                btn.textContent = b.label;
                btn.className =
                    b.variant === 'danger' ? 'primary-btn btn-danger' :
                    b.variant === 'secondary' ? 'secondary-btn' : 'primary-btn';
                btn.onclick = () => done(b.value);
                actions.appendChild(btn);
            });
            box.appendChild(actions);
            overlay.appendChild(box);

            function onKey(e) {
                if (e.key === 'Escape') {
                    e.stopPropagation();
                    done(opts.dismissValue);
                } else if (e.key === 'Tab') {
                    // Focus trap
                    const focusable = box.querySelectorAll(FOCUSABLE);
                    if (!focusable.length) return;
                    const first = focusable[0];
                    const last = focusable[focusable.length - 1];
                    if (e.shiftKey && document.activeElement === first) {
                        e.preventDefault();
                        last.focus();
                    } else if (!e.shiftKey && document.activeElement === last) {
                        e.preventDefault();
                        first.focus();
                    }
                }
            }

            overlay.addEventListener('mousedown', e => {
                if (e.target === overlay) done(opts.dismissValue);
            });
            document.addEventListener('keydown', onKey, true);
            document.body.appendChild(overlay);

            // Focus the last (primary) button by default.
            const focusable = box.querySelectorAll(FOCUSABLE);
            if (focusable.length) focusable[focusable.length - 1].focus();
        });
    }

    /**
     * Styled confirm. Resolves true/false.
     * @param {{title?: string, message?: string, confirmText?: string,
     *          cancelText?: string, danger?: boolean}} opts
     */
    function confirm(opts = {}) {
        return dialog({
            title: opts.title || 'Are you sure?',
            message: opts.message || '',
            dismissValue: false,
            dangerIcon: !!opts.danger,
            buttons: [
                { label: opts.cancelText || 'Cancel', value: false, variant: 'secondary' },
                { label: opts.confirmText || 'Confirm', value: true, variant: opts.danger ? 'danger' : 'primary' }
            ]
        });
    }

    /** Styled replacement for alert(). */
    function info(opts = {}) {
        return dialog({
            title: opts.title || '',
            message: opts.message,
            html: opts.html,
            dismissValue: true,
            buttons: [{ label: opts.okText || 'OK', value: true, variant: 'primary' }]
        });
    }

    // ---- Inline form validation ----
    function fieldWrap(input) {
        return input.closest('.form-group') || input.closest('.field') || input.parentElement;
    }

    function clearFieldError(input) {
        input.removeAttribute('aria-invalid');
        const wrap = fieldWrap(input);
        const err = wrap && wrap.querySelector('.field-error');
        if (err) err.remove();
    }

    function setFieldError(input, message) {
        const wrap = fieldWrap(input);
        if (!wrap) return;
        input.setAttribute('aria-invalid', 'true');
        let err = wrap.querySelector('.field-error');
        if (!err) {
            err = document.createElement('div');
            err.className = 'field-error';
            err.setAttribute('role', 'alert');
            wrap.appendChild(err);
        }
        err.textContent = message;
    }

    function checkField(input) {
        if (input.disabled || input.readOnly) return true;
        if (typeof input.checkValidity === 'function' && !input.checkValidity()) {
            setFieldError(input, input.validationMessage);
            return false;
        }
        clearFieldError(input);
        return true;
    }

    /**
     * Validate every input/select/textarea inside `container` (element or
     * selector). Shows inline errors, focuses the first invalid field.
     * Works for <form> elements and plain divs alike.
     * @returns {boolean} true when everything is valid
     */
    function validate(container) {
        const root = typeof container === 'string' ? document.querySelector(container) : container;
        if (!root) return true;
        let firstBad = null;
        root.querySelectorAll('input, select, textarea').forEach(input => {
            if (!checkField(input) && !firstBad) firstBad = input;
        });
        if (firstBad) firstBad.focus();
        return !firstBad;
    }

    /** Attach blur/input listeners for live inline validation. */
    function attachLiveValidation(container) {
        const root = typeof container === 'string' ? document.querySelector(container) : container;
        if (!root) return;
        root.addEventListener('blur', e => {
            if (e.target.matches('input, select, textarea')) checkField(e.target);
        }, true);
        root.addEventListener('input', e => {
            if (e.target.matches('input, select, textarea') &&
                e.target.getAttribute('aria-invalid') === 'true') {
                checkField(e.target);
            }
        });
    }

    // ---- Skeleton loaders + empty states ----

    /**
     * Shimmer skeleton rows for a table while data is in flight.
     * @param {number} cols column count
     * @param {number} [rows] shimmer rows (default 4)
     * @returns {string} HTML for use as tbody innerHTML
     */
    function skeletonRows(cols, rows = 4) {
        let html = '';
        for (let r = 0; r < rows; r++) {
            html += '<tr class="ui-skeleton-row">';
            for (let c = 0; c < cols; c++) {
                const w = [70, 45, 60, 55][(r + c) % 4];
                html += `<td><span class="ui-skeleton" style="width:${w}%"></span></td>`;
            }
            html += '</tr>';
        }
        return html;
    }

    /**
     * Build an empty-state element: tint icon tile, title, message and an
     * optional call-to-action (link) or Retry button.
     * @param {{icon?: string, title?: string, message?: string,
     *          actionLabel?: string, actionHref?: string,
     *          onRetry?: function}} opts
     */
    function emptyState(opts = {}) {
        const wrap = document.createElement('div');
        wrap.className = 'ui-empty';

        const tile = document.createElement('div');
        tile.className = 'ui-empty-icon';
        tile.setAttribute('aria-hidden', 'true');
        tile.innerHTML = ICONS[opts.icon] || ICONS.box;
        wrap.appendChild(tile);

        const title = document.createElement('div');
        title.className = 'ui-empty-title';
        title.textContent = opts.title || 'Nothing here yet';
        wrap.appendChild(title);

        if (opts.message) {
            const msg = document.createElement('div');
            msg.className = 'ui-empty-msg';
            msg.textContent = opts.message;
            wrap.appendChild(msg);
        }

        if (opts.onRetry) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'primary-btn';
            btn.textContent = opts.actionLabel || 'Retry';
            btn.addEventListener('click', opts.onRetry);
            wrap.appendChild(btn);
        } else if (opts.actionLabel && opts.actionHref) {
            const a = document.createElement('a');
            a.className = 'primary-btn ui-empty-cta';
            a.href = opts.actionHref;
            a.textContent = opts.actionLabel;
            wrap.appendChild(a);
        }
        return wrap;
    }

    /**
     * Render an empty state inside a table body (colspan row).
     * Same opts as emptyState().
     */
    function tableEmpty(tbody, cols, opts = {}) {
        tbody.innerHTML = '';
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = cols;
        td.className = 'ui-empty-cell';
        td.appendChild(emptyState(opts));
        tr.appendChild(td);
        tbody.appendChild(tr);
    }

    /**
     * Race a promise against a timeout (ms). Rejects with Error('timeout').
     */
    function withTimeout(promise, ms = 8000) {
        return Promise.race([
            promise,
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))
        ]);
    }

    /**
     * Disable a button while an async action runs, then restore it.
     * Re-entry while busy is ignored (covers double-click AND Enter-key
     * re-submission, since a disabled submit button blocks implicit submit).
     * @param {HTMLButtonElement} btn
     * @param {string} [busyLabel]  e.g. 'Saving…' — omit to keep the label
     * @param {() => Promise<any>} action
     */
    async function guard(btn, busyLabel, action) {
        if (!btn || btn.disabled) return;
        const label = btn.textContent;
        btn.disabled = true;
        if (busyLabel) btn.textContent = busyLabel;
        try { await action(); }
        finally {
            btn.disabled = false;
            if (busyLabel) btn.textContent = label;
        }
    }

    /**
     * Render a pager (Prev / "Page X of Y · Z items" / Next) into `container`.
     * Clears the container first. No-op (renders nothing) when there is a
     * single page or fewer. Calls onPage(newPage) when a nav button is clicked.
     * @param {HTMLElement} container
     * @param {{page:number, totalPages:number, totalElements:number}} info
     * @param {(page:number)=>void} onPage
     */
    function pager(container, info, onPage) {
        if (!container) return;
        container.innerHTML = '';
        const page = (info && info.page) || 0;
        const totalPages = (info && info.totalPages) || 1;
        const totalElements = (info && info.totalElements) || 0;
        if (totalPages <= 1) return;

        const wrap = document.createElement('div');
        wrap.className = 'ui-pager';

        const prev = document.createElement('button');
        prev.type = 'button';
        prev.className = 'ui-pager-btn';
        prev.textContent = '‹ Prev';
        prev.disabled = page <= 0;
        prev.addEventListener('click', () => { if (page > 0) onPage(page - 1); });

        const inf = document.createElement('span');
        inf.className = 'ui-pager-info';
        inf.textContent = 'Page ' + (page + 1) + ' of ' + totalPages +
            ' · ' + totalElements + ' item' + (totalElements === 1 ? '' : 's');

        const next = document.createElement('button');
        next.type = 'button';
        next.className = 'ui-pager-btn';
        next.textContent = 'Next ›';
        next.disabled = page >= totalPages - 1;
        next.addEventListener('click', () => { if (page < totalPages - 1) onPage(page + 1); });

        wrap.append(prev, inf, next);
        container.appendChild(wrap);
    }

    /**
     * Render the right empty state after a fetch failure.
     *
     * A genuine connection issue — a client-side timeout or an HTTP 408 /
     * 5xx response — shows the "couldn't load, check your connection" retry
     * state. Anything else (no API linked / network failure / other HTTP
     * status / bad JSON) is treated as "no data to display" so the UI does
     * not cry wolf when the backend simply isn't running.
     *
     * @param {HTMLElement} tbody  table body to render into
     * @param {number} cols        column span for the empty row
     * @param {object} noData      opts for the no-data state (icon, title,
     *                             message, actionLabel?, actionHref?) plus
     *                             optional retryTitle / onRetry used only
     *                             when the failure is a genuine issue
     * @param {Error} [err]        caught error (network failure / timeout /
     *                             bad JSON). Pass null when `res` is given.
     * @param {Response} [res]     the Response object when !res.ok
     */
    function fetchEmpty(tbody, cols, noData, err, res) {
        let connection = false;
        if (res) {
            const s = res.status;
            connection = s === 408 || (s >= 500 && s <= 599);
        } else if (err && err.message === 'timeout') {
            connection = true;
        }
        if (connection) {
            tableEmpty(tbody, cols, {
                icon: 'warning',
                title: (noData && noData.retryTitle) || "Couldn't load data",
                message: 'Check your connection and try again.',
                actionLabel: 'Retry',
                onRetry: noData && noData.onRetry
            });
        } else {
            tableEmpty(tbody, cols, {
                icon: (noData && noData.icon) || 'box',
                title: (noData && noData.title) || 'No data to display',
                message: noData && noData.message,
                actionLabel: noData && noData.actionLabel,
                actionHref: noData && noData.actionHref
            });
        }
    }

    // ---- Sidebar menu badge (e.g. low-stock count on Inventory) ----
    function setMenuBadge(count) {
        const badge = document.getElementById('inventoryMenuBadge');
        if (!badge) return;
        const n = Number(count) || 0;
        badge.hidden = n <= 0;
        badge.textContent = n > 99 ? '99+' : String(n);
    }

    // ---- Notifications panel ----
    const notifications = (function () {
        let panel = null, badge = null, lastCount = 0, loaded = false;

        function ensurePanel() {
            if (panel) return panel;
            panel = document.createElement('div');
            panel.className = 'notif-panel';
            panel.setAttribute('role', 'dialog');
            panel.setAttribute('aria-label', 'Notifications');
            document.body.appendChild(panel);

            document.addEventListener('mousedown', e => {
                if (panel && !panel.contains(e.target) && !e.target.closest('[data-notif-btn]')) close();
            });
            document.addEventListener('keydown', e => {
                if (e.key === 'Escape') close();
            });
            return panel;
        }

        function ensureBadge() {
            if (badge) return badge;
            const btn = document.querySelector('[data-notif-btn]');
            if (!btn) return null;
            badge = document.createElement('span');
            badge.className = 'notif-badge';
            badge.hidden = true;
            btn.appendChild(badge);
            return badge;
        }

        function setBadge(n) {
            lastCount = n;
            const b = ensureBadge();
            if (!b) return;
            b.hidden = n <= 0;
            b.textContent = n > 99 ? '99+' : String(n);
            setMenuBadge(n);
        }

        function render(items, connectionIssue) {
            const p = ensurePanel();
            if (!items) {
                p.innerHTML = '';
                const head = document.createElement('div');
                head.className = 'notif-head';
                head.textContent = 'Notifications';
                p.appendChild(head);
                // Genuine connection issue (timeout / 408 / 5xx) → retry
                // state. No API linked / other failure → "all caught up".
                if (connectionIssue) {
                    p.appendChild(emptyState({
                        icon: 'warning',
                        title: "Couldn't load alerts",
                        message: 'Check your connection and try again.',
                        actionLabel: 'Retry',
                        onRetry: load
                    }));
                } else {
                    p.appendChild(emptyState({
                        icon: 'check',
                        title: 'All caught up',
                        message: 'No low-stock alerts right now.'
                    }));
                }
                return;
            }
            if (items.length === 0) {
                p.innerHTML = '<div class="notif-head">Notifications</div>';
                p.appendChild(emptyState({
                    icon: 'check',
                    title: 'All caught up',
                    message: 'No low-stock alerts right now.'
                }));
                return;
            }
            const rows = items.map(m => {
                const qty = m.quantity ?? 0;
                const out = qty <= 0;
                const level = out ? 'out' : 'low';
                const label = out ? 'Out of stock' : `${qty} left (min ${m.threshold ?? 0})`;
                return `<div class="notif-item">
                    <span class="notif-dot ${level}" aria-hidden="true"></span>
                    <div class="notif-item-body">
                        <strong>${htmlEncode(m.name || 'Unknown medicine')}</strong>
                        <span>${htmlEncode(label)}</span>
                    </div>
                </div>`;
            }).join('');
            p.innerHTML = `
                <div class="notif-head">Notifications
                    <span class="notif-count">${items.length} low-stock alert${items.length === 1 ? '' : 's'}</span>
                </div>
                <div class="notif-list">${rows}</div>
                <a class="notif-foot" href="inventory.html">View inventory →</a>`;
        }

        async function load() {
            const p = ensurePanel();
            if (p.classList.contains('open')) {
                p.innerHTML = '<div class="notif-head">Notifications</div><div class="notif-loading"><span class="spinner"></span>Checking stock levels…</div>';
            }
            let res;
            try {
                res = await withTimeout(fetch(`${API_BASE}/api/medicine/low-stock`, { credentials: 'include' }), 8000);
            } catch (e) {
                console.log('Notifications failed', e);
                if (!loaded) setBadge(0);
                // Client-side timeout = genuine connection issue; a network
                // failure (no API linked) is treated as "all caught up".
                render(null, e && e.message === 'timeout');
                return;
            }
            if (!res.ok) {
                const s = res.status;
                console.log('Notifications failed', 'status', s);
                if (!loaded) setBadge(0);
                render(null, s === 408 || (s >= 500 && s <= 599));
                return;
            }
            try {
                const data = await res.json();
                const items = Array.isArray(data) ? data : [];
                loaded = true;
                setBadge(items.length);
                render(items);
            } catch (e) {
                console.log('Notifications failed', e);
                if (!loaded) setBadge(0);
                render(null, false);
            }
        }

        function open() {
            ensurePanel().classList.add('open');
            load();
        }
        function close() {
            if (panel) panel.classList.remove('open');
        }
        function toggle() {
            if (panel && panel.classList.contains('open')) close();
            else open();
        }

        // Prime the badge shortly after load, then keep it fresh.
        function init() {
            ensureBadge();
            setTimeout(load, 1500);
            setInterval(load, 60000);
        }
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            init();
        }

        return { toggle, open, close, load, count: () => lastCount };
    })();

    // Keep the legacy onclick handlers working: every page's bell button
    // calls showNotifications().
    window.showNotifications = notifications.toggle;

    // ---- Global navbar search ----
    (function () {
        const input = document.querySelector('.search-bar input');
        if (!input) return;
        const bar = input.closest('.search-bar');
        if (bar) bar.setAttribute('role', 'search');
        input.addEventListener('keydown', e => {
            if (e.key !== 'Enter') return;
            const q = input.value.trim();
            if (!q) return;
            window.location.href = 'medicines.html?q=' + encodeURIComponent(q);
        });
        // "/" focuses search, mirroring common app behaviour.
        document.addEventListener('keydown', e => {
            if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
            const tag = (document.activeElement || {}).tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
            e.preventDefault();
            input.focus();
        });
    })();

    // ---- Global keyboard behaviour ----
    document.addEventListener('keydown', e => {
        if (e.key !== 'Escape') return;
        // Close mobile sidebar
        const sidebar = document.querySelector('.sidebar.active');
        if (sidebar) {
            sidebar.classList.remove('active');
            const overlay = document.querySelector('.sidebar-overlay');
            if (overlay) overlay.classList.remove('active');
            return;
        }
        // Close any open page modal (e.g. medicine types)
        document.querySelectorAll('.modal').forEach(m => {
            if (getComputedStyle(m).display !== 'none') m.style.display = 'none';
        });
    });

    return { toast, dialog, confirm, info, validate, attachLiveValidation, setFieldError, clearFieldError,
             skeletonRows, emptyState, tableEmpty, fetchEmpty, withTimeout, guard, pager, setMenuBadge, notifications };
})();
