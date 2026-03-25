import express from 'express';
import {
    getIssues,
    createIssue,
    getIssueDetail,
    delIssue,
    updateIssueInfo,
    assignIssue,
    changeIssueState, createIDCIssueFromIssue, requestRNPermission, cancelRNPermission
} from '../controllers/issueController';

import { uploadAttachments } from '../controllers/uploadController';
import { authMiddleware, roleMiddleware } from '../middleware/auth';

import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { createComment, delComment, getAttachmentContent, getCommentDetail, getComments } from '../controllers/commentController';
import { signatureMiddleware } from '../middleware/signature';

const router = express.Router();

router.post('/', authMiddleware, signatureMiddleware, createIDCIssueFromIssue);

router.post('/:id/requestPermission', authMiddleware, requestRNPermission);
router.post('/:id/cancelPermission', authMiddleware, signatureMiddleware, cancelRNPermission);

export default router;
