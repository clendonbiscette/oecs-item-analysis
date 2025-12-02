import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { auditMiddleware } from './utils/audit.js';
import authRoutes from './routes/auth.js';
import assessmentRoutes from './routes/assessments.js';
import statisticsRoutes from './routes/statistics.js';
import reportsRoutes from './routes/reports.js';
import memberStatesRoutes from './routes/member-states.js';
import usersRoutes from './routes/users.js';
import comparisonsRoutes from './routes/comparisons.js';
import auditLogsRoutes from './routes/audit-logs.js';
import adminRoutes from './routes/admin.js';

// Load environment variables
dotenv.config();

// Validate required environment variables
const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

const app = express();
const PORT = process.env.PORT || 3000;

// Security: Configure CORS
// In production (Vercel), frontend and backend are same domain - allow all origins
// In development, allow localhost
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' ? true : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' })); // Limit request body size to prevent DoS
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Audit logging middleware
app.use(auditMiddleware);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/statistics', statisticsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/member-states', memberStatesRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/comparisons', comparisonsRoutes);
app.use('/api/audit-logs', auditLogsRoutes);
app.use('/api/admin', adminRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler - Never expose stack traces in production
app.use((err, req, res, next) => {
  console.error('Server error:', err);

  // Only show detailed errors in development
  if (process.env.NODE_ENV === 'development') {
    res.status(500).json({
      error: 'Internal server error',
      message: err.message,
      stack: err.stack
    });
  } else {
    // In production, only show generic error message
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════╗
║  OECS Item Analysis Platform - Backend  ║
║                                          ║
║  Server running on port ${PORT}            ║
║  Environment: ${process.env.NODE_ENV || 'development'}              ║
║                                          ║
║  API endpoints:                          ║
║  - POST /api/auth/login                  ║
║  - GET  /api/assessments                 ║
║  - POST /api/assessments/upload/validate ║
║  - GET  /api/statistics/:id              ║
║                                          ║
╚══════════════════════════════════════════╝
  `);
});

// Graceful shutdown handler
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

export default app;
