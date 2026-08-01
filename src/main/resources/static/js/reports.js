const API_BASE = "https://pharmacy-system-spring-utt5.onrender.com";

// ---- Auth ----
async function loadUser() {
    const user = localStorage.getItem('user');
    if (!user) {
        localStorage.clear();
        sessionStorage.clear();

        fetch(`${API_BASE}/logout`, {
            credentials: 'include',
            method: 'POST'
        }).catch(() => {});

        setTimeout(() => { window.location.href = 'index.html'; }, 1000);
        return;
    }
    await checkRole();
}

async function checkRole() {
    try {
        const res = await fetch(`${API_BASE}/auth/me`, { credentials: 'include' });
        if (res.status === 401) {
            window.location.href = 'index.html';
            return;
        }
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
        const initials = name.split(" ").map(w => w[0].toUpperCase()).join("");
        document.getElementById('userAvatar').textContent = initials;
    } catch (e) {
        console.log("Failure", e);
    }
}

// Register report modules here — add a loader to extend the page.
const REPORT_MODULES = [
    loadSalesPerformance,
    loadSellingRanges,
    loadMonthlyTrend
];

document.addEventListener('DOMContentLoaded', async function () {
    await loadUser();
    // Run modules independently so one failing report does not block the others.
    REPORT_MODULES.forEach(loader => loader().catch(e => console.log('Report module failed', e)));
});

// ---- Module: Sales Performance ----
async function loadSalesPerformance() {
    const todayEl = document.getElementById('reportToday');
    const monthEl = document.getElementById('reportMonth');
    const momEl = document.getElementById('reportMoM');

    // Today
    try {
        const res = await fetch(`${API_BASE}/sale/todaySales`, { credentials: 'include' });
        if (res.ok) {
            const d = await res.json();
            if (d && typeof d.total === 'number') setStat(todayEl, money(d.total));
        }
    } catch (e) { console.log('today sales failed', e); }

    // This month
    try {
        const res = await fetch(`${API_BASE}/sale/monthlySales`, { credentials: 'include' });
        if (res.ok) {
            const d = await res.json();
            if (d && typeof d.total === 'number') setStat(monthEl, money(d.total));
        }
    } catch (e) { console.log('monthly sales failed', e); }

    // Month-over-month change (derived from the monthly trend, if available)
    try {
        const trend = await fetchMonthlyTrend();
        if (trend && trend.length >= 2) {
            const curr = trend[trend.length - 1].total;
            const prev = trend[trend.length - 2].total;
            const pct = changePct(curr, prev);
            if (pct !== null) {
                const arrow = pct >= 0 ? '↑' : '↓';
                setStat(momEl, `${arrow} ${Math.abs(pct).toFixed(1)}%`);
            }
        }
    } catch (e) { console.log('MoM failed', e); }
}

// ---- Module: Medicine Selling Ranges ----
async function loadSellingRanges() {
    const tbody = document.getElementById('sellingRangesBody');
    tbody.innerHTML = PharmUI.skeletonRows(5);
    let data = [];
    try {
        const res = await PharmUI.withTimeout(fetch(`${API_BASE}/sale/medicineSales`, { credentials: 'include' }));
        if (res.ok) data = await res.json();
        else throw new Error('Request failed ' + res.status);
    } catch (e) {
        console.log('selling ranges failed', e);
        PharmUI.tableEmpty(tbody, 5, {
            icon: 'warning',
            title: "Couldn't load this report",
            message: 'Check your connection and try again.',
            actionLabel: 'Retry',
            onRetry: loadSellingRanges
        });
        return;
    }

    if (!Array.isArray(data) || data.length === 0) {
        tbody.innerHTML = emptyRow(5, 'No data available');
        return;
    }

    // Sort by units sold descending and bucket into ranges (top / mid / low third).
    const sorted = [...data].sort((a, b) => (b.unitsSold || 0) - (a.unitsSold || 0));
    const third = Math.ceil(sorted.length / 3);

    tbody.innerHTML = sorted.map((m, i) => {
        const rangeClass = i < third ? 'range-top' : (i < third * 2 ? 'range-mid' : 'range-low');
        const rangeLabel = i < third ? 'Top seller' : (i < third * 2 ? 'Mid range' : 'Slow mover');
        const revenue = (typeof m.revenue === 'number') ? money(m.revenue) : '\u2014';
        return `
            <tr>
                <td><span class="med-name">${htmlEncode(m.name ?? '\u2014')}</span></td>
                <td><span class="type-tag">${htmlEncode(m.type ?? '\u2014')}</span></td>
                <td>${m.unitsSold ?? 0}</td>
                <td>${revenue}</td>
                <td><span class="range-pill ${rangeClass}">${rangeLabel}</span></td>
            </tr>
        `;
    }).join('');
}

