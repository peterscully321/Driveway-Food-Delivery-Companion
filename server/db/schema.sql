-- =====================================================================
-- DRIVEWAY FOOD ORDERING SYSTEM - RELATIONAL DATABASE SCHEMA (MySQL)
-- Designed by: Yash Gupta
-- Description: Production-ready relational schema supporting voice/text
--              ordering, drive-thru/bay allocation, and live tracking.
-- =====================================================================

CREATE DATABASE IF NOT EXISTS driveway_db;
USE driveway_db;

-- Drop tables in reverse order of foreign keys if re-running
DROP TABLE IF EXISTS order_status_history;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS item_customizations;
DROP TABLE IF EXISTS menu_items;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS coupons;

-- -----------------------------------------------------
-- Table: categories
-- -----------------------------------------------------
CREATE TABLE categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(80) NOT NULL UNIQUE,
    slug VARCHAR(80) NOT NULL UNIQUE,
    icon VARCHAR(50) DEFAULT '🍔',
    description VARCHAR(255),
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table: menu_items
-- -----------------------------------------------------
CREATE TABLE menu_items (
    item_id INT AUTO_INCREMENT PRIMARY KEY,
    category_id INT NOT NULL,
    name VARCHAR(120) NOT NULL,
    description TEXT,
    price DECIMAL(8, 2) NOT NULL,
    image_url VARCHAR(500),
    is_veg BOOLEAN DEFAULT TRUE,
    is_spicy BOOLEAN DEFAULT FALSE,
    prep_time_mins INT DEFAULT 10,
    calories INT DEFAULT NULL,
    rating DECIMAL(2, 1) DEFAULT 4.8,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_menu_category FOREIGN KEY (category_id) 
        REFERENCES categories(category_id) 
        ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_category (category_id),
    INDEX idx_price (price),
    INDEX idx_available (is_available)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table: item_customizations
-- -----------------------------------------------------
CREATE TABLE item_customizations (
    customization_id INT AUTO_INCREMENT PRIMARY KEY,
    item_id INT NOT NULL,
    option_name VARCHAR(100) NOT NULL,
    option_type ENUM('size', 'crust', 'spice_level', 'addon', 'cheese') NOT NULL,
    extra_price DECIMAL(6, 2) DEFAULT 0.00,
    is_default BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_customization_item FOREIGN KEY (item_id) 
        REFERENCES menu_items(item_id) 
        ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_item (item_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table: coupons
-- -----------------------------------------------------
CREATE TABLE coupons (
    coupon_id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(30) NOT NULL UNIQUE,
    description VARCHAR(150),
    discount_percentage DECIMAL(5, 2) DEFAULT 0.00,
    max_discount DECIMAL(8, 2) DEFAULT 100.00,
    min_order_amount DECIMAL(8, 2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE,
    expiry_date DATE DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table: customers
-- -----------------------------------------------------
CREATE TABLE customers (
    customer_id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(120) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    email VARCHAR(120),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_phone (phone_number),
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table: orders
-- -----------------------------------------------------
CREATE TABLE orders (
    order_id INT AUTO_INCREMENT PRIMARY KEY,
    order_number VARCHAR(24) NOT NULL UNIQUE,
    customer_id INT DEFAULT NULL,
    customer_name VARCHAR(120) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    customer_email VARCHAR(120),
    order_type ENUM('driveway_pickup', 'dine_in', 'takeaway', 'curbside') DEFAULT 'driveway_pickup',
    bay_number INT DEFAULT 1,
    vehicle_plate VARCHAR(30) DEFAULT NULL,
    vehicle_model VARCHAR(80) DEFAULT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    discount_amount DECIMAL(10, 2) DEFAULT 0.00,
    tax_amount DECIMAL(10, 2) DEFAULT 0.00,
    total_amount DECIMAL(10, 2) NOT NULL,
    payment_method ENUM('cash_on_pickup', 'card', 'upi', 'online') DEFAULT 'cash_on_pickup',
    payment_status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
    current_status ENUM('PLACED', 'CONFIRMED', 'PREPARING', 'READY_AT_BAY', 'COMPLETED', 'CANCELLED') DEFAULT 'PLACED',
    estimated_ready_time TIMESTAMP NULL,
    special_instructions TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_order_customer FOREIGN KEY (customer_id) 
        REFERENCES customers(customer_id) 
        ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_order_number (order_number),
    INDEX idx_current_status (current_status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table: order_items
-- -----------------------------------------------------
CREATE TABLE order_items (
    order_item_id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    item_id INT NOT NULL,
    item_name VARCHAR(120) NOT NULL,
    unit_price DECIMAL(8, 2) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    subtotal_price DECIMAL(10, 2) NOT NULL,
    customizations_json JSON DEFAULT NULL,
    CONSTRAINT fk_orderitems_order FOREIGN KEY (order_id) 
        REFERENCES orders(order_id) 
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_orderitems_menu FOREIGN KEY (item_id) 
        REFERENCES menu_items(item_id) 
        ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX idx_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table: order_status_history (For Real-time Tracking)
-- -----------------------------------------------------
CREATE TABLE order_status_history (
    history_id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    status ENUM('PLACED', 'CONFIRMED', 'PREPARING', 'READY_AT_BAY', 'COMPLETED', 'CANCELLED') NOT NULL,
    status_label VARCHAR(100) NOT NULL,
    notes VARCHAR(255),
    updated_by VARCHAR(50) DEFAULT 'System',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_history_order FOREIGN KEY (order_id) 
        REFERENCES orders(order_id) 
        ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_order_history (order_id),
    INDEX idx_timestamp (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
