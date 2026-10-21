-- =====================================================================
-- DRIVEWAY FOOD ORDERING SYSTEM - SEED DATA (MySQL)
-- Populates rich menu categories, gourmet food items, and promotional coupons
-- =====================================================================

USE driveway_db;

-- Insert Categories
INSERT INTO categories (category_id, name, slug, icon, description, display_order) VALUES
(1, 'Gourmet Burgers', 'burgers', '🍔', 'Flame-grilled artisan patties with brioche buns', 1),
(2, 'Stone-Baked Pizzas', 'pizzas', '🍕', 'Crispy hand-stretched dough with signature sauces', 2),
(3, 'Driveway Combos', 'combos', '🍟', 'Meal boxes packed with burger, fries, and cold brew', 3),
(4, 'Sides & Finger Food', 'sides', '🍗', 'Loaded wedges, mozzarella sticks, and crispy tenders', 4),
(5, 'Artisan Shakes & Drinks', 'drinks', '🥤', 'Handcrafted thickshakes, iced coffees & craft sodas', 5),
(6, 'Sweet Treats', 'desserts', '🍩', 'Warm molten lava cakes, churros & sundaes', 6);

-- Insert Coupons
INSERT INTO coupons (code, description, discount_percentage, max_discount, min_order_amount, is_active) VALUES
('DRIVEWAY20', '20% Off on your Drive-Thru orders over $15', 20.00, 10.00, 15.00, TRUE),
('FIRSTBITE', '25% Off for First Time Foodies', 25.00, 15.00, 20.00, TRUE),
('CHEFVIP', '$5 Flat Discount on any item', 15.00, 8.00, 10.00, TRUE);

