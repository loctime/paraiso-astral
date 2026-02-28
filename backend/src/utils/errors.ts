// HTTP Error class for proper error handling
export class HttpError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, HttpError);
    }
  }
}

// Factory functions for common HTTP errors
export const createBadRequestError = (message: string = 'Bad Request'): HttpError => {
  return new HttpError(message, 400);
};

export const createUnauthorizedError = (message: string = 'Unauthorized'): HttpError => {
  return new HttpError(message, 401);
};

export const createForbiddenError = (message: string = 'Forbidden'): HttpError => {
  return new HttpError(message, 403);
};

export const createNotFoundError = (message: string = 'Not Found'): HttpError => {
  return new HttpError(message, 404);
};

export const createConflictError = (message: string = 'Conflict'): HttpError => {
  return new HttpError(message, 409);
};
