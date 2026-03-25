import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import { config } from '../config/config';  // 统一配置入口

const JWT_SECRET: Secret = config.jwt.secret; // 从配置读取密钥
const ACCESS_TOKEN_EXPIRES_IN: string = config.jwt.accessTokenExpiresIn;
const REFRESH_TOKEN_EXPIRES_IN: string = config.jwt.refreshTokenExpiresIn;

interface AccessPayload {
    username: string;
    role?: string;
}

interface RefreshPayload {
    username: string;
}

/**
 * 生成 Access Token
 */
export const generateAccessToken = (payload: AccessPayload): string => {
    const options: SignOptions = {
        expiresIn: ACCESS_TOKEN_EXPIRES_IN as SignOptions['expiresIn'],
    };
    return jwt.sign(payload, JWT_SECRET, options);
};

/**
 * 生成 Refresh Token
 */
export const generateRefreshToken = (payload: RefreshPayload): string => {
    const options: SignOptions = {
        expiresIn: REFRESH_TOKEN_EXPIRES_IN as SignOptions['expiresIn'],
    };
    return jwt.sign(payload, JWT_SECRET, options);
};

/**
 * 验证并解码 Token，泛型指定返回类型
 */
export const verifyToken = <T>(token: string): T => {
    return jwt.verify(token, JWT_SECRET) as T;
};
