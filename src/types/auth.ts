// export interface User {
//     username: string;
//     role: 'admin' | 'user'; // 角色类型，方便权限控制
//     email: string;
//     displayName: string;
//     password: string
// }

export interface AuthUserPayload {
    username: string;
    role?: string;
    iat?: number;
    exp?: number;
}


// 模拟数据库：用户列表
// export const users: User[] = [];

// 存储有效的 refresh token，用于刷新 token 验证
export const refreshTokens: string[] = [];
