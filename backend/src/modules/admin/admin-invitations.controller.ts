import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/prisma';
import { UserRole, InvitationStatus } from '@prisma/client';
import { HttpError } from '../../utils/errors';
import crypto from 'crypto';

// ADMIN — Crear invitación
export const createInvitation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, role } = req.body;

    if (!email || !role) {
      throw new HttpError('Email and role are required', 400);
    }

    if (!Object.values(UserRole).includes(role)) {
      throw new HttpError('Invalid role', 400);
    }

    // Generar token seguro con crypto.randomBytes
    const token = crypto.randomBytes(32).toString('hex');

    // Setear expiresAt a 7 días
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Guardar en DB
    const invitation = await prisma.invitation.create({
      data: {
        email: email.toLowerCase(),
        role,
        token,
        expiresAt,
      },
    });

    res.json({
      success: true,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
        token: invitation.token, // Solo devolver token en creación
      },
    });
  } catch (error) {
    next(error);
  }
};
