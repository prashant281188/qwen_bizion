import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

interface DatabaseError extends Error {
  code?: string;
}

export const errorHandler = (
  err: Error | AppError | DatabaseError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('Error:', err);

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
    return;
  }

  // Handle Zod errors
  if (err.name === 'ZodError') {
    res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: err,
    });
    return;
  }

  // Handle database errors
  const dbErr = err as DatabaseError;
  if (dbErr.code === '23505') {
    res.status(409).json({
      success: false,
      message: 'Duplicate entry',
    });
    return;
  }

  if (dbErr.code === '23503') {
    res.status(400).json({
      success: false,
      message: 'Foreign key constraint violation',
    });
    return;
  }

  // Default error
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
  });
};

export const notFound = (req: Request, res: Response, next: NextFunction): void => {
  const error = new AppError(`Not Found - ${req.originalUrl}`, 404);
  next(error);
};
