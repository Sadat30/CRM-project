require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const authRoutes = require('./routes/auth');
const mcpRoutes = require('./routes/mcp');
const contacts = require('./routes/contacts');
const deals = require('./routes/deals');
const tasks = require('./routes/tasks');
const tickets = require('./routes/tickets');
const pipelineStages = require('./routes/pipeline_stages');
const importRoutes = require('./routes/import');
const knowledgeBase = require('./routes/knowledge_base');
const activity = require('./routes/activity');
const googleRoutes = require('./routes/google');
const tenants = require('./routes/tenants');
const chatRoutes = require('./routes/chat');
const authMiddleware = require('./middleware/auth');
const { setTenantContext, requireTenant } = require('./middleware/tenant');
const { initializeChatServer } = require('./websocket/chatServer');

const app = express();

// CORS configuration - allow frontend URL and common development URLs
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
  // Allow external IP access (for development)
  'http://103.61.106.2:5173',
  'http://103.61.106.2:3000',
  'http://163.61.106.2:5173',  // Add the actual frontend IP
  'http://163.61.106.2:3000',
  // Allow any IP on common dev ports (for flexibility in dev mode)
  ...(process.env.NODE_ENV !== 'production' ? [
    /^http:\/\/\d+\.\d+\.\d+\.\d+:5173$/,  // Any IP:5173
    /^http:\/\/\d+\.\d+\.\d+\.\d+:3000$/,  // Any IP:3000
  ] : []),
].filter(Boolean);

// Handle OPTIONS preflight requests explicitly (before CORS middleware)
// This MUST be before CORS middleware to handle preflight immediately
app.options('*', (req, res, next) => {
  const origin = req.headers.origin;
  console.log('OPTIONS preflight from:', origin);
  
  res.header('Access-Control-Allow-Origin', origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400'); // 24 hours
  res.sendStatus(200);
});

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, Postman, etc.)
    if (!origin) {
      console.log('Request with no origin - allowing');
      return callback(null, true);
    }
    
    console.log('CORS check for origin:', origin);
    
    // In development, allow all origins to prevent CORS issues
    if (process.env.NODE_ENV !== 'production') {
      console.log('✅ Allowing origin in dev mode:', origin);
      return callback(null, true);
    }
    
    // Check if origin is in allowed list or matches pattern
    const isAllowed = allowedOrigins.some(allowed => {
      if (!allowed) return false;
      
      // Handle regex patterns (for IP addresses in dev mode)
      if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      
      // Exact match
      if (origin === allowed) return true;
      
      // Match if origin starts with allowed (for IP addresses)
      if (typeof allowed === 'string' && allowed.includes('://')) {
        const allowedBase = allowed.split(':')[0] + ':' + allowed.split(':')[1];
        const originBase = origin.split(':')[0] + ':' + origin.split(':')[1];
        if (originBase === allowedBase) return true;
      }
      
      return false;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      // For development, log but allow
      if (process.env.NODE_ENV !== 'production') {
        console.warn('⚠️  CORS: Allowing origin in dev mode:', origin);
        return callback(null, true);
      }
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  preflightContinue: false,
  optionsSuccessStatus: 200
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Add request logging middleware (for debugging)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    const start = Date.now();
    console.log(`${req.method} ${req.path} - Origin: ${req.headers.origin || 'none'}`);
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
    });
    next();
  });
}

app.get('/', (req, res) => res.json({ msg: 'SimpleCRM API' }));

// Health check endpoint (no DB required)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Database health check
app.get('/health/db', async (req, res) => {
  try {
    const pool = require('./db');
    const [rows] = await pool.query('SELECT 1 as test');
    res.json({ 
      status: 'ok', 
      database: 'connected',
      test: rows[0].test
    });
  } catch (err) {
    res.status(500).json({ 
      status: 'error', 
      database: 'disconnected',
      error: err.message 
    });
  }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/mcp', mcpRoutes);
app.use('/api/tenants', tenants);
app.use('/api/chat', chatRoutes);

// All data routes require auth, tenant context, and tenant access
const tenantMiddleware = [authMiddleware.requireAuth, setTenantContext, requireTenant];
app.use('/api/contacts', ...tenantMiddleware, contacts);
app.use('/api/deals', ...tenantMiddleware, deals);
app.use('/api/tasks', ...tenantMiddleware, tasks);
app.use('/api/tickets', ...tenantMiddleware, tickets);
app.use('/api/pipeline-stages', ...tenantMiddleware, pipelineStages);
app.use('/api/import', ...tenantMiddleware, importRoutes);
app.use('/api/knowledge-base', ...tenantMiddleware, knowledgeBase);
app.use('/api/activity', ...tenantMiddleware, activity);
app.use('/api/google', ...tenantMiddleware, googleRoutes);

const PORT = process.env.PORT || 4000;
// Listen on all interfaces (0.0.0.0) to allow external access
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on http://0.0.0.0:${PORT}`);
  console.log(`Accessible from: http://localhost:${PORT} or http://YOUR_IP:${PORT}`);
  // Initialize WebSocket server
  initializeChatServer(server);
  console.log('WebSocket chat server initialized');
});
