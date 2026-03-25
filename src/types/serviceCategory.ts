import { BaseQuery } from "./base";

// types/serviceCategory.ts
export interface serviceCategory {
    id: number;
    name: string;
    parent_id?: number | null;
    sort_order?: number;
    children?: any[]
}

export interface ServiceCategoryQueryPayload extends BaseQuery {
    name?: string;
    parent_id?: number | null;
    sort_order?: number;
}