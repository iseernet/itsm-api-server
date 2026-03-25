import { BaseQuery } from "./base";

export interface GroupQueryPayload extends BaseQuery {
    // role_name?: string;
    role_id?: number;
    group_name?: string;
}

