export interface RNFaultIssuePayload {
    ticketId: string;
    name: string;
    description: string;
    serverSn:string[];
    eventType: string;
    level: string;
    maintenanceOperations: string;
    hasDown: boolean;
    faultType: string;
    attachments?: AttachmentVO[];
}

export interface AttachmentVO {
    ossUrl: string;
    zipPassword?: string;
}