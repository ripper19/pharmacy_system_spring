function loadUserData() {
        const user = localStorage.getItem('user');
        if (!user) {
            window.location.href = 'index.html';
        }
        fetch('https://pharmacy-system-spring-utt5.onrender.com/auth/me', {credentials: 'include'})
        .then(res => {
            if (res.status===401) {
                localStorage.clear();
                window.location.href='index.html';
                return;
                }
            if (!res.ok){
                throw new Error("Failed auth");
            }
            })
        .catch(() => {
            localStorage.clear();
        });
    }

    async function loadDashboardStats() {
        const cookie = localStorage.getItem('COOKIE');

        try {
            const salesRes = await fetch('https://pharmacy-system-spring-utt5.onrender.com/sale/todaySales', {
                method: 'GET',
                credentials: 'include'
            });
            if(!salesRes.ok) throw new Error("Request Failed" + salesRes.status);
            const salesData = await salesRes.json();

            document.getElementById('todaySales').textContent =
                'KSh ' + salesData.total.toLocaleString();
            
            /**  add with orders module document.getElementById('totalOrders').textContent = salesData.count;

            Fetch low stock items
            const stockRes = await fetch('https://pharmacy-system-spring-utt5.onrender.com/api/medicine/low-stock', {
                headers: { 'Authorization': 'Bearer ' + token }
            });

           const stockData = await stockRes.json();
           document.getElementById('lowStock').textContent = stockData.length;*/

            const revenueRes = await fetch('https://pharmacy-system-spring-utt5.onrender.com/sale/monthlySales', {
                method: 'GET',
                credentials:'include'
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
        const cookie = localStorage.getItem('COOKIE');
        const tbody = document.getElementById('recentSalesTable');

        try {
            const res = await fetch('https://pharmacy-system-spring-utt5.onrender.com/sale/rcntSales', {
                method: 'GET',
                credentials: 'include'
            });
            const sales = await res.json();

            if (sales.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No recent sales</td></tr>';
                return;
            }

            tbody.innerHTML = sales.map(sale => `
                <tr>
                    <td>#${sale.clientName}</td>
                    <td>${sale.prescriptionInfo}</td>
                    <td>${sale.quantity}</td>
                    <td>KSh ${sale.amount.toLocaleString()}</td>
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
                    data: [12000, 1900, 1500, 2500, 2200, 3000, 2800],
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
        fetch ('https://pharmacy-system-spring-utt5.onrender.com/logout',{
        method: 'POST',
        credentials: 'include'
        });
        localStorage.removeItem('user');
        window.location.href = 'index.html';
    }

    // Initialize dashboard
    window.onload = function() {
        loadUserData();
        loadDashboardStats();
        loadRecentSales();
        initSalesChart();
    };