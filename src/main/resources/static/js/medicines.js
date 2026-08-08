let allMedicines = [];
let medicineTypes = [];
let catalogPage = 0;
let searchTimer = null;

// ---- Auth (user-facing: any authenticated user) ----
async function loadUser() {
    const user = localStorage.getItem('user');
    if (!user) {
        localStorage.clear();
        sessionStorage.clear();

        fetch(`${API_BASE}/logout`, {
            credentials: 'include',
            method: 'POST'
        }).catch(() => {});

        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
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
        const initials = name
            .split(" ")
            .map(word => word[0].toUpperCase())
            .join("");
        document.getElementById('userAvatar').textContent = initials;
    } catch (e) {
        console.log("Failure", e);
        // Session could not be verified — send the user back to login.
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = 'index.html';
    }
}

document.addEventListener('DOMContentLoaded', async function () {
    await loadUser();
    // Pre-fill the catalog search from ?q= (global navbar search redirects here).
    const q = new URLSearchParams(window.location.search).get('q');
    if (q) {
        const searchEl = document.getElementById('medicineSearch');
        if (searchEl) searchEl.value = q;
    }
    await loadTypes();
    await loadMedicines();
});

// ---- Data loading ----
async function loadTypes() {
    try {
        const res = await fetch(`${API_BASE}/Medicine_Type/getAll`, { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();
        medicineTypes = data
            .map(t => (typeof t === 'string' ? t : t.name))
            .filter(Boolean);
        renderTypeControls();
    } catch (e) {
        console.log("Failed to load types", e);
    }
}

async function loadMedicines(page) {
    if (page === undefined) page = catalogPage;
    catalogPage = page;
    const tbody = document.getElementById('medicinesCatalogBody');
    tbody.innerHTML = PharmUI.skeletonRows(5);
    const noData = {
        icon: 'pill',
        title: 'No medicines in the catalog',
        message: 'Medicines you add will appear here.',
        actionLabel: 'Add a medicine',
        actionHref: 'inventory.html',
        retryTitle: "Couldn't load medicines",
        onRetry: () => loadMedicines(catalogPage)
    };
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('size', '20');
    const q = (document.getElementById('medicineSearch').value || '').trim();
    if (q) params.set('q', q);
    const type = document.getElementById('typeFilter').value || 'all';
    if (type && type !== 'all') params.set('type', type);

    let res;
    try {
        res = await PharmUI.withTimeout(fetch(`${API_BASE}/medicine/getAll?${params.toString()}`, { credentials: 'include' }));
    } catch (e) {
        console.log("Failed to load medicines", e);
        allMedicines = [];
        PharmUI.fetchEmpty(tbody, 5, noData, e);
        updateSummary(0);
        return;
    }
    if (!res.ok) {
        console.log("Failed to load medicines", res.status);
        allMedicines = [];
        PharmUI.fetchEmpty(tbody, 5, noData, null, res);
        updateSummary(0);
        return;
    }
    let pageData;
    try {
        pageData = await res.json();
    } catch (e) {
        console.log("Failed to parse medicines", e);
        allMedicines = [];
        PharmUI.fetchEmpty(tbody, 5, noData, e);
        updateSummary(0);
        return;
    }
    allMedicines = Array.isArray(pageData) ? pageData : (pageData.content || []);
    const totalPages = (pageData && pageData.totalPages) ? pageData.totalPages : 1;
    const totalElements = (pageData && pageData.totalElements != null) ? pageData.totalElements : allMedicines.length;
    updateSummary(totalElements);

    if (allMedicines.length === 0) {
        if (totalElements === 0 && (q || (type && type !== 'all'))) {
            tbody.innerHTML = emptyRow('No medicines match your search');
        } else {
            PharmUI.tableEmpty(tbody, 5, {
                icon: 'pill',
                title: 'No medicines in the catalog',
                message: 'Medicines you add will appear here.',
                actionLabel: 'Add a medicine',
                actionHref: 'inventory.html'
            });
        }
        renderCatalogPager(tbody, page, totalPages, totalElements);
        return;
    }
    renderTable(allMedicines);
    renderCatalogPager(tbody, page, totalPages, totalElements);
}

// ---- Rendering ----
function renderTypeControls() {
    const select = document.getElementById('typeFilter');
    if (select) {
        select.innerHTML = '<option value="all">All Types</option>';
        medicineTypes.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t;
            opt.textContent = capitalize(t);
            select.appendChild(opt);
        });
    }

    const chips = document.getElementById('typeChips');
    if (chips) {
        chips.innerHTML = '';
        const allChip = document.createElement('span');
        allChip.className = 'type-chip active';
        allChip.dataset.type = 'all';
        allChip.textContent = 'All';
        allChip.addEventListener('click', () => selectChip('all'));
        chips.appendChild(allChip);
        medicineTypes.forEach(t => {
            const chip = document.createElement('span');
            chip.className = 'type-chip';
            chip.dataset.type = t;
            chip.textContent = capitalize(t);
            chip.addEventListener('click', () => selectChip(t));
            chips.appendChild(chip);
        });
    }
}

