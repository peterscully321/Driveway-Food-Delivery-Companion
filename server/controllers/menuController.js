const db = require('../config/database');

async function getCategories(req, res) {
  try {
    const categories = await db.query('SELECT * FROM categories WHERE is_active = 1 ORDER BY display_order ASC');
    res.json({ success: true, data: categories });
  } catch (err) {
    console.error('Error fetching categories:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve menu categories' });
  }
}

async function getMenuItems(req, res) {
  try {
    const { category, search, veg_only } = req.query;
    let sql = 'SELECT m.*, c.name AS category_name, c.slug AS category_slug FROM menu_items m JOIN categories c ON m.category_id = c.category_id WHERE m.is_available = 1';
    const params = [];

    if (category) {
      sql += ' AND (c.slug = ? OR m.category_id = ?)';
      params.push(category, isNaN(Number(category)) ? -1 : Number(category));
    }

    if (search) {
      sql += ' AND (LOWER(m.name) LIKE ? OR LOWER(m.description) LIKE ?)';
      params.push(`%${search.toLowerCase()}%`, `%${search.toLowerCase()}%`);
    }

    if (veg_only === 'true') {
      sql += ' AND m.is_veg = 1';
    }

    sql += ' ORDER BY m.rating DESC, m.item_id ASC';

    // If using memory db fallback
    if (db.isUsingMock()) {
      let items = db.memoryDb.menu_items.slice();
      if (category) {
        items = items.filter(i => {
          const cat = db.memoryDb.categories.find(c => c.category_id === i.category_id);
          return (cat && cat.slug === category) || i.category_id === Number(category);
        });
      }
      if (search) {
        const s = search.toLowerCase();
        items = items.filter(i => i.name.toLowerCase().includes(s) || i.description.toLowerCase().includes(s));
      }
      if (veg_only === 'true') {
        items = items.filter(i => i.is_veg === true);
      }
      const enriched = items.map(i => {
        const cat = db.memoryDb.categories.find(c => c.category_id === i.category_id);
        return {
          ...i,
          category_name: cat ? cat.name : 'General',
          category_slug: cat ? cat.slug : 'general'
        };
      });
      return res.json({ success: true, data: enriched });
    }

    const rows = await db.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Error fetching menu items:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve food items' });
  }
}

async function getMenuItemById(req, res) {
  try {
    const itemId = Number(req.params.id);
    if (db.isUsingMock()) {
      const item = db.memoryDb.menu_items.find(i => i.item_id === itemId);
      if (!item) return res.status(404).json({ success: false, error: 'Item not found' });
      return res.json({ success: true, data: item });
    }

    const rows = await db.query('SELECT * FROM menu_items WHERE item_id = ?', [itemId]);
    if (!rows.length) {
      return res.status(404).json({ success: false, error: 'Menu item not found' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Error fetching menu item' });
  }
}

module.exports = {
  getCategories,
  getMenuItems,
  getMenuItemById
};
