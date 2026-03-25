import { Request, Response } from 'express';
import { CommentPayload, CommentQueryPayload } from '../types/conmment';
import { addComment, delCommentInfo, getAttachmentInfo, getCommentInfo, getCommentList } from '../services/commentService';
import * as fs from 'fs';
import * as path from 'path';
import {
    addIssueComment,
    getIssueInfo,
    updateIssueManualFault,
    updateProjectIssueStatus
} from "../services/issueService";
import { jiraApiUrls } from "../config/jiraApiUrls";
import {
    getRnRequestPermissionByIDCIssueId,
    updateRnRequestPermissionImage, updateRnRequestPermissionImageByIssueId
} from "../services/rnRequestPermissionService";
import { IDCRequestPermissionPayload } from "../types/idcIssue";
import { IssueCustomfield, IssueTypeEnum } from "../enums/issueEnum";
import { rnReportPbdEventState, rnReportPDBIDCIssueState } from "../utils/rn/RNClient";
import { alertRecover, confirmAlert } from "../utils/pbdalert/pbdAlert";

//创建评论
export const createComment = async (req: Request, res: Response) => {

    const { issueIdOrKey } = req.params;

    const { commentBody, updatePermission, updateStatus, updatePermissionTime } = req.body || {};
    // if (!commentBody) {
    //     return res.status(400).json({ success: false, message: 'commentBody is missing' });
    // }

    const files = req.files as Express.Multer.File[];
    const filePaths = files.map((file) => path.resolve(file.path));
    if (!issueIdOrKey) {
        return res.send({
            success: false,
            message: 'idOrKey is missing'
        });
    }

    try {
        const ret = await addComment((req as any).user, issueIdOrKey as string, filePaths, commentBody);
        console.log("updatePermission:", updatePermission);
        if (parseInt(updatePermission) == 1) {
            const issue = await getIssueInfo((req as any).user, issueIdOrKey as string);
            console.log(issue);
            if (issue) {
                const existedRequest = await getRnRequestPermissionByIDCIssueId(issue.id);
                if (existedRequest.length < 0) {
                    return res.send({
                        success: false,
                        data: "No request can be updated"
                    });
                }

                const attachments = issue.fields.attachment || [];

                const commentBody = ret.data.body;
                // 正则匹配 Jira Wiki 风格附件 !filename|可选说明!
                const regex = /!([^\|!\n]+?)\s*(?:\|[^!]*)?!/g;
                const matchedAttachments: any[] = [];
                let match: RegExpExecArray | null;

                while ((match = regex.exec(commentBody)) !== null) {
                    // 去掉文件名首尾空格
                    const filename = match[1].trim();

                    // 在 attachments 中查找匹配文件
                    const file = attachments.find((a: any) => a.filename === filename);

                    if (file) {
                        matchedAttachments.push({
                            ...file,
                            // Jira 真实 URL（调试用，可选）
                            jiraUrl: `${process.env.JIRA_BASE_URL}${jiraApiUrls.issue.attachments.getFile(file.id, file.filename)}`,
                            // 代理 URL（前端用）
                            proxyUrl: `/issue/comment/attachment/${file.id}/${encodeURIComponent(file.filename)}`
                        });
                    }
                }

                console.log(matchedAttachments);
                const idcRequestPermissionPayload: IDCRequestPermissionPayload = existedRequest[0];
                if (updatePermissionTime) {
                    if (idcRequestPermissionPayload.rn_event_id) {
                        await updateRnRequestPermissionImage(idcRequestPermissionPayload.rn_event_id, JSON.stringify(matchedAttachments), (new Date(parseInt(updatePermissionTime) * 1000)).toISOString());
                    }
                    else {
                        await updateRnRequestPermissionImageByIssueId(issueIdOrKey as string, JSON.stringify(matchedAttachments), (new Date(parseInt(updatePermissionTime) * 1000)).toISOString())
                    }
                }
                else {
                    if (idcRequestPermissionPayload.rn_event_id) {
                        await updateRnRequestPermissionImage(idcRequestPermissionPayload.rn_event_id, JSON.stringify(matchedAttachments), (new Date()).toISOString());
                    }
                    else {
                        await updateRnRequestPermissionImageByIssueId(issueIdOrKey as string, JSON.stringify(matchedAttachments), (new Date(parseInt(updatePermissionTime) * 1000)).toISOString())
                    }
                }

                if (process.env.RN_API_ENABLED == '1' && issue.fields.issuetype.id == IssueTypeEnum.IDC) {
                    await rnReportPDBIDCIssueState(issue.id, 'PBD-INPRORESS', "", "", "");
                }
            }
        }
        if (updateStatus != '' && updateStatus != null) { //同时更新issue状态
            await updateProjectIssueStatus((req as any).user, issueIdOrKey as string, updateStatus);
        }
        return res.send({
            success: true,
            data: ret.data
        });
    } catch (error: any) {
        return res.send({
            success: false,
            message: error.message
        });
    }

};

