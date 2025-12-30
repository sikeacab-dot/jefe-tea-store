// Initialize Telegram WebApp
const tg = window.Telegram.WebApp;
try {
    tg.expand();
    tg.enableClosingConfirmation();
} catch (e) {
    console.error('Telegram init failed:', e);
}

// State
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
    return products;
})();

let cart = {};
let currentProductId = null;
let currentQuantity = 1;

// DOM Elements
const productList = document.getElementById('product-list');
const modal = document.getElementById('product-modal');
const modalTitle = document.getElementById('modal-title');
const modalPrice = document.getElementById('modal-price');
const modalCategory = document.getElementById('modal-category');
const modalDescription = document.getElementById('modal-description');
const quantityDisplay = document.getElementById('quantity-display');

const cartConfirmModal = document.getElementById('cart-confirm-modal');
const checkoutModal = document.getElementById('checkout-modal');
const cartItemsContainer = document.getElementById('cart-items');
const cartTotalDisplay = document.getElementById('cart-total');
const cartBadge = document.getElementById('cart-badge');

// Global Functions
window.renderProducts = function (filter = 'all') {
    const filteredProducts = filter === 'all'
        ? window.allProducts
        : window.allProducts.filter(p => p.category === filter);

    productList.innerHTML = filteredProducts.map(product => {
        let displayImage = product.image || 'assets/tea_new.jpg';
        if (product.images && product.images.length > 0) {
            displayImage = product.images[0];
        }

        let priceDisplay = `${product.price}₴`;
        if (product.variants) {
            if (product.variants['100']) {
                priceDisplay = `${product.variants['100']}₴`;
            } else {
                const vals = Object.values(product.variants);
                const min = Math.min(...vals);
                priceDisplay = `${min}₴`;
            }
        }

        return `
        <div class="product-card" onclick="window.openProduct(${product.id})">
            ${product.badge === 'fire' ? `
                <div class="product-badge">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.48 13.03c-.32-.8-.82-1.53-1.48-2.14-.52-.47-.91-.97-1.2-1.5-.67-.86-.99-1.83-1.13-2.79-.33-2.39 1.67-4.38 4.07-4.71-.77-.13-1.56-.08-2.33.12-2.36.42-3.8 2.65-3.21 4.98-2.58.55-4.48 2.82-4.48 5.67 0 .2.02.4.05.6-.24.05-.44.05-.69.05-1.19-.19-2.27-.75-2.99-1.65-1.78 2.52-1.25 5.94.03 8.97 1.67 3.96 6.28 5.85 10.22 4.19 2.15-.91 3.67-2.68 4.25-4.78.2-.74.32-1.51.25-2.29-.05-.77-.35-1.39-1.02-1.74l-.34.02z" /></svg>
                </div>
            ` : ''}
            <img src="${displayImage}" alt="${product.name}" class="product-image" loading="lazy">
            <div class="product-info">
                <div class="product-category">${product.category}</div>
                <div class="product-name">${product.name}</div>
                <div class="product-price">${priceDisplay}</div>
                <button class="btn-mini-add">Додати</button>
            </div>
        </div>`;
    }).join('');
};

window.filterCategory = function (category) {
    document.querySelectorAll('.cat-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('onclick').includes(`'${category}'`));
    });
    window.renderProducts(category);
    if (tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
};

