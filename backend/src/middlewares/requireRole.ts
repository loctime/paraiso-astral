/**
 * RBAC organizacional: controla acceso de staff al panel/org.
 * No confundir con Access Engine (modules/access): ese controla quién ve contenido de eventos (espectadores).
 */
import { Request, Response, NextFunction } from 'express';
import { MembershipRole, UserRole } from '@prisma/client';

function isMembershipRole(role: string): role is MembershipRole {
  return Object.values(MembershipRole).includes(role as MembershipRole);
}

function isUserRole(role: string): role is UserRole {
  return Object.values(UserRole).includes(role as UserRole);
}

export const requireRole = (allowedRoles: MembershipRole[] | UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        res.status(401).json({
          error: 'Authentication required',
        });
        return;
      }

      // Roles de organización (requiere resolveOrganization)
      if (req.membership) {
        const hasRequiredRole = allowedRoles.some((role) => role === req.membership!.role);
        if (!hasRequiredRole) {
          res.status(403).json({
            error: `Access denied. Required roles: ${allowedRoles.join(', ')}. Current role: ${req.membership!.role}`,
          });
          return;
        }
        next();
        return;
      }

      // Roles de usuario global (User.role)
      const userRole = req.user.role;
      if (userRole !== undefined && (isMembershipRole(userRole) || isUserRole(userRole))) {
        const hasRequiredRole = allowedRoles.some((role) => role === userRole);
        if (!hasRequiredRole) {
          res.status(403).json({
            error: `Access denied. Required roles: ${allowedRoles.join(', ')}. Current role: ${userRole}`,
          });
          return;
        }
        next();
        return;
      }

      res.status(403).json({
        error: 'Role information not found',
      });
    } catch (error) {
      next(error);
    }
  };
};
