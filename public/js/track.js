/**
 * Real-Time Order Tracking Module
 * Subscribes to Server-Sent Events (SSE) for live status broadcast
 */

let currentOrderNumber = null;
let eventSource = null;
let currentStatus = 'PLACED';

const STAGE_ORDER = ['PLACED', 'CONFIRMED', 'PREPARING', 'READY_AT_BAY', 'COMPLETED'];

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  currentOrderNumber = urlParams.get('order') || 'DW-8842';

  initTracking(currentOrderNumber);
  setupSimulationButton();
});

async function initTracking(orderNumber) {
  document.getElementById('track-order-num').textContent = orderNumber;
  
  await fetchOrderDetails(orderNumber);
  connectSSE(orderNumber);
}

async function fetchOrderDetails(orderNumber) {
  try {
    const res = await fetch(`/api/orders/${orderNumber}`);
    const data = await res.json();

    if (!data.success) {
      document.getElementById('track-content-body').innerHTML = `
        <div style="text-align: center; padding: 4rem 1rem; color: var(--text-muted);">
          <h2>Order Not Found</h2>
          <p style="margin: 0.8rem 0;">We could not locate order <strong>${escapeHtml(orderNumber)}</strong>.</p>
          <a href="/" class="chip-btn" style="display: inline-block; margin-top: 1rem;">Back to Menu</a>
        </div>
      `;
      return;
    }

    const { order, items, history } = data;
    currentStatus = order.current_status;

    // Render Order Details
    document.getElementById('track-bay-num').textContent = `Bay #${order.bay_number}`;
    const vehicleText = order.vehicle_model || order.vehicle_plate 
      ? `${order.vehicle_model || ''} (${order.vehicle_plate || 'No Plate'})` 
      : 'Standard Curbside Spot';
    document.getElementById('track-vehicle-info').textContent = vehicleText;

    // Render Items Summary
    const itemsEl = document.getElementById('track-items-summary');
    if (itemsEl) {
      itemsEl.innerHTML = items.map(i => `
        <div style="display: flex; justify-content: space-between; font-size: 0.88rem; padding: 0.3rem 0; border-bottom: 1px solid rgba(255,255,255,0.04);">
          <span><strong style="color: var(--accent-gold);">${i.quantity}x</strong> ${escapeHtml(i.item_name)}</span>
          <span>$${parseFloat(i.subtotal_price).toFixed(2)}</span>
        </div>
      `).join('') + `
        <div style="display: flex; justify-content: space-between; font-weight: 800; margin-top: 0.6rem; font-size: 1rem;">
          <span>Total Paid</span>
          <span style="color: var(--accent-gold);">$${parseFloat(order.total_amount).toFixed(2)}</span>
        </div>
      `;
    }

    // Render Bay Slot Visualizer
    renderBayGrid(order.bay_number);

    // Render Progress Stages
    updateStepper(order.current_status);

    // Render History Timeline
    renderTimeline(history);

    // Update estimated time countdown
    startEtaCountdown(order.estimated_ready_time);
  } catch (err) {
    console.error('Failed to fetch order details:', err);
  }
}

function connectSSE(orderNumber) {
  if (eventSource) eventSource.close();

  eventSource = new EventSource(`/api/orders/${orderNumber}/stream`);

  eventSource.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data);
      if (payload.event === 'STATUS_CHANGED') {
        handleStatusUpdate(payload);
      }
    } catch (e) {
      console.warn('Malformed SSE event:', e);
    }
  };

  eventSource.onerror = () => {
    const liveBadge = document.getElementById('live-conn-badge');
    if (liveBadge) {
      liveBadge.innerHTML = '<span style="color: var(--accent-amber);">Connecting...</span>';
    }
  };

  eventSource.onopen = () => {
    const liveBadge = document.getElementById('live-conn-badge');
    if (liveBadge) {
      liveBadge.innerHTML = '<span class="pulse-green"></span> LIVE CONNECTED';
    }
  };
}

