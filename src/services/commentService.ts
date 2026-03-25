import { IssueCustomfield, IssueTypeEnum } from '../enums/issueEnum';
import { AuthUserPayload } from '../middleware/auth';
import { CommentPayload, CommentQueryPayload } from '../types/conmment';
import { IssuePayload, IssueQueryPayload } from '../types/issue';
import { Priority } from '../types/priority';
import { JiraClient } from '../utils/jira/JiraClient';

//新增
export const addComment = async (
    user: AuthUserPayload,
    issueIdOrKey: string,
    filePaths: string[],
    commentBody?: string
) => {
    try {
        const jira = new JiraClient(user.username);
        // if (!issue.issuetype) {
        //     issue.issuetype = IssueTypeEnum.Issue;
        // } else {
        //     const value = IssueTypeEnum[issue.issuetype as keyof typeof IssueTypeEnum];
        //     issue.issuetype = value;
        // }

        // if (!issue.reporter) {
        //     issue.reporter = user.username;
        // }

        return jira.addCommentWithAttachments(issueIdOrKey, filePaths, commentBody);
    } catch (error: any) {
        throw new Error(error.message);
    }

};

//列表
export const getCommentList = async (
    user: AuthUserPayload,
    params: CommentQueryPayload
) => {
    try {
        const jira = new JiraClient(process.env.JIRA_ADMIN_USERNAME as string);

        const pageIndex = params.pageIndex || 1;
        const pageSize = params.pageSize || 50;
        const startAt = (pageIndex - 1) * pageSize;

        const res = await jira.listComments(params.issueIdOrKey, startAt, pageSize);

        return {
            totalCount: res.total || 0,
            list: res.comments || []
        };
    } catch (error: any) {
        console.error('查询 Issue 失败:', error.message);
        throw new Error(error.message);
    }
};

//评论详情
export const getCommentInfo = async (
    user: AuthUserPayload,
    issueIdOrKey: string,
    commentId: string
) => {
    try {

        const jira = new JiraClient(user.username);
        const ret = await jira.getComment(issueIdOrKey, commentId);
        return ret.data;
    } catch (error: any) {
        console.error('获取评论详情失败:', error);
        throw new Error(error.message || error);
    }
};

//删除
export const delCommentInfo = async (
    user: AuthUserPayload,
    issueIdOrKey: string,
    commentId: string,
) => {
    try {
        const jira = new JiraClient(user.username);
        return await jira.deleteComment(issueIdOrKey, commentId);
    } catch (error: any) {
        throw new Error(error.message);
    }

};

//附件详情
export const getAttachmentInfo = async (
    user: AuthUserPayload,
    id: string,
    filename: string,
) => {
    try {
        const jira = new JiraClient(process.env.JIRA_ADMIN_USERNAME as string);
        return await jira.getAttachment(id, filename);
    } catch (error: any) {
        throw new Error(error.message);
    }

};






