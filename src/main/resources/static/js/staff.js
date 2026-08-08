async function loadUserData() {
        const user = localStorage.getItem('user');
        if (!user) {
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
                showMessage('Failed Session Verification. You will be redirected to login', 'error');
                localStorage.clear();
                sessionStorage.clear();

                setTimeout(()=> {
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
            
            if (role !== "SUPERADMIN"){
                showMessage('Not enough privileges', 'error');
                window.location.href = 'dash.html';
            }
        }catch(e){
            showMessage('Failed', 'error');
            console.log(e.message);
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = 'index.html';
        }
    }

let staffLoaded = false;
let currentFetch = null;
let resetTimeOut= null;
let currentStaffPage = 0;

    // Initialize page
    document.addEventListener('DOMContentLoaded', function() {
        loadUserData();
        currentMode = getMode();
        setMode(currentMode);

        renderStaffTable();
        PharmUI.attachLiveValidation(document.getElementById('staffForm'));
    });

    function getMode(){
    // Default to the Add Staff module when no mode has been chosen yet.
    return localStorage.getItem('staffMode') || 'add';
}
    // Set mode and update UI
    function setMode(mode) {
        currentMode = mode;
        localStorage.setItem('staffMode', mode);
        updateButtonStates();
        showCurrentForm();
    }

    // Update button active states
    function updateButtonStates() {
        const buttons = document.querySelectorAll('.action-btn');
        buttons.forEach(btn => {
            const btnMode = btn.textContent.includes('Add') ? 'add' :
                          btn.textContent.includes('Update') ? 'update' :
                          btn.textContent.includes('Delete') ? 'delete' : 'view';
            btn.classList.toggle('active', btnMode === currentMode);
        });
    }

    // Show the appropriate form based on mode
    function showCurrentForm() {
        // Hide all forms
        document.getElementById('addForm').classList.add('hidden');
        document.getElementById('updateForm').classList.add('hidden');
        document.getElementById('deleteForm').classList.add('hidden');
        document.getElementById('viewTable').classList.add('hidden');

        // Show the active form
        if (currentMode === 'add') {
            document.getElementById('addForm').classList.remove('hidden');
        } else if (currentMode === 'update') {
            document.getElementById('updateForm').classList.remove('hidden');
        } else if (currentMode === 'delete') {
            document.getElementById('deleteForm').classList.remove('hidden');
        } else if (currentMode === 'view') {
            document.getElementById('viewTable').classList.remove('hidden');
        }
    }

    async function addStaff(e) {
        const btn = e.target;
        if(btn.disabled) return;

        const name = document.getElementById('fullName').value;
        const email = document.getElementById('updEmail').value;
        const phoneNo = document.getElementById('phone').value;
        const role = document.getElementById('role').value;

        if (!PharmUI.validate(document.getElementById('addForm'))) {
            showMessage('Please fix the highlighted fields', 'warning');
            return;
        }
        if (!name || !email || !phoneNo) {
            showMessage('Please fill in all required fields (*)', 'warning');
            return;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if(!emailRegex.test(email)){
            showMessage('Invalid email format. Enter valid email', 'warning');
            return;
        }
        const phoneRegex = /^[\d\s\-\+\(\)]+$/;
        if(!phoneRegex.test(phoneNo)){
            showMessage('Invalid Phone number format. Enter a valid phone number', 'warning');
            return;
        }
        const toBeSent = {name,email,phoneNo};
        if(role){
            toBeSent.role = role;
        }

        //disable
        btn.disabled=true;
        try{
            const res = await fetch(API_BASE + "/staff/create",{
                method: "POST",
                headers: { "Content-Type" : "application/json" },
                credentials: 'include',
                body: JSON.stringify(toBeSent)
            });
            if(res.status==201){
                showMessage('Successfully added user. They can now Login', 'success');
                clearForm();
                return true;
            }
            else if(res.status==400 || res.status==409){
                const errorMssg = 'Invalid details provided';
                showMessage(errorMssg, `error`);
                return;
            }
            else if(!res.ok) showMessage(`Failed to add new user`, `error`);

        }catch(e){
            console.log('Error adding staff:', e);
            showMessage(e.message || `Error occurred. Try again`, `error`);
        }
        finally{
            btn.disabled=false;
        }
    }


    async function loadStaffData() {
        const email = encodeURIComponent(document.getElementById('updateStaffUser').value);
        try{
        if(!email) return;
        if(currentFetch){
            currentFetch.abort();
        }
        currentFetch = new AbortController();
        const res = await fetch(`${API_BASE}/staff/email?email=${email}`, {
            credentials : 'include',
            signal: currentFetch.signal
        })
        if(!res.ok){
            showMessage(`Staff not found`, `error`);
            return;
        }
        const staff = await res.json();
        showStaffCard(staff);
        document.getElementById('updateStaffUser').readOnly=true;
        staffLoaded= true;
    }catch(e){
        if(e.name === 'AbortError') return;
        showMessage("Requested failed", "error");
    }finally{
        currentFetch=null;
    }
    }
    function showStaffCard(staff){
        document.getElementById("cardName").textContent = staff.name;
        document.getElementById("cardRole").textContent = staff.role;
        document.getElementById("cardId").textContent = staff.publicId;
        document.getElementById("cardEmail").textContent =staff.updEmail||staff.email;
        document.getElementById("cardPhone").textContent =staff.phoneNo;

        document.getElementById("staffCard").classList.remove('hidden');
    }


    async function updateStaff(btn) {
        if (staffLoaded === false){
            showMessage(`Cannot update unavailable user`, `warning`);
            return;
        }
        const name = document.getElementById("updateName").value;
        const updEmail = document.getElementById("updateEmail").value;
        const role = document.getElementById("updateRole").value;
        const phoneNo = document.getElementById("updatePhone").value;

        if(!name && !updEmail && !role && !phoneNo){
            showMessage(`Cant update nil values`, `warning`);
            return;
        }

        const updatesBeingSent = {};
        if(name) updatesBeingSent.name=name;
        if(updEmail) updatesBeingSent.updEmail=updEmail;
        if(role) updatesBeingSent.role=role;
        if(phoneNo) updatesBeingSent.phoneNo=phoneNo;

        await PharmUI.guard(btn, 'Updating…', async () => {
            try{
                const myEmail = document.getElementById('updateStaffUser').value;
                const res = await fetch(`${API_BASE}/staff/supdate/${myEmail}`, {
                    credentials: 'include',
                    headers: {'Content-Type': 'application/json'},
                    method: 'PATCH',
                    body: JSON.stringify(updatesBeingSent)
                });
                if(!res.ok){
                    showMessage(`Failed to update`, `error`)
                    return;
                }
                showMessage("Staff updated", "success");
                const updatedStaff = await res.json();
                showStaffCard(updatedStaff);

                if(resetTimeOut) clearTimeout(resetTimeOut);
                resetTimeOut = setTimeout(() => {
                    staffLoaded = false;
                    clearUpdateForm();
                    document.getElementById("updateStaffUser").readOnly=false;
                }, 25000);
            }catch(e){
                showMessage("Unknown error occurred duriong update", "error");
                console.log(e.message);
            }
        });
    }

    // Delete staff member
    async function deleteStaff(btn) {
        const publicId = document.getElementById('deleteStaffId').value;
        const email = document.getElementById('confirmDelete').value;

        if(!publicId && !email || !email){
            showMessage("Please confirm the Staff to be deleted", "warning");
            return;
        }
        await PharmUI.guard(btn, 'Deleting…', async () => {
            try {
                const res = await fetch(API_BASE + "/staff/delete",{
                    headers: {'Content-Type': 'application/json'},
                    method:'DELETE',
                    credentials: 'include',
                    body: JSON.stringify({publicId,email})
                });
                if(!res.ok) {showMessage(`Failed to delete user!`,`error`); return;}
                if(res.ok) {showMessage(`User deleted`, `success`)};
                clearDeleteForm();
            } catch (e) {
                console.log("Error deleting staff:", e);
                showMessage("Failed to delete user", "error");
            }
        });
    }

    // Render staff table
    async function renderStaffTable(page) {
        if (page === undefined) page = currentStaffPage;
        currentStaffPage = page;
        const tableBody = document.getElementById('staffTableBody');
        tableBody.innerHTML = PharmUI.skeletonRows(7);

        let res;
        try {
            res = await PharmUI.withTimeout(fetch (API_BASE + "/staff/all?page=" + page + "&size=20",{
                credentials: 'include'
            }));
        } catch (e) {
            console.log('Failed to load staff', e);
            // No API linked / network failure → "no data to display".
            // Genuine client timeout → "couldn't load" retry state.
            PharmUI.fetchEmpty(tableBody, 7, {
                icon: 'users',
                title: 'No staff to display',
                message: 'Team members you add will appear here.',
                retryTitle: "Couldn't load staff",
                onRetry: () => renderStaffTable(currentStaffPage)
            }, e);
            return;
        }
        if(!res.ok){
            // Genuine server error (408 / 5xx) → "couldn't load" retry.
            // Any other status → "no data to display".
            showMessage("Couldn't load staff (" + res.status + ")", "error");
            PharmUI.fetchEmpty(tableBody, 7, {
                icon: 'users',
                title: 'No staff to display',
                message: 'Team members you add will appear here.',
                retryTitle: "Couldn't load staff",
                onRetry: () => renderStaffTable(currentStaffPage)
            }, null, res);
            return;
        }
        try{
        const pageData = await res.json();
        const users = Array.isArray(pageData) ? pageData : (pageData.content || []);
        const totalPages = (pageData && pageData.totalPages) ? pageData.totalPages : 1;
        const totalElements = (pageData && pageData.totalElements != null) ? pageData.totalElements : users.length;
        if (!users || users.length === 0) {
            PharmUI.tableEmpty(tableBody, 7, {
                icon: 'users',
                title: 'No staff yet',
                message: 'Team members you add will appear here.',
                actionLabel: 'Add staff',
                actionHref: 'staff.html'
            });
            renderStaffPager(tableBody, page, totalPages, totalElements);
            return;
        }
        // Clear the skeleton rows before appending real data.
        tableBody.innerHTML = '';
        users.forEach(user => {
            const row = document.createElement('tr');

            const td1 = document.createElement('td');
            td1.textContent = user.publicId;
            row.appendChild(td1);

            const td2 = document.createElement('td');
            td2.textContent = user.name;
            row.appendChild(td2);

            const td3 = document.createElement('td');
            td3.textContent = user.email;
            row.appendChild(td3);

            const td4 = document.createElement('td');
            td4.textContent = user.role;
            row.appendChild(td4);

            const td5 = document.createElement('td');
            td5.textContent = user.phoneNo;
            row.appendChild(td5);

            const td6 = document.createElement('td');
            td6.textContent = user.joined;
            row.appendChild(td6);

            const tdActions = document.createElement('td');
            tdActions.className = 'action-cell';
            const btnEdit = document.createElement('button');
            btnEdit.className = 'icon-btn edit-btn';
            btnEdit.textContent = 'Edit';
            btnEdit.addEventListener('click', () => editStaff(user.email));
            const btnDelete = document.createElement('button');
            btnDelete.className = 'icon-btn delete-btn';
            btnDelete.textContent = 'Delete';
            btnDelete.addEventListener('click', () => confirmDelete(user.publicId, user.email));
            tdActions.appendChild(btnEdit);
            tdActions.appendChild(btnDelete);
            row.appendChild(tdActions);

            tableBody.appendChild(row);
        });
        renderStaffPager(tableBody, page, totalPages, totalElements);
    }catch(e){
        console.log('Failed to parse staff', e);
        PharmUI.fetchEmpty(tableBody, 7, {
            icon: 'users',
            title: 'No staff to display',
            message: 'Team members you add will appear here.',
            retryTitle: "Couldn't load staff",
            onRetry: () => renderStaffTable(currentStaffPage)
        }, e);
    }
    }

    // Render the pager below the staff table.
    function renderStaffPager(tableBody, page, totalPages, totalElements) {
        let pagerEl = document.getElementById('staffViewPager');
        if (!pagerEl) {
            pagerEl = document.createElement('div');
            pagerEl.id = 'staffViewPager';
            const table = tableBody.closest('table');
            if (table) table.after(pagerEl);
            else tableBody.parentElement.appendChild(pagerEl);
        }
        PharmUI.pager(pagerEl, { page: page, totalPages: totalPages, totalElements: totalElements }, function (p) {
            renderStaffTable(p);
        });
    }

    // Edit staff from table
    function editStaff(staffEmail) {
        document.getElementById('updateStaffUSer').value = staffEmail;
        loadStaffData();
    }

    // Quick delete from table
    async function confirmDelete(publicId, email) {
        const ok = await PharmUI.confirm({
            title: 'Delete staff member?',
            message: `Are you sure you want to delete ${email}?`,
            confirmText: 'Delete',
            danger: true
        });
        if (ok) {
            console.log(publicId,email);
            const res = await fetch(API_BASE + "/staff/delete", {
                headers:{"Content-Type": "application/json"},
                method: 'DELETE',
                credentials: 'include',
                body: JSON.stringify({publicId, email})
            });
            if(!res.ok){
                showMessage("Failed!", "error");
                return;
            }
            showMessage(`Deleted ${email}`, 'success');
        }
        renderStaffTable();
    }

    // Search staff
    function searchStaff() {
        const searchTerm = document.getElementById('staffSearch').value.toLowerCase();
        if (!searchTerm) {
            renderStaffTable();
            return;
        }

        const filtered = staffData.filter(staff =>
            staff.publicId.toLowerCase().includes(searchTerm) ||
            staff.name.toLowerCase().includes(searchTerm) ||
            staff.role.toLowerCase().includes(searchTerm) ||
            staff.department.toLowerCase().includes(searchTerm)
        );

        const tableBody = document.getElementById('staffTableBody');
        tableBody.innerHTML = '';

        filtered.forEach(staff => {
            const row = document.createElement('tr');

            const td1 = document.createElement('td');
            td1.textContent = staff.publicId;
            row.appendChild(td1);

            const td2 = document.createElement('td');
            td2.textContent = staff.name;
            row.appendChild(td2);

            const td3 = document.createElement('td');
            td3.textContent = staff.role;
            row.appendChild(td3);

            const td4 = document.createElement('td');
            td4.textContent = staff.department;
            row.appendChild(td4);

            const td5 = document.createElement('td');
            td5.textContent = staff.phone;
            row.appendChild(td5);

            const td6 = document.createElement('td');
            const badge = document.createElement('span');
            badge.className = 'status-badge ' + (staff.status === 'active' ? 'status-active' : 'status-inactive');
            badge.textContent = staff.status;
            td6.appendChild(badge);
            row.appendChild(td6);

            const tdActions = document.createElement('td');
            tdActions.className = 'action-cell';
            const btnEdit = document.createElement('button');
            btnEdit.className = 'icon-btn edit-btn';
            btnEdit.textContent = 'Edit';
            btnEdit.addEventListener('click', () => editStaff(staff.publicId));
            const btnDelete = document.createElement('button');
            btnDelete.className = 'icon-btn delete-btn';
            btnDelete.textContent = 'Delete';
            btnDelete.addEventListener('click', () => confirmDelete(staff.publicId, staff.name));
            tdActions.appendChild(btnEdit);
            tdActions.appendChild(btnDelete);
            row.appendChild(tdActions);

            tableBody.appendChild(row);
        });

        if (filtered.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px;">No staff members found matching "' + htmlEncode(searchTerm) + '"</td></tr>';
        }
    }

    // Clear forms
    function clearForm() {
        document.getElementById('fullName').value = '';
        document.getElementById('updEmail').value = '';
        document.getElementById('phone').value = '';
        document.getElementById('role').value = '';
    }

    function clearUpdateForm() {
        document.getElementById('updateStaffUser').value = '';
        document.getElementById('updateName').value = '';
        document.getElementById('updateEmail').value = '';
        document.getElementById('updatePhone').value = '';
        document.getElementById('updateRole').value = '';

        document.getElementById("staffCard").classList.add('hidden');
    }

    function clearDeleteForm() {
        document.getElementById('deleteStaffId').value = '';
        document.getElementById('confirmDelete').value = '';
    }

    // Show message
    function showMessage(message, type) {
        const messageArea = document.getElementById('messageArea');
        messageArea.className = `message ${type}`;
        messageArea.textContent = message;
        messageArea.style.display = 'block';

        // Auto-hide after 5 seconds
        setTimeout(() => {
            messageArea.style.display = 'none';
        }, 5000);
    }

    // Navigation functions
    function toggleSidebar() {
        document.querySelector('.sidebar').classList.toggle('active');
        document.querySelector('.sidebar-overlay').classList.toggle('active');
    }

    async function logout() {
        const ok = await PharmUI.confirm({
            title: 'Log out?',
            message: 'Are you sure you want to logout?',
            confirmText: 'Logout'
        });
        if (ok) {
            await fetch(API_BASE + "/logout", {
                credentials: 'include',
                method: 'POST'
            });
            window.location.href = 'index.html';
        }
    }