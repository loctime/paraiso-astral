import { Request, Response, NextFunction } from 'express';
import { MembershipRole, UserRole } from '@prisma/client';

export const requireRole = (allowedRoles: MembershipRole[] | UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        res.status(401).json({
          error: 'Authentication required',
        });
        return;
      }

      // Para roles de organización (requiere resolveOrganization middleware)
      if (req.membership) {
        const hasRequiredRole = allowedRoles.some(role => role === req.membership!.role);
        if (!hasRequiredRole) {
          res.status(403).json({
            error: `Access denied. Required roles: ${allowedRoles.join(', ')}. Current role: ${req.membership!.role}`,
          });
          return;
        }
      }
      // Para roles de usuario global
      else if ((req.user as any).role) {
        const hasRequiredRole = allowedRoles.some(role => role === (req.user as any).role);
        if (!hasRequiredRole) {
          res.status(403).json({
            error: `Access denied. Required roles: ${allowedRoles.join(', ')}. Current role: ${(req.user as any).role}`,
          });
          return;
        }
      } else {
        res.status(403).json({
          error: 'Role information not found',
        });
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
