const API_BASE = "https://pharmacy-system-spring-utt5.onrender.com";

// ---- Auth + profile ----
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

        const initials = name.split(" ").map(w => w[0].toUpperCase()).join("");

        // Sidebar
        document.getElementById('userName').textContent = name;
        document.getElementById('userRole').textContent = role;
        document.getElementById('userAvatar').textContent = initials;

        // Profile card
        document.getElementById('profileAvatar').textContent = initials;
        document.getElementById('profileName').textContent = name;
        document.getElementById('profileRoleBadge').textContent = role;
        document.getElementById('fldName').value = name;
        document.getElementById('fldEmail').value = bemail;
        document.getElementById('fldRole').value = role;
    } catch (e) {
        console.log("Failure", e);
    }
}

// Paint the profile card from the cached credentials immediately, then
// loadUser() revalidates via /auth/me and refreshes the values.
function hydrateProfileFromCache() {
    let cached;
    try {
        cached = JSON.parse(localStorage.getItem('user'));
    } catch (e) {
        return;
    }
    if (!cached || !cached.name) return;

    const initials = cached.name.split(' ').map(w => (w[0] ? w[0].toUpperCase() : '')).join('');
    document.getElementById('profileAvatar').textContent = initials;
    document.getElementById('profileName').textContent = cached.name;
    document.getElementById('profileRoleBadge').textContent = cached.role || '—';
    document.getElementById('fldName').value = cached.name;
    if (cached.bemail) document.getElementById('fldEmail').value = cached.bemail;
    document.getElementById('fldRole').value = cached.role || '';
}

document.addEventListener('DOMContentLoaded', async function () {
    hydrateProfileFromCache();
    await loadUser();
    loadCompany().catch(e => console.log('company failed', e));
    loadMyDailySales().catch(e => console.log('daily sales failed', e));
});

// ---- Company ----
async function loadCompany() {
    let company = null;
    try {
        const res = await fetch(`${API_BASE}/company`, { credentials: 'include' });
        if (res.ok) company = await res.json();
    } catch (e) {
        console.log('company fetch failed', e);
    }

    // The organization running this system is PharmaCare; specifics come from the
    // backend when available, otherwise fields stay "No data available".
    const name = (company && company.name) || 'PharmaCare';
    document.getElementById('companyName').textContent = name;
    document.getElementById('fldCompany').value = name;

    if (company) {
        if (company.email) document.getElementById('fldCompanyEmail').value = company.email;
        if (company.phone) document.getElementById('fldCompanyPhone').value = company.phone;
        if (company.address) document.getElementById('fldCompanyAddr').value = company.address;
    }
}

// ---- My daily sales ----
async function loadMyDailySales() {
    const todayEl = document.getElementById('myToday');
    const countEl = document.getElementById('myCount');

    try {
        const res = await fetch(`${API_BASE}/sale/todaySales`, { credentials: 'include' });
        if (!res.ok) return;
        const d = await res.json();
        if (d && typeof d.total === 'number') setStat(todayEl, 'KSh ' + d.total.toLocaleString());
        if (d && typeof d.count === 'number') setStat(countEl, d.count);
    } catch (e) {
        console.log('daily sales failed', e);
    }
}

// ---- Helpers ----
function setStat(el, value) {
    el.textContent = value;
    el.classList.remove('empty-stat');
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
