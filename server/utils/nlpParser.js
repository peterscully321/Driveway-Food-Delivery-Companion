/**
 * NLP Voice & Text Command Parser for Driveway Food Ordering
 * Parses natural conversational spoken & typed sentences into structured ordering intents
 */

const NUMBER_WORDS = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  single: 1,
  double: 2,
  couple: 2,
  triple: 3
};

function parseVoiceOrTextCommand(transcript, menuItems = []) {
  if (!transcript || typeof transcript !== 'string') {
    return {
      intent: 'UNKNOWN',
      confidence: 0,
      rawText: '',
      message: 'Empty or invalid speech input.'
    };
  }

  const raw = transcript.trim();
  const lower = raw.toLowerCase();

  // 1. Intent: TRACK_ORDER
  const trackRegex = /(?:track|status of|where is|find)(?:\s+my)?\s+order\s*(?:number|id|#)?\s*([a-z0-9\-]+)?/i;
  const trackMatch = lower.match(trackRegex);
  const directOrderMatch = lower.match(/(dw-\d{4})/i);

  if (trackMatch || directOrderMatch) {
    const orderNumber = (directOrderMatch ? directOrderMatch[1] : (trackMatch && trackMatch[1])) || null;
    return {
      intent: 'TRACK_ORDER',
      orderNumber: orderNumber ? orderNumber.toUpperCase() : null,
      rawText: raw,
      message: orderNumber ? `Tracking order ${orderNumber.toUpperCase()}` : 'Please specify your Order ID to track.'
    };
  }

  // 2. Intent: APPLY_COUPON
  if (lower.includes('apply coupon') || lower.includes('promo code') || lower.includes('use coupon')) {
    const couponMatch = raw.match(/coupon\s+([A-Za-z0-9]+)|code\s+([A-Za-z0-9]+)/i);
    const code = couponMatch ? (couponMatch[1] || couponMatch[2]).toUpperCase() : null;
    return {
      intent: 'APPLY_COUPON',
      couponCode: code,
      rawText: raw,
      message: code ? `Applying coupon code: ${code}` : 'Which coupon code would you like to apply?'
    };
  }

  // 3. Intent: CHECKOUT
  if (lower.includes('checkout') || lower.includes('place order') || lower.includes('pay now') || lower.includes('finalize order')) {
    return {
      intent: 'CHECKOUT',
      rawText: raw,
      message: 'Proceeding to Driveway Bay checkout.'
    };
  }

  // 4. Intent: CLEAR_CART
  if (lower.includes('clear cart') || lower.includes('empty cart') || lower.includes('remove everything')) {
    return {
      intent: 'CLEAR_CART',
      rawText: raw,
      message: 'Cleared all items from your order.'
    };
  }

  // 5. Intent: FILTER_CATEGORY / FILTER_VEG
  if (lower.includes('only veg') || lower.includes('vegetarian') || lower.includes('show veg')) {
    return {
      intent: 'FILTER_VEG',
      rawText: raw,
      message: 'Showing 100% vegetarian items.'
    };
  }

  const categoryKeywords = {
    burgers: ['burger', 'burgers'],
    pizzas: ['pizza', 'pizzas'],
    combos: ['combo', 'combos', 'meal box'],
    sides: ['sides', 'fries', 'wings', 'sticks'],
    drinks: ['drinks', 'shakes', 'beverages', 'soda'],
    desserts: ['dessert', 'desserts', 'sweet', 'cakes', 'churros']
  };

  for (const [slug, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(k => lower.startsWith(`show ${k}`) || lower.startsWith(`view ${k}`) || lower === k)) {
      return {
        intent: 'FILTER_CATEGORY',
        categorySlug: slug,
        rawText: raw,
        message: `Showing ${slug} menu section.`
      };
    }
  }

  // 6. Intent: ADD_TO_CART / REMOVE_FROM_CART
  const isRemove = lower.includes('remove') || lower.includes('delete') || lower.includes('cancel');
  
  // Extract food items matched against menuItems catalog
  const matchedItems = [];
  
  // Clean tokens
  const cleanSentence = lower
    .replace(/[,\.!\?]/g, ' ')
    .replace(/\b(please|can i have|i want|give me|add|get me|order|put|to my cart|in my cart|and|with)\b/g, ' ');

  for (const item of menuItems) {
    const itemNameLower = item.name.toLowerCase();
    
    // Check key phrases of the item
    // e.g. "angus burger", "pepperoni", "chocolate shake", "truffle fries"
    const words = itemNameLower.split(' ').filter(w => w.length > 3);
    const hasFullMatch = lower.includes(itemNameLower);
    const hasCoreWordMatch = words.some(w => lower.includes(w));

    if (hasFullMatch || hasCoreWordMatch) {
      // Find quantity preceding this item in sentence
      let quantity = 1;
      const index = lower.indexOf(words[0] || itemNameLower);
      const precedingSubstr = lower.slice(Math.max(0, index - 20), index).trim();
      const precedingTokens = precedingSubstr.split(/\s+/);
      const lastToken = precedingTokens[precedingTokens.length - 1];

      if (lastToken) {
        if (!isNaN(parseInt(lastToken))) {
          quantity = parseInt(lastToken);
        } else if (NUMBER_WORDS[lastToken]) {
          quantity = NUMBER_WORDS[lastToken];
        }
      }

      matchedItems.push({
        item_id: item.item_id,
        name: item.name,
        price: item.price,
        quantity: Math.max(1, quantity),
        is_veg: item.is_veg
      });
    }
  }

  if (matchedItems.length > 0) {
    return {
      intent: isRemove ? 'REMOVE_FROM_CART' : 'ADD_TO_CART',
      items: matchedItems,
      rawText: raw,
      message: isRemove
        ? `Removed ${matchedItems.map(i => i.name).join(', ')} from cart.`
        : `Added ${matchedItems.map(i => `${i.quantity}x ${i.name}`).join(', ')} to your Driveway order!`
    };
  }

  return {
    intent: 'GENERAL_QUERY',
    confidence: 0.5,
    rawText: raw,
    message: `Received: "${raw}". You can say: "Add 2 Angus Burgers", "Apply coupon DRIVEWAY20", or "Track DW-8842".`
  };
}

module.exports = {
  parseVoiceOrTextCommand
};
