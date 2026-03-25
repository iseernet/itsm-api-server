import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthUserPayload } from '../types/auth';



export interface AuthRequest extends Request {
    user?: AuthUserPayload;
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        // return res.status(401).json({ message: 'Missing token' });
        return res.send({
            success: false,
            message: 'Missing token'
        });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as AuthUserPayload;
        req.user = decoded;
        next();
    } catch {
        return res.send({
            success: false,
            message: 'Invalid token'
        });
        // return res.status(401).json({ message: 'Invalid token' });
    }
};

export const roleMiddleware = (requiredRole: string) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user || req.user.role !== requiredRole) {
            return res.send({
                success: false,
                message: 'Insufficient permissions'
            });
            // return res.status(403).json({ message: 'Insufficient permissions' });
        }
        next();
    };
};
export { AuthUserPayload };

