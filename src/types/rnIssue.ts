export interface RNIssuePayload {
    id?:string;
    name: string;
    description: string;
    service:string;
    level: string; // P0-P4
    alarmId?: string[];
    relativeIssueId?: string[];
}
