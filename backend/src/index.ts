import express = require('express');
import cors = require('cors');
import * as dotenv from 'dotenv';
import * as path from 'path';
import { createServer } from 'http';
import { testDatabaseConnection } from './lib/database';
import { RealTimeService } from './services/RealTimeService';
import { GamificationJobs } from './jobs/gamificationJobs';
import authRoutes from './routes/auth';
import captureRoutes from './routes/captures';
import teamRoutes from './routes/teams';
import territoryRoutes from './routes/territories';
import chatRoutes from './routes/chat';
import gamificationRoutes from './routes/gamification';

// Load environment variables
const envPath = path.join(__dirname, '..', '.env');
dotenv.config({ path: envPath });

// Fallback for development if .env isn't working
if (!process.env.DATABASE_URL) {
  console.log('⚠️  No DATABASE_URL found, using development fallback');
  process.env.PORT = '3000';
  process.env.NODE_ENV = 'development';
  process.env.DATABASE_URL =
    'postgresql://juris_user:juris_password@localhost:5432/juris_db';
  process.env.JWT_SECRET = 'development-secret-key';
}

const app = express();
const PORT = process.env.PORT || 3000;
const httpServer = createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/territories', territoryRoutes);
app.use('/api/captures', captureRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/gamification', gamificationRoutes);

// Basic route
app.get('/', (req, res) => {
  res.json({
    message: 'Juris API Server is running!',
    version: '1.0.0',
  });
});

// Health check
app.get('/health', (req, res) => {
  console.log("Checking health status.")
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
  });
});

// Database connection test
app.get('/db-test', async (req, res) => {
  try {
    const isConnected = await testDatabaseConnection();
    res.json({
      status: isConnected ? 'connected' : 'failed',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Database connection test failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

const realTimeService = new RealTimeService(httpServer);

GamificationJobs.startScheduler();

httpServer.listen(3000, '0.0.0.0', async () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📱 Health check: http://0.0.0.0:${PORT}/health`);
  console.log(`🗃️  Database test: http://0.0.0.0:${PORT}/db-test`);
  console.log(`🔌 Socket.io server initialized for real-time chat`);

  // Test database connection on startup
  console.log('\n🔌 Testing database connection...');
  await testDatabaseConnection();
});
