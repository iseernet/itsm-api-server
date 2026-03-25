import {BaseQuery} from "./base";

export interface TransceiverCleanupLogPayload {
    id?: string;
    service_type?: string;
    server_sn?: string;
    operator?: string;
    cleanup_start_at?: number;
    result?: string;
    note?: string;
    idc_ticket_id?: string;
    attachment_url?: string;
    p2p?: string;
    created_at?: string;
    updated_at?: string;
}

export interface TransceiverCleanupLogQueryPayload extends BaseQuery {
    serviceType?:string
    serverSn?: string;
    idcTicketId?: string;
    result?: string;
    cleanupTimeStart?: number;
    cleanupTimeEnd?: number;
}