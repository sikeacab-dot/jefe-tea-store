// Admin Logic

// Load Data
let allProducts = []; // Master list
let displayProducts = []; // Filtered list
let currentFilter = 'all';

function initAdmin() {
    // Try to load from LocalStorage
    const stored = localStorage.getItem('jefe_products');

    if (stored) {
        allProducts = JSON.parse(stored);
    } else {
        // Fallback to the global 'products' from products.js
        if (typeof products !== 'undefined') {
            allProducts = [...products]; // Copy
        } else {
            allProducts = [];
        }
    }

    filterAdmin('all');
}

window.filterAdmin = function (category) {
    currentFilter = category;

    // Update tabs UI
    document.querySelectorAll('.cat-btn').forEach(btn => {
        btn.classList.remove('active');
        const onclickVal = btn.getAttribute('onclick');
        if (onclickVal.includes(`'${category}'`)) {
            btn.classList.add('active');
        }
    });

    if (category === 'all') {
        displayProducts = [...allProducts];
    } else {
        displayProducts = allProducts.filter(p => p.category === category);
    }

    renderAdminList();
};

function renderAdminList() {
    const list = document.getElementById('admin-list');
    list.innerHTML = '';

    displayProducts.forEach((p, index) => {
        // Find real index in allProducts for ordering commands
        const realIndex = allProducts.findIndex(x => x.id === p.id);

        const div = document.createElement('div');
        div.className = 'admin-card';
        div.innerHTML = `
            <div class="drag-handle">::</div>
            <img src="${p.image}" class="admin-thumb" onerror="this.src='https://placehold.co/60x60?text=No+Img'">
            <div class="admin-info">
                <div style="font-weight: bold;">
                    ${p.badge === 'fire' ? '🔥' : ''} ${p.name}
                </div>
                <div style="color: var(--text-secondary); font-size: 0.9rem;">${p.category} • ${p.price}₴</div>
            </div>
            <div class="admin-actions">
                <button class="btn-sm" onclick="openEditModal(${p.id})">Edit</button>
                ${currentFilter === 'all' ? `
                <div style="display:flex; gap:4px">
                    <button class="btn-sm" onclick="moveUp(${realIndex})" title="Вверх">↑</button>
                    <button class="btn-sm" onclick="moveDown(${realIndex})" title="Вниз">↓</button>
                </div>
                ` : ''}
                <button class="btn-sm btn-danger" onclick="deleteProduct(${p.id})">Del</button>
            </div>
        `;
        list.appendChild(div);
    });
}

// persistence
function saveToStorage() {
    localStorage.setItem('jefe_products', JSON.stringify(allProducts));
    // Rerender with current filter
    filterAdmin(currentFilter);
}

// CRUD
window.openEditModal = function (id = null) {
    const modal = document.getElementById('edit-modal');
    const isEdit = id !== null;

    document.getElementById('edit-modal-title').textContent = isEdit ? 'Редактировать' : 'Новый товар';
    document.getElementById('edit-id').value = isEdit ? id : '';

    if (isEdit) {
        const p = allProducts.find(x => x.id === id);
        if (p) {
            document.getElementById('edit-name').value = p.name;
            document.getElementById('edit-category').value = p.category;
            document.getElementById('edit-price').value = p.price;
            document.getElementById('edit-image').value = p.image;
            document.getElementById('edit-origin').value = p.origin;
            document.getElementById('edit-description').value = p.description;

            // New Fields
            document.getElementById('edit-badge').value = p.badge || 'none';
            document.getElementById('edit-steeps').value = p.brewing?.steeps || '';
            document.getElementById('edit-time').value = p.brewing?.time || '';
            document.getElementById('edit-grams').value = p.brewing?.grams || '';

            // Pricing Mode Load
            if (p.variants && Object.keys(p.variants).length > 0) {
                setPricingMode('variant');
                // Fill variants
                ['50', '100', '200', '250', '357'].forEach(w => {
                    const price = p.variants[w];
                    const check = document.getElementById(`check-${w}`);
                    const input = document.getElementById(`price-${w}`);

                    if (price) {
                        check.checked = true;
                        input.disabled = false;
                        input.value = price;
                    } else {
                        check.checked = false;
                        input.disabled = true;
                        input.value = '';
                    }
                });
            } else {
                setPricingMode('fixed');
                // Reset variants
                document.querySelectorAll('.variant-row input[type="checkbox"]').forEach(c => c.checked = false);
                document.querySelectorAll('.variant-row input[type="number"]').forEach(i => { i.disabled = true; i.value = ''; });
            }

            // Preview
            const imgPreview = document.getElementById('image-preview');
            imgPreview.src = p.image;
            imgPreview.style.display = 'block';
        }
    } else {
        // Clear form
        document.getElementById('edit-name').value = '';
        document.getElementById('edit-category').value = 'Puerh';
        document.getElementById('edit-price').value = '';

        // Default: Fixed mode active
        const fixedCheck = document.getElementById('check-fixed');
        fixedCheck.checked = true;
        document.getElementById('edit-price').disabled = false;

        // Reset variants
        document.querySelectorAll('.check-weight').forEach(c => c.checked = false);
        document.querySelectorAll('.variant-row input[type="number"]:not(#edit-price)').forEach(i => { i.disabled = true; i.value = ''; });

        document.getElementById('edit-image').value = 'assets/tea_new.jpg';
        document.getElementById('edit-origin').value = '';
        document.getElementById('edit-description').value = '';

        document.getElementById('edit-badge').value = 'none';
        document.getElementById('edit-steeps').value = '7';
        document.getElementById('edit-time').value = '20';
        document.getElementById('edit-grams').value = '5';

        // Clear preview
        document.getElementById('image-preview').style.display = 'none';
        document.getElementById('image-preview').src = '';
    }

    // Reset file input
    document.getElementById('file-upload').value = '';

    modal.classList.add('active');
};

