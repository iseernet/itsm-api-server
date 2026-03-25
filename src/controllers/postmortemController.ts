import { Request, Response } from 'express';
import { CommentPayload, CommentQueryPayload } from '../types/conmment';
import { addComment, delCommentInfo, getAttachmentInfo, getCommentInfo, getCommentList } from '../services/commentService';
import * as fs from 'fs';
import * as path from 'path';
import {
    addAttachmentFiles,
    addIssueComment,
    getIssueInfo, recordDownTime, recordTransceiverCleanupLog,
    updateIssuePostmortem,
    updateProjectIssueStatus
} from "../services/issueService";

//创建
export const addPostmortemData = async (req: Request, res: Response) => {

    const { issueIdOrKey } = req.params;

    let {
        isGPUDropped,
        isLogNeeded,
        logCollectTime,
        postmortemServerSn,
        postmortemFaultType,
        postmortemMaintenanceOperation,
        rootCause,
        transceiver_result,
        transceiver_node
    } = req.body || {};

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const postmortemFiles = files['files'] || [];

    const filePaths = postmortemFiles.map((file) => path.resolve(file.path));
    if (!issueIdOrKey) {
        return res.send({
            success: false,
            message: 'idOrKey is missing'
        });
    }

    //上传postmortem附件
    const attachmentsRes = await addAttachmentFiles((req as any).user, issueIdOrKey as string, filePaths);
    const attachments = attachmentsRes.data;

    const fileUrls = [];

    for (const filePath of filePaths) {
        const filename = filePath.split(/[\\/]/).pop();
        const file = attachments.find((a: any) => a.filename === filename);

        if (file) {
            fileUrls.push(`/issue/comment/attachment/${file.id}/${encodeURIComponent(file.filename)}`);
        }
    }

    console.log(fileUrls);

    //上传光模块清洁附件
    const cleanupFiles = files['files_clean'] || [];
    const cleanupFilePaths = cleanupFiles.map((file) => path.resolve(file.path));
    const cleanupAttachmentsRes = await addAttachmentFiles((req as any).user, issueIdOrKey as string, cleanupFilePaths);
    const cleanupAttachments = cleanupAttachmentsRes.data;

    const cleanupFileUrls = [];

    for (const filePath of cleanupFilePaths) {
        const filename = filePath.split(/[\\/]/).pop();
        const file = cleanupAttachments.find((a: any) => a.filename === filename);

        if (file) {
            cleanupFileUrls.push(`/issue/comment/attachment/${file.id}/${encodeURIComponent(file.filename)}`);
        }
    }

    if(isGPUDropped == '0'){
        postmortemServerSn = '';
    }

    const updateData = {
        postmortem_is_gpu_down:isGPUDropped,
        postmortem_need_log:isLogNeeded,
        postmortem_server_sn: postmortemServerSn,
        collect_log_time:logCollectTime,
        collect_log_upload_image:fileUrls.join(','),
        postmortem_time: Math.floor(new Date().getTime()/1000).toString(),

        postmortem_fault_type: postmortemFaultType,
        postmortem_maintenance_operation: postmortemMaintenanceOperation,
        root_cause: rootCause,

        transceiver_result:transceiver_result,
        transceiver_node:transceiver_node,
        transceiver_attachments:cleanupFileUrls.join(','),
        transceiver_cleanup_time:Math.floor(new Date().getTime() / 1000)
    };

    const issue = await updateIssuePostmortem((req as any).user, issueIdOrKey as string, updateData);

    const newIssue = await getIssueInfo((req as any).user, issueIdOrKey as string);
    if(newIssue.fields.status.name == 'PBD-CLOSED'){
        await recordDownTime(newIssue.id);
    }

    try {
        return res.send({
            success: true,
            data: issue
        });
    } catch (error: any) {
        return res.send({
            success: false,
            message: error.message
        });
    }

};
