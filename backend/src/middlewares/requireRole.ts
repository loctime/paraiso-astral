import { Request, Response, NextFunction } from 'express';
import { MembershipRole } from '../types/auth';

export const requireRole = (allowedRoles: MembershipRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Requerir que resolveOrganization haya corrido antes
      if (!req.user) {
        res.status(401).json({
          error: 'Authentication required',
        });
        return;
      }

      if (!req.membership) {
        res.status(403).json({
          error: 'Organization membership required. Use resolveOrganization middleware first.',
        });
        return;
      }

      // Verificar que membership.role coincida
      const hasRequiredRole = allowedRoles.includes(req.membership.role);

      if (!hasRequiredRole) {
        res.status(403).json({
          error: `Access denied. Required roles: ${allowedRoles.join(', ')}. Current role: ${req.membership.role}`,
        });
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
