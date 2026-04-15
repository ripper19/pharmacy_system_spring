    // Initialize
    let currentFilter = 'today';

    window.onload = function() {
        loadUserData();
        loadSales(currentFilter);
        calculateTotal();
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
                <input type="text" class="medicine-name" placeholder="Search medicine..." required>
            </div>
            <div>
                <label>Quantity</label>
                <input type="number" class="medicine-qty" min="1" value="1" required onchange="calculateTotal()">
            </div>
            <div>
                <label>Price</label>
                <input type="number" class="medicine-price" step="0.01" placeholder="0.00" required onchange="calculateTotal()">
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
            const res = await fetch('https://pharmacy-system-spring-utt5.onrender.com/sale/sell', {
                method: 'POST',
                credentials: 'include',
                headers:{'Content-Type':'application/json'},
                body: JSON.stringify(saleData)
            });

            const data = await res.json();

            if (res.ok) {
                showAlert('Sale created successfully! Sale ID: #' + data.id, 'success');
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
        event?.target?.classList.add('active');

        try {
            const res = await fetch(`https://pharmacy-system-spring-utt5.onrender.com/api/sales?filter=${filter}`, {
                headers: { 'Authorization': 'Bearer ' + token }
            });

            const sales = await res.json();

            if (sales.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px; color: #7f8c8d;">No sales found</td></tr>';
                return;
            }

            tbody.innerHTML = sales.map(sale => `
                <tr>
                    <td>#${sale.id}</td>
                    <td>${sale.clientName}</td>
                    <td>${sale.clientPhone}</td>
                    <td>${sale.saleType}</td>
                    <td>KSh ${sale.totalAmount.toFixed(2)}</td>
                    <td>${formatDateTime(sale.createdAt)}</td>
                    <td>
                        <div class="action-btns">
                            <button class="btn-view" onclick="viewSale(${sale.id})">View</button>
                            <button class="btn-delete" onclick="deleteSale(${sale.id})">Delete</button>
                        </div>
                    </td>
                </tr>
            `).join('');

        } catch (e) {
            console.error('Error loading sales:', e);
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: red;">Error loading sales data</td></tr>';
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
            const res = await fetch(`https://pharmacy-system-spring-utt5.onrender.com/api/sales/search?q=${searchTerm}`, {
                headers: { 'Authorization': 'Bearer ' + token }
            });

            const sales = await res.json();

            document.getElementById('tableTitle').textContent = `Search Results for "${searchTerm}"`;

            if (sales.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px; color: #7f8c8d;">No sales found</td></tr>';
                return;
            }

            tbody.innerHTML = sales.map(sale => `
                <tr>
                    <td>#${sale.id}</td>
                    <td>${sale.clientName}</td>
                    <td>${sale.clientPhone}</td>
                    <td>${sale.saleType}</td>
                    <td>KSh ${sale.totalAmount.toFixed(2)}</td>
                    <td>${formatDateTime(sale.createdAt)}</td>
                    <td>
                        <div class="action-btns">
                            <button class="btn-view" onclick="viewSale(${sale.id})">View</button>
                            <button class="btn-delete" onclick="deleteSale(${sale.id})">Delete</button></div></td></tr>`).join('');
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
            const res = await fetch(`https://pharmacy-system-spring-utt5.onrender.com/api/sales/${saleId}`, {
                headers: { 'Authorization': 'Bearer ' + token }
            });

            const sale = await res.json();

            const items = sale.items.map(item =>
                `${item.medicineName} (${item.quantity}x) - KSh ${item.price}`
            ).join('\n');

            alert(`Sale Details\n\n` +
                  `ID: #${sale.id}\n` +
                  `Client: ${sale.clientName}\n` +
                  `Phone: ${sale.clientPhone}\n` +
                  `Type: ${sale.saleType}\n` +
                  `Items:\n${items}\n` +
                  `Total: KSh ${sale.totalAmount}\n` +
                  `Date: ${formatDateTime(sale.createdAt)}`);

        } catch (e) {
            console.error('Error viewing sale:', e);
            showAlert('Failed to load sale details', 'error');
        }
    }

    // Delete sale
    async function deleteSale(saleId) {
        if (!confirm('Are you sure you want to delete this sale? This action cannot be undone.')) {
            return;
        }

        const token = localStorage.getItem('token');

        try {
            const res = await fetch(`https://pharmacy-system-spring-utt5.onrender.com/api/sales/${saleId}`, {
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

    function logout() {
        localStorage.removeItem('token');
        window.location.href = 'index.html';
    }