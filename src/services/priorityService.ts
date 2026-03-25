import { PriorityBlackValueMap } from '../enums/priorityEnum';
import { AuthUserPayload } from '../middleware/auth';
import { JiraClient } from '../utils/jira/JiraClient';


export const getPriorityList = async () => {
    try {
        const jira = new JiraClient(process.env.JIRA_ADMIN_USERNAME as string, process.env.JIRA_ADMIN_PASSWORD);
        const rs = await jira.getAllPriorities();
        const list = rs
            .filter((issue: any) => !PriorityBlackValueMap.Id.includes(issue.id)); // 过滤掉黑名单 ID
        return list;

    } catch (error: any) {
        console.error('search priority failed:', error.message);
        throw new Error(error.message);
    }
};





