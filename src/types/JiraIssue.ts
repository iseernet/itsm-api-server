export interface JiraIssueTest {
    id?: number;               // 自增主键，可选
    issue_key: string;
    summary: string;
    status: string;
    assignee?: string | null;
    created_at: string;        // ISO 时间字符串
    updated_at: string;
}
