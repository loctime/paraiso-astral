import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
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

    console.error('HttpError:', {
      message: err.message,
      statusCode: err.statusCode,
      url: req.url,
      method: req.method,
      timestamp: new Date().toISOString(),
    });

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
  const message = err.message || 'Internal Server Error';

  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString(),
  });

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
  const app = express();

  // CORS configuration
  app.use(cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request logging middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
    next();
  });

  // Health check endpoint
  app.get('/health', healthCheck);

  // Version endpoint
  app.get('/api/version', version);

  // Auth routes (removed - now using Firebase)
  // app.use('/api/auth', authRoutes);

  // Public event access routes
  app.use('/public/event-access', eventAccessRoutes);

  // Public events API
  app.use('/api/events', eventsRoutes);

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
