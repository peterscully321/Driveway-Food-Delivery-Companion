const db = require('../config/database');

// In-memory registry for SSE client streams
// Map<orderNumber, Set<Response>>
const sseSubscribers = new Map();

const STATUS_PIPELINE = [
  { status: 'PLACED', label: 'Order Received', note: 'Order logged into Driveway dispatch system' },
  { status: 'CONFIRMED', label: 'Kitchen Confirmed', note: 'Kitchen staff assigned order to grill station' },
  { status: 'PREPARING', label: 'Cooking & Crafting', note: 'Chefs are flame-grilling patties and baking pizzas' },
  { status: 'READY_AT_BAY', label: 'Ready at Bay', note: 'Food packaged hot and delivered to designated bay' },
  { status: 'COMPLETED', label: 'Order Fulfilled', note: 'Customer pickup verified. Enjoy your meal!' }
];

function broadcastOrderUpdate(orderNumber, payload) {
  const subscribers = sseSubscribers.get(orderNumber.toUpperCase());
  if (subscribers && subscribers.size > 0) {
    const data = `data: ${JSON.stringify(payload)}\n\n`;
    subscribers.forEach(res => {
      try {
        res.write(data);
      } catch (err) {
        console.error('SSE send error:', err.message);
      }
    });
  }
}

async function createOrder(req, res) {
  try {
    const {
      customer_name,
      customer_phone,
      customer_email,
      order_type = 'driveway_pickup',
      bay_number = Math.floor(Math.random() * 8) + 1,
      vehicle_plate = '',
      vehicle_model = '',
      items = [],
      coupon_code = '',
      special_instructions = '',
      payment_method = 'cash_on_pickup'
    } = req.body;

    if (!customer_name || !customer_phone) {
      return res.status(400).json({ success: false, error: 'Customer name and phone number are required.' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'Cart is empty. Please add food items to order.' });
    }

    // Calculate subtotal from database items
    let subtotal = 0;
    const validatedItems = [];

    for (const item of items) {
      let menuItem;
      if (db.isUsingMock()) {
        menuItem = db.memoryDb.menu_items.find(m => m.item_id === Number(item.item_id));
      } else {
        const rows = await db.query('SELECT * FROM menu_items WHERE item_id = ?', [item.item_id]);
        menuItem = rows[0];
      }

      if (!menuItem) {
        return res.status(400).json({ success: false, error: `Invalid item ID: ${item.item_id}` });
      }

      const qty = Math.max(1, parseInt(item.quantity) || 1);
      const itemPrice = parseFloat(menuItem.price);
      const itemSubtotal = parseFloat((itemPrice * qty).toFixed(2));
      subtotal += itemSubtotal;

      validatedItems.push({
        item_id: menuItem.item_id,
        item_name: menuItem.name,
        unit_price: itemPrice,
        quantity: qty,
        subtotal_price: itemSubtotal
      });
    }

    subtotal = parseFloat(subtotal.toFixed(2));

    // Handle coupon discount
    let discount = 0;
    if (coupon_code) {
      let coupon;
      if (db.isUsingMock()) {
        coupon = db.memoryDb.coupons.find(c => c.code === coupon_code.toUpperCase() && c.is_active);
      } else {
        const cRows = await db.query('SELECT * FROM coupons WHERE code = ? AND is_active = 1', [coupon_code.toUpperCase()]);
        coupon = cRows[0];
      }

      if (coupon && subtotal >= parseFloat(coupon.min_order_amount || 0)) {
        const rawDiscount = (subtotal * parseFloat(coupon.discount_percentage)) / 100;
        discount = Math.min(rawDiscount, parseFloat(coupon.max_discount));
        discount = parseFloat(discount.toFixed(2));
      }
    }

    const tax = parseFloat(((subtotal - discount) * 0.08).toFixed(2)); // 8% sales tax
    const total = parseFloat((subtotal - discount + tax).toFixed(2));

    // Unique order number: DW-XXXX
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `DW-${randomSuffix}`;

    const orderData = {
      order_number: orderNumber,
      customer_name,
      customer_phone,
      customer_email: customer_email || null,
      order_type,
      bay_number: Number(bay_number) || 1,
      vehicle_plate: vehicle_plate || null,
      vehicle_model: vehicle_model || null,
      subtotal,
      discount_amount: discount,
      tax_amount: tax,
      total_amount: total,
      payment_method,
      payment_status: payment_method === 'card' ? 'completed' : 'pending',
      current_status: 'PLACED',
      special_instructions: special_instructions || null,
      estimated_ready_time: new Date(Date.now() + 15 * 60000).toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (db.isUsingMock()) {
      const orderId = db.memoryDb.orders.length + 1;
      orderData.order_id = orderId;
      db.memoryDb.orders.push(orderData);

      validatedItems.forEach((vi, idx) => {
        db.memoryDb.order_items.push({
          order_item_id: db.memoryDb.order_items.length + 1,
          order_id: orderId,
          ...vi,
          customizations_json: null
        });
      });

      db.memoryDb.order_status_history.push({
        history_id: db.memoryDb.order_status_history.length + 1,
        order_id: orderId,
        status: 'PLACED',
        status_label: 'Order Received',
        notes: `Driveway order placed for Bay #${orderData.bay_number}`,
        created_at: new Date().toISOString()
      });
    } else {
      // MySQL Relational transaction
      const orderSql = `
        INSERT INTO orders 
        (order_number, customer_name, customer_phone, customer_email, order_type, bay_number, 
         vehicle_plate, vehicle_model, subtotal, discount_amount, tax_amount, total_amount, 
         payment_method, payment_status, current_status, special_instructions, estimated_ready_time) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const orderParams = [
        orderData.order_number,
        orderData.customer_name,
        orderData.customer_phone,
        orderData.customer_email,
        orderData.order_type,
        orderData.bay_number,
        orderData.vehicle_plate,
        orderData.vehicle_model,
        orderData.subtotal,
        orderData.discount_amount,
        orderData.tax_amount,
        orderData.total_amount,
        orderData.payment_method,
        orderData.payment_status,
        orderData.current_status,
        orderData.special_instructions,
        new Date(Date.now() + 15 * 60000)
      ];

      const result = await db.query(orderSql, orderParams);
      const insertedOrderId = result.insertId;
      orderData.order_id = insertedOrderId;

      for (const vi of validatedItems) {
        await db.query(
          'INSERT INTO order_items (order_id, item_id, item_name, unit_price, quantity, subtotal_price) VALUES (?, ?, ?, ?, ?, ?)',
          [insertedOrderId, vi.item_id, vi.item_name, vi.unit_price, vi.quantity, vi.subtotal_price]
        );
      }

      await db.query(
        'INSERT INTO order_status_history (order_id, status, status_label, notes) VALUES (?, ?, ?, ?)',
        [insertedOrderId, 'PLACED', 'Order Received', `Driveway order placed for Bay #${orderData.bay_number}`]
      );
    }

    return res.status(201).json({
      success: true,
      message: 'Order placed successfully!',
      order: orderData,
      items: validatedItems
    });
  } catch (err) {
    console.error('Order creation error:', err);
    return res.status(500).json({ success: false, error: 'Failed to process order' });
  }
}

