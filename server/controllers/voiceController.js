const db = require('../config/database');
const { parseVoiceOrTextCommand } = require('../utils/nlpParser');

async function parseVoiceCommand(req, res) {
  try {
    const { transcript } = req.body;
    if (!transcript) {
      return res.status(400).json({ success: false, error: 'Speech transcript is required.' });
    }

    let menuItems = [];
    if (db.isUsingMock()) {
      menuItems = db.memoryDb.menu_items;
    } else {
      menuItems = await db.query('SELECT item_id, name, price, is_veg FROM menu_items WHERE is_available = 1');
    }

    const parsed = parseVoiceOrTextCommand(transcript, menuItems);
    res.json({
      success: true,
      data: parsed
    });
  } catch (err) {
    console.error('Error parsing voice command:', err);
    res.status(500).json({ success: false, error: 'Voice processing failed' });
  }
}

async function validateCoupon(req, res) {
  try {
    const code = (req.query.code || req.body.code || '').toUpperCase().trim();
    const orderAmount = parseFloat(req.query.amount || req.body.amount || 0);

    if (!code) {
      return res.status(400).json({ success: false, error: 'Coupon code is required.' });
    }

    let coupon = null;
    if (db.isUsingMock()) {
      coupon = db.memoryDb.coupons.find(c => c.code === code && c.is_active);
    } else {
      const rows = await db.query('SELECT * FROM coupons WHERE code = ? AND is_active = 1', [code]);
      coupon = rows[0];
    }

    if (!coupon) {
      return res.status(404).json({ success: false, valid: false, error: `Invalid coupon code "${code}". Try DRIVEWAY20 or FIRSTBITE.` });
    }

    const minAmount = parseFloat(coupon.min_order_amount);
    if (orderAmount < minAmount) {
      return res.status(400).json({
        success: false,
        valid: false,
        error: `Coupon "${code}" requires minimum order of $${minAmount.toFixed(2)}.`
      });
    }

    const discountPct = parseFloat(coupon.discount_percentage);
    const maxDiscount = parseFloat(coupon.max_discount);
    const calculatedDiscount = Math.min((orderAmount * discountPct) / 100, maxDiscount);

    res.json({
      success: true,
      valid: true,
      coupon: {
        code: coupon.code,
        discount_percentage: discountPct,
        max_discount: maxDiscount,
        discount_amount: parseFloat(calculatedDiscount.toFixed(2)),
        description: coupon.description
      }
    });
  } catch (err) {
    console.error('Coupon validation error:', err);
    res.status(500).json({ success: false, error: 'Failed to validate coupon' });
  }
}

module.exports = {
  parseVoiceCommand,
  validateCoupon
};
