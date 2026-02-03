function loadUserData() {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = 'login.html';
            return;
        }

        // Decode JWT token to get user info (simplified)
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            document.getElementById('userName').textContent = payload.name || 'User';
            document.getElementById('userRole').textContent = payload.role || 'Staff';

            // Set avatar initials
            const name = payload.name || 'User';
            const initials = name.split(' ').map(n => n[0]).join('').toUpperCase();
            document.getElementById('userAvatar').textContent = initials;
        } catch (e) {
            console.error('Error decoding token:', e);
        }
    }

    // Load dashboard stats
    async function loadDashboardStats() {
        const token = localStorage.getItem('token');

        try {
            // Fetch today's sales
            const salesRes = await fetch('http://localhost:8080/api/sales/today', {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            const salesData = await salesRes.json();
            document.getElementById('todaySales').textContent =
                'KSh ' + salesData.total.toLocaleString();
            document.getElementById('totalOrders').textContent = salesData.count;

            // Fetch low stock items
            const stockRes = await fetch('http://localhost:8080/api/medicine/low-stock', {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            const stockData = await stockRes.json();
            document.getElementById('lowStock').textContent = stockData.length;

            // Fetch month revenue
            const revenueRes = await fetch('http://localhost:8080/api/sales/monthly', {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            const revenueData = await revenueRes.json();
            document.getElementById('monthRevenue').textContent =
                'KSh ' + revenueData.total.toLocaleString();

        } catch (e) {
            console.error('Error loading stats:', e);
        }
    }

    // Load recent sales
    async function loadRecentSales() {
        const token = localStorage.getItem('token');
        const tbody = document.getElementById('recentSalesTable');

        try {
            const res = await fetch('http://localhost:8080/api/sales/recent', {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            const sales = await res.json();

            if (sales.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No recent sales</td></tr>';
                return;
            }

            tbody.innerHTML = sales.map(sale => `
                <tr>
                    <td>#${sale.id}</td>
                    <td>${sale.medicineName}</td>
                    <td>${sale.quantity}</td>
                    <td>KSh ${sale.amount.toLocaleString()}</td>
                    <td><span class="status-badge status-${sale.status.toLowerCase()}">${sale.status}</span></td>
                    <td>${new Date(sale.date).toLocaleDateString()}</td>
                </tr>
            `).join('');

        } catch (e) {
            console.error('Error loading recent sales:', e);
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: red;">Error loading data</td></tr>';
        }
    }

    // Initialize sales chart
    function initSalesChart() {
        const ctx = document.getElementById('salesChart').getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Sales (KSh)',
                    data: [12000, 19000, 15000, 25000, 22000, 30000, 28000],
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    // Navigation
    function loadPage(page) {
        const menuItems = document.querySelectorAll('.menu-item');
        menuItems.forEach(item => item.classList.remove('active'));
        event.target.closest('.menu-item').classList.add('active');

        // Navigate to page (implement as needed)
        console.log('Loading page:', page);
    }

    function showNotifications() {
        alert('Notifications feature coming soon!');
    }

    function logout() {
        localStorage.removeItem('token');
        window.location.href = 'login.html';
    }

    // Initialize dashboard
    window.onload = function() {
        loadUserData();
        loadDashboardStats();
        loadRecentSales();
        initSalesChart();
    };