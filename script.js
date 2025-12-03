// Initialize Telegram WebApp
const tg = window.Telegram.WebApp;
try {
    tg.expand();
} catch (e) {
    console.error('Telegram expand failed:', e);
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
                <div class="product-price">$${product.price}</div>
            </div>
        </div>
    `).join('');
};

window.filterCategory = function (category) {
    document.querySelectorAll('.cat-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent === category || (category === 'all' && btn.textContent === 'All')) {
            btn.classList.add('active');
        }
    });
    window.renderProducts(category);
    if (tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
};

window.openProduct = function (id) {
    try {
        console.log('Opening product:', id);
        const product = products.find(p => p.id === id);
        if (!product) {
            console.error('Product not found');
            return;
        }

        currentProductId = id;
        currentQuantity = 1;
        window.updateQuantityDisplay();

        modalImage.src = product.image;
        modalTitle.textContent = product.name;
        modalPrice.textContent = `$${product.price}`;
        modalCategory.textContent = product.category;
        modalOrigin.textContent = product.origin;
        modalDescription.textContent = product.description;

        modal.classList.add('active');
        console.log('Modal active class added');

        if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
    } catch (e) {
        console.error('Error opening product:', e);
        alert('Error opening product: ' + e.message);
    }
};

window.closeModal = function () {
    modal.classList.remove('active');
    currentProductId = null;
};

window.adjustQuantity = function (delta) {
    const newQty = currentQuantity + delta;
    if (newQty >= 1 && newQty <= 10) {
        currentQuantity = newQty;
        window.updateQuantityDisplay();
        if (tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
    }
};

window.updateQuantityDisplay = function () {
    quantityDisplay.textContent = currentQuantity;
};

window.addToCart = function () {
    if (!currentProductId) return;
    if (!cart[currentProductId]) cart[currentProductId] = 0;
    cart[currentProductId] += currentQuantity;

    window.closeModal();
    window.updateMainButton();

    if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
};

window.calculateTotal = function () {
    return Object.entries(cart).reduce((total, [id, qty]) => {
        const product = products.find(p => p.id === parseInt(id));
        return total + (product ? product.price * qty : 0);
    }, 0);
};

window.updateMainButton = function () {
    const total = window.calculateTotal();
    const count = Object.values(cart).reduce((a, b) => a + b, 0);
    const text = `Checkout ($${total})`;
    const floatingCart = document.getElementById('floating-cart');

    if (count > 0) {
        if (tg.MainButton.isVisible) {
            tg.MainButton.text = text;
            tg.MainButton.show();
        } else {
            if (floatingCart) {
                floatingCart.textContent = text;
                floatingCart.classList.add('visible');
            }
        }
    } else {
        tg.MainButton.hide();
        if (floatingCart) floatingCart.classList.remove('visible');
    }
};

window.checkout = function () {
    const total = window.calculateTotal();
    let message = "🍵 *New Order from JEFE TEASTORE* 🍵\n\n";
    Object.entries(cart).forEach(([id, qty]) => {
        const product = products.find(p => p.id === parseInt(id));
        if (product) {
            message += `• ${product.name} x${qty} - $${product.price * qty}\n`;
        }
    });
    message += `\n💰 *Total: $${total}*`;
    const url = `https://t.me/jefesike?text=${encodeURIComponent(message)}`;
    tg.openTelegramLink(url);
    tg.close();
};

// Event Listeners
modal.addEventListener('click', (e) => {
    if (e.target === modal) window.closeModal();
});

tg.MainButton.onClick(window.checkout);

// Init
window.renderProducts();
tg.ready();
