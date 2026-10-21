const express = require('express');
const router = express.Router();
const voiceController = require('../controllers/voiceController');

// Parse natural spoken or typed text into ordering actions
router.post('/parse', voiceController.parseVoiceCommand);

// Validate promo discount coupon
router.get('/coupon', voiceController.validateCoupon);
router.post('/coupon', voiceController.validateCoupon);

module.exports = router;