//查询
export const getComments = async (req: Request<{ issueIdOrKey: string }, {}, CommentQueryPayload>, res: Response) => {

    // const requiredFields: [keyof CommentQueryPayload, string][] = [
    //     ['issueIdOrKey', 'issueIdOrKey is missing'],
    // ];

    // for (const [field, message] of requiredFields) {

    //     if (!req.query[field]) {
    //         return res.send({
    //             success: false,
    //             message: message
    //         });
    //     }
    // }
    const { issueIdOrKey } = req.params;
    if (!issueIdOrKey) {
        return res.send({
            success: false,
            message: 'issueIdOrKey is missing'
        });
    }
    try {
        const query = req.query;
        const params: CommentQueryPayload = {
            issueIdOrKey: issueIdOrKey,
            pageIndex: query.pageIndex ? parseInt(query.pageIndex as string) : 1,
            pageSize: query.pageSize ? parseInt(query.pageSize as string) : 10,
            ...query,
        };
        const ret = await getCommentList((req as any).user, params);
        return res.send({
            success: true,
            data: ret
        });
    } catch (error: any) {
        // return res.status(500).json({ message: error.message });
        return res.send({
            success: false,
            message: error.message
        });
    }


};


//详情
export const getCommentDetail = async (req: Request, res: Response) => {
    try {
        const { issueIdOrKey, commentId } = req.params;

        if (!issueIdOrKey || !commentId) {
            return res.send({
                success: false,
                message: 'issueIdOrKey or commentId is missing'
            });

        }

        const ret = await getCommentInfo((req as any).user, issueIdOrKey as string, commentId as string);
        return res.send({
            success: true,
            data: ret
        });
    } catch (error: any) {
        console.error('获取评论详情失败:', error);
        return res.send({
            success: false,
            message: '获取评论详情失败', error: error.message || error
        });

    }

};

//删除
export const delComment = async (req: Request, res: Response) => {

    const { issueIdOrKey, commentId } = req.params;
    if (!issueIdOrKey || !commentId) {
        return res.send({
            success: false,
            message: 'issueIdOrKey or commentId is missing'
        });

    }

    try {
        const ret = await delCommentInfo((req as any).user, issueIdOrKey as string, commentId as string);
        return res.send({
            success: true,
            data: { success: true }
        });
    } catch (error: any) {
        // return res.status(500).json({ message: error.message });
        return res.send({
            success: false,
            message: error.message
        });
    }
};

//附件代理
export const getAttachmentContent = async (req: Request, res: Response) => {

    try {
        const { id, filename } = req.params;
        const { data, contentType } = await getAttachmentInfo((req as any).user, id as string, filename as string);

        res.setHeader('Content-Type', contentType);
        res.send(data);
    } catch (error: any) {
        console.error('附件获取失败', error);
        return res.send({
            success: false,
            message: error.message
        });
    }
};


