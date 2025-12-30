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
// Load products from localStorage or fallback
window.allProducts = (function () {
    const stored = localStorage.getItem('jefe_products');
    if (stored) {
        try {
            return JSON.parse(stored);
        } catch (e) {
            console.error('Failed to parse stored products:', e);
            return products;
        }
    }
    return products; // Global from products.js
})();

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
        ? window.allProducts
        : window.allProducts.filter(p => p.category === filter);

    productList.innerHTML = filteredProducts.map(product => {
        // Handle images (backward compatibility)
        let displayImage = product.image || 'assets/tea_new.jpg';
        if (product.images && product.images.length > 0) {
            displayImage = product.images[0];
        }

        // Price Logic for Card
        let priceDisplay = `${product.price}₴`;
        if (product.variants) {
            if (product.variants['100']) {
                priceDisplay = `${product.variants['100']}₴`;
            } else {
                // Show raw min price
                const vals = Object.values(product.variants);
                const min = Math.min(...vals);
                priceDisplay = `${min}₴`;
            }
        }

        return `
        <div class="product-card" onclick="window.openProduct(${product.id})">
            ${product.badge === 'fire' ? `
                <div class="product-badge">
                    <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                        <path d="M19.48 13.03c-.32-.8-.82-1.53-1.48-2.14-.52-.47-.91-.97-1.2-1.5-.67-.86-.99-1.83-1.13-2.79-.33-2.39 1.67-4.38 4.07-4.71-.77-.13-1.56-.08-2.33.12-2.36.42-3.8 2.65-3.21 4.98-2.58.55-4.48 2.82-4.48 5.67 0 .2.02.4.05.6-.24.05-.44.05-.69.05-1.19-.19-2.27-.75-2.99-1.65-1.78 2.52-1.25 5.94.03 8.97 1.67 3.96 6.28 5.85 10.22 4.19 2.15-.91 3.67-2.68 4.25-4.78.2-.74.32-1.51.25-2.29-.05-.77-.35-1.39-1.02-1.74l-.34.02z" />
                    </svg>
                </div>
            ` : ''}
            <img src="${displayImage}" alt="${product.name}" class="product-image" loading="lazy">
            <div class="product-info">
                <div class="product-category">${product.category}</div>
                <div class="product-name">${product.name}</div>
                <div class="product-price">${priceDisplay}</div>
                <button class="btn-mini-add">Додати</button>
            </div>
        </div>
    `}).join('');
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
    const product = window.allProducts.find(p => p.id === id);
    if (!product) return;

    currentProductId = id;
    currentQuantity = 1;
    window.currentVariant = null; // Reset variant
    window.currentSlide = 0; // Reset carousel
    window.updateQuantityDisplay();

    // Init Carousel
    let productImages = [];
    if (product.images && Array.isArray(product.images) && product.images.length > 0) {
        productImages = product.images.filter(img => img && img.trim() !== '');
    }

    // Fallback to single image if needed
    if (productImages.length === 0 && product.image) {
        productImages = [product.image];
    }

    // Global fallback if nothing found
    if (productImages.length === 0) {
        productImages = ['assets/tea_new.jpg'];
    }

    const track = document.getElementById('carousel-track');
    const dotsContainer = document.getElementById('carousel-dots');

    track.innerHTML = productImages.map(img => `
        <img src="${img}" 
             alt="${product.name}" 
             onerror="this.onerror=null; this.src='https://placehold.co/400x400?text=Tea+Image'">
    `).join('');

    const hasMultiple = productImages.length > 1;

    dotsContainer.innerHTML = hasMultiple
        ? productImages.map((_, i) => `<div class="dot ${i === 0 ? 'active' : ''}" onclick="window.goToImage(${i})"></div>`).join('')
        : '';

    window.updateCarouselUI(); // Set initial state

    // UI controls visibility
    const navs = document.querySelectorAll('.carousel-nav');
    navs.forEach(nav => nav.style.display = hasMultiple ? 'block' : 'none');
    dotsContainer.style.display = hasMultiple ? 'flex' : 'none';

    modalTitle.textContent = product.name;
    modalCategory.textContent = product.category;
    modalDescription.textContent = product.description;

    // Price & Variants Logic
    const vContainer = document.getElementById('modal-variants');
    vContainer.innerHTML = '';

    if (product.variants) {
        vContainer.style.display = 'flex';
        // Sort keys: 50, 100, 200, 250, 357
        const weights = Object.keys(product.variants).sort((a, b) => Number(a) - Number(b));

        weights.forEach(w => {
            const btn = document.createElement('button');
            btn.className = 'weight-btn';
            btn.textContent = `${w}г`;
            btn.onclick = () => window.setVariant(w);
            vContainer.appendChild(btn);
        });

        // Default to 100g if exists, else first
        if (product.variants['100']) window.setVariant('100');
        else window.setVariant(weights[0]);

    } else {
        // Fixed Price
        vContainer.style.display = 'none';
        modalPrice.textContent = `${product.price}₴`;
    }

    // Brewing Guide
    const brewContainer = document.getElementById('modal-brewing');
    if (product.brewing) {
        brewContainer.style.display = 'flex';
        brewContainer.innerHTML = `
            <div class="brew-tag" title="Кількість проливів">
                <svg viewBox="0 0 24 24" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M19 8h1a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-1M6 9v11a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V9M6 9l2-5h8l2 5M10.5 14a2.5 2.5 0 1 0 5 0"/>
                </svg>
                <span>${product.brewing.steeps}</span>
            </div>
            <div class="brew-tag" title="Час заварювання">
                <svg viewBox="0 0 24 24" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                </svg>
                <span>${product.brewing.time}с</span>
            </div>
            <div class="brew-tag" title="Вага">
                <svg viewBox="0 0 24 24" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 5H3v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5z"/>
                    <path d="M12 12h.01"/>
                    <path d="M12 8v-3"/>
                </svg>
                <span>${product.brewing.grams}г</span>
            </div>
        `;
    } else {
        brewContainer.style.display = 'none';
        brewContainer.innerHTML = '';
    }

    modal.classList.add('active');
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
};

