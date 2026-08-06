    // Initialize
    let currentFilter = 'today';

    async function loadUserData() {
        const user = localStorage.getItem('user');
        if(!user){
            localStorage.clear();
            sessionStorage.clear();

            fetch(API_BASE + "/logout", {
                credentials: 'include',
                method: 'POST'
            }).catch(()=> {});

            setTimeout(()=> {
                window.location.href = 'index.html';
            }, 1000);
            return;
        }
        await checkRole();
    }
    
    async function checkRole() {
        try{
            const res = await fetch(API_BASE + "/auth/me", {
                credentials: 'include'
            });
            if(res.status === 401){
                window.location.href = 'index.html';
                return;
            }
            if(!res.ok){
                localStorage.clear();
                sessionStorage.clear();

                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1000);
                return;
            }
            const {name, email:bemail, role} = await res.json();
            localStorage.removeItem('user');
            localStorage.setItem('user', JSON.stringify({name, bemail, role}));
            
            // Initialize user info
            document.getElementById('userName').textContent = name;
            document.getElementById('userRole').textContent = role;
            const initials = name
                .split(" ")
                .map(word => word[0].toUpperCase())
                .join("");
            document.getElementById('userAvatar').textContent = initials;
        }catch(e){
            console.log("Failure", e);
            // Session could not be verified — send the user back to login.
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = 'index.html';
        }
    }

    window.onload = function() {
        loadUserData();
        loadSales(currentFilter);
        calculateTotal();
        PharmUI.attachLiveValidation(document.getElementById('saleForm'));
    };

    function toggleForm(formType) {
        const createForm = document.getElementById('createSaleForm');
        const searchForm = document.getElementById('searchSaleForm');
        const cards = document.querySelectorAll('.action-card');

        cards.forEach(card => card.classList.remove('active'));

        if (formType === 'createSale') {
            if (createForm.classList.contains('active')) {
                createForm.classList.remove('active');
            } else {
                createForm.classList.add('active');
                searchForm.classList.remove('active');
                event.target.closest('.action-card').classList.add('active');
            }
        } else if (formType === 'searchSale') {
            if (searchForm.classList.contains('active')) {
                searchForm.classList.remove('active');
            } else {
                searchForm.classList.add('active');
                createForm.classList.remove('active');
                event.target.closest('.action-card').classList.add('active');
            }
        }
    }

    function closeForm(formType) {
        document.getElementById(formType + 'Form').classList.remove('active');
        document.querySelectorAll('.action-card').forEach(card => card.classList.remove('active'));
    }

    // Medicine items management
    function addMedicineItem() {
        const container = document.getElementById('medicineItems');
        const newItem = document.createElement('div');
        newItem.className = 'medicine-item';
        newItem.innerHTML = `
            <div>
                <label>Medicine Name</label>
                <input type="text" class="medicine-name" placeholder="Search medicine..." aria-label="Medicine name" required>
            </div>
            <div>
                <label>Quantity</label>
                <input type="number" class="medicine-qty" min="1" value="1" aria-label="Quantity" required onchange="calculateTotal()">
            </div>
            <div>
                <label>Price</label>
                <input type="number" class="medicine-price" step="0.01" min="0" placeholder="0.00" aria-label="Price" required onchange="calculateTotal()">
            </div>
            <button type="button" class="remove-item-btn" onclick="removeMedicineItem(this)">Remove</button>
        `;
        container.appendChild(newItem);
        updateRemoveButtons();
    }

    function removeMedicineItem(btn) {
        btn.closest('.medicine-item').remove();
        updateRemoveButtons();
        calculateTotal();
    }

    function updateRemoveButtons() {
        const items = document.querySelectorAll('.medicine-item');
        items.forEach((item, index) => {
            const removeBtn = item.querySelector('.remove-item-btn');
            removeBtn.style.display = items.length > 1 ? 'block' : 'none';
        });
    }

    function calculateTotal() {
        const items = document.querySelectorAll('.medicine-item');
        let total = 0;

        items.forEach(item => {
            const qty = parseFloat(item.querySelector('.medicine-qty').value) || 0;
            const price = parseFloat(item.querySelector('.medicine-price').value) || 0;
            total += qty * price;
        });

        document.getElementById('totalAmount').textContent = 'KSh ' + total.toFixed(2);
    }

    // Add event listeners to calculate total on input
    document.addEventListener('input', function(e) {
        if (e.target.classList.contains('medicine-qty') || e.target.classList.contains('medicine-price')) {
            calculateTotal();
        }
    });

    // Submit sale
    async function submitSale(e) {
        e.preventDefault();

        if (!PharmUI.validate(document.getElementById('saleForm'))) {
            showAlert('Please fix the highlighted fields', 'error');
            return;
        }

        const items = Array.from(document.querySelectorAll('.medicine-item')).map(item => ({
            medicineName: item.querySelector('.medicine-name').value,
            quantity: parseInt(item.querySelector('.medicine-qty').value),
            price: parseFloat(item.querySelector('.medicine-price').value)
        }));

        const saleData = {
            clientName: document.getElementById('clientName').value,
            clientPhone: document.getElementById('clientPhone').value,
            saleType: document.getElementById('saleType').value,
            prescriptionNumber: document.getElementById('prescriptionNumber').value,
            items: items,
            notes: document.getElementById('notes').value
        };

        try {
            const res = await fetch(API_BASE + '/sale/sell', {
                method: 'POST',
                credentials: 'include',
                headers:{'Content-Type':'application/json'},
                body: JSON.stringify(saleData)
            });

            const data = await res.json();

            if (res.ok) {
                showAlert('Sale created successfully!', 'success');
                document.getElementById('saleForm').reset();
                calculateTotal();
                closeForm('createSale');
                loadSales(currentFilter);
            } else {
                showAlert('Error: ' + data.message, 'error');
            }
        } catch (e) {
            console.error('Error creating sale:', e);
            showAlert('Failed to create sale. Please try again.', 'error');
        }
    }

    // Load sales
    async function loadSales(filter) {
        const token = localStorage.getItem('token');
        const tbody = document.getElementById('salesTableBody');
        currentFilter = filter;

        // Update filter buttons
        document.querySelectorAll('.filter-btns button').forEach(btn => btn.classList.remove('active'));
        event?.target?.classList?.add('active');

        tbody.innerHTML = PharmUI.skeletonRows(7);

        try {
            const res = await PharmUI.withTimeout(fetch(`${API_BASE}/api/sales?filter=${filter}`, {
                headers: { 'Authorization': 'Bearer ' + token }
            }));

            const sales = await res.json();

            if (!Array.isArray(sales) || sales.length === 0) {
                PharmUI.tableEmpty(tbody, 7, {
                    icon: 'cart',
                    title: 'No sales found',
                    message: 'Sales for this period will show up here.'
                });
                return;
            }

            tbody.innerHTML = '';
            sales.forEach(sale => {
                const tr = document.createElement('tr');
                tr.innerHTML = `<td>#${htmlEncode(sale.publicId)}</td><td>${htmlEncode(sale.clientName)}</td><td>${htmlEncode(sale.clientPhone)}</td><td>${htmlEncode(sale.saleType)}</td><td>KSh ${sale.totalAmount.toFixed(2)}</td><td>${formatDateTime(sale.createdAt)}</td>`;
                const tdActions = document.createElement('td');
                const divActions = document.createElement('div');
                divActions.className = 'action-btns';
                const btnView = document.createElement('button');
                btnView.className = 'btn-view';
                btnView.textContent = 'View';
                btnView.addEventListener('click', () => viewSale(sale.publicId));
                const btnDelete = document.createElement('button');
                btnDelete.className = 'btn-delete';
                btnDelete.textContent = 'Delete';
                btnDelete.addEventListener('click', () => deleteSale(sale.publicId));
                divActions.appendChild(btnView);
                divActions.appendChild(btnDelete);
                tdActions.appendChild(divActions);
                tr.appendChild(tdActions);
                tbody.appendChild(tr);
            });

        } catch (e) {
            console.error('Error loading sales:', e);
            PharmUI.tableEmpty(tbody, 7, {
                icon: 'warning',
                title: "Couldn't load sales",
                message: 'Check your connection and try again.',
                actionLabel: 'Retry',
                onRetry: () => loadSales(filter)
            });
        }
    }

    // Search sale
    async function searchSale() {
        const searchTerm = document.getElementById('searchInput').value.trim();
        if (!searchTerm) {
            showAlert('Please enter a sale ID or date', 'error');
            return;
        }

        const token = localStorage.getItem('token');
        const tbody = document.getElementById('salesTableBody');

        try {
            const res = await fetch(`${API_BASE}/api/sales/search?q=${searchTerm}`, {
                headers: { 'Authorization': 'Bearer ' + token }
            });

            const sales = await res.json();

            document.getElementById('tableTitle').textContent = `Search Results for "${searchTerm}"`;

            if (sales.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" class="table-empty">No sales found</td></tr>';
                return;
            }

            tbody.innerHTML = '';
            sales.forEach(sale => {
                const tr = document.createElement('tr');
                tr.innerHTML = `<td>#${htmlEncode(sale.publicId)}</td><td>${htmlEncode(sale.clientName)}</td><td>${htmlEncode(sale.clientPhone)}</td><td>${htmlEncode(sale.saleType)}</td><td>KSh ${sale.totalAmount.toFixed(2)}</td><td>${formatDateTime(sale.createdAt)}</td>`;
                const tdActions = document.createElement('td');
                const divActions = document.createElement('div');
                divActions.className = 'action-btns';
                const btnView = document.createElement('button');
                btnView.className = 'btn-view';
                btnView.textContent = 'View';
                btnView.addEventListener('click', () => viewSale(sale.publicId));
                const btnDelete = document.createElement('button');
                btnDelete.className = 'btn-delete';
                btnDelete.textContent = 'Delete';
                btnDelete.addEventListener('click', () => deleteSale(sale.publicId));
                divActions.appendChild(btnView);
                divActions.appendChild(btnDelete);
                tdActions.appendChild(divActions);
                tr.appendChild(tdActions);
                tbody.appendChild(tr);
            });
    } catch (e) {
            console.error('Error searching sales:', e);
            showAlert('Search failed. Please try again.', 'error');
        }
    }

    function clearSearch() {
        document.getElementById('searchInput').value = '';
        document.getElementById('tableTitle').textContent = 'Recent Sales';
        loadSales('today');
    }

    // View sale details
    async function viewSale(saleId) {
        const token = localStorage.getItem('token');

        try {
            const res = await fetch(`${API_BASE}/api/sales/${saleId}`, {
                headers: { 'Authorization': 'Bearer ' + token }
            });

            const sale = await res.json();

            const itemRows = sale.items.map(item =>
                `<tr><td>${htmlEncode(item.medicineName)}</td><td>${htmlEncode(item.quantity)}×</td><td>KSh ${htmlEncode(item.price)}</td></tr>`
            ).join('');

            PharmUI.info({
                title: `Sale #${sale.publicId}`,
                html: `
                    <table>
                        <tr><td><strong>Client</strong></td><td colspan="2">${htmlEncode(sale.clientName)}</td></tr>
                        <tr><td><strong>Phone</strong></td><td colspan="2">${htmlEncode(sale.clientPhone)}</td></tr>
                        <tr><td><strong>Type</strong></td><td colspan="2">${htmlEncode(sale.saleType)}</td></tr>
                        ${itemRows}
                        <tr><td><strong>Total</strong></td><td colspan="2"><strong>KSh ${htmlEncode(sale.totalAmount)}</strong></td></tr>
                        <tr><td><strong>Date</strong></td><td colspan="2">${htmlEncode(formatDateTime(sale.createdAt))}</td></tr>
                    </table>`
            });

        } catch (e) {
            console.error('Error viewing sale:', e);
            showAlert('Failed to load sale details', 'error');
        }
    }

    // Delete sale
    async function deleteSale(saleId) {
        const ok = await PharmUI.confirm({
            title: 'Delete sale?',
            message: 'Are you sure you want to delete this sale? This action cannot be undone.',
            confirmText: 'Delete',
            danger: true
        });
        if (!ok) {
            return;
        }

        const token = localStorage.getItem('token');

        try {
            const res = await fetch(`${API_BASE}/api/sales/${saleId}`, {
                method: 'DELETE',
                headers: { 'Authorization': 'Bearer ' + token }
            });

            if (res.ok) {
                showAlert('Sale deleted successfully', 'success');
                loadSales(currentFilter);
            } else {
                const data = await res.json();
                showAlert('Error: ' + data.message, 'error');
            }
        } catch (e) {
            console.error('Error deleting sale:', e);
            showAlert('Failed to delete sale', 'error');
        }
    }

    // Filter sales
    function filterSales(filter) {
        loadSales(filter);
    }

    // Utility functions
    function formatDateTime(dateString) {
        const date = new Date(dateString);
        return date.toLocaleString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function showAlert(message, type) {
        const alertBox = document.getElementById('alertBox');
        alertBox.className = `alert alert-${type} show`;
        alertBox.textContent = message;

        setTimeout(() => {
            alertBox.classList.remove('show');
        }, 5000);
    }

    function toggleSidebar() {
        document.querySelector('.sidebar').classList.toggle('active');
        document.querySelector('.sidebar-overlay').classList.toggle('active');
    }

    function logout() {
        localStorage.removeItem('token');
        window.location.href = 'index.html';
    }