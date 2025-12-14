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
    currency: '$'
};

// Make functions global
window.renderProducts = function (filter = 'all') {
    const filteredProducts = filter === 'all'
        ? products
        : products.filter(p => p.category === filter);

    productList.innerHTML = filteredProducts.map(product => `
        <div class="product-card" onclick="window.openProduct(${product.id})">
            <img src="${product.image}" alt="${product.name}" class="product-image" loading="lazy">
            <div class="product-info">
                <div class="product-category">${product.category}</div>
                <div class="product-name">${product.name}</div>
                <div class="product-price">${STRINGS.currency}${product.price}</div>
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

    let message = "🍵 *Нове Замовлення JEFE* 🍵\n\n";
    Object.entries(cart).forEach(([id, qty]) => {
        const product = products.find(p => p.id === parseInt(id));
        if (product) {
            message += `• ${product.name} x${qty} - $${product.price * qty}\n`;
        }
    });
    message += `\n💰 *Всього: $${total}*`;

    // Try to copy to clipboard for user convenience (might not work in all webviews)
    /* 
    navigator.clipboard.writeText(message).then(() => {
        // Success
    }).catch(err => {
        console.log('Clipboard failed', err);
    });
    */

    const url = `https://t.me/jefesike?start=order&text=${encodeURIComponent(message)}`;
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