window.setVariant = function (weight) {
    const product = window.allProducts.find(p => p.id === currentProductId);
    if (!product || !product.variants[weight]) return;

    window.currentVariant = weight;

    // Update Price
    document.getElementById('modal-price').textContent = `${product.variants[weight]}₴`;

    // Update Buttons
    document.querySelectorAll('.weight-btn').forEach(btn => {
        if (btn.textContent === `${weight}г`) btn.classList.add('active');
        else btn.classList.remove('active');
    });
};

window.closeModal = function () {
    modal.classList.remove('active');
    currentProductId = null;
    window.currentVariant = null;
};

// Carousel Logic
window.currentSlide = 0;
window.moveCarousel = function (delta) {
    const product = window.allProducts.find(p => p.id === currentProductId);
    const images = product.images || [product.image];
    const count = images.length;

    window.currentSlide = (window.currentSlide + delta + count) % count;
    window.updateCarouselUI();
    if (tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
};

window.goToImage = function (index) {
    window.currentSlide = index;
    window.updateCarouselUI();
};

window.updateCarouselUI = function () {
    const track = document.getElementById('carousel-track');
    const dots = document.querySelectorAll('.dot');

    track.style.transform = `translateX(-${window.currentSlide * 100}%)`;

    dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === window.currentSlide);
    });
};

// Touch Support for Carousel
let touchStartX = 0;
let touchEndX = 0;

modal.addEventListener('touchstart', e => {
    if (e.target.closest('.modal-carousel')) {
        touchStartX = e.changedTouches[0].screenX;
    }
}, { passive: true });

modal.addEventListener('touchend', e => {
    if (e.target.closest('.modal-carousel')) {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }
}, { passive: true });

