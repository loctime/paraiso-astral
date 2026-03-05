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
    namespace Multer {
      interface File {
        fieldname: string;
        originalname: string;
        encoding: string;
        mimetype: string;
        size: number;
        buffer?: Buffer;
        destination?: string;
        filename?: string;
        path?: string;
      }
    }
  }
}

export {};
