import { Request } from 'express';
import { User, Membership, Organization, Event } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: User & { firebaseUid?: string };
      organization?: Organization;
      membership?: Membership;
      /** Evento cargado y autorizado por requireEventAccess (evita doble query). */
      event?: Event;
    }
  }
}

export {};
