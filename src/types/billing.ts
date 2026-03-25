export interface IssueHandleTimePayload {
    issue_id: string;
    issue_type?: string;
    issue_reporter?: string;
    reported_at?: number;
    accepted_at?: number;
    authorized_at?: number;
    log_given_at?: number;
    finished_at?: number;
    confirmed_at?: number;

    manual_report_at?: number;
    manual_resolve_at?: number;
}
