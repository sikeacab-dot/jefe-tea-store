/**
 * ZEN ARCHITECTURE v4.0
 * Ground-up rewrite for maximum stability and clarity.
 */

// 1. Core Telegram & State
const tg = window.Telegram.WebApp;
try {
    tg.expand();
    tg.enableClosingConfirmation();
} catch (e) {
    console.error('Zen: TG Init Error', e);
}

const ZenState = {
    products: (function () {
        const s = localStorage.getItem('jefe_products');
        if (s) { try { return JSON.parse(s); } catch (e) { return products; } }
        return products;
    })(),
    cart: {}, // Format: { "id_variant": quantity }
    current: {
        productId: null,
        variant: null,
        qty: 1,
        slide: 0
    }
};

// 2. UI Engine
const ZenUI = {
    // DOM Cache
    elements: {
        catalog: document.getElementById('product-list'),
        productModal: document.getElementById('product-modal'),
        cartModal: document.getElementById('checkout-modal'),
        confirmModal: document.getElementById('cart-confirm-modal'),
        badge: document.getElementById('cart-badge'),

        // Product Modal Details
        mTitle: document.getElementById('modal-title'),
        mPrice: document.getElementById('modal-price'),
        mCat: document.getElementById('modal-category'),
        mDesc: document.getElementById('modal-description'),
        mQty: document.getElementById('modal-qty'),
        mVariants: document.getElementById('modal-variants'),
        mBrewing: document.getElementById('modal-brewing'),
        mTrack: document.getElementById('carousel-track'),
        mDots: document.getElementById('carousel-dots'),

        // Checkout Details
        cItems: document.getElementById('cart-items'),
        cTotal: document.getElementById('cart-total'),
        cTitle: document.getElementById('checkout-title'),
        cFooter: document.getElementById('checkout-footer'),
        cSuccess: document.getElementById('checkout-success'),
        cSubmit: document.getElementById('checkout-submit-btn'),
        cPhone: document.getElementById('order-phone')
    },

    // Initialization
    init() {
        this.renderCatalog();
        this.updateBadge();
        tg.ready();
    },

    // Catalog Logic
    renderCatalog(filter = 'all') {
        const list = this.elements.catalog;
        if (!list) return;

        const items = filter === 'all'
            ? ZenState.products
            : ZenState.products.filter(p => p.category === filter);

        list.innerHTML = items.map(p => {
            const img = (p.images && p.images.length > 0) ? p.images[0] : (p.image || 'assets/tea_new.jpg');
            let price = `${p.price}₴`;
            if (p.variants) {
                const first = p.variants['100'] || Object.values(p.variants)[0];
                price = `${first}₴`;
            }

            return `
            <div class="product-card" onclick="ZenUI.openProduct(${p.id})">
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
    },

    filterCatalog(cat, btn) {
        document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
        if (btn) btn.classList.add('active');
        this.renderCatalog(cat);
        if (tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
    },

    // Product Modal Logic
    openProduct(id) {
        const p = ZenState.products.find(x => x.id === id);
        if (!p) return;

        ZenState.current = { productId: id, variant: null, qty: 1, slide: 0 };

        // Text & Content
        this.elements.mTitle.textContent = p.name;
        this.elements.mCat.textContent = p.category;
        this.elements.mDesc.textContent = p.description;
        this.elements.mQty.textContent = ZenState.current.qty;

        // Carousel
        const images = (p.images && p.images.length > 0) ? p.images : [p.image || 'assets/tea_new.jpg'];
        this.elements.mTrack.innerHTML = images.map(img => `<img src="${img}" onerror="this.src='https://placehold.co/400x400?text=Tea+Image'">`).join('');
        this.elements.mDots.innerHTML = images.length > 1 ? images.map((_, i) => `<div class="dot ${i === 0 ? 'active' : ''}" onclick="ZenUI.goToImage(${i})"></div>`).join('') : '';
        document.querySelectorAll('.carousel-nav').forEach(n => n.style.display = images.length > 1 ? 'block' : 'none');
        this.updateCarousel();

        // Variants
        const vCont = this.elements.mVariants;
        vCont.innerHTML = '';
        if (p.variants) {
            vCont.style.display = 'flex';
            const ws = Object.keys(p.variants).sort((a, b) => Number(a) - Number(b));
            ws.forEach(w => {
                const b = document.createElement('button');
                b.className = 'weight-btn'; b.textContent = `${w}г`;
                b.onclick = () => this.setVariant(w);
                vCont.appendChild(b);
            });
            this.setVariant(p.variants['100'] ? '100' : ws[0]);
        } else {
            vCont.style.display = 'none';
            this.elements.mPrice.textContent = `${p.price}₴`;
        }

        // Brewing
        const brew = this.elements.mBrewing;
        if (p.brewing) {
            brew.style.display = 'flex';
            brew.innerHTML = `
                <div class="brew-tag"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 8h1a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-1M6 9v11a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V9M6 9l2-5h8l2 5M10.5 14a2.5 2.5 0 1 0 5 0"/></svg><span>${p.brewing.steeps}</span></div>
                <div class="brew-tag"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg><span>${p.brewing.time}с</span></div>
                <div class="brew-tag"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 5H3v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5z"/><path d="M12 12h.01"/><path d="M12 8v-3"/></svg><span>${p.brewing.grams}г</span></div>`;
        } else brew.style.display = 'none';

        this.elements.productModal.classList.add('active');
        if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
    },

    setVariant(w) {
        const p = ZenState.products.find(x => x.id === ZenState.current.productId);
        if (!p || !p.variants[w]) return;
        ZenState.current.variant = w;
        this.elements.mPrice.textContent = `${p.variants[w]}₴`;
        document.querySelectorAll('.weight-btn').forEach(b => b.classList.toggle('active', b.textContent === `${w}г`));
    },

    adjustQty(d) {
        const n = ZenState.current.qty + d;
        if (n >= 1 && n <= 50) {
            ZenState.current.qty = n;
            this.elements.mQty.textContent = n;
            if (tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
        }
    },

    // Carousel Internal
    updateCarousel() {
        this.elements.mTrack.style.transform = `translateX(-${ZenState.current.slide * 100}%)`;
        document.querySelectorAll('.dot').forEach((d, i) => d.classList.toggle('active', i === ZenState.current.slide));
    },
    moveCarousel(d) {
        const p = ZenState.products.find(x => x.id === ZenState.current.productId);
        const len = (p.images && p.images.length > 0) ? p.images.length : 1;
        ZenState.current.slide = (ZenState.current.slide + d + len) % len;
        this.updateCarousel();
    },
    goToImage(i) { ZenState.current.slide = i; this.updateCarousel(); },

    // Cart Logic
    addToCart(buyNow) {
        if (!ZenState.current.productId) return;
        let key = String(ZenState.current.productId);
        if (ZenState.current.variant) key += `_${ZenState.current.variant}`;

        ZenState.cart[key] = (ZenState.cart[key] || 0) + ZenState.current.qty;
        this.elements.productModal.classList.remove('active');
        this.updateBadge();

        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        if (buyNow) this.openCart();
        else this.elements.confirmModal.classList.add('active');
    },

    updateBadge() {
        const c = Object.values(ZenState.cart).reduce((a, b) => a + b, 0);
        this.elements.badge.textContent = c;
        this.elements.badge.style.display = c > 0 ? 'flex' : 'none';
    },

    openCart() {
        this.closeModals();

        // EXHAUSTIVE UI RESET
        this.elements.cItems.classList.remove('hidden');
        this.elements.cItems.style.display = 'block';
        this.elements.cFooter.classList.remove('hidden');
        this.elements.cFooter.style.display = 'flex';
        this.elements.cTitle.classList.remove('hidden');
        this.elements.cSuccess.classList.add('hidden');

        const btn = this.elements.cSubmit;
        btn.disabled = false;
        btn.textContent = 'Оформити замовлення';
        btn.style.opacity = '1';
        btn.style.background = '';

        // Render Items
        const entries = Object.entries(ZenState.cart);
        if (entries.length === 0) {
            this.elements.cItems.innerHTML = '<div class="empty-cart">Кошик порожній</div>';
            this.elements.cTotal.textContent = '0₴';
        } else {
            let total = 0;
            let html = '';
            for (const [key, qty] of entries) {
                const [idStr, variant] = key.split('_');
                const p = ZenState.products.find(x => x.id === parseInt(idStr));
                if (p) {
                    let price = (variant && p.variants) ? p.variants[variant] : p.price;
                    total += (price * qty);
                    const img = (p.images && p.images.length > 0) ? p.images[0] : (p.image || 'assets/tea_new.jpg');
                    html += `
                    <div class="cart-item">
                        <img src="${img}" class="cart-item-img">
                        <div class="cart-item-info">
                            <div class="cart-item-title">${p.name}${variant ? ' (' + variant + 'г)' : ''}</div>
                            <div class="cart-item-price">${qty} x ${price}₴ = ${price * qty}₴</div>
                        </div>
                    </div>`;
                }
            }
            this.elements.cItems.innerHTML = html;
            this.elements.cTotal.textContent = `${total}₴`;
        }
        this.elements.cartModal.classList.add('active');
    },

    closeModals() {
        this.elements.productModal.classList.remove('active');
        this.elements.cartModal.classList.remove('active');
        this.elements.confirmModal.classList.remove('active');
    },

    // Checkout Processing
    async processCheckout() {
        const btn = this.elements.cSubmit;
        if (btn.disabled) return;

        const phone = this.elements.cPhone.value.trim();
        if (!phone) { alert('Введіть номер телефону!'); return; }

        btn.disabled = true;
        btn.textContent = 'Надсилаємо...';
        btn.style.opacity = '0.7';

        let total = 0;
        let itemList = [];
        for (const [k, q] of Object.entries(ZenState.cart)) {
            const [id, v] = k.split('_');
            const p = ZenState.products.find(x => x.id === parseInt(id));
            if (p) {
                let price = (v && p.variants) ? p.variants[v] : p.price;
                total += (price * q);
                itemList.push(`• ${p.name}${v ? ' (' + v + 'г)' : ''} x${q}`);
            }
        }

        const botToken = '__BOT_TOKEN_PLACEHOLDER__'.trim().replace(/^"|"$/g, '');
        const chatId = '__ADMIN_CHAT_ID_PLACEHOLDER__'.trim().replace(/^"|"$/g, '');
        const u = tg.initDataUnsafe?.user || {};
        const messenger = document.querySelector('input[name="order-messenger"]:checked')?.value || 'Telegram';

        let msg = `<b>📦 Нове замовлення!</b>\n\n`;
        msg += `👤 <b>Клієнт:</b> ${u.first_name || 'Клієнт'} (${u.username ? '@' + u.username : 'немає'})\n`;
        msg += `📞 <b>Контакт:</b> ${phone} (${messenger})\n\n`;
        msg += `🛒 <b>Товари:</b>\n${itemList.join('\n')}\n\n`;
        msg += `💰 <b>Сума:</b> ${total}₴`;

        try {
            const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: 'HTML' })
            });
            if (res.ok) {
                if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
                // SUCCESS TRANSITION
                this.elements.cItems.classList.add('hidden');
                this.elements.cFooter.classList.add('hidden');
                this.elements.cTitle.classList.add('hidden');
                this.elements.cSuccess.classList.remove('hidden');

                ZenState.cart = {};
                this.updateBadge();
                setTimeout(() => this.closeModals(), 5000);
            } else throw new Error();
        } catch (e) {
            btn.disabled = false;
            btn.textContent = 'Спробуйте ще раз';
            btn.style.background = '#ff4444';
            if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
        }
    }
};

// Start Zen
document.addEventListener('DOMContentLoaded', () => ZenUI.init());

// Global clicks for closing modals on overlay
document.querySelectorAll('.modal-overlay').forEach(m => {
    m.addEventListener('click', (e) => { if (e.target === m) ZenUI.closeModals(); });
});