async function getOrderDetails(req, res) {
  try {
    const orderNumber = req.params.orderNumber.toUpperCase();

    let order = null;
    let items = [];
    let history = [];

    if (db.isUsingMock()) {
      order = db.memoryDb.orders.find(o => o.order_number === orderNumber);
      if (order) {
        items = db.memoryDb.order_items.filter(i => i.order_id === order.order_id);
        history = db.memoryDb.order_status_history.filter(h => h.order_id === order.order_id);
      }
    } else {
      const oRows = await db.query('SELECT * FROM orders WHERE order_number = ?', [orderNumber]);
      if (oRows.length > 0) {
        order = oRows[0];
        items = await db.query('SELECT * FROM order_items WHERE order_id = ?', [order.order_id]);
        history = await db.query('SELECT * FROM order_status_history WHERE order_id = ? ORDER BY created_at ASC', [order.order_id]);
      }
    }

    if (!order) {
      return res.status(404).json({ success: false, error: `Order ${orderNumber} not found.` });
    }

    res.json({
      success: true,
      order,
      items,
      history,
      pipeline: STATUS_PIPELINE
    });
  } catch (err) {
    console.error('Error fetching order:', err);
    res.status(500).json({ success: false, error: 'Could not fetch order details' });
  }
}

async function updateOrderStatus(req, res) {
  try {
    const orderNumber = req.params.orderNumber.toUpperCase();
    const { status, notes } = req.body;

    const validStatusObj = STATUS_PIPELINE.find(p => p.status === status);
    if (!validStatusObj) {
      return res.status(400).json({ success: false, error: `Invalid status: ${status}` });
    }

    let order = null;

    if (db.isUsingMock()) {
      order = db.memoryDb.orders.find(o => o.order_number === orderNumber);
      if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

      order.current_status = status;
      order.updated_at = new Date().toISOString();

      db.memoryDb.order_status_history.push({
        history_id: db.memoryDb.order_status_history.length + 1,
        order_id: order.order_id,
        status: status,
        status_label: validStatusObj.label,
        notes: notes || validStatusObj.note,
        created_at: new Date().toISOString()
      });
    } else {
      const oRows = await db.query('SELECT * FROM orders WHERE order_number = ?', [orderNumber]);
      if (!oRows.length) return res.status(404).json({ success: false, error: 'Order not found' });
      order = oRows[0];

      await db.query('UPDATE orders SET current_status = ?, updated_at = NOW() WHERE order_id = ?', [status, order.order_id]);
      await db.query(
        'INSERT INTO order_status_history (order_id, status, status_label, notes) VALUES (?, ?, ?, ?)',
        [order.order_id, status, validStatusObj.label, notes || validStatusObj.note]
      );
    }

    // Broadcast live to all connected SSE clients
    broadcastOrderUpdate(orderNumber, {
      event: 'STATUS_CHANGED',
      orderNumber,
      status,
      statusLabel: validStatusObj.label,
      notes: notes || validStatusObj.note,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: `Status updated to ${status}`,
      current_status: status
    });
  } catch (err) {
    console.error('Error updating order status:', err);
    res.status(500).json({ success: false, error: 'Could not update order status' });
  }
}

