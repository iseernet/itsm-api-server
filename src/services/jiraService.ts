//已废弃
// import axios, { AxiosInstance } from 'axios';
// import { config } from '../config/config';
// import { JiraTicket, CreateTicketRequest } from '../types/jira';

// const jiraClient: AxiosInstance = axios.create({
//   baseURL: config.jira.host,
//   auth: {
//     username: 'admin',
//     password: config.jira.apiToken
//   },
//   headers: {
//     'Content-Type': 'application/json'
//   }
// });

// export const createTicket = async ({ summary, description }: CreateTicketRequest): Promise<JiraTicket> => {
//   try {
//     const response = await jiraClient.post('/rest/api/3/issue', {
//       fields: {
//         project: { key: config.jira.projectKey },
//         summary,
//         description,
//         issuetype: { name: 'Service Request' }
//       }
//     });
//     return response.data;
//   } catch (error: any) {
//     throw new Error(error.response?.data?.errors || error.message);
//   }
// };

// import { JiraClient } from '../utils/jira/JiraClient';

// export const uploadAttachmentsToIssue = async (
//     user: UserPayload,
//     issueIdOrKey: string,
//     filePaths: string[],
// ) => {
//     const jira = new JiraClient(username, password);
//     return jira.uploadAttachments(issueIdOrKey, filePaths);
// };
