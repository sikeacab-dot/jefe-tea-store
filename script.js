// Initialize Telegram WebApp
const tg = window.Telegram.WebApp;
try {
    tg.expand();
    // Enable closing confirmation to prevent accidental closing
    tg.enableClosingConfirmation();
} catch (e) {
    console.error('Telegram init failed:', e);
}

// State
let cart = {};
let currentProductId = null;
let currentQuantity = 1;

// DOM Elements
const productList = document.getElementById('product-list');
const modal = document.getElementById('product-modal');
const modalImage = document.getElementById('modal-image');
const modalTitle = document.getElementById('modal-title');
const modalPrice = document.getElementById('modal-price');
const modalCategory = document.getElementById('modal-category');
const modalOrigin = document.getElementById('modal-origin');
const modalDescription = document.getElementById('modal-description');
const quantityDisplay = document.getElementById('quantity-display');

const cartConfirmModal = document.getElementById('cart-confirm-modal');
const checkoutModal = document.getElementById('checkout-modal');
const cartItemsContainer = document.getElementById('cart-items');
const cartTotalDisplay = document.getElementById('cart-total');
const cartBadge = document.getElementById('cart-badge');

// Localization Map (Simple)
const STRINGS = {
    currency: '₴'
};

// Make functions global
window.renderProducts = function (filter = 'all') {
    const filteredProducts = filter === 'all'
        ? products
        : products.filter(p => p.category === filter);

    productList.innerHTML = filteredProducts.map(product => `
        <div class="product-card" onclick="window.openProduct(${product.id})">
            ${product.badge === 'fire' ? `
                <div class="product-badge">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2C6.5 2 3.5 6.5 3.5 11C3.5 15.5 6.5 19.5 9.5 21.5C9.5 21.5 6.5 18 6.5 15C6.5 12 9 9.5 12 7C15 9.5 17.5 12 17.5 15C17.5 18 14.5 21.5 14.5 21.5C17.5 19.5 20.5 15.5 20.5 11C20.5 6.5 17.5 2 12 2Z" 
                        stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>
            ` : ''}
            <img src="${product.image}" alt="${product.name}" class="product-image" loading="lazy">
            <div class="product-info">
                <div class="product-category">${product.category}</div>
                <div class="product-name">${product.name}</div>
                <div class="product-price">${product.price}${STRINGS.currency}</div>
                <button class="btn-mini-add">Додати</button>
            </div>
        </div>
    `).join('');
};

window.filterCategory = function (category) {
    document.querySelectorAll('.cat-btn').forEach(btn => {
        btn.classList.remove('active');
        // Simple mapping for demo, ideally strictly use IDs
        const btnCat = btn.getAttribute('onclick').match(/'([^']+)'/)[1];
        if (btnCat === category) {
            btn.classList.add('active');
        }
    });
    window.renderProducts(category);
    if (tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
};

window.openProduct = function (id) {
    const product = products.find(p => p.id === id);
    if (!product) return;

    currentProductId = id;
    currentQuantity = 1;
    window.updateQuantityDisplay();

    modalImage.src = product.image;
    modalTitle.textContent = product.name;
    modalPrice.textContent = `${STRINGS.currency}${product.price}`;
    modalCategory.textContent = product.category;
    modalOrigin.textContent = product.origin;
    modalDescription.textContent = product.description;

    // Brewing Guide
    const brewContainer = document.getElementById('modal-brewing');
    if (product.brewing) {
        brewContainer.style.display = 'grid';
        brewContainer.innerHTML = `
            <div class="brew-item">
                <div class="brew-icon">🌊</div>
                <div class="brew-value">${product.brewing.steeps || '-'}</div>
                <div class="brew-label">Проливи</div>
            </div>
            <div class="brew-item">
                <div class="brew-icon">⏱️</div>
                <div class="brew-value">${product.brewing.time || '-'}с</div>
                <div class="brew-label">Час</div>
            </div>
            <div class="brew-item">
                <div class="brew-icon">⚖️</div>
                <div class="brew-value">${product.brewing.grams || '-'}г</div>
                <div class="brew-label">Вага</div>
            </div>
        `;
    } else {
        brewContainer.style.display = 'none';
        brewContainer.innerHTML = '';
    }

    modal.classList.add('active');
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
};

