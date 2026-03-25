import { BaseQuery } from "./base";

// types/ServiceFaultType.ts
export interface ServiceFaultType {
    id: number;
    name?: string;
    parent_id?: number | null;
    code?: string;
    service_category_id?: number;
    service_category_name?: string;
}

export interface ServiceFaultTypeQuery {
    name?: string;
    parent_id?: number;
    code?: string;
    service_category_id?: number;
    pageIndex?: number;
    pageSize?: number;
    service_category_name?: string;
}