-- Insert Menu Items
INSERT INTO menu_items (item_id, category_id, name, description, price, image_url, is_veg, is_spicy, prep_time_mins, calories, rating) VALUES
-- Burgers
(1, 1, 'Smokehouse BBQ Angus Burger', 'Double flame-grilled Angus beef, aged cheddar, smoked bacon, caramelized onions & hickory BBQ glaze on brioche.', 12.99, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80', FALSE, FALSE, 12, 780, 4.9),
(2, 1, 'Truffle Mushroom Swiss Burger', 'Prime beef patty crowned with sautéed portobello, Swiss emmental, baby arugula & black truffle aioli.', 13.50, 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=600&auto=format&fit=crop&q=80', FALSE, FALSE, 14, 720, 4.8),
(3, 1, 'Crispy Hot Nashville Chicken Burger', 'Buttermilk fried chicken tossed in cayenne chili butter, house dill pickles & garlic ranch slaw.', 11.75, 'https://images.unsplash.com/photo-1625813506062-0aeb1d7a094b?w=600&auto=format&fit=crop&q=80', FALSE, TRUE, 10, 690, 4.9),
(4, 1, 'The Green Beast (Vegan Smash)', 'Beyond meat double patty, vegan smoked gouda, pickled jalapeños, crispy onion rings & chipotle mayo.', 12.25, 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=600&auto=format&fit=crop&q=80', TRUE, TRUE, 11, 540, 4.7),

-- Pizzas
(5, 2, 'Artisan Pepperoni & Hot Honey', 'Cupping pepperoni, crushed San Marzano tomato, fior di latte mozzarella, finished with chili wildflower honey.', 15.99, 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=600&auto=format&fit=crop&q=80', FALSE, TRUE, 15, 890, 4.9),
(6, 2, 'Classic Margherita Rustica', 'Fresh buffalo mozzarella, San Marzano marinara, basil leaves & extra virgin olive oil drizzle.', 13.99, 'https://images.unsplash.com/photo-1604382355076-af4b0eb60143?w=600&auto=format&fit=crop&q=80', TRUE, FALSE, 12, 740, 4.8),
(7, 2, 'Wild Truffle & Funghi Bianca', 'Ricotta cream base, roasted wild forest mushrooms, thyme, pecorino romano & white truffle oil.', 16.50, 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=80', TRUE, FALSE, 15, 810, 4.8),

-- Combos
(8, 3, 'Driveway Mega Pitstop Box', 'Angus BBQ burger + large rosemary sea salt fries + 6 spicy buffalo wings + 32oz beverage.', 18.99, 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=600&auto=format&fit=crop&q=80', FALSE, TRUE, 15, 1250, 5.0),
(9, 3, 'Crispy Duo Crunch Box', 'Nashville chicken sandwich + curly fries + cheesy dipping sauce + Oreo blast thickshake.', 16.99, 'https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=600&auto=format&fit=crop&q=80', FALSE, TRUE, 12, 1120, 4.9),

-- Sides
(10, 4, 'Loaded Driveway Truffle Fries', 'Crisp hand-cut skin-on fries, shaved parmesan, garlic herb crunch & truffle cheese dip.', 6.99, 'https://images.unsplash.com/photo-1576107232684-1279f3908594?w=600&auto=format&fit=crop&q=80', TRUE, FALSE, 8, 480, 4.9),
(11, 4, 'Golden Buffalo Wings (8 Pcs)', 'Jumbo crispy wings glazed in signature smoky buffalo glaze, served with blue cheese dip.', 9.50, 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=600&auto=format&fit=crop&q=80', FALSE, TRUE, 10, 620, 4.8),
(12, 4, 'Crispy Mozzarella Sticks (6 Pcs)', 'Herb-crusted melted string mozzarella with warm San Marzano marinara dip.', 6.50, 'https://images.unsplash.com/photo-1531749668029-2db88e4276c7?w=600&auto=format&fit=crop&q=80', TRUE, FALSE, 7, 430, 4.7),

-- Drinks
(13, 5, 'Belgian Triple Chocolate Shake', 'Rich Belgian cocoa, Madagascar vanilla bean gelato, whipped cream & fudge brownie cubes.', 5.99, 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600&auto=format&fit=crop&q=80', TRUE, FALSE, 5, 510, 4.9),
(14, 5, 'Salted Caramel Crunch Shake', 'Caramelized toffee gelato, pretzel brittle, fleur de sel & whipped mascarpone.', 5.99, 'https://images.unsplash.com/photo-1579954115545-a95591f28bfc?w=600&auto=format&fit=crop&q=80', TRUE, FALSE, 5, 490, 4.8),
(15, 5, 'Ice Cold Sparkling Berry Lemonade', 'Muddled fresh blackberries, Meyer lemon juice, mint leaves & fizzy soda.', 4.25, 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop&q=80', TRUE, FALSE, 4, 160, 4.7),

-- Desserts
(16, 6, 'Gooey Molten Choco Lava Cake', 'Warm chocolate soufflé cake with liquid Valrhona chocolate core & vanilla bean drizzle.', 6.50, 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&auto=format&fit=crop&q=80', TRUE, FALSE, 8, 420, 4.9),
(17, 6, 'Cinnamon Sugar Spanish Churros (5 Pcs)', 'Fried choux pastry coated in fragrant cinnamon sugar, paired with warm Nutella dip.', 5.99, 'https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=600&auto=format&fit=crop&q=80', TRUE, FALSE, 6, 380, 4.8);

-- Insert Customizations
INSERT INTO item_customizations (item_id, option_name, option_type, extra_price, is_default) VALUES
(1, 'Extra Smoked Bacon', 'addon', 1.75, FALSE),
(1, 'Double Sharp Cheddar', 'cheese', 1.25, FALSE),
(1, 'Gluten-Free Bun', 'crust', 1.00, FALSE),
(5, 'Stuffed Cheese Crust', 'crust', 2.50, FALSE),
(5, 'Extra Pepperoni', 'addon', 2.00, FALSE),
(3, 'Extra Spicy Ghost Pepper Heat', 'spice_level', 0.50, FALSE);
