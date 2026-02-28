import { Request, Response, NextFunction } from 'express';
import { auth } from '../config/firebase';
import { prisma } from '../config/prisma';

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

    // Buscar usuario interno en PostgreSQL por email (temporal hasta que firebaseUid esté en la DB)
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        passwordHash: true,
      },
    });

    if (!user) {
      res.status(401).json({
        error: 'User not found in internal database',
      });
      return;
    }

    if (user.status !== 'active') {
      res.status(401).json({
        error: 'User account is not active',
      });
      return;
    }

    // Adjuntar req.user con información de Firebase y base de datos
    // Por ahora usamos type assertion para incluir firebaseUid
    req.user = {
      ...user,
      firebaseUid: firebaseUid,
    } as any;
    
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