// ---- Module: Monthly Trend ----
async function loadMonthlyTrend() {
    const container = document.getElementById('monthlyTrend');
    container.innerHTML = '<div class="trend-skeleton"><span class="ui-skeleton" style="width:60%"></span><span class="ui-skeleton" style="width:80%"></span><span class="ui-skeleton" style="width:70%"></span></div>';
    const trend = await fetchMonthlyTrend();

    if (!trend || trend.length === 0) {
        container.innerHTML = '';
        container.appendChild(PharmUI.emptyState({
            icon: 'chart',
            title: 'No trend data yet',
            message: 'Monthly sales trends will appear once sales are recorded.'
        }));
        return;
    }

    const max = Math.max(...trend.map(t => t.total || 0), 1);

    container.innerHTML = trend.map((t, i) => {
        const pct = i > 0 ? changePct(t.total, trend[i - 1].total) : null;
        let changeHtml = '<span class="trend-change flat">—</span>';
        if (pct !== null) {
            const cls = pct > 0 ? 'up' : (pct < 0 ? 'down' : 'flat');
            const arrow = pct > 0 ? '↑' : (pct < 0 ? '↓' : '');
            changeHtml = `<span class="trend-change ${cls}">${arrow} ${Math.abs(pct).toFixed(1)}%</span>`;
        }
        const width = Math.round(((t.total || 0) / max) * 100);
        return `
            <div class="trend-row">
                <div class="trend-month">${htmlEncode(formatMonth(t.month))}</div>
                <div class="trend-bar-track"><div class="trend-bar-fill" style="width: ${width}%"></div></div>
                <div class="trend-meta">
                    <span class="trend-value">${money(t.total || 0)}</span>
                    ${changeHtml}
                </div>
            </div>
        `;
    }).join('');
}

// Shared fetch (used by both performance and trend modules).
let _trendCache;
async function fetchMonthlyTrend() {
    if (_trendCache !== undefined) return _trendCache;
    try {
        const res = await fetch(`${API_BASE}/sale/monthlyTrend`, { credentials: 'include' });
        _trendCache = res.ok ? await res.json() : null;
    } catch (e) {
        _trendCache = null;
    }
    return _trendCache;
}

// ---- Helpers ----
function setStat(el, value) {
    el.textContent = value;
    el.classList.remove('empty-stat');
}

function money(n) {
    return 'KSh ' + Number(n).toLocaleString();
}

function changePct(curr, prev) {
    if (typeof curr !== 'number' || typeof prev !== 'number') return null;
    if (prev === 0) return curr === 0 ? 0 : null;
    return ((curr - prev) / prev) * 100;
}

function formatMonth(m) {
    if (!m) return '—';
    // Accepts "2026-05" or a date string.
    const d = new Date(m.length === 7 ? m + '-01' : m);
    if (isNaN(d)) return m;
    return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}

function emptyRow(cols, text) {
    return '<tr><td colspan="' + cols + '" class="table-empty">' + htmlEncode(text) + '</td></tr>';
}

// ---- Navigation ----
function toggleSidebar() {
    document.querySelector('.sidebar').classList.toggle('active');
    document.querySelector('.sidebar-overlay').classList.toggle('active');
}

function logout() {
    fetch(`${API_BASE}/logout`, { method: 'POST', credentials: 'include' }).catch(() => {});
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}
