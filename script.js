// Initialize Telegram WebApp
const tg = window.Telegram.WebApp;
try {
    tg.expand();
    tg.enableClosingConfirmation();
} catch (e) {
    console.error('Telegram init failed:', e);
}

// State Management
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

// Core UI Reset & Initialization
window.resetCheckoutUI = function () {
    const items = document.getElementById('cart-items');
    const footer = document.querySelector('.checkout-footer');
    const title = document.getElementById('checkout-title');
    const success = document.getElementById('checkout-success');
    const btn = document.getElementById('checkout-btn');

    // Show products, hide success
    if (items) items.classList.remove('hidden');
    if (footer) footer.classList.remove('hidden');
    if (title) title.classList.remove('hidden');
    if (success) success.classList.add('hidden');

    // Reset Button
    if (btn) {
        btn.disabled = false;
        btn.textContent = 'Оформити замовлення';
        btn.style.opacity = '1';
        btn.style.background = ''; // In case it was red from error
    }

    // Reset Inputs
    const phoneInput = document.getElementById('order-phone');
    if (phoneInput) {
        // We might want to KEEP the phone number for convenience, or clear it.
        // Let's keep it but ensure it's not disabled.
        phoneInput.disabled = false;
    }
};

// Functions
window.renderProducts = function (filter = 'all') {
    const list = document.getElementById('product-list');
    if (!list) return;

    const filtered = filter === 'all' ? window.allProducts : window.allProducts.filter(p => p.category === filter);

    list.innerHTML = filtered.map(p => {
        const img = (p.images && p.images.length > 0) ? p.images[0] : (p.image || 'assets/tea_new.jpg');
        let price = `${p.price}₴`;
        if (p.variants) {
            const v = p.variants['100'] || Object.values(p.variants)[0];
            price = `${v}₴`;
        }
        return `
        <div class="product-card" onclick="window.openProduct(${p.id})">
            ${p.badge === 'fire' ? '<div class="product-badge"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.48 13.03c-.32-.8-.82-1.53-1.48-2.14-.52-.47-.91-.97-1.2-1.5-.67-.86-.99-1.83-1.13-2.79-.33-2.39 1.67-4.38 4.07-4.71-.77-.13-1.56-.08-2.33.12-2.36.42-3.8 2.65-3.21 4.98-2.58.55-4.48 2.82-4.48 5.67 0 .2.02.4.05.6-.24.05-.44.05-.69.05-1.19-.19-2.27-.75-2.99-1.65-1.78 2.52-1.25 5.94.03 8.97 1.67 3.96 6.28 5.85 10.22 4.19 2.15-.91 3.67-2.68 4.25-4.78.2-.74.32-1.51.25-2.29-.05-.77-.35-1.39-1.02-1.74l-.34.02z"/></svg></div>' : ''}
            <img src="${img}" alt="${p.name}" class="product-image" loading="lazy">
            <div class="product-info">
                <div class="product-category">${p.category}</div>
                <div class="product-name">${p.name}</div>
                <div class="product-price">${price}</div>
                <button class="btn-mini-add">Додати</button>
            </div>
        </div>`;
    }).join('');
};

window.filterCategory = function (cat) {
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.toggle('active', b.getAttribute('onclick').includes(`'${cat}'`)));
    window.renderProducts(cat);
    if (tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
};

window.openProduct = function (id) {
    const p = window.allProducts.find(x => x.id === id);
    if (!p) return;
    currentProductId = id; currentQuantity = 1; window.currentVariant = null; window.currentSlide = 0;

    window.updateQuantityDisplay();

    // Carousel
    const images = (p.images && p.images.length > 0) ? p.images : [p.image || 'assets/tea_new.jpg'];
    const track = document.getElementById('carousel-track');
    const dots = document.getElementById('carousel-dots');
    if (track) track.innerHTML = images.map(img => `<img src="${img}" onerror="this.src='https://placehold.co/400x400?text=Tea+Image'">`).join('');
    if (dots) dots.innerHTML = images.length > 1 ? images.map((_, i) => `<div class="dot ${i === 0 ? 'active' : ''}" onclick="window.goToImage(${i})"></div>`).join('') : '';

    window.updateCarouselUI();
    document.querySelectorAll('.carousel-nav').forEach(n => n.style.display = images.length > 1 ? 'block' : 'none');

    document.getElementById('modal-title').textContent = p.name;
    document.getElementById('modal-category').textContent = p.category;
    document.getElementById('modal-description').textContent = p.description;

    const vCont = document.getElementById('modal-variants');
    if (vCont) {
        vCont.innerHTML = '';
        if (p.variants) {
            vCont.style.display = 'flex';
            const ws = Object.keys(p.variants).sort((a, b) => Number(a) - Number(b));
            ws.forEach(w => {
                const b = document.createElement('button');
                b.className = 'weight-btn'; b.textContent = `${w}г`;
                b.onclick = () => window.setVariant(w);
                vCont.appendChild(b);
            });
            window.setVariant(p.variants['100'] ? '100' : ws[0]);
        } else {
            vCont.style.display = 'none';
            document.getElementById('modal-price').textContent = `${p.price}₴`;
        }
    }

    const brew = document.getElementById('modal-brewing');
    if (brew) {
        if (p.brewing) {
            brew.style.display = 'flex';
            brew.innerHTML = `
                <div class="brew-tag"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 8h1a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-1M6 9v11a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V9M6 9l2-5h8l2 5M10.5 14a2.5 2.5 0 1 0 5 0"/></svg><span>${p.brewing.steeps}</span></div>
                <div class="brew-tag"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg><span>${p.brewing.time}с</span></div>
                <div class="brew-tag"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 5H3v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5z"/><path d="M12 12h.01"/><path d="M12 8v-3"/></svg><span>${p.brewing.grams}г</span></div>`;
        } else brew.style.display = 'none';
    }

    document.getElementById('product-modal')?.classList.add('active');
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
};

