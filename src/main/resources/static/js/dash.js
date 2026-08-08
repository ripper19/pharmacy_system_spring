async function loadUser(){
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
        const {name, email:bemail, role}= await res.json();
        localStorage.removeItem('user');
        localStorage.setItem('user', JSON.stringify({name,bemail, role}));
    }catch(e){
        console.log("Failure", e);
        // Session could not be verified — send the user back to login.
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = 'index.html';
    }
    }

    async function loadDashboardStats() {
        const cookie = localStorage.getItem('COOKIE');

        try {
            const salesRes = await PharmUI.withTimeout(fetch(API_BASE + '/sale/todaySales', {
                method: 'GET',
                credentials: 'include'
            }));
            if(!salesRes.ok) throw new Error("Request Failed" + salesRes.status);
            const salesData = await salesRes.json();

            countUpStat(document.getElementById('todaySales'), salesData.total);

            /**  add with orders module document.getElementById('totalOrders').textContent = salesData.count;

            Fetch low stock items
            const stockRes = await fetch(API_BASE + '/api/medicine/low-stock', {
                headers: { 'Authorization': 'Bearer ' + token }
            });

           const stockData = await stockRes.json();
           document.getElementById('lowStock').textContent = stockData.length;*/

            const revenueRes = await PharmUI.withTimeout(fetch(API_BASE + '/sale/monthlySales', {
                method: 'GET',
                credentials:'include'
            }));

            const revenueData = await revenueRes.json();
            countUpStat(document.getElementById('monthRevenue'), revenueData.total);

        } catch (e) {
            console.error('Error loading stats:', e);
            ['todaySales', 'monthRevenue'].forEach(id => {
                const el = document.getElementById(id);
                if (el && el.classList.contains('empty-stat')) el.textContent = '—';
            });
        }
    }

    // Animate a stat value from 0 (skipped under reduced motion).
    function countUpStat(el, target) {
        if (!el || typeof target !== 'number') return;
        el.classList.remove('empty-stat');
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduce) {
            el.textContent = 'KSh ' + target.toLocaleString();
            return;
        }
        const dur = 700, t0 = performance.now();
        function tick(t) {
            const p = Math.min((t - t0) / dur, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            el.textContent = 'KSh ' + Math.round(target * eased).toLocaleString();
            if (p < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
    }

    // Load recent sales
    async function loadRecentSales() {
        const cookie = localStorage.getItem('COOKIE');
        const tbody = document.getElementById('recentSalesTable');
        tbody.innerHTML = PharmUI.skeletonRows(5);
        const noData = {
            icon: 'cart',
            title: 'No sales yet',
            message: 'Sales you record will show up here.',
            actionLabel: 'Record your first sale',
            actionHref: 'sales.html',
            retryTitle: "Couldn't load sales",
            onRetry: loadRecentSales
        };
        let res;
        try {
            res = await PharmUI.withTimeout(fetch(API_BASE + '/sale/rcntSales', {
                method: 'GET',
                credentials: 'include'
            }));
        } catch (e) {
            console.error('Error loading recent sales:', e);
            PharmUI.fetchEmpty(tbody, 5, noData, e);
            return;
        }
        if (!res.ok) {
            console.error('Error loading recent sales:', res.status);
            PharmUI.fetchEmpty(tbody, 5, noData, null, res);
            return;
        }
        try {
            const sales = await res.json();

            if (!Array.isArray(sales) || sales.length === 0) {
                PharmUI.tableEmpty(tbody, 5, {
                    icon: 'cart',
                    title: 'No sales yet',
                    message: 'Sales you record will show up here.',
                    actionLabel: 'Record your first sale',
                    actionHref: 'sales.html'
                });
                return;
            }

            tbody.innerHTML = sales.map(sale => `
                <tr>
                    <td>#${htmlEncode(sale.clientName)}</td>
                    <td>${htmlEncode(sale.prescriptionInfo)}</td>
                    <td>${sale.quantity}</td>
                    <td>KSh ${sale.amount.toLocaleString()}</td>
                    <td>${new Date(sale.date).toLocaleDateString()}</td>
                </tr>
            `).join('');

        } catch (e) {
            console.error('Error loading recent sales:', e);
            PharmUI.fetchEmpty(tbody, 5, noData, e);
        }
    }

    // ===== Sales Overview chart =====
    let currentOverviewRange = 'today';

    function setOverviewRange(range, evt) {
        currentOverviewRange = range;
        document.querySelectorAll('.chart-filters button').forEach(b => b.classList.remove('active'));
        if (evt && evt.target) evt.target.classList.add('active');
        loadSalesOverview(range);
    }

    function drawSalesChart(points, hoverIdx) {
        const canvas = document.getElementById('salesChart');
        const empty = document.querySelector('.chart-empty');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        if (!points || points.length === 0) {
            if (empty) empty.style.display = 'flex';
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            chartBars = [];
            return;
        }
        if (empty) empty.style.display = 'none';

        // Match the bitmap to the displayed size for a crisp render.
        const dpr = window.devicePixelRatio || 1;
        const cssW = canvas.clientWidth || 600;
        const cssH = canvas.clientHeight || 240;
        canvas.width = cssW * dpr;
        canvas.height = cssH * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, cssW, cssH);

        const max = Math.max(...points.map(p => p.total || 0), 1);
        const topPad = 22;
        const bottomPad = 26;
        const n = points.length;
        const gap = Math.max(10, Math.min(28, cssW / (n * 3)));
        const barW = Math.max(2, (cssW - gap * (n + 1)) / n);

        // Baseline
        ctx.strokeStyle = '#dce9f8';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, cssH - bottomPad + 0.5);
        ctx.lineTo(cssW, cssH - bottomPad + 0.5);
        ctx.stroke();

        chartBars = [];
        points.forEach((p, i) => {
            const h = ((p.total || 0) / max) * (cssH - topPad - bottomPad);
            const x = gap + i * (barW + gap);
            const y = cssH - bottomPad - h;
            chartBars.push({ x, y, w: barW, h: Math.max(h, 2), point: p });

            ctx.fillStyle = i === hoverIdx ? '#4a8ef4' : '#1769e8';
            roundRect(ctx, x, y, barW, Math.max(h, 2), 6);
            ctx.fill();

            // Value label above the bar (skip when bars are too dense)
            if (barW >= 26) {
                ctx.fillStyle = i === hoverIdx ? '#08234a' : '#68809d';
                ctx.font = '600 10px Inter, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(formatCompact(p.total || 0), x + barW / 2, y - 6);
            }

            ctx.fillStyle = '#68809d';
            ctx.font = '11px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(p.label != null ? String(p.label) : '', x + barW / 2, cssH - 9);
        });
    }

    function formatCompact(n) {
        if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '') + 'k';
        return String(Math.round(n));
    }

    // Chart hover tooltip
    let chartBars = [];
    (function initChartTooltip() {
        document.addEventListener('DOMContentLoaded', () => {
            const canvas = document.getElementById('salesChart');
            const body = document.querySelector('.chart-body');
            if (!canvas || !body) return;

            const tip = document.createElement('div');
            tip.className = 'chart-tooltip';
            tip.hidden = true;
            body.appendChild(tip);

            canvas.addEventListener('mousemove', e => {
                const rect = canvas.getBoundingClientRect();
                const mx = e.clientX - rect.left;
                const my = e.clientY - rect.top;
                const idx = chartBars.findIndex(b => mx >= b.x - 4 && mx <= b.x + b.w + 4);
                const points = chartBars.length ? currentOverviewPoints : [];
                drawSalesChart(points, idx >= 0 ? idx : undefined);
                if (idx >= 0 && chartBars[idx]) {
                    const b = chartBars[idx];
                    tip.textContent = `${b.point.label}: KSh ${(b.point.total || 0).toLocaleString()}`;
                    tip.style.left = Math.min(Math.max(b.x + b.w / 2, 60), rect.width - 60) + 'px';
                    tip.style.top = Math.max(b.y - 8, 4) + 'px';
                    tip.hidden = false;
                    canvas.style.cursor = 'pointer';
                } else {
                    tip.hidden = true;
                    canvas.style.cursor = 'default';
                }
            });
            canvas.addEventListener('mouseleave', () => {
                tip.hidden = true;
                drawSalesChart(currentOverviewPoints);
            });
        });
    })();

    let currentOverviewPoints = [];

    // Redraw the chart to fit when the viewport changes (rotation, resize).
    let chartResizeTimer = null;
    window.addEventListener('resize', () => {
        clearTimeout(chartResizeTimer);
        chartResizeTimer = setTimeout(() => drawSalesChart(currentOverviewPoints), 150);
    });

    async function loadSalesOverview(range) {
        let points = [];
        try {
            const res = await PharmUI.withTimeout(fetch(`${API_BASE}/sale/overview?range=${range}`, {
                method: 'GET',
                credentials: 'include'
            }));
            if (res.ok) points = await res.json();
        } catch (e) {
            console.error('Error loading sales overview:', e);
        }
        currentOverviewPoints = Array.isArray(points) ? points : [];
        drawSalesChart(currentOverviewPoints);
    }

    function roundRect(ctx, x, y, w, h, r) {
        r = Math.min(r, w / 2, h / 2);
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }

    // Navigation
    function toggleSidebar() {
        document.querySelector('.sidebar').classList.toggle('active');
        document.querySelector('.sidebar-overlay').classList.toggle('active');
    }

    function logout() {
        fetch (API_BASE + '/logout',{
        method: 'POST',
        credentials: 'include'
        });
        localStorage.removeItem('user');
        window.location.href = 'index.html';
    }

    // Initialize dashboard
    document.addEventListener('DOMContentLoaded', async function() {
        await loadUser();
        const currentUser = JSON.parse(localStorage.getItem('user'));
        document.getElementById('userName').textContent = currentUser?.name;
        document.getElementById('userRole').textContent = currentUser?.role;
        const initials = currentUser?.name
        .split(" ")
        .map(word=>word[0].toUpperCase())
        .join("");
        document.getElementById('userAvatar').textContent=initials;

        loadDashboardStats();
        loadRecentSales();
        loadSalesOverview('today');
    });
