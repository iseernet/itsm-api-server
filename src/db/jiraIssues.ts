import BaseRepository from './BaseRepository';
import { JiraIssueTest } from '../types/JiraIssue';

export class JiraIssueRepository extends BaseRepository<JiraIssueTest> {
    constructor() {
        super('jira_issues', 'id');
    }

    // 扩展特殊查询方法，比如根据 issue_key 查找
    async findByIssueKey(issue_key: string): Promise<JiraIssueTest | null> {
        const results = await this.findBy({ issue_key });
        return results.length > 0 ? results[0] : null;
    }
}

export const jiraIssueRepo = new JiraIssueRepository();