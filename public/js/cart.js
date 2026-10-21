/**
 * Cart State Management and Calculation Engine
 */

const Cart = (function () {
  const STORAGE_KEY = 'driveway_cart_items';
  let items = [];
  let coupon = null;

  function init() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        items = JSON.parse(stored);
      }
    } catch (e) {
      items = [];
    }
    syncBadge();
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {}
    syncBadge();
    renderCart();
  }

  function getItems() {
    return items;
  }

  function addItem(item, qty = 1) {
    const existing = items.find(i => i.item_id === item.item_id);
    if (existing) {
      existing.quantity += qty;
    } else {
      items.push({
        item_id: item.item_id,
        name: item.name,
        price: parseFloat(item.price),
        quantity: Math.max(1, qty),
        is_veg: item.is_veg
      });
    }
    save();
    if (window.AudioFX) window.AudioFX.playClick();
  }

  function updateQuantity(itemId, delta) {
    const target = items.find(i => i.item_id === itemId);
    if (!target) return;

    target.quantity += delta;
    if (target.quantity <= 0) {
      items = items.filter(i => i.item_id !== itemId);
    }
    save();
    if (window.AudioFX) window.AudioFX.playClick();
  }

  function removeItem(itemId) {
    items = items.filter(i => i.item_id !== itemId);
    save();
  }

  function clearCart() {
    items = [];
    coupon = null;
    save();
  }

  function getSubtotal() {
    return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }

  function getDiscount() {
    if (!coupon) return 0;
    const sub = getSubtotal();
    const rawDisc = (sub * (coupon.discount_percentage || 0)) / 100;
    return Math.min(rawDisc, coupon.max_discount || 9999);
  }

  function getTax() {
    const taxable = Math.max(0, getSubtotal() - getDiscount());
    return taxable * 0.08; // 8% sales tax
  }

  function getTotal() {
    const sub = getSubtotal();
    const disc = getDiscount();
    const tax = getTax();
    return Math.max(0, sub - disc + tax);
  }

  async function applyCouponCode(code) {
    const trimmed = (code || '').trim().toUpperCase();
    if (!trimmed) throw new Error('Please enter a coupon code.');

    const sub = getSubtotal();
    const res = await fetch(`/api/voice/coupon?code=${encodeURIComponent(trimmed)}&amount=${sub}`);
    const data = await res.json();

    if (!data.success || !data.valid) {
      throw new Error(data.error || 'Invalid coupon');
    }

    coupon = data.coupon;
    renderCart();
    return coupon;
  }

  function removeCoupon() {
    coupon = null;
    renderCart();
  }

  function getAppliedCoupon() {
    return coupon;
  }

  function syncBadge() {
    const totalCount = items.reduce((sum, i) => sum + i.quantity, 0);
    const badges = document.querySelectorAll('.cart-count-badge');
    badges.forEach(b => {
      b.textContent = totalCount;
      b.style.display = totalCount > 0 ? 'inline-block' : 'none';
    });
  }

  function renderCart() {
    const container = document.getElementById('cart-items-list');
    const summaryBox = document.getElementById('cart-summary-box');
    if (!container || !summaryBox) return;

    if (items.length === 0) {
      container.innerHTML = `
        <div class="empty-cart-view">
          <div class="empty-cart-icon">🛒</div>
          <p>Your Driveway order is currently empty.</p>
          <p style="font-size: 0.8rem; margin-top: 0.4rem; color: var(--text-dim);">
            Tap "Add" or speak: <em>"Add 2 Angus Burgers"</em>
          </p>
        </div>
      `;
      summaryBox.style.display = 'none';
      return;
    }

    summaryBox.style.display = 'block';

    let html = '';
    items.forEach(item => {
      const itemSubtotal = (item.price * item.quantity).toFixed(2);
      html += `
        <div class="cart-item-row">
          <div class="cart-item-info">
            <div class="cart-item-name">${item.is_veg ? '🟢 ' : '🔴 '}${escapeHtml(item.name)}</div>
            <div class="cart-item-price">$${item.price.toFixed(2)} &times; ${item.quantity} = $${itemSubtotal}</div>
          </div>
          <div class="qty-control">
            <button class="qty-btn" onclick="Cart.updateQuantity(${item.item_id}, -1)">-</button>
            <span class="qty-val">${item.quantity}</span>
            <button class="qty-btn" onclick="Cart.updateQuantity(${item.item_id}, 1)">+</button>
          </div>
        </div>
      `;
    });
    container.innerHTML = html;

    // Render totals
    const subtotalEl = document.getElementById('bill-subtotal');
    const discountEl = document.getElementById('bill-discount');
    const discountRow = document.getElementById('bill-discount-row');
    const taxEl = document.getElementById('bill-tax');
    const totalEl = document.getElementById('bill-total-amount');

    const sub = getSubtotal();
    const disc = getDiscount();
    const tax = getTax();
    const tot = getTotal();

    if (subtotalEl) subtotalEl.textContent = `$${sub.toFixed(2)}`;
    if (taxEl) taxEl.textContent = `$${tax.toFixed(2)}`;
    if (totalEl) totalEl.textContent = `$${tot.toFixed(2)}`;

    if (discountRow) {
      if (disc > 0 && coupon) {
        discountRow.style.display = 'flex';
        discountEl.textContent = `-$${disc.toFixed(2)} (${coupon.code})`;
      } else {
        discountRow.style.display = 'none';
      }
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[m]);
  }

  return {
    init,
    getItems,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    getSubtotal,
    getDiscount,
    getTax,
    getTotal,
    applyCouponCode,
    removeCoupon,
    getAppliedCoupon,
    renderCart,
    syncBadge
  };
})();

window.Cart = Cart;
