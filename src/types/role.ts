import { BaseQuery } from "./base";

export interface RoleQueryPayload extends BaseQuery {
    projectKey?: string;
    text?: string;
}

export interface RoleUserQueryPayload extends BaseQuery {
    projectKey?: string;
    roleName?: string;
    role_id?: number;
}

export interface Role {
    id: number;
    name: string;
    description: string;
    url?: string;
}