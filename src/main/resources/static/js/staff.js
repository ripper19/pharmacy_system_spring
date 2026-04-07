async function loadUserData() {
        const user = localStorage.getItem('user');
        if (!user) {
            console.log("No user")
            window.location.href = 'index.html';
            return;
        }
        await checksuper();
    }
async function checksuper(){
    try{
        const res = await fetch("http://localhost:8080/auth/me",{
            credentials: 'include'
        });
        if(res.status===401){
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = 'index.html';
            return false;
        }
        if(!res.ok){
            showMessage('Failed Session Verification.You will be redirected to login', 'error');
            localStorage.removeItem("user");

            setTimeout(()=> {
                window.location.href = 'index.html';
            }, 1000);
            return;
        }
        const user = await res.json();
        if (user.role !== "SUPERADMIN"){
            showMessage('Not enough priviledges', 'error');
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



    // Initialize page
    document.addEventListener('DOMContentLoaded', function() {
        loadUserData();
        currentMode = getMode();
        setMode(currentMode);
        const currentUser = JSON.parse(localStorage.getItem("user"));
        document.getElementById("userName").textContent = currentUser?.name;
        document.getElementById("userRole").textContent = currentUser?.role;
        const initials = currentUser?.name
        .split(" ")
        .map(word=>word[0].toUpperCase())
        .join("");
        document.getElementById("userAvatar").textContent = initials;

        renderStaffTable();
    });

    function getMode(){
    return localStorage.getItem('staffMode');
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
        const email = document.getElementById('email').value;
        const phoneNo = document.getElementById('phone').value;
        const role = document.getElementById('role').value;

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
            const res = await fetch("http://localhost:8080/staff/create",{
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
        const res = await fetch(`http://localhost:8080/staff/email?email=${email}`, {
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
        document.getElementById("cardId").textContent = staff.Id;
        document.getElementById("cardEmail").textContent =staff.updEmail||staff.email;
        document.getElementById("cardPhone").textContent =staff.phoneNo;

        document.getElementById("staffCard").style.display="block"
    }


    async function updateStaff() {
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
        
        try{
        const myEmail = document.getElementById('updateStaffUser').value;
        const res = await fetch(`http://localhost:8080/staff/supdate/${myEmail}`, {
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
    }

    // Delete staff member
    async function deleteStaff() {
        const id = document.getElementById('deleteStaffId').value;
        const email = document.getElementById('confirmDelete').value;

        if(!id && !email || !email){
            throw new Error("Please confirm the Staff to be deleted");
        }
        const res = await fetch("http://localhost:8080/staff/delete",{
            headers: {'Content-Type': 'application/json'},
            method:'DELETE',
            credentials: 'include',
            body: JSON.stringify({id,email})
        });
        if(!res.ok) {showMessage(`Failed to delete user!`,`error`);}
        if(res.ok) {showMessage(`User deleted`, `success`)};
        clearDeleteForm();
    }

    // Render staff table
    async function renderStaffTable() {
        const tableBody = document.getElementById('staffTableBody');
        tableBody.innerHTML = '';

        const res = await fetch ("http://localhost:8080/staff/all",{
            credentials: 'include'
        });
        if(!res.ok){
            showMessage("Failed to fetch all staff!!", "error");
            return;
        };
        try{
        const users = await res.json();
        users.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML=`
            <td>${user.Id}</td>
            <td>${user.name}</td>
            <td>${user.email}</td>
            <td>${user.role}</td>
            <td>${user.phoneNo}</td>
            <td>${user.joined}</td>
            <td class="action-cell">
            <button class="icon-btn edit-btn" onclick="editStaff('${user.email}')">Edit</button>
            <button class="icon-btn delete-btn" onclick="confirmDelete('${user.Id}', '${user.email}')">Delete</button>
            </td>`;
            tableBody.appendChild(row);
        });
    }catch(e){
        showMessage("Error!!");
        console.log(e.message);
    }
    }

    // Edit staff from table
    function editStaff(staffEmail) {
        document.getElementById('updateStaffUSer').value = staffEmail;
        loadStaffData();
    }

    // Quick delete from table
    async function confirmDelete(id, email) {
        if (confirm(`Are you sure you want to delete ${email}?`)) {
            console.log(id,email);
            const res = await fetch("http://localhost:8080/staff/delete", {
                headers:{"Content-Type": "application/json"},
                method: 'DELETE',
                credentials: 'include',
                body: JSON.stringify({id, email})
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
            staff.id.toLowerCase().includes(searchTerm) ||
            staff.name.toLowerCase().includes(searchTerm) ||
            staff.role.toLowerCase().includes(searchTerm) ||
            staff.department.toLowerCase().includes(searchTerm)
        );

        const tableBody = document.getElementById('staffTableBody');
        tableBody.innerHTML = '';

        filtered.forEach(staff => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${staff.id}</td>
                <td>${staff.name}</td>
                <td>${staff.role}</td>
                <td>${staff.department}</td>
                <td>${staff.phone}</td>
                <td><span class="status-badge ${staff.status === 'active' ? 'status-active' : 'status-inactive'}">${staff.status}</span></td>
                <td class="action-cell">
                    <button class="icon-btn edit-btn" onclick="editStaff('${staff.id}')">Edit</button>
                    <button class="icon-btn delete-btn" onclick="confirmDelete('${staff.id}', '${staff.name}')">Delete</button>
                </td>
            `;
            tableBody.appendChild(row);
        });

        if (filtered.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px;">No staff members found matching "${searchTerm}"</td></tr>`;
        }
    }

    // Clear forms
    function clearForm() {
        document.getElementById('fullName').value = '';
        document.getElementById('email').value = '';
        document.getElementById('phone').value = '';
        document.getElementById('role').value = '';
    }

    function clearUpdateForm() {
        document.getElementById('updateStaffUser').value = '';
        document.getElementById('updateName').value = '';
        document.getElementById('updateEmail').value = '';
        document.getElementById('updatePhone').value = '';
        document.getElementById('updateRole').value = '';

        document.getElementById("staffCard").style.display = "none"
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
    function showNotifications() {
        alert('Notifications would appear here');
    }

    async function logout() {
        if (confirm('Are you sure you want to logout?')) {
            const res = await fetch("http://localhost:8080/logout", {
                credentials: 'include',
                method: 'POST'
            });
            window.location.href = 'index.html';
        }
    }