// Interactive helper: advance to next stage in the pipeline
async function advanceOrderStatus(req, res) {
  try {
    const orderNumber = req.params.orderNumber.toUpperCase();
    let currentStatus = 'PLACED';

    if (db.isUsingMock()) {
      const o = db.memoryDb.orders.find(o => o.order_number === orderNumber);
      if (!o) return res.status(404).json({ success: false, error: 'Order not found' });
      currentStatus = o.current_status;
    } else {
      const oRows = await db.query('SELECT current_status FROM orders WHERE order_number = ?', [orderNumber]);
      if (!oRows.length) return res.status(404).json({ success: false, error: 'Order not found' });
      currentStatus = oRows[0].current_status;
    }

    const currentIndex = STATUS_PIPELINE.findIndex(p => p.status === currentStatus);
    const nextIndex = Math.min(currentIndex + 1, STATUS_PIPELINE.length - 1);
    const nextStep = STATUS_PIPELINE[nextIndex];

    req.body = { status: nextStep.status, notes: nextStep.note };
    return updateOrderStatus(req, res);
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to advance order status' });
  }
}

// Server-Sent Events (SSE) Stream
function subscribeOrderStream(req, res) {
  const orderNumber = req.params.orderNumber.toUpperCase();

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  if (!sseSubscribers.has(orderNumber)) {
    sseSubscribers.set(orderNumber, new Set());
  }
  sseSubscribers.get(orderNumber).add(res);

  // Send initial ping connection event
  res.write(`data: ${JSON.stringify({ event: 'CONNECTED', orderNumber, timestamp: new Date().toISOString() })}\n\n`);

  // Heartbeat to keep connection open
  const keepAliveInterval = setInterval(() => {
    res.write(': ping\n\n');
  }, 20000);

  req.on('close', () => {
    clearInterval(keepAliveInterval);
    const subs = sseSubscribers.get(orderNumber);
    if (subs) {
      subs.delete(res);
      if (subs.size === 0) sseSubscribers.delete(orderNumber);
    }
  });
}

async function getAllOrders(req, res) {
  try {
    if (db.isUsingMock()) {
      const orders = db.memoryDb.orders.slice().reverse();
      return res.json({ success: true, count: orders.length, orders });
    }

    const rows = await db.query('SELECT * FROM orders ORDER BY created_at DESC LIMIT 50');
    res.json({ success: true, count: rows.length, orders: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Could not fetch orders' });
  }
}

module.exports = {
  createOrder,
  getOrderDetails,
  updateOrderStatus,
  advanceOrderStatus,
  subscribeOrderStream,
  getAllOrders
};