window.closeModal = function () {
    modal.classList.remove('active');
    currentProductId = null;
};

window.adjustQuantity = function (delta) {
    const newQty = currentQuantity + delta;
    if (newQty >= 1 && newQty <= 50) {
        currentQuantity = newQty;
        window.updateQuantityDisplay();
        if (tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
    }
};

window.updateQuantityDisplay = function () {
    quantityDisplay.textContent = currentQuantity;
};

window.addToCart = function (isBuyNow) {
    if (!currentProductId) return;
    if (!cart[currentProductId]) cart[currentProductId] = 0;
    cart[currentProductId] += currentQuantity;

    window.closeModal();
    window.updateCartBadge();

    if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');

    if (isBuyNow) {
        window.openCart();
    } else {
        window.openConfirmModal();
    }
};

window.openConfirmModal = function () {
    cartConfirmModal.classList.add('active');
};

window.closeConfirmModal = function () {
    cartConfirmModal.classList.remove('active');
};

window.openCart = function () {
    window.closeConfirmModal(); // Ensure this is closed if open

    // Render Cart Items
    const cartEntries = Object.entries(cart);

    if (cartEntries.length === 0) {
        // Handle empty cart if needed, or just show empty state
        cartItemsContainer.innerHTML = '<div class="empty-cart">Кошик порожній</div>';
        cartTotalDisplay.textContent = '$0';
    } else {
        let total = 0;
        cartItemsContainer.innerHTML = cartEntries.map(([id, qty]) => {
            const product = products.find(p => p.id === parseInt(id));
            if (!product) return '';
            const itemTotal = product.price * qty;
            total += itemTotal;
            return `
                <div class="cart-item">
                    <img src="${product.image}" class="cart-item-img">
                    <div class="cart-item-info">
                        <div class="cart-item-title">${product.name}</div>
                        <div class="cart-item-price">${qty} x $${product.price} = $${itemTotal}</div>
                    </div>
                </div>
            `;
        }).join('');
        cartTotalDisplay.textContent = `$${total}`;
    }

    checkoutModal.classList.add('active');
};

window.closeCheckout = function () {
    checkoutModal.classList.remove('active');
};

window.updateCartBadge = function () {
    const count = Object.values(cart).reduce((a, b) => a + b, 0);
    cartBadge.textContent = count;
    cartBadge.style.display = count > 0 ? 'flex' : 'none';
};

window.processCheckout = function () {
    const total = Object.entries(cart).reduce((sum, [id, qty]) => {
        const p = products.find(p => p.id === parseInt(id));
        return sum + (p ? p.price * qty : 0);
    }, 0);

    let message = "Привіт! \nХочу замовити ";
    const items = [];
    Object.entries(cart).forEach(([id, qty]) => {
        const product = products.find(p => p.id === parseInt(id));
        if (product) {
            items.push(`${product.name} (x${qty})`);
        }
    });

    message += items.join(', ');
    message += `\nСума: ${total}$`;

    // Copy to clipboard fallback (just in case)
    try {
        navigator.clipboard.writeText(message);
    } catch (e) {
        console.log('Clipboard access denied');
    }

    const url = `https://t.me/jefesike?text=${encodeURIComponent(message)}`;
    tg.openTelegramLink(url);
    tg.close();
};

// Event Listeners
[modal, cartConfirmModal, checkoutModal].forEach(m => {
    m.addEventListener('click', (e) => {
        if (e.target === m) {
            m.classList.remove('active');
        }
    });
});

// Init
window.renderProducts();
window.updateCartBadge();
tg.ready();
