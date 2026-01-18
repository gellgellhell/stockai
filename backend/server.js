require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Database 초기화
require('./db/database');

const analysisRoutes = require('./routes/analysis');
const marketRoutes = require('./routes/market');
const userRoutes = require('./routes/user');
const adsRoutes = require('./routes/ads');
const paymentRoutes = require('./routes/payment');
const watchlistRoutes = require('./routes/watchlist');
const notificationRoutes = require('./routes/notifications');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // 영수증 데이터를 위해 크기 증가

// Routes
app.use('/api/analysis', analysisRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/user', userRoutes);
app.use('/api/ads', adsRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/watchlist', watchlistRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log(`🚀 Stock AI Backend running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});
