let allMedicines = [];
let medicineTypes = [];

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

async function loadMedicines() {
    const tbody = document.getElementById('medicinesCatalogBody');
    tbody.innerHTML = PharmUI.skeletonRows(5);
    try {
        const res = await PharmUI.withTimeout(fetch(`${API_BASE}/medicine/getAll`, { credentials: 'include' }));
        if (!res.ok) throw new Error('Request failed ' + res.status);
        allMedicines = await res.json();
    } catch (e) {
        console.log("Failed to load medicines", e);
        allMedicines = [];
        PharmUI.tableEmpty(tbody, 5, {
            icon: 'warning',
            title: "Couldn't load medicines",
            message: 'Check your connection and try again.',
            actionLabel: 'Retry',
            onRetry: loadMedicines
        });
        updateSummary();
        return;
    }
    updateSummary();
    applyFilters();
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
    const search = (document.getElementById('medicineSearch').value || '').toLowerCase();
    const type = document.getElementById('typeFilter').value || 'all';

    // Sync chip active state
    document.querySelectorAll('.type-chip').forEach(chip => {
        chip.classList.toggle('active', chip.dataset.type === type);
    });

    let filtered = allMedicines;
    if (type !== 'all') {
        filtered = filtered.filter(m => (m.type || '').toLowerCase() === type.toLowerCase());
    }
    if (search) {
        filtered = filtered.filter(m =>
            (m.name || '').toLowerCase().includes(search) ||
            (m.sku || '').toLowerCase().includes(search) ||
            (m.type || '').toLowerCase().includes(search)
        );
    }

    renderTable(filtered);
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
        const status = getStockStatus(med.quantity, med.threshold);
        const statusClass = getStockStatusClass(status);
        const encDesc = (med.description || '')
            ? htmlEncode(med.description.substring(0, 60)) + (med.description.length > 60 ? '…' : '')
            : '';
        const desc = encDesc
            ? `<small class="med-desc">${encDesc}</small>`
            : '';
        const price = (typeof med.price === 'number') ? `KSh ${med.price.toFixed(2)}` : 'No data available';
        return `
            <tr>
                <td>${htmlEncode(med.sku ?? '—')}</td>
                <td><span class="med-name">${htmlEncode(med.name ?? '—')}</span>${desc}</td>
                <td><span class="type-tag">${htmlEncode(med.type ?? '—')}</span></td>
                <td>${price}</td>
                <td><span class="stock-badge ${statusClass}">${status}</span></td>
            </tr>
        `;
    }).join('');
}

function updateSummary() {
    const totalEl = document.getElementById('statTotal');
    const typesEl = document.getElementById('statTypes');
    const inStockEl = document.getElementById('statInStock');

    if (!allMedicines || allMedicines.length === 0) {
        [totalEl, typesEl, inStockEl].forEach(el => {
            el.textContent = 'No data available';
            el.classList.add('empty-stat');
        });
        return;
    }

    const inStock = allMedicines.filter(m => (m.quantity || 0) > 0).length;
    const typeCount = medicineTypes.length || new Set(allMedicines.map(m => m.type)).size;

    setStat(totalEl, allMedicines.length);
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
