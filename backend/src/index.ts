import express = require('express');
import cors = require('cors');
import * as dotenv from 'dotenv';
import authRoutes from './routes/auth';
import captureRoutes from './routes/captures';
import teamRoutes from './routes/teams';
import territoryRoutes from './routes/territories';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/territories', territoryRoutes);
app.use('/api/territories', captureRoutes);

// Basic route
app.get('/', (req, res) => {
  res.json({
    message: 'Juris API Server is running!',
    version: '1.0.0',
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📱 Health check: http://localhost:${PORT}/health`);
  console.log(`🔑 Auth endpoints:`);
  console.log(`   POST http://localhost:${PORT}/api/auth/register`);
  console.log(`   POST http://localhost:${PORT}/api/auth/login`);
});
