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
        // Session could not be verified — send the user back to login.
        showMessage("Failed Session Verification. Redirecting to login", "error");
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = 'index.html';
    }
}

let currentMode = 'add';
let medicineTypes = [];
let medicinesData = [];

    document.addEventListener('DOMContentLoaded', function() {
        loadUser();
        updateButtonStates();
        renderMedicineTypes();
        PharmUI.attachLiveValidation(document.getElementById('medicinesForm'));
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
        const medicineType = document.getElementById('medicineType').value;
        const description = document.getElementById('description').value;
        const cost = document.getElementById('price').value;
        const expiryDate = document.getElementById('expiryDate').value;

        if (!PharmUI.validate(document.getElementById('addForm'))) {
            showMessage('Please fix the highlighted fields', 'error');
            return;
        }
        if (!sku || !medicineName || !medicineType || !description || isNaN(quantity) || isNaN(cost) || !expiryDate) {
            showMessage('Please fill in all required fields (*)', 'error');
            return;
        }
        const newMedicine = {sku, medicineName,quantity,medicineType,description,cost,expiryDate};
        const threshold = parseInt(document.getElementById('lowStockThreshold').value);

        if(!isNaN(threshold)) newMedicine.lowStockThreshold = threshold;

        try{
            const res = await fetch(API_BASE + "/medicine/create", {
                headers: {'Content-Type':'application/json'},
                credentials: 'include',
                method: 'POST',
                body: JSON.stringify(newMedicine)
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
            const res = await fetch(API_BASE + "/medicine/delete",{
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
            const res = await fetch(API_BASE + "/medicine/checkMedicine",{
                credentials:'include',
                headers: {'Content-Type':'application/json'},
                method: 'POST',
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

        const resultDiv = document.getElementById('stockResult');
        resultDiv.textContent = '';
        const h4 = document.createElement('h4');
        h4.textContent = medicine.name + ' (' + medicine.sku + ')';
        resultDiv.appendChild(h4);

        const grid = document.createElement('div');
        grid.style.cssText = 'display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-top: 15px;';

        const addItem = (label, value, opts) => {
            const div = document.createElement('div');
            const strong = document.createElement('strong');
            strong.textContent = label + ':';
            div.appendChild(strong);
            const valDiv = document.createElement('div');
            if (opts && opts.style) valDiv.style.cssText = opts.style;
            valDiv.textContent = value;
            div.appendChild(valDiv);
            grid.appendChild(div);
        };

        addItem('Current Stock', medicine.quantity, {
            style: 'font-size: 28px; font-weight: bold; color: ' + getStockColor(medicine.quantity, medicine.threshold)
        });
        addItem('Threshold', medicine.threshold, { style: 'font-size: 20px; color: #666;' });
        addItem('Type', medicine.type);
        addItem('Price', 'KSh ' + medicine.price.toFixed(2));

        const statusDiv = document.createElement('div');
        const strongStatus = document.createElement('strong');
        strongStatus.textContent = 'Status:';
        statusDiv.appendChild(strongStatus);
        const valDiv = document.createElement('div');
        const badge = document.createElement('span');
        badge.className = 'stock-badge ' + statusClass;
        badge.textContent = stockStatus;
        valDiv.appendChild(badge);
        statusDiv.appendChild(valDiv);
        grid.appendChild(statusDiv);

        addItem('Safety Margin', Math.max(0, medicine.quantity - medicine.threshold) + ' units');
        resultDiv.appendChild(grid);

        if (medicine.quantity <= medicine.threshold) {
            const alertDiv = document.createElement('div');
            alertDiv.style.cssText = 'margin-top: 15px; padding: 10px; background: #ffebee; border-radius: 5px; color: #c62828;';
            alertDiv.textContent = '\u26A0\uFE0F Low Stock Alert: Consider reordering soon!';
            resultDiv.appendChild(alertDiv);
        }
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
            const res = await fetch(API_BASE + "/medicine/checkStocktype", {
                credentials: 'include',
                headers: {'Content-Type': 'application/json'},
                method: 'POST',
                body: JSON.stringify(type)
            });
            const meds = await res.json();
            if(!res.ok){
                showMessage(meds, "error");
                return;
            }
        if (meds === null) {
            document.getElementById('stockByTypeResult').innerHTML = `
                <div class="message warning">No medicines found for type: ${htmlEncode(type)}</div>
            `;
            document.getElementById('stockByTypeResult').classList.remove('hidden');
            return;
        }

        const totalQuantity = meds.reduce((sum, meds) => sum + meds.quantity, 0);
        const totalValue = filtered.reduce((sum, meds) => sum + (meds.quantity * med.price), 0);
        const lowStockCount = filtered.filter(meds => meds.quantity <= meds.threshold).length;


        document.getElementById('stockByTypeResult').innerHTML = `
            <div class="stock-result">
                <h4>Stock Summary${type !== 'all' ? ` for ${htmlEncode(type)}` : ''}</h4>
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
    async function renderMedicinesTable() {
        const tableBody = document.getElementById('medicinesTableBody');
        tableBody.innerHTML = PharmUI.skeletonRows(8);

        try{
            const res = await PharmUI.withTimeout(fetch(API_BASE + "/medicine/getAll",{
            credentials:'include',
            }));
            if (!res.ok) throw new Error('Request failed ' + res.status);
            const data = await res.json();
            medicinesData = data;
        }catch(e){
            console.log("Failed to load medicines", e);
            PharmUI.tableEmpty(tableBody, 8, {
                icon: 'warning',
                title: "Couldn't load medicines",
                message: 'Check your connection and try again.',
                actionLabel: 'Retry',
                onRetry: renderMedicinesTable
            });
            return;
        }

        if (!medicinesData || medicinesData.length === 0) {
            PharmUI.tableEmpty(tableBody, 8, {
                icon: 'pill',
                title: 'No medicines yet',
                message: 'Use the Add Medicine form to stock your first item.'
            });
            return;
        }

        medicinesData.forEach(medicine => {
            const stockStatus = getStockStatus(medicine.quantity, medicine.threshold);
            const statusClass = getStockStatusClass(stockStatus);

            const row = document.createElement('tr');

            const tdSku = document.createElement('td');
            tdSku.textContent = medicine.sku;
            row.appendChild(tdSku);

            const tdName = document.createElement('td');
            const strongName = document.createElement('strong');
            strongName.textContent = medicine.name;
            tdName.appendChild(strongName);
            tdName.appendChild(document.createElement('br'));
            const descSmall = document.createElement('small');
            descSmall.style.color = '#666';
            descSmall.textContent = medicine.description.substring(0, 50) + (medicine.description.length > 50 ? '...' : '');
            tdName.appendChild(descSmall);
            row.appendChild(tdName);

            const tdType = document.createElement('td');
            tdType.textContent = medicine.type;
            row.appendChild(tdType);

            const tdQty = document.createElement('td');
            tdQty.textContent = medicine.quantity;
            row.appendChild(tdQty);

            const tdStatus = document.createElement('td');
            const badge = document.createElement('span');
            badge.className = 'stock-badge ' + statusClass;
            badge.textContent = stockStatus;
            tdStatus.appendChild(badge);
            row.appendChild(tdStatus);

            const tdPrice = document.createElement('td');
            tdPrice.textContent = 'KSh ' + medicine.price.toFixed(2);
            row.appendChild(tdPrice);

            const tdActions = document.createElement('td');
            tdActions.className = 'action-cell';
            const btnEdit = document.createElement('button');
            btnEdit.className = 'icon-btn edit-btn';
            btnEdit.textContent = 'Edit';
            btnEdit.addEventListener('click', () => editMedicine(medicine.sku));
            const btnDelete = document.createElement('button');
            btnDelete.className = 'icon-btn delete-btn';
            btnDelete.textContent = 'Delete';
            btnDelete.addEventListener('click', () => confirmDeleteMedicine(medicine.sku, medicine.name));
            const btnStock = document.createElement('button');
            btnStock.className = 'icon-btn';
            btnStock.style.cssText = 'background: #e8f5e9; color: #2e7d32;';
            btnStock.textContent = 'Stock';
            btnStock.addEventListener('click', () => checkSingleMedicine(medicine.sku));
            tdActions.appendChild(btnEdit);
            tdActions.appendChild(btnDelete);
            tdActions.appendChild(btnStock);
            row.appendChild(tdActions);

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
    async function confirmDeleteMedicine(sku, name) {
        const ok = await PharmUI.confirm({
            title: 'Delete medicine?',
            message: `Are you sure you want to delete ${name} (${sku})?\n\nThis action cannot be undone.`,
            confirmText: 'Delete',
            danger: true
        });
        if (ok) {
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

            const tdSku = document.createElement('td');
            tdSku.textContent = medicine.sku;
            row.appendChild(tdSku);

            const tdName = document.createElement('td');
            const strongName = document.createElement('strong');
            strongName.textContent = medicine.name;
            tdName.appendChild(strongName);
            tdName.appendChild(document.createElement('br'));
            const descSmall = document.createElement('small');
            descSmall.style.color = '#666';
            descSmall.textContent = medicine.description.substring(0, 50) + (medicine.description.length > 50 ? '...' : '');
            tdName.appendChild(descSmall);
            row.appendChild(tdName);

            const tdType = document.createElement('td');
            tdType.textContent = medicine.type;
            row.appendChild(tdType);

            const tdQty = document.createElement('td');
            tdQty.textContent = medicine.quantity;
            row.appendChild(tdQty);

            const tdThreshold = document.createElement('td');
            tdThreshold.textContent = medicine.threshold;
            row.appendChild(tdThreshold);

            const tdStatus = document.createElement('td');
            const badge = document.createElement('span');
            badge.className = 'stock-badge ' + statusClass;
            badge.textContent = stockStatus;
            tdStatus.appendChild(badge);
            row.appendChild(tdStatus);

            const tdPrice = document.createElement('td');
            tdPrice.textContent = 'KSh ' + medicine.price.toFixed(2);
            row.appendChild(tdPrice);

            const tdActions = document.createElement('td');
            tdActions.className = 'action-cell';
            const btnEdit = document.createElement('button');
            btnEdit.className = 'icon-btn edit-btn';
            btnEdit.textContent = 'Edit';
            btnEdit.addEventListener('click', () => editMedicine(medicine.sku));
            const btnDelete = document.createElement('button');
            btnDelete.className = 'icon-btn delete-btn';
            btnDelete.textContent = 'Delete';
            btnDelete.addEventListener('click', () => confirmDeleteMedicine(medicine.sku, medicine.name));
            tdActions.appendChild(btnEdit);
            tdActions.appendChild(btnDelete);
            row.appendChild(tdActions);

            tableBody.appendChild(row);
        });

        if (filtered.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 20px;">No medicines found matching "' + htmlEncode(searchTerm) + '"</td></tr>';
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

        let res;
        try {
            res = await fetch(API_BASE + "/Medicine_Type/getAll", {
                credentials: 'include',
            });
        } catch (e) {
            showMessage("Failed to fetch Types", "error");
            return;
        }
        if(!res.ok){
            showMessage("Failed to fetch Types", "error");
            return;
        }
        const medicineTypesResult = await res.json();
        medicineTypes.length=0;
        medicineTypesResult.forEach(t => {
            const typeName = typeof t === 'string' ? t : t.name;
            if (!typeName) return;
            medicineTypes.push(typeName);
            const typeDiv = document.createElement('div');
            typeDiv.className = 'type-item';
            const displayName = typeName.charAt(0).toUpperCase() + typeName.slice(1).toLowerCase();

            const infoDiv = document.createElement('div');
            const strongEl = document.createElement('strong');
            strongEl.textContent = displayName;
            infoDiv.appendChild(strongEl);
            const subDiv = document.createElement('div');
            subDiv.style.cssText = 'font-size: 12px; color: #666;';
            subDiv.textContent = '\xA0';
            infoDiv.appendChild(subDiv);
            typeDiv.appendChild(infoDiv);

            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'type-actions';
            if (typeName !== 'OTHER') {
                const btnDelete = document.createElement('button');
                btnDelete.className = 'small-btn danger-btn';
                btnDelete.textContent = 'Delete';
                btnDelete.addEventListener('click', () => deleteMedicineType(typeName));
                actionsDiv.appendChild(btnDelete);
            }
            typeDiv.appendChild(actionsDiv);

            typesList.appendChild(typeDiv);
        });
        updateTypeSelectOptions();
    }

    function flashTypeInputs(type) {
        const inputs = [document.getElementById('newTypeName'), document.getElementById('newTypeDescription')];
        const cls = type === 'success' ? 'input-success' : 'input-error';
        inputs.forEach(el => el.classList.add(cls));
        setTimeout(() => inputs.forEach(el => el.classList.remove(cls)), 3000);
    }

    function clearTypeForm() {
        document.getElementById('newTypeName').value = '';
        document.getElementById('newTypeDescription').value = '';
    }

    function showTypeModalMessage(message, type) {
        const el = document.getElementById('typeModalMessage');
        el.className = `message ${type}`;
        el.textContent = message;
        el.style.display = 'block';
        setTimeout(() => el.style.display = 'none', 5000);
    }

    async function addMedicineType() {
        const name = document.getElementById('newTypeName').value.trim().toLowerCase();
        const Description = document.getElementById('newTypeDescription').value.trim();
        if (!name || !Description) {
            showTypeModalMessage('Please enter a type name and description', 'warning');
            flashTypeInputs('error');
            return;
        }
        const res = await fetch(API_BASE + "/Medicine_Type/addType",{
            credentials: 'include',
            headers: {'Content-Type': 'application/json'},
            method: 'POST',
            body: JSON.stringify({name, description: Description})
        });
        if(!res.ok){
            const err = await res.json();
            showTypeModalMessage(err.message || "Failed to add type", "error");
            flashTypeInputs('error');
            return;
        }
        const getBack = await res.text();
        showTypeModalMessage(getBack, 'success');
        flashTypeInputs('success');
        clearTypeForm();
        renderMedicineTypes();
    }

    async function deleteMedicineType(type) {
        const res = await fetch(`${API_BASE}/Medicine_Type/check/${type}`,{
            credentials: 'include'
        });
        if(!res.ok) {
            showMessage("Failed to get this Medicine type", "error");
            return;
        }
        const count = await res.json();
        if(count > 0){
            showTypeModalMessage(`This Medicine Type has ${count} medicines allocated to it. Please reallocate and try again`, 'warning');
            return;
        }
        const ok = await PharmUI.confirm({
            title: 'Delete medicine type?',
            message: `Delete medicine type "${type}"?`,
            confirmText: 'Delete',
            danger: true
        });
        if (ok) {
            const delres = await fetch(`${API_BASE}/Medicine_Type/delete_Type/${type}`,{
                credentials:'include',
                method: 'DELETE'
            });
            if(!delres.ok){
                showMessage("Failed to delete", "error");
                return;
            }
            renderMedicineTypes();
            showMessage(`Medicine type "${type}" deleted!`, 'success');
        }
    }

    function updateTypeSelectOptions() {
        const selects = ['medicineType', 'updateType', 'checkMedicineType'];
        selects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (select) {
                const currentValue = select.value;
                select.innerHTML = '<option value="">Select Type</option>';
                medicineTypes.forEach(type => {
                    const opt = document.createElement('option');
                    opt.value = type;
                    opt.textContent = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
                    select.appendChild(opt);
                });
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

    async function logout() {
        const ok = await PharmUI.confirm({
            title: 'Log out?',
            message: 'Are you sure you want to logout?',
            confirmText: 'Logout'
        });
        if (ok) {
            window.location.href = 'index.html';
        }
    }

    // Close modal when clicking outside
    window.onclick = function(event) {
        const modal = document.getElementById('medicineTypesModal');
        if (event.target === modal) {
            closeMedicineTypesModal();
        }
    }