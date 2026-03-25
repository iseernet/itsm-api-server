import { JiraConfig } from '../types/jira';

/**
 * 获取Jira默认配置
 * 优先从环境变量读取，如果没有则返回空配置
 */
export function getJiraConfig(): JiraConfig {
    return {
        baseUrl: process.env.JIRA_BASE_URL || '',
        username: process.env.JIRA_USERNAME || '',
        password: process.env.JIRA_PASSWORD || '',
        apiToken: process.env.JIRA_API_TOKEN || '',
        timeout: process.env.JIRA_TIMEOUT ? parseInt(process.env.JIRA_TIMEOUT) : 10000
    };
}