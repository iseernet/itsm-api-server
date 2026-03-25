import { AuthUserPayload } from '../types/auth';
import { JiraClient } from '../utils/jira/JiraClient';

export const uploadAttachmentsToIssue = async (
    user: AuthUserPayload,
    issueIdOrKey: string,
    filePaths: string[],
) => {
    try {
        const jira = new JiraClient(user.username);
        return await jira.uploadAttachments(issueIdOrKey, filePaths);
    } catch (error: any) {
        throw new Error(error.message);
    }
};
