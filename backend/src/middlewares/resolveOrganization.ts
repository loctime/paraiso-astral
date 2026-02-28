import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { MembershipRole } from '../types/auth';

export const resolveOrganization = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Verificar que el usuario esté autenticado
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
      });
      return;
    }

    // Leer req.params.orgId
    const orgId = req.params.orgId;
    
    if (!orgId) {
      res.status(400).json({
        error: 'Organization ID is required',
      });
      return;
    }

    // Verificar que el usuario tenga membership en esa organización
    const membership = await prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: req.user.id,
          organizationId: orgId,
        },
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
          },
        },
      },
    });

    if (!membership) {
      res.status(403).json({
        error: 'Access denied: User is not a member of this organization',
      });
      return;
    }

    if (membership.organization.status !== 'active') {
      res.status(403).json({
        error: 'Access denied: Organization is not active',
      });
      return;
    }

    // Adjuntar req.organization y req.membership
    req.organization = membership.organization;
    req.membership = membership;
    
    next();
  } catch (error) {
    next(error);
  }
};
