declare module 'multer' {
  import { Request } from 'express';

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

  interface Options {
    dest?: string;
    storage?: any;
    fileFilter?: (req: Request, file: File, cb: (error: Error | null, accept?: boolean) => void) => void;
    limits?: { fileSize?: number };
  }

  function multer(options?: Options): {
    single(fieldName: string): any;
    array(fieldName?: string, maxCount?: number): any;
    fields(fields: Array<{ name: string; maxCount?: number }>): any;
    none(): any;
    any(): any;
  };

  namespace multer {
    function memoryStorage(): any;
    function diskStorage(options: any): any;
  }

  export = multer;
}
