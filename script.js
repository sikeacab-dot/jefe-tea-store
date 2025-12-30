/**
 * ZEN ARCHITECTURE v4.9
 * Clean code, original branding, mobile-first fixes.
 */

const tg = window.Telegram.WebApp;
try { tg.expand(); tg.enableClosingConfirmation(); } catch (e) { }

const ZenState = {
    products: (function () {
        const s = localStorage.getItem('jefe_products');
        if (s) { try { return JSON.parse(s); } catch (e) { return products; } }
        return products;
    })(),
    cart: {},
    current: { productId: null, variant: null, qty: 1, slide: 0, checkoutTimeout: null }
};

const ZenUI = {
    init() {
        this.renderCatalog();
        this.updateBadge();
        tg.ready();
    },

    renderCatalog(filter = 'all') {
        const list = document.getElementById('product-list');
        if (!list) return;
        const items = filter === 'all' ? ZenState.products : ZenState.products.filter(p => p.category === filter);

        list.innerHTML = items.map(p => {
            const img = (p.images && p.images.length > 0) ? p.images[0] : (p.image || 'assets/tea_new.jpg');
            let price = `${p.price}₴`;
            if (p.variants) price = `${p.variants['100'] || Object.values(p.variants)[0]}₴`;

            return `
            <div class="product-card" onclick="ZenUI.openProduct(${p.id})">
                ${p.badge === 'fire' ? '<div class="product-badge"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.48 13.03c-.32-.8-.82-1.53-1.48-2.14-.52-.47-.91-.97-1.2-1.5-.67-.86-.99-1.83-1.13-2.79-.33-2.39 1.67-4.38 4.07-4.71-.77-.13-1.56-.08-2.33.12-2.36.42-3.8 2.65-3.21 4.98-2.58.55-4.48 2.82-4.48 5.67 0 .2.02.4.05.6-.24.05-.44.05-.69.05-1.19-.19-2.27-.75-2.99-1.65-1.78 2.52-1.25 5.94.03 8.97 1.67 3.96 6.28 5.85 10.22 4.19 2.15-.91 3.67-2.68 4.25-4.78.2-.74.32-1.51.25-2.29-.05-.77-.35-1.39-1.02-1.74l-.34.02z"/></svg></div>' : ''}
                <img src="${img}" class="product-image">
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

    openProduct(id) {
        const p = ZenState.products.find(x => x.id === id);
        if (!p) return;
        if (ZenState.current.checkoutTimeout) { clearTimeout(ZenState.current.checkoutTimeout); ZenState.current.checkoutTimeout = null; }
        ZenState.current = { ...ZenState.current, productId: id, variant: null, qty: 1, slide: 0 };

        document.getElementById('modal-title').textContent = p.name;
        document.getElementById('modal-category').textContent = p.category;
        document.getElementById('modal-description').textContent = p.description;
        document.getElementById('modal-qty').textContent = ZenState.current.qty;

        const imgs = (p.images && p.images.length > 0) ? p.images : [p.image || 'assets/tea_new.jpg'];
        document.getElementById('carousel-track').innerHTML = imgs.map(img => `<img src="${img}" onerror="this.src='https://placehold.co/400x400?text=Tea'">`).join('');
        document.getElementById('carousel-dots').innerHTML = imgs.length > 1 ? imgs.map((_, i) => `<div class="dot ${i === 0 ? 'active' : ''}" onclick="ZenUI.goToImage(${i})"></div>`).join('') : '';
        document.querySelectorAll('.carousel-nav').forEach(n => n.style.display = imgs.length > 1 ? 'block' : 'none');
        this.updateCarousel();

        const vCont = document.getElementById('modal-variants');
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
            document.getElementById('modal-price').textContent = `${p.price}₴`;
        }

        const brew = document.getElementById('modal-brewing');
        if (p.brewing) {
            brew.style.display = 'flex';
            brew.innerHTML = `<div class="brew-tag">🍵 ${p.brewing.steeps}</div> <div class="brew-tag">⏱ ${p.brewing.time}с</div> <div class="brew-tag">⚖️ ${p.brewing.grams}г</div>`;
        } else brew.style.display = 'none';

        document.getElementById('product-modal').classList.add('active');
        if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
    },

    setVariant(w) {
        const p = ZenState.products.find(x => x.id === ZenState.current.productId);
        if (!p) return;
        ZenState.current.variant = w;
        document.getElementById('modal-price').textContent = `${p.variants[w]}₴`;
        document.querySelectorAll('.weight-btn').forEach(b => b.classList.toggle('active', b.textContent === `${w}г`));
    },

    adjustQty(d) {
        const n = ZenState.current.qty + d;
        if (n >= 1 && n <= 50) { ZenState.current.qty = n; document.getElementById('modal-qty').textContent = n; }
    },

    updateCarousel() {
        document.getElementById('carousel-track').style.transform = `translateX(-${ZenState.current.slide * 100}%)`;
        document.querySelectorAll('.dot').forEach((d, i) => d.classList.toggle('active', i === ZenState.current.slide));
    },
    moveCarousel(d) {
        const p = ZenState.products.find(x => x.id === ZenState.current.productId);
        const len = (p.images && p.images.length > 0) ? p.images.length : 1;
        ZenState.current.slide = (ZenState.current.slide + d + len) % len;
        this.updateCarousel();
    },
    goToImage(i) { ZenState.current.slide = i; this.updateCarousel(); },

    addToCart(buyNow) {
        if (!ZenState.current.productId) return;
        let k = String(ZenState.current.productId);
        if (ZenState.current.variant) k += `_${ZenState.current.variant}`;
        ZenState.cart[k] = (ZenState.cart[k] || 0) + ZenState.current.qty;
        this.closeModals();
        this.updateBadge();
        if (buyNow) this.openCart();
        else document.getElementById('cart-confirm-modal').classList.add('active');
    },

    updateBadge() {
        const c = Object.values(ZenState.cart).reduce((a, b) => a + b, 0);
        const b = document.getElementById('cart-badge');
        if (b) { b.textContent = c; b.style.display = c > 0 ? 'flex' : 'none'; }
    },

    openCart() {
        if (ZenState.current.checkoutTimeout) { clearTimeout(ZenState.current.checkoutTimeout); ZenState.current.checkoutTimeout = null; }
        this.closeModals();

        // Robust Visibility Reset
        const items = document.getElementById('cart-items');
        const footer = document.getElementById('checkout-footer');
        const title = document.getElementById('checkout-title');
        const success = document.getElementById('checkout-success');
        const btn = document.getElementById('checkout-submit-btn');

        if (items) { items.classList.remove('hidden'); items.style.setProperty('display', 'block', 'important'); }
        if (footer) { footer.classList.remove('hidden'); footer.style.setProperty('display', 'flex', 'important'); }
        if (title) title.classList.remove('hidden');
        if (success) success.classList.add('hidden');

        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Оформити замовлення';
            btn.style.opacity = '1';
            btn.style.background = '';
        }

        const entries = Object.entries(ZenState.cart);
        if (entries.length === 0) {
            if (items) items.innerHTML = '<div class="empty-cart">Порожньо</div>';
            document.getElementById('cart-total').textContent = '0₴';
        } else {
            let total = 0;
            let html = '';
            for (const [key, qty] of entries) {
                const [id, v] = key.split('_');
                const p = ZenState.products.find(x => x.id === parseInt(id));
                if (p) {
                    let price = v ? p.variants[v] : p.price;
                    total += (price * qty);
                    const img = (p.images && p.images.length > 0) ? p.images[0] : (p.image || 'assets/tea_new.jpg');
                    html += `
                    <div class="cart-item">
                        <img src="${img}" class="cart-item-img">
                        <div class="cart-item-info">
                            <div class="cart-item-title">${p.name}${v ? ' (' + v + 'г)' : ''}</div>
                            <div class="cart-item-price">${qty} x ${price}₴ = ${price * qty}₴</div>
                        </div>
                    </div>`;
                }
            }
            if (items) items.innerHTML = html;
            document.getElementById('cart-total').textContent = `${total}₴`;
        }
        document.getElementById('checkout-modal').classList.add('active');
    },

    closeModals() {
        document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
    },

    async processCheckout() {
        const btn = document.getElementById('checkout-submit-btn');
        if (btn.disabled) return;
        const phone = document.getElementById('order-phone').value.trim();
        if (!phone) { alert('Введіть телефон!'); return; }

        btn.disabled = true; btn.textContent = 'Надсилаємо...';

        let total = 0; let list = [];
        for (const [k, q] of Object.entries(ZenState.cart)) {
            const [id, v] = k.split('_');
            const p = ZenState.products.find(x => x.id === parseInt(id));
            if (p) {
                let price = v ? p.variants[v] : p.price;
                total += (price * q);
                list.push(`• ${p.name}${v ? ' (' + v + 'г)' : ''} x${q}`);
            }
        }

        const botToken = '__BOT_TOKEN_PLACEHOLDER__'.trim().replace(/^"|"$/g, '');
        const chatId = '__ADMIN_CHAT_ID_PLACEHOLDER__'.trim().replace(/^"|"$/g, '');
        const messenger = document.querySelector('input[name="order-messenger"]:checked')?.value || 'Telegram';
        const u = tg.initDataUnsafe?.user || {};

        let msg = `<b>📦 Нове замовлення!</b>\n\n👤 ${u.first_name || 'Клієнт'}\n📞 ${phone} (${messenger})\n\n🛒 ${list.join('\n')}\n\n💰 ${total}₴`;

        try {
            const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: 'HTML' })
            });
            if (res.ok) {
                document.getElementById('cart-items').classList.add('hidden');
                document.getElementById('checkout-footer').classList.add('hidden');
                document.getElementById('checkout-title').classList.add('hidden');
                document.getElementById('checkout-success').classList.remove('hidden');
                ZenState.cart = {}; this.updateBadge();
                ZenState.current.checkoutTimeout = setTimeout(() => {
                    document.getElementById('checkout-modal').classList.remove('active');
                    ZenState.current.checkoutTimeout = null;
                }, 4000);
            } else throw new Error();
        } catch (e) {
            btn.disabled = false; btn.textContent = 'Помилка'; btn.style.background = '#ff4444';
        }
    }
};

document.addEventListener('DOMContentLoaded', () => ZenUI.init());
document.querySelectorAll('.modal-overlay').forEach(m => m.addEventListener('click', e => { if (e.target === m) ZenUI.closeModals(); }));
