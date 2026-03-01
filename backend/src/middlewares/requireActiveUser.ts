import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { UserStatus } from '@prisma/client';

export const requireActiveUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?.firebaseUid) {
      res.status(401).json({
        error: 'Authentication required',
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { firebaseUid: req.user.firebaseUid },
      select: {
        id: true,
        email: true,
        status: true,
        role: true,
        displayName: true,
        avatarUrl: true,
      },
    });

    if (!user) {
      res.status(403).json({
        error: 'User not found',
      });
      return;
    }

    if (user.status !== UserStatus.ACTIVE) {
      res.status(403).json({
        error: 'User account is not active',
      });
      return;
    }

    // Actualizar req.user con información completa
    req.user = {
      ...req.user,
      ...user,
    };

    next();
  } catch (error) {
    next(error);
  }
};