window.closeEditModal = function () {
    document.getElementById('edit-modal').classList.remove('active');
};

window.saveProduct = function () {
    const id = document.getElementById('edit-id').value; // string or empty

    const mode = window.currentPricingMode;
    let finalPrice = 0;
    let variants = {};

    if (mode === 'fixed') {
        finalPrice = Number(document.getElementById('edit-price').value);
    } else {
        // Collect variants
        ['50', '100', '200', '250', '357'].forEach(w => {
            if (document.getElementById(`check-${w}`).checked) {
                const pVal = Number(document.getElementById(`price-${w}`).value);
                if (pVal > 0) variants[w] = pVal;
            }
        });

        // Determine "Main" price for sorting/display (prefer 100g, else min)
        if (variants['100']) finalPrice = variants['100'];
        else {
            const vals = Object.values(variants);
            if (vals.length > 0) finalPrice = Math.min(...vals);
        }
    }

    const newProduct = {
        id: id ? parseInt(id) : Date.now(), // Generate ID if new
        name: document.getElementById('edit-name').value,
        category: document.getElementById('edit-category').value,
        price: finalPrice, // Main price
        variants: Object.keys(variants).length > 0 ? variants : null, // Store map
        image: document.getElementById('edit-image').value,
        origin: document.getElementById('edit-origin').value,
        description: document.getElementById('edit-description').value,

        // New Fields
        badge: document.getElementById('edit-badge').value,
        brewing: {
            steeps: Number(document.getElementById('edit-steeps').value) || 0,
            time: Number(document.getElementById('edit-time').value) || 0,
            grams: Number(document.getElementById('edit-grams').value) || 0
        }
    };

    if (id) {
        // Update existing
        const idx = allProducts.findIndex(p => p.id === parseInt(id));
        if (idx !== -1) {
            allProducts[idx] = newProduct;
        }
    } else {
        // Add new to TOP
        allProducts.unshift(newProduct);
    }

    saveToStorage();
    closeEditModal();
};

window.deleteProduct = function (id) {
    if (confirm('Удалить этот товар?')) {
        allProducts = allProducts.filter(p => p.id !== id);
        saveToStorage();
    }
};

window.resetToDefault = function () {
    if (confirm('Сбросить все изменения и вернуться к стандартному списку?')) {
        localStorage.removeItem('jefe_products');
        location.reload();
    }
};

// Ordering (Only works when filter is ALL, or logic gets complex. We disabled buttons in filter mode)
window.moveUp = function (index) {
    if (index > 0) {
        [allProducts[index], allProducts[index - 1]] = [allProducts[index - 1], allProducts[index]];
        saveToStorage();
    }
};

window.moveDown = function (index) {
    if (index < allProducts.length - 1) {
        [allProducts[index], allProducts[index + 1]] = [allProducts[index + 1], allProducts[index]];
        saveToStorage();
    }
};

// Export
window.downloadProducts = function () {
    const jsonContent = JSON.stringify(allProducts, null, 4);
    const fileContent = `const products = ${jsonContent};\n`;

    const blob = new Blob([fileContent], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'products.js';
    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    alert('Файл products.js скачан! \nТеперь замените им файл в папке вашего проекта.');
};

// Start
// Image Compression Logic
document.getElementById('file-upload').addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (event) {
        const img = new Image();
        img.onload = function () {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            // Resize logic (Max 1200px)
            const MAX_WIDTH = 1200;
            const MAX_HEIGHT = 1200;
            let width = img.width;
            let height = img.height;

            // Calculate new dimensions
            if (width > height) {
                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }
            } else {
                if (height > MAX_HEIGHT) {
                    width *= MAX_HEIGHT / height;
                    height = MAX_HEIGHT;
                }
            }

            canvas.width = width;
            canvas.height = height;

            // Draw and Compress
            ctx.drawImage(img, 0, 0, width, height);

            // Export as JPEG with 0.9 quality
            const dataUrl = canvas.toDataURL('image/jpeg', 0.9);

            // Update UI
            document.getElementById('edit-image').value = dataUrl;
            document.getElementById('image-preview').src = dataUrl;
            document.getElementById('image-preview').style.display = 'block';
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
});

// Pricing Mode Logic
window.currentPricingMode = 'fixed';
window.setPricingMode = function (mode) {
    window.currentPricingMode = mode;

    // UI Toggles
    document.getElementById('mode-fixed').className = mode === 'fixed' ? 'btn-sm active' : 'btn-sm';
    document.getElementById('mode-variant').className = mode === 'variant' ? 'btn-sm active' : 'btn-sm';

    document.getElementById('price-fixed-container').style.display = mode === 'fixed' ? 'block' : 'none';
    document.getElementById('price-variant-container').style.display = mode === 'variant' ? 'block' : 'none';
};

// Toggle inputs on checkbox
['50', '100', '200', '250', '357'].forEach(w => {
    document.getElementById(`check-${w}`).addEventListener('change', (e) => {
        document.getElementById(`price-${w}`).disabled = !e.target.checked;
        if (!e.target.checked) document.getElementById(`price-${w}`).value = '';
    });
});

// Start
initAdmin();
