import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import {
    refreshTokens,
} from '../types/auth';
import {
    generateAccessToken,
    generateRefreshToken,
    verifyToken,
} from '../services/jwtService';
import { JiraClient } from '../utils/jira/JiraClient';
import { getPermissions, flattenMenuNames } from '../services/permissionsService';

const saltRounds = 10;

//获取token
export const token = async (req: Request, res: Response) => {
    const { clientId, clientSecret } = req.body;

    if (!clientId || !clientSecret) {
        return res.send({
            success: false,
            message: "clientId or clientSecret is missing"
        });
    }

    const username = clientId
    try {
        const { data } = await JiraClient.getCurrentUserWithBasicAuth(clientId, clientSecret, process.env.JIRA_PROJECT_KEY!);
        if (!data) return res.status(401).json({ message: 'User not found' });
        const accessToken = generateAccessToken({ username });
        console.log('accessToken', accessToken);
        const refreshToken = generateRefreshToken({ username });
        refreshTokens.push(refreshToken);
        console.log('refreshToken', refreshToken);

        return res.send({
            success: true,
            data: { "accessToken": accessToken, "refreshToken": refreshToken, "user": data },
        });
    } catch (error: any) {
        console.error("JIRA login failed:" + JSON.stringify(error));
        // return res.send({
        //     success: false,
        //     message: "JIRA login failed:" + error.response?.data || error.message,
        // });
        return res.send({
            success: false,
            message: "username or password is wrong.",
        });
    }
};



//登录
export const login = async (req: Request, res: Response) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.send({
            success: false,
            message: "Username or password is missing"
        });
    }

    try {
        const { data } = await JiraClient.getCurrentUserWithBasicAuth(username, password, process.env.JIRA_PROJECT_KEY!);
        if (!data) {
            return res.send({
                success: false,
                message: "User not found"
            });
        }
        const accessToken = generateAccessToken({ username });
        const refreshToken = generateRefreshToken({ username });
        refreshTokens.push(refreshToken);

        res.send({
            success: true,
            data: { accessToken, refreshToken },
        });
    } catch (error: any) {
        // console.error("JIRA login failed：", error.response?.data || error.message);
        res.send({
            success: false,
            data: "JIRA login failed:" + error.response?.data || error.message,
        });
    }
};

//刷新登录用token
export const refresh = (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    if (!refreshToken || !refreshTokens.includes(refreshToken)) {
        return res.status(403).json({ message: 'Invalid refresh token' });
    }

    try {
        const payload = verifyToken<{ username: string }>(refreshToken);
        const newAccessToken = generateAccessToken({ username: payload.username });
        // res.json({ accessToken: newAccessToken });
        res.send({
            status: true,
            data: { accessToken: newAccessToken },
        });
    } catch {
        return res.status(403).json({ message: 'Invalid refresh token' });
    }
};

//注销
export const logout = (req: Request, res: Response) => {
    const { refreshToken } = req.body;
    const index = refreshTokens.indexOf(refreshToken);
    if (index > -1) refreshTokens.splice(index, 1);

    res.send({
        status: true,
        data: { message: 'Logged out successfully' },
    });
    // res.json({ message: 'Logged out successfully' });
};

export const protectedRoute = (req: Request, res: Response) => {
    res.json({ message: 'You are authenticated', user: (req as any).user });
};

export const adminOnly = (req: Request, res: Response) => {
    res.json({ message: 'This is an admin-only route' });
};

//获取用户权限
export const getUserPermissions = async (req: Request, res: Response) => {
    try {
        const username = (req as any).user.username; // 假设已经有登录鉴权中间件
        const ret = await getPermissions((req as any).user, process.env.JIRA_PROJECT_KEY!);
        // ret.menus 是树形结构，解析成一维 name 数组
        console.log("==========" + JSON.stringify(ret.menus))
        // const menuNames = flattenMenuNames(ret.menus);
        const menuNames = [...new Set(ret.menus)];
        return res.send({
            success: true,
            data: menuNames
        });

    } catch (err) {
        console.error(err);
        return res.send({
            success: false,
            message: "获取权限失败"
        });
    }
}


