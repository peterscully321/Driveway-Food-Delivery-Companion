/**
 * Kitchen Display System (KDS) Logic
 */

let kitchenOrders = [];

document.addEventListener('DOMContentLoaded', () => {
  loadOrders();
  setInterval(loadOrders, 6000); // Poll kitchen orders every 6s
});

async function loadOrders() {
  try {
    const res = await fetch('/api/orders');
    const data = await res.json();
    if (!data.success) return;

    kitchenOrders = data.orders || [];
    renderBoard();
  } catch (err) {
    console.error('Failed to load kitchen orders:', err);
  }
}

function renderBoard() {
  const colPlaced = document.getElementById('kds-list-placed');
  const colPrep = document.getElementById('kds-list-prep');
  const colReady = document.getElementById('kds-list-ready');
  const colDone = document.getElementById('kds-list-done');

  if (!colPlaced || !colPrep || !colReady || !colDone) return;

  colPlaced.innerHTML = '';
  colPrep.innerHTML = '';
  colReady.innerHTML = '';
  colDone.innerHTML = '';

  let placedCount = 0;
  let prepCount = 0;
  let readyCount = 0;
  let doneCount = 0;

  kitchenOrders.forEach(order => {
    const status = order.current_status;
    const card = createOrderTicket(order);

    if (status === 'PLACED' || status === 'CONFIRMED') {
      colPlaced.appendChild(card);
      placedCount++;
    } else if (status === 'PREPARING') {
      colPrep.appendChild(card);
      prepCount++;
    } else if (status === 'READY_AT_BAY') {
      colReady.appendChild(card);
      readyCount++;
    } else if (status === 'COMPLETED') {
      colDone.appendChild(card);
      doneCount++;
    }
  });

  // Update counters
  setCount('count-placed', placedCount);
  setCount('count-prep', prepCount);
  setCount('count-ready', readyCount);
  setCount('count-done', doneCount);

  // Update header stats
  const statActive = document.getElementById('stat-active-orders');
  if (statActive) statActive.textContent = placedCount + prepCount + readyCount;
}

function setCount(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function createOrderTicket(order) {
  const card = document.createElement('div');
  card.className = 'kds-ticket';

  let actionButtonHtml = '';
  if (order.current_status === 'PLACED' || order.current_status === 'CONFIRMED') {
    actionButtonHtml = `
      <button class="ticket-action-btn btn-start-prep" onclick="updateStatus('${order.order_number}', 'PREPARING')">
        👨‍🍳 Start Cooking
      </button>
    `;
  } else if (order.current_status === 'PREPARING') {
    actionButtonHtml = `
      <button class="ticket-action-btn btn-send-bay" onclick="updateStatus('${order.order_number}', 'READY_AT_BAY')">
        🚗 Dispatch to Bay #${order.bay_number}
      </button>
    `;
  } else if (order.current_status === 'READY_AT_BAY') {
    actionButtonHtml = `
      <button class="ticket-action-btn btn-complete" onclick="updateStatus('${order.order_number}', 'COMPLETED')">
        ✅ Customer Picked Up
      </button>
    `;
  } else {
    actionButtonHtml = `
      <div style="font-size: 0.8rem; color: var(--text-dim); text-align: center;">Order Completed</div>
    `;
  }

  const vehicleDesc = order.vehicle_model || order.vehicle_plate
    ? `${order.vehicle_model || ''} [${order.vehicle_plate || ''}]`
    : 'Curbside Pickup';

  card.innerHTML = `
    <div class="ticket-header">
      <div>
        <div class="ticket-order-id">${escapeHtml(order.order_number)}</div>
        <div style="font-size: 0.72rem; color: var(--text-dim);">${new Date(order.created_at).toLocaleTimeString()}</div>
      </div>
      <div class="ticket-bay-badge">Bay #${order.bay_number}</div>
    </div>
    <div class="ticket-customer-info">
      <strong>${escapeHtml(order.customer_name)}</strong> &bull; ${escapeHtml(vehicleDesc)}
    </div>
    ${order.special_instructions ? `
      <div class="ticket-special-note">
        ⚠️ <strong>Note:</strong> ${escapeHtml(order.special_instructions)}
      </div>
    ` : ''}
    <div style="margin-top: 0.8rem;">
      ${actionButtonHtml}
    </div>
    <div style="margin-top: 0.6rem; text-align: right;">
      <a href="/track?order=${encodeURIComponent(order.order_number)}" target="_blank" style="font-size: 0.75rem; color: var(--accent-cyan); text-decoration: none;">
        Open Customer Tracker ↗
      </a>
    </div>
  `;

  return card;
}

async function updateStatus(orderNumber, newStatus) {
  try {
    if (window.AudioFX) window.AudioFX.playClick();
    const res = await fetch(`/api/orders/${orderNumber}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    const data = await res.json();
    if (data.success) {
      await loadOrders();
    } else {
      alert(data.error || 'Failed to update');
    }
  } catch (e) {
    console.error(e);
  }
}
window.updateStatus = updateStatus;

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[m]);
}
