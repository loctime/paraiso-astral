import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/prisma';
import { InvitationStatus, UserRole } from '@prisma/client';
import { HttpError } from '../../utils/errors';
import crypto from 'crypto';

// VALIDAR INVITACIÓN (público)
export const validateInvitation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      throw new HttpError('Token is required', 400);
    }

    const invitation = await prisma.invitation.findUnique({
      where: { token },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    if (!invitation) {
      throw new HttpError('Invalid invitation token', 400);
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new HttpError('Invitation is no longer valid', 400);
    }

    if (new Date() > invitation.expiresAt) {
      throw new HttpError('Invitation has expired', 400);
    }

    res.json({
      valid: true,
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
    });
  } catch (error) {
    next(error);
  }
};

// ACEPTAR INVITACIÓN (requiere auth)
export const acceptInvitation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { token } = req.body;

    if (!token) {
      throw new HttpError('Token is required', 400);
    }

    if (!req.user?.firebaseUid || !req.user?.email) {
      throw new HttpError('Authentication required', 401);
    }

    const invitation = await prisma.invitation.findUnique({
      where: { token },
    });

    if (!invitation) {
      throw new HttpError('Invalid invitation token', 400);
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new HttpError('Invitation is no longer valid', 400);
    }

    if (new Date() > invitation.expiresAt) {
      throw new HttpError('Invitation has expired', 400);
    }

    if (invitation.email.toLowerCase() !== req.user.email.toLowerCase()) {
      throw new HttpError('Invitation email does not match your account', 400);
    }

    // Verificar que no exista un User con ese email
    const existingUser = await prisma.user.findUnique({
      where: { email: req.user.email.toLowerCase() },
    });

    if (existingUser) {
      throw new HttpError('User with this email already exists', 400);
    }

    // Crear registro User
    const newUser = await prisma.user.create({
      data: {
        firebaseUid: req.user.firebaseUid,
        email: req.user.email.toLowerCase(),
        role: invitation.role,
        status: 'ACTIVE', // Usar string temporal hasta que se actualice el schema
      },
    });

    // Marcar invitación como USED
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: {
        status: InvitationStatus.USED,
        usedAt: new Date(),
      },
    });

    res.json({
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        status: newUser.status,
      },
    });
  } catch (error) {
    next(error);
  }
};
