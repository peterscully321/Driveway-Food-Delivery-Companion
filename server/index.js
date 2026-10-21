const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const db = require('./config/database');
const menuRoutes = require('./routes/menuRoutes');
const orderRoutes = require('./routes/orderRoutes');
const voiceRoutes = require('./routes/voiceRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend assets
app.use(express.static(path.join(__dirname, '../public')));

// API Routes
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/voice', voiceRoutes);

// Health check and system diagnostic
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    system: 'Driveway Food Ordering Platform',
    database: db.isUsingMock() ? 'Embedded Relational Memory Store' : 'Active MySQL Database',
    timestamp: new Date().toISOString()
  });
});

// HTML page routes
app.get('/track', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/track.html'));
});

app.get('/kitchen', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/kitchen.html'));
});

// Fallback to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Start Server
async function startServer() {
  await db.initDatabase();
  app.listen(PORT, () => {
    console.log(`\n============================================================`);
    console.log(`🍔 DRIVEWAY - Real-Time Food Ordering Platform`);
    console.log(`⚡ Server running at: http://localhost:${PORT}`);
    console.log(`🎙️ Voice & Text AI input active on Customer Terminal`);
    console.log(`📡 Real-Time Order Tracking: http://localhost:${PORT}/track`);
    console.log(`👨‍🍳 Kitchen Display Terminal: http://localhost:${PORT}/kitchen`);
    console.log(`============================================================\n`);
  });
}

startServer().catch(err => {
  console.error('Failed to start Driveway server:', err);
});