window.setVariant = function (w) {
    const p = window.allProducts.find(x => x.id === currentProductId);
    if (!p || !p.variants[w]) return;
    window.currentVariant = w;
    document.getElementById('modal-price').textContent = `${p.variants[w]}₴`;
    document.querySelectorAll('.weight-btn').forEach(b => b.classList.toggle('active', b.textContent === `${w}г`));
};

window.closeModal = function () { document.getElementById('product-modal')?.classList.remove('active'); };
window.updateCarouselUI = function () {
    const t = document.getElementById('carousel-track');
    if (t) t.style.transform = `translateX(-${window.currentSlide * 100}%)`;
    document.querySelectorAll('.dot').forEach((d, i) => d.classList.toggle('active', i === window.currentSlide));
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
    if (n >= 1 && n <= 50) { currentQuantity = n; window.updateQuantityDisplay(); if (tg.HapticFeedback) tg.HapticFeedback.selectionChanged(); }
};
window.updateQuantityDisplay = function () { if (document.getElementById('quantity-display')) document.getElementById('quantity-display').textContent = currentQuantity; };

window.addToCart = function (buyNow) {
    if (!currentProductId) return;
    let k = String(currentProductId); if (window.currentVariant) k += `_${window.currentVariant}`;
    cart[k] = (cart[k] || 0) + currentQuantity;
    window.closeModal(); window.updateCartBadge();
    if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
    if (buyNow) window.openCart(); else document.getElementById('cart-confirm-modal')?.classList.add('active');
};

window.closeConfirmModal = function () { document.getElementById('cart-confirm-modal')?.classList.remove('active'); };

window.openCart = function () {
    window.closeConfirmModal();
    window.resetCheckoutUI(); // FORCED RESET ON EVERY OPEN

    const list = document.getElementById('cart-items');
    const entries = Object.entries(cart);

    if (entries.length === 0) {
        if (list) list.innerHTML = '<div class="empty-cart">Кошик порожній</div>';
        if (document.getElementById('cart-total')) document.getElementById('cart-total').textContent = '0₴';
    } else {
        let total = 0;
        let html = '';
        entries.forEach(([k, q]) => {
            const [id, v] = k.split('_');
            const p = window.allProducts.find(x => x.id === parseInt(id));
            if (p) {
                // Safety Variant Check
                let price = p.price;
                let title = p.name;
                if (v && p.variants && p.variants[v]) {
                    price = p.variants[v];
                    title += ` (${v}г)`;
                } else if (v) {
                    title += ` (${v}г)`; // Fallback display if variant removed but in cart
                }
                total += (price * q);
                const img = (p.images && p.images.length > 0) ? p.images[0] : (p.image || 'assets/tea_new.jpg');
                html += `
                <div class="cart-item">
                    <img src="${img}" class="cart-item-img">
                    <div class="cart-item-info">
                        <div class="cart-item-title">${title}</div>
                        <div class="cart-item-price">${q} x ${price}₴ = ${price * q}₴</div>
                    </div>
                </div>`;
            }
        });
        if (list) list.innerHTML = html;
        if (document.getElementById('cart-total')) document.getElementById('cart-total').textContent = `${total}₴`;
    }
    document.getElementById('checkout-modal')?.classList.add('active');
};

window.closeCheckout = function () { document.getElementById('checkout-modal')?.classList.remove('active'); };

window.updateCartBadge = function () {
    const c = Object.values(cart).reduce((a, b) => a + b, 0);
    const b = document.getElementById('cart-badge');
    if (b) { b.textContent = c; b.style.display = c > 0 ? 'flex' : 'none'; }
};

const BOT_TOKEN = '__BOT_TOKEN_PLACEHOLDER__'.trim().replace(/^"|"$/g, '');
const ADMIN_CHAT_ID = '__ADMIN_CHAT_ID_PLACEHOLDER__'.trim().replace(/^"|"$/g, '');

window.processCheckout = async function () {
    const btn = document.getElementById('checkout-btn');
    if (!btn || btn.disabled) return;

    const phone = document.getElementById('order-phone')?.value.trim();
    if (!phone) { alert('Введіть номер телефону!'); return; }

    btn.disabled = true;
    btn.textContent = 'Надсилаємо...';
    btn.style.opacity = '0.7';

    let total = 0; let items = [];
    Object.entries(cart).forEach(([k, q]) => {
        const [id, v] = k.split('_');
        const p = window.allProducts.find(x => x.id === parseInt(id));
        if (p) {
            let price = (v && p.variants) ? p.variants[v] : p.price;
            total += (price * q);
            items.push(`• ${p.name}${v ? ' (' + v + 'г)' : ''} x${q}`);
        }
    });

    const u = tg.initDataUnsafe?.user || {};
    let msg = `<b>📦 Нове замовлення!</b>\n\n`;
    msg += `👤 <b>Клієнт:</b> ${u.first_name || 'Клієнт'} (${u.username ? '@' + u.username : 'немає'})\n`;
    msg += `📞 <b>Контакт:</b> ${phone} (${document.querySelector('input[name="messenger"]:checked')?.value || 'Telegram'})\n\n`;
    msg += `🛒 <b>Товари:</b>\n${items.join('\n')}\n\n💰 <b>Сума:</b> ${total}₴`;

    try {
        const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
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

// Modals Background Close
document.querySelectorAll('.modal-overlay').forEach(m => {
    m.addEventListener('click', e => { if (e.target === m) m.classList.remove('active'); });
});

// Initialization
window.renderProducts();
window.updateCartBadge();
tg.ready();