window.openProduct = function (id) {
    const product = window.allProducts.find(p => p.id === id);
    if (!product) return;

    currentProductId = id;
    currentQuantity = 1;
    window.currentVariant = null;
    window.currentSlide = 0;
    window.updateQuantityDisplay();

    let productImages = (product.images && product.images.length > 0) ? product.images : [product.image || 'assets/tea_new.jpg'];

    const track = document.getElementById('carousel-track');
    const dotsContainer = document.getElementById('carousel-dots');
    if (track) {
        track.innerHTML = productImages.map(img => `<img src="${img}" alt="${product.name}" onerror="this.src='https://placehold.co/400x400?text=Tea+Image'">`).join('');
    }

    const hasMultiple = productImages.length > 1;
    if (dotsContainer) {
        dotsContainer.innerHTML = hasMultiple ? productImages.map((_, i) => `<div class="dot ${i === 0 ? 'active' : ''}" onclick="window.goToImage(${i})"></div>`).join('') : '';
    }

    window.updateCarouselUI();
    document.querySelectorAll('.carousel-nav').forEach(nav => nav.style.display = hasMultiple ? 'block' : 'none');

    if (modalTitle) modalTitle.textContent = product.name;
    if (modalCategory) modalCategory.textContent = product.category;
    if (modalDescription) modalDescription.textContent = product.description;

    const vContainer = document.getElementById('modal-variants');
    if (vContainer) {
        vContainer.innerHTML = '';
        if (product.variants) {
            vContainer.style.display = 'flex';
            const weights = Object.keys(product.variants).sort((a, b) => Number(a) - Number(b));
            weights.forEach(w => {
                const btn = document.createElement('button');
                btn.className = 'weight-btn';
                btn.textContent = `${w}г`;
                btn.onclick = () => window.setVariant(w);
                vContainer.appendChild(btn);
            });
            window.setVariant(product.variants['100'] ? '100' : weights[0]);
        } else {
            vContainer.style.display = 'none';
            if (modalPrice) modalPrice.textContent = `${product.price}₴`;
        }
    }

    const brewContainer = document.getElementById('modal-brewing');
    if (brewContainer) {
        if (product.brewing) {
            brewContainer.style.display = 'flex';
            brewContainer.innerHTML = `
                <div class="brew-tag"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 8h1a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-1M6 9v11a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V9M6 9l2-5h8l2 5M10.5 14a2.5 2.5 0 1 0 5 0"/></svg><span>${product.brewing.steeps}</span></div>
                <div class="brew-tag"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg><span>${product.brewing.time}с</span></div>
                <div class="brew-tag"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 5H3v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5z"/><path d="M12 12h.01"/><path d="M12 8v-3"/></svg><span>${product.brewing.grams}г</span></div>`;
        } else {
            brewContainer.style.display = 'none';
        }
    }

    if (modal) modal.classList.add('active');
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
};

window.setVariant = function (weight) {
    const p = window.allProducts.find(x => x.id === currentProductId);
    if (!p || !p.variants[weight]) return;
    window.currentVariant = weight;
    if (modalPrice) modalPrice.textContent = `${p.variants[weight]}₴`;
    document.querySelectorAll('.weight-btn').forEach(btn => btn.classList.toggle('active', btn.textContent === `${weight}г`));
};

window.closeModal = function () { if (modal) modal.classList.remove('active'); };
window.updateCarouselUI = function () {
    const track = document.getElementById('carousel-track');
    if (track) track.style.transform = `translateX(-${window.currentSlide * 100}%)`;
    document.querySelectorAll('.dot').forEach((dot, i) => dot.classList.toggle('active', i === window.currentSlide));
};
window.moveCarousel = function (d) {
    const p = window.allProducts.find(x => x.id === currentProductId);
    const len = (p.images && p.images.length > 0) ? p.images.length : 1;
    window.currentSlide = (window.currentSlide + d + len) % len;
    window.updateCarouselUI();
};
window.goToImage = function (i) { window.currentSlide = i; window.updateCarouselUI(); };

