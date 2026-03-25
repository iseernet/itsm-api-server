export interface PriorityQueryPayload {
    id?: string;
}

export interface Priority {
    self: string;
    iconUrl: string;
    name: string;
    id: string;
    statusColor?: string;
    description?: string;
}
