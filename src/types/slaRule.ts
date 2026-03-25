import { BaseQuery } from "./base";

export interface SlaRulePayload {
    id?: number;
    name: string;
    update_by: string;
    level_id: string;
    responce_time: number;
    responce_time_unit: string;
    resolve_time: number;
    resolve_time_unit: string;
    is_open?: boolean | false;
}

export interface SlaRuleQueryPayload {
    id?: number;
    name?: string;
    update_by?: string;
    level_id?: string;
    responce_time?: number;
    responce_time_unit?: string;
    resolve_time?: number;
    resolve_time_unit?: string;
    pageIndex?: number;
    pageSize?: number;
    is_open?: boolean;
    text?: string;
}