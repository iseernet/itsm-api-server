import { BaseQuery } from "./base";

// types/service.ts
export interface service {
    id: number;
    name: string;
    service_category_id: number;
    sort_order?: number;
    created_time?: Date | null;
    assignee?: string | null;
    supervisor?: string | null;
    is_open?: boolean | false;
}

export interface ServiceQueryPayload extends BaseQuery {
    name?: string;
    service_category_id?: number;
    service_category_name?: string;
    sort_order?: number;
    created_time?: Date | null;
    assignee?: string | null;
    supervisor?: string | null;
    is_open?: boolean | false;
}

export interface PaginatedService {
    total: number;
    data: service[];
}