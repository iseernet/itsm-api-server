import {BaseQuery} from "./base";

export interface SlaDayPayload {
    id?: string;
    date: string;
    downtime?: number;
    dropped_num?: number;
}

export interface SlaDayQueryPayload extends BaseQuery {
    startDate?: string;
    endDate?: string;
}
