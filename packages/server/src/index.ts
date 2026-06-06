import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import Redis from 'ioredis';

import { prisma } from '@nexcomm/database';
import { API_RESPONSE, JWTPayload } from '@nexcomm/shared';

// Import routes
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import groupRoutes from './routes/group.routes';
import messageRoutes from './routes/message.routes';
import uploadRoutes from './routes/upload.routes';

// Import socket handlers
import { initSocketHandlers } from './sockets/socket.handlers';

const app = express();
const server = http.createServer(app);

// Configuration
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Redis connection
export const redis = new Redis(REDIS_URL, {
  retryStrategy: (times) => Math.min(times * 50, 2000),
});

redis.on('connect', () => console.log('✅ Connected to Redis'));
redis.on('error', (err) => console.error('❌ Redis error:', err));

// Socket.IO setup
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Middleware
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Auth middleware for protected routes
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json(API_RESPONSE.error('Unauthorized', 'NO_TOKEN'));
    }

    const token = authHeader.split(' ')[1];
    const payload = jwt.verify(token, JWT_SECRET) as JWTPayload;

    // Verify user exists and is active
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, role: true, status: true },
    });

    if (!user || user.status !== 'ACTIVE') {
      return res.status(401).json(API_RESPONSE.error('Unauthorized', 'USER_INVALID'));
    }

    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json(API_RESPONSE.error('Invalid token', 'TOKEN_INVALID'));
  }
};

// Admin middleware
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json(API_RESPONSE.error('Forbidden: Admin access required', 'FORBIDDEN'));
  }
  next();
};

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', authenticate, userRoutes);
app.use('/api/groups', authenticate, groupRoutes);
app.use('/api/messages', authenticate, messageRoutes);
app.use('/api/uploads', authenticate, uploadRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initialize socket handlers
initSocketHandlers(io, redis);

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json(
    API_RESPONSE.error(err.message || 'Internal server error', 'SERVER_ERROR')
  );
});

// 404 handler
app.use((req, res) => {
  res.status(404).json(API_RESPONSE.error('Not found', 'NOT_FOUND'));
});

// Start server
server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════╗
║           NexComm Server Starting...              ║
╠═══════════════════════════════════════════════════╣
║  🌐 REST API:   http://localhost:${PORT}/api       ║
║  🔌 WebSocket:  ws://localhost:${PORT}             ║
║  💾 Database:   PostgreSQL                        ║
║  📦 Cache:      Redis                             ║
╚═══════════════════════════════════════════════════╝
  `);
});

export { app, io };
