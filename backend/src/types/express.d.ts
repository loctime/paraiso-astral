import { Request } from 'express';
import { User, Membership, Organization } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: User;
      organization?: Organization;
      membership?: Membership;
    }
  }
}

export {};
