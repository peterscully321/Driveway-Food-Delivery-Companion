const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

// Create a new order
router.post('/', orderController.createOrder);

// Get list of all orders (Kitchen dashboard / admin)
router.get('/', orderController.getAllOrders);

// Get specific order details and full tracking history
router.get('/:orderNumber', orderController.getOrderDetails);

// Real-time Server-Sent Events stream for order tracking
router.get('/:orderNumber/stream', orderController.subscribeOrderStream);

// Update status (e.g. from Kitchen dashboard)
router.patch('/:orderNumber/status', orderController.updateOrderStatus);

// Interactive test progression helper (advances to next status)
router.post('/:orderNumber/advance', orderController.advanceOrderStatus);

module.exports = router;