function handleSwipe() {
    const diff = touchStartX - touchEndX;
    if (Math.abs(diff) > 50) { // Threshold
        if (diff > 0) window.moveCarousel(1);  // Swipe Left -> Next
        else window.moveCarousel(-1);           // Swipe Right -> Prev
    }
}

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

    // Create composite key for cart: ID_Weight (e.g. "123_100") or just ID ("123")
    let cartKey = String(currentProductId);
    if (window.currentVariant) {
        cartKey = `${currentProductId}_${window.currentVariant}`;
    }

    if (!cart[cartKey]) cart[cartKey] = 0;
    cart[cartKey] += currentQuantity;

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
        cartTotalDisplay.textContent = '0₴';
    } else {
        let total = 0;
        cartItemsContainer.innerHTML = cartEntries.map(([key, qty]) => {
            // Parse Key
            const [idStr, variant] = key.split('_');
            const id = parseInt(idStr);

            const product = window.allProducts.find(p => p.id === id);
            if (!product) return '';

            // Determine Price
            let price = product.price;
            let title = product.name;

            if (variant && product.variants && product.variants[variant]) {
                price = product.variants[variant];
                title += ` (${variant}г)`;
            } else if (variant) {
                // Legacy or Broken state fallback
                title += ` (${variant}г)`;
            }

            const itemTotal = price * qty;
            total += itemTotal;
            const cartDisplayImage = (product.images && product.images.length > 0) ? product.images[0] : (product.image || 'assets/tea_new.jpg');
            return `
                <div class="cart-item">
                    <img src="${cartDisplayImage}" class="cart-item-img">
                    <div class="cart-item-info">
                        <div class="cart-item-title">${title}</div>
                        <div class="cart-item-price">${qty} x ${price}₴ = ${itemTotal}₴</div>
                    </div>
                </div>
            `;
        }).join('');
        cartTotalDisplay.textContent = `${total}₴`;
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

// Bot Config (Values will be replaced by GitHub Actions during deploy)
const BOT_TOKEN = '__BOT_TOKEN_PLACEHOLDER__'.trim().replace(/^"|"$/g, '');
const ADMIN_CHAT_ID = '__ADMIN_CHAT_ID_PLACEHOLDER__'.trim().replace(/^"|"$/g, '');

window.processCheckout = async function () {
    const checkoutBtn = document.querySelector('.btn-checkout');
    if (!checkoutBtn || checkoutBtn.disabled) return;

    if (BOT_TOKEN.includes('PLACEHOLDER')) {
        console.error('Telegram Bot Token not configured!');
        alert('Помилка конфігурації бота. Будь ласка, переконайтеся, що секрети на GitHub налаштовані.');
        return;
    }

    const phoneInput = document.getElementById('order-phone');
    const selectedMessenger = document.querySelector('input[name="messenger"]:checked')?.value || 'Telegram';
    const phoneNumber = phoneInput?.value.trim();

    if (!phoneNumber) {
        alert('Будь ласка, введіть ваш номер телефону для зв\'язку!');
        phoneInput?.focus();
        return;
    }

    const total = Object.entries(cart).reduce((sum, [key, qty]) => {
        const [idStr, variant] = key.split('_');
        const id = parseInt(idStr);
        const p = window.allProducts.find(p => p.id === id);

        if (!p) return sum;

        let price = p.price;
        if (variant && p.variants && p.variants[variant]) {
            price = p.variants[variant];
        }
        return sum + (price * qty);
    }, 0);

    const user = tg.initDataUnsafe?.user || {};
    const userName = user.first_name || 'Клієнт';
    const userUsername = user.username ? `@${user.username}` : 'немає';

    let message = `<b>📦 Нове замовлення!</b>\n\n`;
    message += `👤 <b>Клієнт:</b> ${userName} (${userUsername})\n`;
    message += `🆔 <b>ID:</b> <code>${user.id || 'невідомо'}</code>\n`;
    message += `📞 <b>Контакт:</b> ${phoneNumber} (${selectedMessenger})\n\n`;
    message += `🛒 <b>Товари:</b>\n`;

    const items = [];
    Object.entries(cart).forEach(([key, qty]) => {
        const [idStr, variant] = key.split('_');
        const id = parseInt(idStr);
        const product = window.allProducts.find(p => p.id === id);

        if (product) {
            let name = product.name;
            if (variant) name += ` (${variant}г)`;
            items.push(`• ${name} x${qty}`);
        }
    });

    message += items.join('\n');
    message += `\n\n💰 <b>Сума:</b> ${total}₴`;

    try {
        // Change button state
        const originalText = checkoutBtn.textContent;
        checkoutBtn.disabled = true;
        checkoutBtn.textContent = 'Надсилаємо...';
        checkoutBtn.style.opacity = '0.7';

        const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: ADMIN_CHAT_ID,
                text: message,
                parse_mode: 'HTML'
            })
        });

        const data = await response.json();

        if (response.ok) {
            if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');

            // Show Success State in UI
            cartItemsContainer.innerHTML = `
                <div style="text-align:center; padding: 40px 20px;">
                    <div style="font-size: 48px; margin-bottom: 20px;">✅</div>
                    <h2 style="margin-bottom: 10px;">Дякуємо!</h2>
                    <p style="color: rgba(255,255,255,0.6); line-height: 1.5;">
                        Ваше замовлення успішно надіслано.<br>Ми зв'яжемося з вами найближчим часом.
                    </p>
                </div>
            `;
            document.querySelector('.checkout-footer').style.display = 'none';

            // Clear cart
            cart = {};
            window.updateCartBadge();

            // Auto close after 3 seconds or allow manual close
            setTimeout(() => {
                window.closeCheckout();
                // Reset UI for next time
                setTimeout(() => {
                    const footer = document.querySelector('.checkout-footer');
                    if (footer) footer.style.display = ''; // Revert to CSS value (block !important)
                }, 500);
            }, 5000);

        } else {
            console.error('Telegram API Error:', data);
            alert(`Помилка API: ${data.description || 'невідома помилка'}`);
            throw new Error('API Error');
        }
    } catch (e) {
        console.error('Checkout failed:', e);
        alert(`Помилка запиту: ${e.message}`);
        checkoutBtn.disabled = false;
        checkoutBtn.textContent = 'Помилка. Спробуйте ще раз';
        checkoutBtn.style.background = '#ff4444';
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
    }
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