window.adjustQuantity = function (d) {
    const n = currentQuantity + d;
    if (n >= 1 && n <= 50) {
        currentQuantity = n;
        window.updateQuantityDisplay();
        if (tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
    }
};
window.updateQuantityDisplay = function () { if (quantityDisplay) quantityDisplay.textContent = currentQuantity; };

window.addToCart = function (buyNow) {
    if (!currentProductId) return;
    let key = String(currentProductId);
    if (window.currentVariant) key += `_${window.currentVariant}`;
    cart[key] = (cart[key] || 0) + currentQuantity;
    window.closeModal();
    window.updateCartBadge();
    if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
    if (buyNow) window.openCart();
    else window.openConfirmModal();
};

window.openConfirmModal = function () { if (cartConfirmModal) cartConfirmModal.classList.add('active'); };
window.closeConfirmModal = function () { if (cartConfirmModal) cartConfirmModal.classList.remove('active'); };

window.openCart = function () {
    window.closeConfirmModal();

    // RESET UI STATES
    const items = document.getElementById('cart-items');
    const footer = document.querySelector('.checkout-footer');
    const title = document.getElementById('checkout-title');
    const success = document.getElementById('checkout-success');
    const btn = document.querySelector('.btn-checkout');

    if (items) items.classList.remove('hidden');
    if (footer) footer.classList.remove('hidden');
    if (title) title.classList.remove('hidden');
    if (success) success.classList.add('hidden');

    if (btn) {
        btn.disabled = false;
        btn.textContent = 'Оформити замовлення';
        btn.style.opacity = '1';
        btn.style.background = '';
    }

    const entries = Object.entries(cart);
    if (entries.length === 0) {
        if (items) items.innerHTML = '<div class="empty-cart">Кошик порожній</div>';
        if (cartTotalDisplay) cartTotalDisplay.textContent = '0₴';
    } else {
        let total = 0;
        if (items) {
            items.innerHTML = entries.map(([k, q]) => {
                const [id, v] = k.split('_');
                const p = window.allProducts.find(x => x.id === parseInt(id));
                if (!p) return '';
                let price = v ? p.variants[v] : p.price;
                total += (price * q);
                const img = (p.images && p.images.length > 0) ? p.images[0] : (p.image || 'assets/tea_new.jpg');
                return `
                <div class="cart-item">
                    <img src="${img}" class="cart-item-img">
                    <div class="cart-item-info">
                        <div class="cart-item-title">${p.name}${v ? ' (' + v + 'г)' : ''}</div>
                        <div class="cart-item-price">${q} x ${price}₴ = ${price * q}₴</div>
                    </div>
                </div>`;
            }).join('');
        }
        if (cartTotalDisplay) cartTotalDisplay.textContent = `${total}₴`;
    }
    if (checkoutModal) checkoutModal.classList.add('active');
};

window.closeCheckout = function () { if (checkoutModal) checkoutModal.classList.remove('active'); };

window.updateCartBadge = function () {
    const c = Object.values(cart).reduce((a, b) => a + b, 0);
    if (cartBadge) {
        cartBadge.textContent = c;
        cartBadge.style.display = c > 0 ? 'flex' : 'none';
    }
};

const BOT_TOKEN = '__BOT_TOKEN_PLACEHOLDER__'.trim().replace(/^"|"$/g, '');
const ADMIN_CHAT_ID = '__ADMIN_CHAT_ID_PLACEHOLDER__'.trim().replace(/^"|"$/g, '');

window.processCheckout = async function () {
    const btn = document.querySelector('.btn-checkout');
    if (!btn || btn.disabled) return;

    const phone = document.getElementById('order-phone')?.value.trim();
    if (!phone) { alert('Будь ласка, введіть телефон!'); document.getElementById('order-phone')?.focus(); return; }

    let total = 0;
    let list = [];
    Object.entries(cart).forEach(([k, q]) => {
        const [id, v] = k.split('_');
        const p = window.allProducts.find(x => x.id === parseInt(id));
        if (p) {
            let price = v ? p.variants[v] : p.price;
            total += (price * q);
            list.push(`• ${p.name}${v ? ' (' + v + 'г)' : ''} x${q}`);
        }
    });

    const u = tg.initDataUnsafe?.user || {};
    let msg = `<b>📦 Нове замовлення!</b>\n\n`;
    msg += `👤 <b>Клієнт:</b> ${u.first_name || 'Клієнт'} (${u.username ? '@' + u.username : 'немає'})\n`;
    msg += `📞 <b>Контакт:</b> ${phone} (${document.querySelector('input[name="messenger"]:checked')?.value || 'Telegram'})\n\n`;
    msg += `🛒 <b>Товари:</b>\n${list.join('\n')}\n\n💰 <b>Сума:</b> ${total}₴`;

    try {
        btn.disabled = true; btn.textContent = 'Надсилаємо...'; btn.style.opacity = '0.7';
        const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: ADMIN_CHAT_ID, text: msg, parse_mode: 'HTML' })
        });
        if (res.ok) {
            if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
            document.getElementById('cart-items')?.classList.add('hidden');
            document.querySelector('.checkout-footer')?.classList.add('hidden');
            document.getElementById('checkout-title')?.classList.add('hidden');
            document.getElementById('checkout-success')?.classList.remove('hidden');
            cart = {}; window.updateCartBadge();
            setTimeout(() => window.closeCheckout(), 5000);
        } else throw new Error('API Error');
    } catch (e) {
        btn.disabled = false; btn.textContent = 'Спробуйте ще раз'; btn.style.background = '#ff4444';
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
    }
};

window.renderProducts();
window.updateCartBadge();
tg.ready();
