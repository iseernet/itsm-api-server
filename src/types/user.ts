import { BaseQuery } from "./base";

// password / notification 不支持查询，只能返回原数据
export interface UserQueryPayload extends BaseQuery {
    key?: string;
    username?: string;
    emailAddress?: string;
    displayName?: string;
    // password?: string;
    group?: string;
    project: string;
    role: string;
    text?: string;
    // notification: boolean;
}


export interface User {
    key?: string;
    username: string;        // 必填，登录名
    password: string;       // 创建用户必填，更新用户可选
    emailAddress: string;
    displayName: string;
    groups?: string;       // 所属组
    applicationKeys?: string[]; // 应用权限
    active?: boolean;        // 是否激活
    timeZone?: string;       // 时区
    locale?: string;         // 语言环境
    role_ids?: string;
    avatar?: string;
    feishu?:string;
}


