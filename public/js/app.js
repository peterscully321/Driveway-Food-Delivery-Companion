/**
 * Driveway Main Application Logic
 */

let allMenuItems = [];
let activeCategory = 'all';

document.addEventListener('DOMContentLoaded', async () => {
  if (window.Cart) window.Cart.init();
  if (window.VoiceAssistant) window.VoiceAssistant.init();

  setupEventListeners();
  await loadCategories();
  await loadMenuItems();
});

function setupEventListeners() {
  // Voice Modal Controls
  const voiceNavBtn = document.getElementById('voice-nav-btn');
  if (voiceNavBtn) {
    voiceNavBtn.addEventListener('click', () => window.VoiceAssistant.openVoiceModal());
  }

  const voiceCloseBtn = document.getElementById('voice-close-btn');
  if (voiceCloseBtn) {
    voiceCloseBtn.addEventListener('click', () => window.VoiceAssistant.closeVoiceModal());
  }

  const modalMicCircle = document.getElementById('modal-mic-circle');
  if (modalMicCircle) {
    modalMicCircle.addEventListener('click', () => window.VoiceAssistant.toggleListening());
  }

  const voiceSendBtn = document.getElementById('voice-text-send-btn');
  const voiceTextInput = document.getElementById('voice-text-input');
  if (voiceSendBtn && voiceTextInput) {
    const submitText = () => {
      const txt = voiceTextInput.value.trim();
      if (txt) {
        window.VoiceAssistant.handleVoiceCommand(txt);
        voiceTextInput.value = '';
      }
    };
    voiceSendBtn.addEventListener('click', submitText);
    voiceTextInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') submitText();
    });
  }

  // Cart Drawer
  const cartNavBtn = document.getElementById('cart-nav-btn');
  const cartDrawerBackdrop = document.getElementById('cart-drawer-backdrop');
  const cartCloseBtn = document.getElementById('cart-close-btn');

  if (cartNavBtn) {
    cartNavBtn.addEventListener('click', () => {
      window.Cart.renderCart();
      if (cartDrawerBackdrop) cartDrawerBackdrop.classList.add('open');
    });
  }

  if (cartCloseBtn && cartDrawerBackdrop) {
    cartCloseBtn.addEventListener('click', () => cartDrawerBackdrop.classList.remove('open'));
    cartDrawerBackdrop.addEventListener('click', (e) => {
      if (e.target === cartDrawerBackdrop) cartDrawerBackdrop.classList.remove('open');
    });
  }

  // Coupon Apply
  const applyCouponBtn = document.getElementById('apply-coupon-btn');
  const couponInput = document.getElementById('coupon-input');
  if (applyCouponBtn && couponInput) {
    applyCouponBtn.addEventListener('click', async () => {
      try {
        const coupon = await window.Cart.applyCouponCode(couponInput.value);
        showToast(`Coupon applied! ${coupon.discount_percentage}% off`, 'success');
        couponInput.value = '';
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }

  // Checkout modal controls
  const openCheckoutBtn = document.getElementById('open-checkout-btn');
  if (openCheckoutBtn) {
    openCheckoutBtn.addEventListener('click', openCheckoutModal);
  }

  const checkoutModalCloseBtn = document.getElementById('checkout-modal-close-btn');
  const checkoutBackdrop = document.getElementById('checkout-modal-backdrop');
  if (checkoutModalCloseBtn && checkoutBackdrop) {
    checkoutModalCloseBtn.addEventListener('click', () => checkoutBackdrop.classList.remove('open'));
    checkoutBackdrop.addEventListener('click', (e) => {
      if (e.target === checkoutBackdrop) checkoutBackdrop.classList.remove('open');
    });
  }

  // Checkout Form Submission
  const checkoutForm = document.getElementById('checkout-order-form');
  if (checkoutForm) {
    checkoutForm.addEventListener('submit', handleOrderSubmit);
  }

  // Search input
  const searchInput = document.getElementById('menu-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', () => filterAndRenderMenu());
  }

  // Veg toggle
  const vegToggle = document.getElementById('veg-only-toggle');
  if (vegToggle) {
    vegToggle.addEventListener('change', () => filterAndRenderMenu());
  }
}

async function loadCategories() {
  const container = document.getElementById('category-pills-wrap');
  if (!container) return;

  try {
    const res = await fetch('/api/menu/categories');
    const data = await res.json();
    if (!data.success) return;

    let html = `
      <button class="cat-pill active" data-category="all" onclick="filterByCategory('all')">
        🌟 All Items
      </button>
    `;

    data.data.forEach(cat => {
      html += `
        <button class="cat-pill" data-category="${cat.slug}" onclick="filterByCategory('${cat.slug}')">
          ${cat.icon} ${cat.name}
        </button>
      `;
    });

    container.innerHTML = html;
  } catch (err) {
    console.error('Error fetching categories:', err);
  }
}

async function loadMenuItems() {
  const container = document.getElementById('menu-items-grid');
  if (!container) return;

  try {
    const res = await fetch('/api/menu');
    const data = await res.json();
    if (!data.success) return;

    allMenuItems = data.data;
    filterAndRenderMenu();
  } catch (err) {
    console.error('Error fetching menu items:', err);
    container.innerHTML = '<p style="color: var(--accent-red); grid-column: 1/-1; text-align: center;">Failed to load menu items.</p>';
  }
}

function filterByCategory(slug) {
  activeCategory = slug;
  const pills = document.querySelectorAll('.cat-pill');
  pills.forEach(p => {
    p.classList.toggle('active', p.getAttribute('data-category') === slug);
  });
  filterAndRenderMenu();
}
window.filterByCategory = filterByCategory;

function filterAndRenderMenu() {
  const container = document.getElementById('menu-items-grid');
  if (!container) return;

  const searchInput = document.getElementById('menu-search-input');
  const vegToggle = document.getElementById('veg-only-toggle');

  const query = (searchInput ? searchInput.value : '').toLowerCase().trim();
  const vegOnly = vegToggle ? vegToggle.checked : false;

  const filtered = allMenuItems.filter(item => {
    const matchesCat = activeCategory === 'all' || item.category_slug === activeCategory;
    const matchesQuery = !query || item.name.toLowerCase().includes(query) || item.description.toLowerCase().includes(query);
    const matchesVeg = !vegOnly || item.is_veg === 1 || item.is_veg === true;
    return matchesCat && matchesQuery && matchesVeg;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
        <p style="font-size: 2.5rem; margin-bottom: 0.5rem;">🔍</p>
        <p style="font-size: 1.1rem; font-weight: 700;">No items found matching your criteria.</p>
        <p style="font-size: 0.85rem; color: var(--text-dim); margin-top: 0.3rem;">Try another keyword or category filter.</p>
      </div>
    `;
    return;
  }

  let html = '';
  filtered.forEach(item => {
    const isVeg = item.is_veg === 1 || item.is_veg === true;
    const isSpicy = item.is_spicy === 1 || item.is_spicy === true;

    html += `
      <div class="menu-card">
        <div class="card-image-wrap">
          <img src="${item.image_url}" alt="${escapeHtml(item.name)}" class="card-img" loading="lazy" />
          <div class="card-badges">
            <span class="badge ${isVeg ? 'badge-veg' : 'badge-nonveg'}">
              ${isVeg ? '🌱 Veg' : '🥩 Non-Veg'}
            </span>
            ${isSpicy ? '<span class="badge badge-spicy">🌶️ Spicy</span>' : ''}
          </div>
          <div class="card-prep-time">⏱️ ${item.prep_time_mins || 12} mins</div>
        </div>
        <div class="card-body">
          <div class="card-title-row">
            <h3 class="card-title">${escapeHtml(item.name)}</h3>
            <span class="card-rating">★ ${item.rating || '4.8'}</span>
          </div>
          <p class="card-desc">${escapeHtml(item.description)}</p>
          <div class="card-footer">
            <div class="card-price">$${parseFloat(item.price).toFixed(2)}</div>
            <button class="add-btn" onclick="addToCartById(${item.item_id})">
              <span>+ Add to Cart</span>
            </button>
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function addToCartById(itemId) {
  const item = allMenuItems.find(i => i.item_id === itemId);
  if (item && window.Cart) {
    window.Cart.addItem(item, 1);
    showToast(`Added ${item.name} to order`, 'success');
  }
}
window.addToCartById = addToCartById;

function openCheckoutModal() {
  const cartItems = window.Cart.getItems();
  if (cartItems.length === 0) {
    showToast('Your cart is empty!', 'error');
    return;
  }

  // Close cart drawer
  const cartDrawerBackdrop = document.getElementById('cart-drawer-backdrop');
  if (cartDrawerBackdrop) cartDrawerBackdrop.classList.remove('open');

  // Fill in modal summary
  const summaryEl = document.getElementById('checkout-modal-summary');
  if (summaryEl) {
    summaryEl.innerHTML = `
      <div style="background: rgba(0,0,0,0.3); border-radius: 8px; padding: 0.8rem; margin-bottom: 1rem;">
        <div style="display: flex; justify-content: space-between; font-weight: 700; margin-bottom: 0.3rem;">
          <span>Items: ${cartItems.reduce((acc, i) => acc + i.quantity, 0)}</span>
          <span style="color: var(--accent-gold);">Total: $${window.Cart.getTotal().toFixed(2)}</span>
        </div>
        <div style="font-size: 0.8rem; color: var(--text-dim);">
          ${cartItems.map(i => `${i.quantity}x ${i.name}`).join(', ')}
        </div>
      </div>
    `;
  }

  const modalBackdrop = document.getElementById('checkout-modal-backdrop');
  if (modalBackdrop) modalBackdrop.classList.add('open');
}
window.openCheckoutModal = openCheckoutModal;

async function handleOrderSubmit(e) {
  e.preventDefault();

  const submitBtn = document.getElementById('confirm-order-submit-btn');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Transmitting Order to Kitchen...';
  }

  const name = document.getElementById('cust-name').value.trim();
  const phone = document.getElementById('cust-phone').value.trim();
  const bay = document.getElementById('cust-bay').value;
  const plate = document.getElementById('cust-plate').value.trim();
  const model = document.getElementById('cust-model').value.trim();
  const notes = document.getElementById('cust-notes').value.trim();
  const payment = document.getElementById('cust-payment').value;

  const coupon = window.Cart.getAppliedCoupon();
  const items = window.Cart.getItems();

  const payload = {
    customer_name: name,
    customer_phone: phone,
    bay_number: bay,
    vehicle_plate: plate,
    vehicle_model: model,
    order_type: 'driveway_pickup',
    items: items,
    coupon_code: coupon ? coupon.code : '',
    special_instructions: notes,
    payment_method: payment
  };

  try {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to place order');
    }

    if (window.AudioFX) window.AudioFX.playSuccess();
    window.Cart.clearCart();

    const orderNumber = data.order.order_number;
    showToast(`Order ${orderNumber} placed! Opening live tracker...`, 'success');

    setTimeout(() => {
      window.location.href = `/track?order=${encodeURIComponent(orderNumber)}`;
    }, 1200);
  } catch (err) {
    console.error(err);
    showToast(err.message, 'error');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Confirm & Place Driveway Order';
    }
  }
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
    <span>${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
window.showToast = showToast;

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[m]);
}