function selectChip(type) {
    document.getElementById('typeFilter').value = type;
    applyFilters();
}

function applyFilters() {
    // Sync chip active state to the current select value.
    const type = document.getElementById('typeFilter').value || 'all';
    document.querySelectorAll('.type-chip').forEach(chip => {
        chip.classList.toggle('active', chip.dataset.type === type);
    });

    // Debounce so typing doesn't fire a request per keystroke.
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => loadMedicines(0), 300);
}

function renderTable(medicines) {
    const tbody = document.getElementById('medicinesCatalogBody');

    if (!medicines || medicines.length === 0) {
        if (allMedicines.length === 0) {
            PharmUI.tableEmpty(tbody, 5, {
                icon: 'pill',
                title: 'No medicines in the catalog',
                message: 'Medicines you add will appear here.',
                actionLabel: 'Add a medicine',
                actionHref: 'inventory.html'
            });
        } else {
            tbody.innerHTML = emptyRow('No medicines match your search');
        }
        return;
    }

    tbody.innerHTML = medicines.map(med => {
        const cost = (typeof med.cost === 'number') ? med.cost : (typeof med.price === 'number' ? med.price : null);
        const price = cost !== null ? `KSh ${cost.toFixed(2)}` : 'No data available';
        return `
            <tr>
                <td>${htmlEncode(med.sku ?? '—')}</td>
                <td><span class="med-name">${htmlEncode(med.medicineName ?? med.name ?? '—')}</span></td>
                <td><span class="type-tag">${htmlEncode((med.medicineType && med.medicineType.name) || med.type || '—')}</span></td>
                <td>${price}</td>
                <td><span class="stock-badge ${String(med.status || '').toLowerCase()}">${htmlEncode(med.status ?? '—')}</span></td>
            </tr>
        `;
    }).join('');
}

function renderCatalogPager(tbody, page, totalPages, totalElements) {
    let pagerEl = document.getElementById('catalogPager');
    if (!pagerEl) {
        pagerEl = document.createElement('div');
        pagerEl.id = 'catalogPager';
        const table = tbody.closest('table');
        if (table) table.after(pagerEl);
        else tbody.parentElement.appendChild(pagerEl);
    }
    PharmUI.pager(pagerEl, { page: page, totalPages: totalPages, totalElements: totalElements }, function (p) {
        loadMedicines(p);
    });
}

function updateSummary(totalElements) {
    const totalEl = document.getElementById('statTotal');
    const typesEl = document.getElementById('statTypes');
    const inStockEl = document.getElementById('statInStock');

    const total = (typeof totalElements === 'number') ? totalElements : allMedicines.length;
    const inStock = allMedicines.filter(m => (m.quantity || 0) > 0).length;
    const typeCount = medicineTypes.length;

    if (total === 0) {
        [totalEl, typesEl, inStockEl].forEach(el => {
            el.textContent = 'No data available';
            el.classList.add('empty-stat');
        });
        return;
    }

    setStat(totalEl, total);
    setStat(typesEl, typeCount);
    setStat(inStockEl, inStock);
}

function setStat(el, value) {
    el.textContent = value;
    el.classList.remove('empty-stat');
}

// ---- Helpers ----
function emptyRow(text) {
    return '<tr><td colspan="5" class="table-empty">' + htmlEncode(text) + '</td></tr>';
}

function capitalize(s) {
    if (!s) return s;
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function getStockStatus(quantity, threshold) {
    const q = quantity || 0;
    const t = threshold || 0;
    if (q === 0) return 'Out of Stock';
    if (q <= t) return 'Low Stock';
    if (q <= t * 2) return 'Limited';
    return 'In Stock';
}

function getStockStatusClass(status) {
    switch (status) {
        case 'In Stock': return 'stock-high';
        case 'Limited': return 'stock-medium';
        case 'Low Stock': return 'stock-low';
        case 'Out of Stock': return 'stock-out';
        default: return 'stock-out';
    }
}

// ---- Navigation ----
function toggleSidebar() {
    document.querySelector('.sidebar').classList.toggle('active');
    document.querySelector('.sidebar-overlay').classList.toggle('active');
}

function logout() {
    fetch(`${API_BASE}/logout`, {
        method: 'POST',
        credentials: 'include'
    }).catch(() => {});
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}
