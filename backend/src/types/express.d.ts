import { Request } from 'express';
import { User, Membership, Organization } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: User & { firebaseUid?: string };
      organization?: Organization;
      membership?: Membership;
    }
  }
}

export {};
