import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthUserPayload } from '../types/auth';



export interface AuthRequest extends Request {
    user?: AuthUserPayload;
}

export const openApiAuthMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers["client-id"];
    if (!authHeader) {
        return res.send({
            success: false,
            message: 'Client ID is missing'
        });
        // return res.status(401).json({ message: 'Client ID is missing' });
    }

    req.user = { "username": authHeader as string };
    // req.user = decoded;
    next();
};

export { AuthUserPayload };

