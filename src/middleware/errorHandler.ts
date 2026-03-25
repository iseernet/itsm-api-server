import { Request, Response, NextFunction } from 'express';

const errorHandler = (error: Error, req: Request, res: Response, next: NextFunction): void => {
  console.error(error.stack);
  res.status(500).json({ error: error.message || 'Server error' });
};

export default errorHandler;