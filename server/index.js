const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const mongoose = require('mongoose');
const winston = require('winston');
const http = require('http');
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// SECURITY: Validate environment variables before starting server
const { validateEnvironment } = require('./config/validateEnv');
validateEnvironment();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true
  }
});

const PORT = process.env.PORT || 5000;

// Logger setup (must be before CORS to use in callback)
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Security middleware
// CORS Configuration - Strict origin validation
const allowedOrigins = [
  process.env.CLIENT_URL,
  process.env.WEBSITE_URL,
  'https://virdispay.com',
  'https://app.virdispay.com',
  'https://api.virdispay.com'
].filter(Boolean); // Remove undefined values

// Allow localhost in development
if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
  allowedOrigins.push('http://localhost:3000', 'http://localhost:3001', 'http://localhost:5000');
}

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, curl, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      logger.warn(`CORS: Blocked request from unauthorized origin: ${origin}`);
      callback(new Error('Not allowed by CORS policy'));
    }
  },
  credentials: true,
  maxAge: 86400, // 24 hours
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Secret-Key']
}));

// Enhanced Helmet Configuration
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://widgets.virdispay.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https://api.virdispay.com", "wss://api.virdispay.com"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
    }
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  frameguard: {
    action: 'deny'
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  }
}));

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(mongoSanitize());
app.use(hpp());

// Advanced Rate limiting
const { 
  apiRateLimit, 
  rateLimitMonitor, 
  rateLimitViolationHandler,
  rateLimitService 
} = require('./middleware/rateLimiting');

// Apply general API rate limiting
app.use('/api/', apiRateLimit);
app.use('/api/', rateLimitMonitor);

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/virdispay-payments', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => logger.info('Connected to MongoDB'))
.catch(err => logger.error('MongoDB connection error:', err));

// Start Smart Routing Service
const SmartRoutingService = require('./services/SmartRoutingService');
SmartRoutingService.start();

// Initialize Notification Service
const NotificationService = require('./services/notificationService');
const notificationService = new NotificationService();

// Socket.IO authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token || socket.handshake.query.token;
  
  if (!token) {
    return next(new Error('Authentication token required'));
  }

  try {
    // SECURITY: No fallback! JWT_SECRET must be set in environment
    if (!process.env.JWT_SECRET) {
      return next(new Error('Server configuration error'));
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    socket.userEmail = decoded.email;
    next();
  } catch (err) {
    next(new Error('Invalid authentication token'));
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.userId}`);
  
  // Add client to notification service
  notificationService.addClient(socket, socket.userId);
  
  // Handle room subscriptions
  socket.on('subscribe_room', (roomId) => {
    notificationService.subscribeToRoom(socket, roomId);
  });
  
  socket.on('unsubscribe_room', (roomId) => {
    notificationService.unsubscribeFromRoom(socket, roomId);
  });
  
  // Handle notification actions
  socket.on('notification_action', (data) => {
    console.log(`Notification action from ${socket.userId}:`, data);
    // Handle notification actions (view payment, retry, etc.)
  });
  
  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.userId}`);
    notificationService.removeClient(socket, socket.userId);
  });
});

// Make notification service available to routes
app.set('notificationService', notificationService);

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/merchants', require('./routes/merchants'));
app.use('/api/smart-routing', require('./routes/smartRouting'));
// KYC/AML Compliance Routes
app.use('/api/kyc', require('./routes/kyc'));
app.use('/api/aml', require('./routes/aml'));
// Email Preferences Routes
app.use('/api/email-preferences', require('./routes/emailPreferences'));
// Analytics Routes
app.use('/api/analytics', require('./routes/analytics'));
// Security Routes
app.use('/api/security', require('./routes/security'));
// Rate Limiting Routes
app.use('/api/rate-limit', require('./routes/rateLimiting'));
app.use('/api/api-keys', require('./routes/apiKeys'));
// Admin Routes
app.use('/api/admin', require('./routes/admin'));
// Subscription Routes
app.use('/api/subscriptions', require('./routes/subscriptions'));
// Fiat features disabled for non-custodial launch
// app.use('/api/fiat-conversion', require('./routes/fiatConversion'));
// app.use('/api/fiat-payments', require('./routes/fiatPayments'));
// app.use('/api/cannabis-payments', require('./routes/cannabisPayments'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'VirdisPay Payment Processor'
  });
});

// Rate limit violation handler
app.use(rateLimitViolationHandler);

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// Serve static files from React build in production
if (process.env.NODE_ENV === 'production') {
  const path = require('path');
  // Serve static files from the React app build directory
  app.use(express.static(path.join(__dirname, '../client/build')));
  
  // Handle React routing - return all requests to React app
  app.get('*', (req, res) => {
    // Don't serve React app for API routes
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'Route not found' });
    }
    res.sendFile(path.join(__dirname, '../client/build/index.html'));
  });
} else {
  // 404 handler for development
  app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
  });
}

server.listen(PORT, () => {
  logger.info(`VirdisPay Payment Processor server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`Socket.IO server initialized`);
});

module.exports = app;
