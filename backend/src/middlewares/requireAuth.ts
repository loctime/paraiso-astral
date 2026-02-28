import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../modules/auth/auth.service';
import { prisma } from '../config/prisma';

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Leer Authorization: Bearer <token>
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Authorization header required',
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verificar JWT
    const payload = AuthService.verifyToken(token);

    // Buscar user en DB
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      res.status(401).json({
        error: 'User not found',
      });
      return;
    }

    if (user.status !== 'active') {
      res.status(401).json({
        error: 'User account is not active',
      });
      return;
    }

    // Adjuntar req.user
    req.user = user;
    
    next();
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid token') {
      res.status(401).json({
        error: 'Invalid token',
      });
      return;
    }
    
    next(error);
  }
};
