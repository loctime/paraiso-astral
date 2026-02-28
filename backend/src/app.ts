import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { eventAccessRoutes } from './modules/events/eventAccess.routes';
import { eventsRoutes } from './modules/events/events.routes';
import { requireAuth } from './middlewares/requireAuth';
import { resolveOrganization } from './middlewares/resolveOrganization';
import { requireRole } from './middlewares/requireRole';
import { MembershipRole } from '@prisma/client';
import { HttpError } from './utils/errors';

// Global error handler interface
interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

// Rate limiting for public endpoints
const publicRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      status: 'error',
      statusCode: 429,
      message: 'Too many requests'
    });
  }
});

// Stricter rate limiting for ticket access endpoint
const ticketAccessRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 requests per window (stricter)
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      status: 'error',
      statusCode: 429,
      message: 'Too many requests'
    });
  }
});

// Health check endpoint
const healthCheck = (req: Request, res: Response) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: env.NODE_ENV,
    version: '1.0.0',
  });
};

// Version endpoint
const version = (req: Request, res: Response) => {
  res.status(200).json({
    name: 'Paraiso Astral API',
    version: '1.0.0',
  });
};

// Global error handler middleware
const globalErrorHandler = (
  err: AppError | HttpError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Handle HttpError instances
  if (err instanceof HttpError) {
    const statusCode = err.statusCode;
    const message = err.message;

    // Production-safe logging
    if (env.NODE_ENV === 'development') {
      console.error('HttpError:', {
        message: err.message,
        statusCode: err.statusCode,
        url: req.url,
        method: req.method,
        timestamp: new Date().toISOString(),
        stack: err.stack,
      });
    } else {
      // Production: only log non-sensitive info
      console.error('HttpError:', {
        method: req.method,
        url: req.originalUrl,
        statusCode: err.statusCode,
        timestamp: new Date().toISOString(),
      });
    }

    res.status(statusCode).json({
      status: 'error',
      statusCode,
      message,
      ...(env.NODE_ENV === 'development' && { stack: err.stack }),
    });
    return;
  }

  // Handle regular errors
  const statusCode = err.statusCode || 500;
  const message = env.NODE_ENV === 'production' ? 'Internal Server Error' : (err.message || 'Internal Server Error');

  // Production-safe logging
  if (env.NODE_ENV === 'development') {
    console.error('Error:', {
      message: err.message,
      stack: err.stack,
      url: req.url,
      method: req.method,
      timestamp: new Date().toISOString(),
    });
  } else {
    // Production: only log non-sensitive info
    console.error('Error:', {
      method: req.method,
      url: req.originalUrl,
      statusCode,
      timestamp: new Date().toISOString(),
    });
  }

  res.status(statusCode).json({
    status: 'error',
    statusCode,
    message,
    ...(env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

// 404 handler middleware
const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const error: AppError = new Error(`Route ${req.originalUrl} not found`);
  error.statusCode = 404;
  next(error);
};

// Create Express app
export const createApp = (): Application => {
  const app: Application = express();

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: false, // Disabled for now to avoid breaking frontend
    xPoweredBy: false,
    frameguard: { action: 'deny' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
  }));

  // CORS configuration
  app.use(cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request logging middleware (non-sensitive)
  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`);
    });
    
    next();
  });

  // Health check endpoint (no rate limiting)
  app.get('/health', healthCheck);

  // Version endpoint (with rate limiting)
  app.get('/api/version', publicRateLimit, version);

  // Public event access routes (with stricter rate limiting)
  app.use('/public/event-access', ticketAccessRateLimit, eventAccessRoutes);

  // Public events API (with rate limiting)
  app.use('/api/events', publicRateLimit, eventsRoutes);

  // Ejemplo protegido con RBAC
  app.get(
    '/api/orgs/:orgId/test',
    requireAuth,
    resolveOrganization,
    requireRole([MembershipRole.ADMIN, MembershipRole.OWNER]),
    (req: Request, res: Response) => {
      res.json({
        message: 'Access granted',
        user: {
          id: req.user!.id,
          email: req.user!.email,
        },
        organization: {
          id: req.organization!.id,
          name: req.organization!.name,
        },
        membership: {
          role: req.membership!.role,
        },
      });
    }
  );

  // API routes will be added here
  // app.use('/api/v1/auth', authRoutes);
  // app.use('/api/v1/events', eventRoutes);
  // app.use('/api/v1/artists', artistRoutes);
  // app.use('/api/v1/admin', adminRoutes);

  // 404 handler
  app.use(notFoundHandler);

  // Global error handler
  app.use(globalErrorHandler);

  return app;
};
