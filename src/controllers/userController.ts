import { Request, Response, NextFunction } from 'express';
import {
    addUser,
    getUserList,
    getUserInfo,
    delUserInfo,
    updateUserInfo
} from '../services/userService';
import { User, UserQueryPayload } from '../types/user';
import { JiraClient } from "../utils/jira/JiraClient";


// 创建用户
export const createUser = async (req: Request, res: Response) => {
    try {
        const authUser = (req as any).user;
        const userData: User = req.body;

        // ⭐ 拿到上传的头像文件
        const files = req.files as Express.Multer.File[];
        if (files && files.length > 0) {
            userData.avatar = files[0].path; // multer 保存的文件路径
        }

        const result = await addUser(authUser, userData);

        return res.send({
            success: true,
            data: result
        });

    } catch (err: any) {
        return res.send({
            success: false,
            message: err.message
        });
    }
};

/**
 * 查询用户列表（分页）
 */
export const getUsers = async (req: Request, res: Response) => {
    try {
        const authUser = (req as any).user;
        const params: UserQueryPayload = req.query as any; // query 参数
        const result = await getUserList(authUser, params);
        return res.send({
            success: true,
            data: result
        });
    } catch (err: any) {
        return res.send({
            success: false,
            message: err.message
        });
    }
};

/**
 * 获取指定用户信息
 */
export const getUser = async (req: Request, res: Response) => {
    try {
        const authUser = (req as any).user;
        const key: string = req.params.key as string;
        const result = await getUserInfo(authUser, key, process.env.JIRA_PROJECT_KEY!);
        return res.send({
            success: true,
            data: result
        });
    } catch (err: any) {
        return res.send({
            success: false,
            message: err.message
        });
    }
};

/**
 * 删除用户
 */
export const deleteUser = async (req: Request, res: Response) => {
    try {
        const authUser = (req as any).user;
        const username: string = req.params.username as string;
        const result = await delUserInfo(authUser, username);

        return res.send({
            success: true,
            data: { success: true }
        });
    } catch (err: any) {
        return res.send({
            success: false,
            message: err.message
        });
    }
};

/**
 * 更新用户
 */
export const updateUser = async (req: Request, res: Response) => {
    try {
        const authUser = (req as any).user;
        const username: string = req.params.username as string;
        const userData: User = req.body;
        // ⭐ 拿到上传的头像文件
        const files = req.files as Express.Multer.File[];
        if (files && files.length > 0) {
            userData.avatar = files[0].path; // multer 保存的文件路径
        }
        await updateUserInfo(authUser, username, userData);
        return res.send({
            success: true,
            data: { success: true }
        });
    } catch (err: any) {
        return res.send({
            success: false,
            message: err.message
        });
    }
};

//用于对应在jira直接创建user导致user信息中少了自定义属性 token 的问题，此问题会导致登录itsm失败，提示错误为获取不到token
export const updateUserToken = async (req: Request, res: Response) => {
    try {
        const userData: User = req.body;
        const username: string = userData.username as string;
        const userPassword: string = userData.password as string;

        const jira = new JiraClient(process.env.JIRA_ADMIN_USERNAME as string);

        const base64Token = Buffer.from(username + ':' + userPassword).toString('base64');
        await jira.setUserProperty(username, 'token', base64Token);

        return res.send({
            success: true,
            data: { success: true }
        });
    } catch (err: any) {
        return res.send({
            success: false,
            message: err.message
        });
    }
};

