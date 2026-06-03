async function loadUser(){
    const user = localStorage.getItem('user');
    if(!user){
        localStorage.clear();
        sessionStorage.clear();

        fetch("https://pharmacy-system-spring-utt5.onrender.com/logout", {
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
        const res = await fetch("https://pharmacy-system-spring-utt5.onrender.com/auth/me", {
            credentials: 'include'
        });
        if(res.status === 401){
            window.location.href = 'index.html';
            return;
        }
        if(!res.ok){
            showMessage("Invalidated session token. Redirecting to login", "error");
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
        
        if(role !== 'SUPERADMIN' && role !== 'ADMIN'){
            showMessage("Insufficient privileges", "error");
            setTimeout(()=> {
                window.location.href = 'sales.html';
            }, 1000);
            return;
        }
    }catch(e){
        console.log("Failure", e);
        showMessage("Failed", "error");
    }
}

let currentMode = 'add';
let medicineTypes = [];

    document.addEventListener('DOMContentLoaded', function() {
        loadUser();
        updateButtonStates();
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
            let btnMode = 'add';
            if (btn.textContent.includes('Update')) btnMode = 'update';
            else if (btn.textContent.includes('Delete')) btnMode = 'delete';
            else if (btn.textContent.includes('Single')) btnMode = 'stock-check';
            else if (btn.textContent.includes('Type')) btnMode = 'stock-by-type';
            else if (btn.textContent.includes('View')) btnMode = 'view';
            else if (btn.textContent.includes('Manage')) btnMode = 'types';

            btn.classList.toggle('active', btnMode === currentMode);
        });
    }

    function showCurrentForm() {
        document.getElementById('addForm').classList.add('hidden');
        document.getElementById('updateForm').classList.add('hidden');
        document.getElementById('deleteForm').classList.add('hidden');
        document.getElementById('stockCheckForm').classList.add('hidden');
        document.getElementById('stockByTypeForm').classList.add('hidden');
        document.getElementById('viewTable').classList.add('hidden');

        if (currentMode === 'add') {
            document.getElementById('addForm').classList.remove('hidden');
        } else if (currentMode === 'update') {
            document.getElementById('updateForm').classList.remove('hidden');
        } else if (currentMode === 'delete') {
            document.getElementById('deleteForm').classList.remove('hidden');
        } else if (currentMode === 'stock-check') {
            document.getElementById('stockCheckForm').classList.remove('hidden');
        } else if (currentMode === 'stock-by-type') {
            document.getElementById('stockByTypeForm').classList.remove('hidden');
        } else if (currentMode === 'view') {
            document.getElementById('viewTable').classList.remove('hidden');
            renderMedicinesTable();
        }
    }

    async function addMedicine() {
        const sku = document.getElementById('sku').value;
        const medicineName = document.getElementById('medicineName').value;
        const quantity = parseInt(document.getElementById('quantity').value);
        const type = document.getElementById('medicineType').value;
        const description = document.getElementById('description').value;
        const cost = document.getElementById('price').value;

        

        if (!sku || !medicineName || !type || !description || isNaN(quantity) || isNaN(cost)) {
            showMessage('Please fill in all required fields (*)', 'error');
            return;
        }
        const newMedicine = {sku, medicineName,quantity,type,description,cost};
        const threshold = parseInt(document.getElementById('lowStockThreshold').value);

        if(!isNaN(threshold)) newMedicine.lowStockThreshold = threshold;

        try{
            const res = await fetch("https://pharmacy-system-spring-utt5.onrender.com/medicine/create", {
                headers: {'Content-Type':'application/json'},
                credentials: 'include',
                method: 'POST',
                body: JSON.stringify({newMedicine})
            });
            const returnedResult = await res.json();
            if(!res.ok){
                showMessage(`${returnedResult.message}`, 'error');
                return;
            }
            showMessage(`${returnedResult.message}`, 'success');
            renderMedicinesTable();

        }catch(e){
            console.log("Error:", e);
            showMessage("Failed to add medicine", "error");
        }
    }

    // Load medicine data for updating
    function loadMedicineData() {
        const sku = document.getElementById('updateSku').value;
        const medicine = medicinesData.find(m => m.sku === sku);

        if (medicine) {
            document.getElementById('updateName').value = medicine.name;
            document.getElementById('updateType').value = medicine.type;
            document.getElementById('updateQuantity').value = medicine.quantity;
            document.getElementById('updateThreshold').value = medicine.threshold;
            document.getElementById('updatePrice').value = medicine.price;
        } else {
            showMessage('SKU not found!', 'error');
            clearUpdateForm();
        }
    }

    // Update medicine information
    function updateMedicine() {
        const sku = document.getElementById('updateSku').value;
        const medicineIndex = medicinesData.findIndex(m => m.sku === sku);

        if (medicineIndex === -1) {
            showMessage('SKU not found!', 'error');
            return;
        }

        // Update medicine data
        medicinesData[medicineIndex] = {
            ...medicinesData[medicineIndex],
            name: document.getElementById('updateName').value || medicinesData[medicineIndex].name,
            type: document.getElementById('updateType').value || medicinesData[medicineIndex].type,
            quantity: parseInt(document.getElementById('updateQuantity').value) || medicinesData[medicineIndex].quantity,
            threshold: parseInt(document.getElementById('updateThreshold').value) || medicinesData[medicineIndex].threshold,
            price: parseFloat(document.getElementById('updatePrice').value) || medicinesData[medicineIndex].price
        };

        showMessage(`Medicine ${sku} updated successfully!`, 'success');
        clearUpdateForm();
        renderMedicinesTable();
    }

    
    async function deleteMedicine() {
        const name = document.getElementById('deleteName').value;
        const sku = document.getElementById('confirmDeleteMedicine').value;

        try{
            const res = await fetch("https://pharmacy-system-spring-utt5.onrender.com/medicine/delete",{
                credentials:'include',
                method:'DELETE',
                headers: {'Content-Type': 'application/json'},
                body:JSON.stringify({name,sku})
            });
            const deleteRes = await res.json();
            if(!res.ok){
                showMessage(deleteRes.deleted, 'error');
                return;
            }
            showMessage(deleteRes.deleted, 'success');
            clearDeleteForm();
            renderMedicineTypes();
        }catch(e){
            console.log("Error occured", e);
            showMessage("Error occured", "error");
        }
    }
    async function checkStock() {
        const name = document.getElementById('checkMedicineName').value;
        if (!name) {
            showMessage('Please enter a medicine name', 'error');
            return;
        }
        try{
            const res = await fetch("https://pharmacy-system-spring-utt5.onrender.com/medicine/checkMedicine",{
                credentials:'include',
                headers: {'Content-Type':'application/json'},
                method: POST,
                body:JSON.stringify({name})
            });
            //medicine returned from checking one. I thik I have a lot of variables named medicine.
            const medicine = await res.json();
            if(!res.ok){
                showMessage(medicine, "error");
                return;
            }
        const stockStatus = getStockStatus(medicine.quantity, medicine.threshold);
        const statusClass = getStockStatusClass(stockStatus);

        document.getElementById('stockResult').innerHTML = `
            <h4>${medicine.name} (${medicine.sku})</h4>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-top: 15px;">
                <div>
                    <strong>Current Stock:</strong>
                    <div style="font-size: 28px; font-weight: bold; color: ${getStockColor(medicine.quantity, medicine.threshold)}">${medicine.quantity}</div>
                </div>
                <div>
                    <strong>Threshold:</strong>
                    <div style="font-size: 20px; color: #666;">${medicine.threshold}</div>
                </div>
                <div>
                    <strong>Type:</strong>
                    <div>${medicine.type}</div>
                </div>
                <div>
                    <strong>Price:</strong>
                    <div>KSh ${medicine.price.toFixed(2)}</div>
                </div>
                <div>
                    <strong>Status:</strong>
                    <div><span class="stock-badge ${statusClass}">${stockStatus}</span></div>
                </div>
                <div>
                    <strong>Safety Margin:</strong>
                    <div>${Math.max(0, medicine.quantity - medicine.threshold)} units</div>
                </div>
            </div>
            ${medicine.quantity <= medicine.threshold ?
                `<div style="margin-top: 15px; padding: 10px; background: #ffebee; border-radius: 5px; color: #c62828;">
                    ⚠️ <strong>Low Stock Alert:</strong> Consider reordering soon!
                </div>` : ''}
        `;
        document.getElementById('stockResult').classList.remove('hidden');
    }catch(e){
        console.log("Error:", e);
        showMessage("Failed to check");
    }
}

    // Check stock by medicine type
    async function checkStockByType() {
        const type = document.getElementById('checkMedicineType').value;
        if (!type) {
            showMessage('Please select a medicine type', 'error');
            return;
        }
        try{
            const res = await fetch("https://pharmacy-system-spring-utt5.onrender.com/medicine/checkStocktype", {
                credentials: 'include',
                headers: {'Content-Type': 'application/json'},
                method:POST,
                body: JSON.stringify(type)
            });
            const meds = await res.json();
            if(!res.ok){
                showMessage(meds, "error");
                return;
            }
        if (meds === null) {
            document.getElementById('stockByTypeResult').innerHTML = `
                <div class="message warning">No medicines found for type: ${type}</div>
            `;
            document.getElementById('stockByTypeResult').classList.remove('hidden');
            return;
        }

        const totalQuantity = meds.reduce((sum, meds) => sum + meds.quantity, 0);
        const totalValue = filtered.reduce((sum, meds) => sum + (meds.quantity * med.price), 0);
        const lowStockCount = filtered.filter(meds => meds.quantity <= meds.threshold).length;


        document.getElementById('stockByTypeResult').innerHTML = `
            <div class="stock-result">
                <h4>Stock Summary${type !== 'all' ? ` for ${type}` : ''}</h4>
                ${type === 'all' ? typeSummary : ''}

                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 20px;">
                    <div style="text-align: center; padding: 15px; background: #e8f5e9; border-radius: 8px;">
                        <div style="font-size: 12px; color: #666;">Total Medicines</div>
                        <div style="font-size: 28px; font-weight: bold; color: #2e7d32;">${meds.length}</div>
                    </div>
                    <div style="text-align: center; padding: 15px; background: #e3f2fd; border-radius: 8px;">
                        <div style="font-size: 12px; color: #666;">Total Quantity</div>
                        <div style="font-size: 28px; font-weight: bold; color: #1976d2;">${totalQuantity}</div>
                    </div>
                    <div style="text-align: center; padding: 15px; background: ${lowStockCount > 0 ? '#fff3e0' : '#e8f5e9'}; border-radius: 8px;">
                        <div style="font-size: 12px; color: #666;">Low Stock Items</div>
                        <div style="font-size: 28px; font-weight: bold; color: ${lowStockCount > 0 ? '#ef6c00' : '#2e7d32'};">${lowStockCount}</div>
                    </div>
                </div>

                <div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
                    <strong>Inventory Value:</strong> KSh ${totalValue.toFixed(2)}
                </div>
            </div>
        `;
        document.getElementById('stockByTypeResult').classList.remove('hidden');
    }catch(e){
        console.log("Fatal error", e);
        showMessage("Error occured", "error");
    }
}

    // Render medicines table
    function renderMedicinesTable() {
        const tableBody = document.getElementById('medicinesTableBody');
        tableBody.innerHTML = '';

        medicinesData.forEach(medicine => {
            const stockStatus = getStockStatus(medicine.quantity, medicine.threshold);
            const statusClass = getStockStatusClass(stockStatus);

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${medicine.sku}</td>
                <td><strong>${medicine.name}</strong><br><small style="color: #666;">${medicine.description.substring(0, 50)}${medicine.description.length > 50 ? '...' : ''}</small></td>
                <td>${medicine.type}</td>
                <td>${medicine.quantity}</td>
                <td>${medicine.threshold}</td>
                <td><span class="stock-badge ${statusClass}">${stockStatus}</span></td>
                <td>KSh ${medicine.price.toFixed(2)}</td>
                <td class="action-cell">
                    <button class="icon-btn edit-btn" onclick="editMedicine('${medicine.sku}')">Edit</button>
                    <button class="icon-btn delete-btn" onclick="confirmDeleteMedicine('${medicine.sku}', '${medicine.name}')">Delete</button>
                    <button class="icon-btn" style="background: #e8f5e9; color: #2e7d32;" onclick="checkSingleMedicine('${medicine.sku}')">Stock</button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }

    // Helper functions for stock status
    function getStockStatus(quantity, threshold) {
        if (quantity === 0) return 'Out of Stock';
        if (quantity <= threshold) return 'Low Stock';
        if (quantity <= threshold * 2) return 'Medium Stock';
        return 'High Stock';
    }

    function getStockStatusClass(status) {
        switch(status) {
            case 'High Stock': return 'stock-high';
            case 'Medium Stock': return 'stock-medium';
            case 'Low Stock': return 'stock-low';
            case 'Out of Stock': return 'stock-out';
            default: return 'stock-out';
        }
    }

    function getStockColor(quantity, threshold) {
        if (quantity === 0) return '#c62828';
        if (quantity <= threshold) return '#ef6c00';
        if (quantity <= threshold * 2) return '#ff9800';
        return '#2e7d32';
    }

    // Edit medicine from table
    function editMedicine(sku) {
        setMode('update');
        document.getElementById('updateSku').value = sku;
        loadMedicineData();
    }

    // Check single medicine from table
    function checkSingleMedicine(sku) {
        setMode('stock-check');
        const medicine = medicinesData.find(m => m.sku === sku);
        if (medicine) {
            document.getElementById('checkMedicineName').value = medicine.name;
            checkStock();
        }
    }

    // Quick delete from table
    function confirmDeleteMedicine(sku, name) {
        if (confirm(`Are you sure you want to delete ${name} (${sku})?\n\nThis action cannot be undone.`)) {
            medicinesData = medicinesData.filter(m => m.sku !== sku);
            showMessage(`Medicine ${name} deleted!`, 'success');
            renderMedicinesTable();
        }
    }

    // Search medicines
    function searchMedicines() {
        const searchTerm = document.getElementById('medicineSearch').value.toLowerCase();
        if (!searchTerm) {
            renderMedicinesTable();
            return;
        }

        const filtered = medicinesData.filter(medicine =>
            medicine.sku.toLowerCase().includes(searchTerm) ||
            medicine.name.toLowerCase().includes(searchTerm) ||
            medicine.type.toLowerCase().includes(searchTerm) ||
            medicine.description.toLowerCase().includes(searchTerm)
        );

        const tableBody = document.getElementById('medicinesTableBody');
        tableBody.innerHTML = '';

        filtered.forEach(medicine => {
            const stockStatus = getStockStatus(medicine.quantity, medicine.threshold);
            const statusClass = getStockStatusClass(stockStatus);

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${medicine.sku}</td>
                <td><strong>${medicine.name}</strong><br><small style="color: #666;">${medicine.description.substring(0, 50)}${medicine.description.length > 50 ? '...' : ''}</small></td>
                <td>${medicine.type}</td>
                <td>${medicine.quantity}</td>
                <td>${medicine.threshold}</td>
                <td><span class="stock-badge ${statusClass}">${stockStatus}</span></td>
                <td>KSh ${medicine.price.toFixed(2)}</td>
                <td class="action-cell">
                    <button class="icon-btn edit-btn" onclick="editMedicine('${medicine.sku}')">Edit</button>
                    <button class="icon-btn delete-btn" onclick="confirmDeleteMedicine('${medicine.sku}', '${medicine.name}')">Delete</button>
                </td>
            `;
            tableBody.appendChild(row);
        });

        if (filtered.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 20px;">No medicines found matching "${searchTerm}"</td></tr>`;
        }
    }

    // Medicine Types Management
    function openMedicineTypesModal() {
        document.getElementById('medicineTypesModal').style.display = 'block';
        renderMedicineTypes();
    }

    function closeMedicineTypesModal() {
        document.getElementById('medicineTypesModal').style.display = 'none';
    }

    async function renderMedicineTypes() {
        const typesList = document.getElementById('medicineTypesList');
        typesList.innerHTML = '';

        const res = await fetch("https://pharmacy-system-spring-utt5.onrender.com/Medicine_type/getAll", {
            credentials: 'include',
        });
        if(!res.ok){
            showMessage("Failed to fetch Types", "error");
        }
        const medicineTypesResult = await res.json();
        medicineTypes.length=0;
        medicineTypesResult.forEach(type => {
            medicineTypes.push(type);
            const typeDiv = document.createElement('div');
            typeDiv.className = 'type-item';
            typeDiv.innerHTML = `
                <div>
                    <strong style="text-transform: capitalize;">${type}</strong>
                    <div style="font-size: 12px; color: #666;">
                        ${medicinesData.filter(m => m.type === type).length} medicines
                    </div>
                </div>
                <div class="type-actions">
                    ${type !== 'other' ? `
                        <button class="small-btn danger-btn" onclick="deleteMedicineType('${type}')">Delete</button>
                    ` : ''}
                </div>
            `;
            typesList.appendChild(typeDiv);
        });
    }

    async function addMedicineType() {
        const name = document.getElementById('newTypeName').value.trim().toLowerCase();
        const Description = document.getElementById('newTypeDescription').value.trim();
        if (!name || !Description) {
            alert('Please enter a type name and description');
            return;
        }
        const res = await fetch("https://pharmacy-system-spring-utt5.onrender.com/Medicine_Type/addType",{
            credentials: 'include',
            headers: {'Content-Type': 'application/json'},
            method: 'POST',
            body: JSON.stringify({name,Description})
        });
        if(!res.ok){
            showMessage("Failed to add medicine", "error");
            return;
        }
        const getBack = await res.json();
        showMessage(`${getBack}`, 'success');
        renderMedicineTypes();
    }

    async function deleteMedicineType(type) {
        const res = await fetch(`https://pharmacy-system-spring-utt5.onrender.com/Medcine_Type/check/${type}`,{
            credentials: 'include'
        });
        if(!res.ok) {
            showMessage("Failed to get this Medicine type", "error");
            return;
        }
        const all = res.json();
        if(all.count > 0){
            alert(`This Medicine Type has ${all.count} medicines allocated to it. Please reallocated and try again`);
            return;
        }
        if(all.count==0){
        if (confirm(`Delete medicine type "${type}"?`)) {
            const delres = await fetch("https://pharmacy-system-spring-utt5.onrender.com/Medicine_Type/delete_Type/",{
                credentials:'include'
            });
            if(!delres.ok){
                showMessage("Failed to delete", "error");
            }
            renderMedicineTypes();
            showMessage(`Medicine type "${type}" deleted!`, 'success');
        }
    }
    }

    //REFACTOR THIS!!!
    function updateTypeSelectOptions() {
        // Update all select elements with medicine types
        const selects = ['medicineType', 'updateType', 'checkMedicineType'];
        selects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (select) {
                const currentValue = select.value;
                select.innerHTML = '<option value="">Select Type</option>' +
                    medicineTypes.map(type =>
                        `<option value="${type}">${type.charAt(0).toUpperCase() + type.slice(1)}</option>`
                    ).join('');
                select.value = currentValue;
            }
        });
    }

    // Clear forms
    function clearForm() {
        document.getElementById('sku').value = '';
        document.getElementById('medicineName').value = '';
        document.getElementById('medicineType').value = '';
        document.getElementById('quantity').value = '';
        document.getElementById('lowStockThreshold').value = '';
        document.getElementById('price').value = '';
        document.getElementById('description').value = '';
        document.getElementById('expiryDate').value = '';
    }

    function clearUpdateForm() {
        document.getElementById('updateSku').value = '';
        document.getElementById('updateName').value = '';
        document.getElementById('updateType').value = '';
        document.getElementById('updateQuantity').value = '';
        document.getElementById('updateThreshold').value = '';
        document.getElementById('updatePrice').value = '';
    }

    function clearDeleteForm() {
        document.getElementById('deleteName').value = '';
        document.getElementById('confirmDeleteMedicine').value = '';
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

    function showNotifications() {
        alert('Notifications would appear here');
    }

    function logout() {
        if (confirm('Are you sure you want to logout?')) {
            window.location.href = 'login.html';
        }
    }

    // Close modal when clicking outside
    window.onclick = function(event) {
        const modal = document.getElementById('medicineTypesModal');
        if (event.target === modal) {
            closeMedicineTypesModal();
        }
    }