function handleStatusUpdate(payload) {
  currentStatus = payload.status;
  updateStepper(payload.status);

  if (window.AudioFX) window.AudioFX.playSuccess();

  // Add entry to timeline
  const timelineEl = document.getElementById('timeline-list-container');
  if (timelineEl) {
    const entry = document.createElement('div');
    entry.className = 'timeline-entry';
    entry.innerHTML = `
      <div class="timeline-entry-header">
        <span style="color: var(--accent-gold);">${escapeHtml(payload.statusLabel)}</span>
        <span class="timeline-time">${new Date().toLocaleTimeString()}</span>
      </div>
      <div class="timeline-notes">${escapeHtml(payload.notes)}</div>
    `;
    timelineEl.prepend(entry);
  }

  // Toast notice
  if (window.showToast) {
    window.showToast(`Order status updated to: ${payload.statusLabel}`, 'success');
  }
}

function updateStepper(status) {
  const currentIndex = STAGE_ORDER.indexOf(status);
  const fillPercentage = Math.max(0, (currentIndex / (STAGE_ORDER.length - 1)) * 100);

  const fillLine = document.getElementById('stepper-fill-bar');
  if (fillLine) {
    fillLine.style.width = `${fillPercentage}%`;
  }

  STAGE_ORDER.forEach((stage, idx) => {
    const node = document.getElementById(`step-node-${stage.toLowerCase()}`);
    if (!node) return;

    if (idx < currentIndex) {
      node.className = 'step-node completed';
    } else if (idx === currentIndex) {
      node.className = 'step-node active';
    } else {
      node.className = 'step-node';
    }
  });

  // Current status banner text
  const currentStatusDesc = document.getElementById('current-status-desc');
  if (currentStatusDesc) {
    const descriptions = {
      PLACED: 'Your order has been transmitted to our kitchen system.',
      CONFIRMED: 'Kitchen team has received and confirmed your meal ticket.',
      PREPARING: 'Flame-grilling, assembling, and freshly cooking your food right now!',
      READY_AT_BAY: 'Food is packed and hot at your assigned Driveway Bay!',
      COMPLETED: 'Order handed over successfully. Enjoy your meal!'
    };
    currentStatusDesc.textContent = descriptions[status] || 'Processing order';
  }
}

function renderTimeline(historyList = []) {
  const timelineEl = document.getElementById('timeline-list-container');
  if (!timelineEl) return;

  timelineEl.innerHTML = historyList.slice().reverse().map(h => `
    <div class="timeline-entry">
      <div class="timeline-entry-header">
        <span style="color: var(--accent-gold);">${escapeHtml(h.status_label)}</span>
        <span class="timeline-time">${new Date(h.created_at).toLocaleTimeString()}</span>
      </div>
      <div class="timeline-notes">${escapeHtml(h.notes || '')}</div>
    </div>
  `).join('');
}

function renderBayGrid(assignedBay = 1) {
  const grid = document.getElementById('bay-slots-grid');
  if (!grid) return;

  let html = '';
  for (let i = 1; i <= 8; i++) {
    const isThisBay = i === Number(assignedBay);
    html += `
      <div class="bay-slot ${isThisBay ? 'occupied' : ''}">
        ${isThisBay ? '🚗 ' : ''}Bay #${i}
      </div>
    `;
  }
  grid.innerHTML = html;
}

function startEtaCountdown(readyTimeString) {
  const countdownEl = document.getElementById('eta-countdown-val');
  if (!countdownEl) return;

  const target = readyTimeString ? new Date(readyTimeString).getTime() : Date.now() + 12 * 60000;

  function update() {
    if (currentStatus === 'READY_AT_BAY') {
      countdownEl.textContent = 'READY!';
      countdownEl.style.color = 'var(--accent-green)';
      return;
    }
    if (currentStatus === 'COMPLETED') {
      countdownEl.textContent = 'PICKED UP';
      countdownEl.style.color = 'var(--text-dim)';
      return;
    }

    const diff = Math.max(0, target - Date.now());
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);

    countdownEl.textContent = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  update();
  setInterval(update, 1000);
}

function setupSimulationButton() {
  const advanceBtn = document.getElementById('simulate-advance-btn');
  if (!advanceBtn) return;

  advanceBtn.addEventListener('click', async () => {
    try {
      advanceBtn.disabled = true;
      advanceBtn.textContent = 'Advancing stage...';

      const res = await fetch(`/api/orders/${currentOrderNumber}/advance`, { method: 'POST' });
      const data = await res.json();

      if (!data.success) {
        alert(data.error || 'Could not advance');
      }
    } catch (e) {
      console.error(e);
    } finally {
      advanceBtn.disabled = false;
      advanceBtn.textContent = 'Simulate Next Kitchen Stage ⏭️';
    }
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[m]);
}
