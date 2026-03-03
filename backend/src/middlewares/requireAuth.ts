import { Request, Response, NextFunction } from 'express';
import { auth } from '../config/firebase';
import { prisma } from '../config/prisma';
import { UserStatus } from '@prisma/client';

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Leer Authorization: Bearer <firebase-id-token>
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Authorization header required',
      });
      return;
    }

    const idToken = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verificar Firebase ID Token
    const decodedToken = await auth.verifyIdToken(idToken);
    const firebaseUid = decodedToken.uid;
    const email = decodedToken.email;

    if (!email) {
      res.status(401).json({
        error: 'Email is required in Firebase token',
      });
      return;
    }

    // Buscar usuario interno en PostgreSQL por firebaseUid (lookup principal)
    let user = await prisma.user.findUnique({
      where: { firebaseUid: firebaseUid },
      select: {
        id: true,
        firebaseUid: true,
        email: true,
        name: true,
        displayName: true,
        avatarUrl: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        passwordHash: true,
      },
    });

    // Fallback: si no existe por firebaseUid, buscar por email y actualizar
    if (!user) {
      user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        select: {
          id: true,
          firebaseUid: true,
          email: true,
          name: true,
          displayName: true,
          avatarUrl: true,
          role: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          passwordHash: true,
        },
      });

      // Si se encuentra por email, actualizar firebaseUid
      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: { firebaseUid: firebaseUid },
        });
      }
    }

    if (!user) {
      res.status(401).json({
        error: 'User not found in internal database',
      });
      return;
    }

    if (user.status !== UserStatus.ACTIVE) {
      res.status(401).json({
        error: 'User account is not active',
      });
      return;
    }

    // Adjuntar req.user con información de Firebase y base de datos
    req.user = {
      ...user,
      firebaseUid,
    };
    
    next();
  } catch (error) {
    if (error instanceof Error && error.message.includes('Firebase')) {
      res.status(401).json({
        error: 'Invalid Firebase token',
      });
      return;
    }
    
    next(error);
  }
};

/**
 * Auth opcional para rutas públicas: si hay Bearer token válido, resuelve y adjunta req.user.
 * Si no hay token o es inválido, continúa sin req.user (Access Engine trata como guest).
 * Usar en rutas event-scoped públicas (ej. GET /api/events/:eventId) para que REGISTERED/FOLLOWER/HAS_TICKET funcionen.
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }

    const idToken = authHeader.substring(7);
    let decodedToken: { uid: string; email?: string };
    try {
      decodedToken = await auth.verifyIdToken(idToken);
    } catch {
      next();
      return;
    }

    const firebaseUid = decodedToken.uid;
    const email = decodedToken.email;
    if (!email) {
      next();
      return;
    }

    let user = await prisma.user.findUnique({
      where: { firebaseUid },
      select: {
        id: true,
        firebaseUid: true,
        email: true,
        name: true,
        displayName: true,
        avatarUrl: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        passwordHash: true,
      },
    });

    if (!user) {
      user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        select: {
          id: true,
          firebaseUid: true,
          email: true,
          name: true,
          displayName: true,
          avatarUrl: true,
          role: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          passwordHash: true,
        },
      });
      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: { firebaseUid },
        });
      }
    }

    if (!user || user.status !== UserStatus.ACTIVE) {
      next();
      return;
    }

    req.user = { ...user, firebaseUid };
    next();
  } catch {
    next();
  }
};
