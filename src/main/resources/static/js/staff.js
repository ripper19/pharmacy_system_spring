let currentMode = 'add';

    // Initialize page
    document.addEventListener('DOMContentLoaded', function() {
        updateButtonStates();
        renderStaffTable();
    });

    // Set mode and update UI
    function setMode(mode) {
        currentMode = mode;
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
            renderStaffTable();
        }
    }

    // Add new staff member
    async function addStaff() {
        const fullName = document.getElementById('fullName').value;
        const email = document.getElementById('email').value;
        const phone = document.getElementById('phone').value;
        const role = document.getElementById('role').value;

        // Basic validation
        if (!fullName || !email || !phone || !role) {
            showMessage('Please fill in all required fields (*)', 'error');
            return;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if(!emailRegex.test(email)){
            showMessage('Invalid email format. Enter valid email', 'error');
        }
        const phoneRegex = /^[\d\s\-\+\(\)]+$/;
        if(!phoneRegex.test(phone)){
            showMessage('Invalid Phone number format. Enter a valid phone number', 'error');
        }
        //addapi
        try{
            const res = await fetch("http://localhost:8080/staff/create",{
                method: "POST",
                headers: { "Content-Type" : "application/json" },
                body: JSON.stringify({fullName,email,phone,role})
            });
            const data = await res.json();

            if(res.status==201){
                showMessage('Successfully added user. They can now Login', 'success');
                clearForm();
                return data;
            }
            else if(res.status==400 || res.status==409){
                const errorMssg = data.message || 'Invalid details provided';
                showMessage(errorMssg, 'error');
                return;
            }
            else if(!res.ok) throw new Error(data.message || 'Failed to add new user');
        }catch(e){
            console.log('Error adding staff:', e);
            showMessage(e.message || 'Error occurred. Try again', 'error');
        }
    }

    // Load staff data for updating
    function loadStaffData() {
        const staffId = document.getElementById('updateStaffId').value;
        const staff = staffData.find(s => s.id === staffId);

        if (staff) {
            document.getElementById('updateName').value = staff.name;
            document.getElementById('updateEmail').value = staff.email;
            document.getElementById('updatePhone').value = staff.phone;
            document.getElementById('updateRole').value = staff.role;
            document.getElementById('updateStatus').value = staff.status;
        } else {
            showMessage('Staff ID not found!', 'error');
            clearUpdateForm();
        }
    }

    // Update staff information
    function updateStaff() {
        const staffId = document.getElementById('updateStaffId').value;
        const staffIndex = staffData.findIndex(s => s.id === staffId);

        if (staffIndex === -1) {
            showMessage('Staff ID not found!', 'error');
            return;
        }

        // Update staff data
        staffData[staffIndex] = {
            ...staffData[staffIndex],
            name: document.getElementById('updateName').value || staffData[staffIndex].name,
            email: document.getElementById('updateEmail').value || staffData[staffIndex].email,
            phone: document.getElementById('updatePhone').value || staffData[staffIndex].phone,
            role: document.getElementById('updateRole').value || staffData[staffIndex].role,
            status: document.getElementById('updateStatus').value || staffData[staffIndex].status
        };

        showMessage(`Staff member ${staffId} updated successfully!`, 'success');
        clearUpdateForm();
        renderStaffTable();
    }

    // Delete staff member
    function deleteStaff() {
        const staffId = document.getElementById('deleteStaffId').value;
        const confirmName = document.getElementById('confirmDelete').value;

        if (!staffId) {
            showMessage('Please enter a Staff ID', 'error');
            return;
        }

        const staff = staffData.find(s => s.id === staffId);
        if (!staff) {
            showMessage('Staff ID not found!', 'error');
            return;
        }

        // Safety confirmation
        if (confirmName !== staff.name) {
            showMessage('Name does not match! Please type the exact staff name to confirm deletion.', 'error');
            return;
        }

        // Remove staff
        staffData = staffData.filter(s => s.id !== staffId);
        showMessage(`Staff member ${staff.name} deleted successfully!`, 'success');
        clearDeleteForm();
        renderStaffTable();
    }

    // Render staff table
    function renderStaffTable() {
        const tableBody = document.getElementById('staffTableBody');
        tableBody.innerHTML = '';

        staffData.forEach(staff => {
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
    }

    // Edit staff from table
    function editStaff(staffId) {
        setMode('update');
        document.getElementById('updateStaffId').value = staffId;
        loadStaffData();
    }

    // Quick delete from table
    function confirmDelete(staffId, staffName) {
        if (confirm(`Are you sure you want to delete ${staffName} (${staffId})?`)) {
            staffData = staffData.filter(s => s.id !== staffId);
            showMessage(`Staff member ${staffName} deleted!`, 'success');
            renderStaffTable();
        }
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
        document.getElementById('department').value = '';
        document.getElementById('salary').value = '';
        document.getElementById('joinDate').value = '';
    }

    function clearUpdateForm() {
        document.getElementById('updateStaffId').value = '';
        document.getElementById('updateName').value = '';
        document.getElementById('updateEmail').value = '';
        document.getElementById('updatePhone').value = '';
        document.getElementById('updateRole').value = '';
        document.getElementById('updateStatus').value = 'active';
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

    function logout() {
        if (confirm('Are you sure you want to logout?')) {
            window.location.href = 'login.html';
        }
    }