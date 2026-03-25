import express from 'express';
import {
    getIssues,
    createIssue,
    getIssueDetail,
    createIDCIssue,
    getIdcIssues,
    getIdcIssueDetail,
    serverOperation,
    systemDeploy,
    closeIdcIssue,
    closeIssue,
    updateRnIssueState,
    authorizeIssueInfo,
    getSignature,
    createAlarmIssue,
    cancelIdcIssue,
    reopenIdcIssue, confirmResolveIdcIssue, alarmRecovery,
    deviceReplace, createFaultIssue, addFaultIssueAttachments
} from '../controllers/openApiController';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { openApiAuthMiddleware } from '../middleware/openApi';
import { signatureMiddleware } from '../middleware/signature';
import { uploadAttachments } from '../controllers/uploadController';

const router = express.Router();

// 上传路径从环境变量获取或默认 uploads/
const uploadPath = process.env.UPLOAD_DIR || 'uploads/';
if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
}

// multer 配置：自定义存储 + 类型 + 大小限制
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadPath),
    filename: (req, file, cb) => {
        const timestamp = Date.now();
        const uniqueName = `${timestamp}-${file.originalname}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 最大 5MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('仅支持上传 JPG、PNG、PDF 文件'));
        }
    }
});

router.post('/alarm', openApiAuthMiddleware, signatureMiddleware, createAlarmIssue);
router.post('/alarm/:alarmId/recovery', openApiAuthMiddleware, signatureMiddleware, alarmRecovery);

router.get('/issue', openApiAuthMiddleware, signatureMiddleware, getIssues);
router.post('/issue', openApiAuthMiddleware, signatureMiddleware, createIssue);
router.get('/issue/:id', openApiAuthMiddleware, signatureMiddleware, getIssueDetail);
router.post('/issue/:id/close', openApiAuthMiddleware, signatureMiddleware, closeIssue);

router.post('/rnIssue/:rnIssueId/updateState', openApiAuthMiddleware, signatureMiddleware, updateRnIssueState);

router.post('/idcIssue', openApiAuthMiddleware, signatureMiddleware, createIDCIssue);
router.get('/idcIssue', openApiAuthMiddleware, signatureMiddleware, getIdcIssues);
router.get('/idcIssue/:id', openApiAuthMiddleware, signatureMiddleware, getIdcIssueDetail);
router.post('/idcIssue/:id/cancel', openApiAuthMiddleware, signatureMiddleware, cancelIdcIssue);
router.post('/idcIssue/:id/reopen', openApiAuthMiddleware, signatureMiddleware, reopenIdcIssue);
router.post('/idcIssue/:id/confirmResolve', openApiAuthMiddleware, signatureMiddleware, confirmResolveIdcIssue);
router.post('/idcIssue/:id/authorize', openApiAuthMiddleware, signatureMiddleware, authorizeIssueInfo);

router.post('/serverOperation', openApiAuthMiddleware, signatureMiddleware, serverOperation);
router.post('/systemDeploy', openApiAuthMiddleware, signatureMiddleware, systemDeploy);

router.post('/faultIssue', openApiAuthMiddleware, signatureMiddleware, createFaultIssue);
router.post('/faultIssue/:id/attachments', openApiAuthMiddleware, signatureMiddleware, addFaultIssueAttachments);

// router.post('/getSignature', openApiAuthMiddleware, getSignature);

// ========== 附件上传接口 ==========
router.post(
    '/upload-files',
    openApiAuthMiddleware,
    // signatureMiddleware, // 如有签名校验可开启
    (req, res, next) => {
        upload.array('files')(req, res, (err: any) => {
            if (err instanceof multer.MulterError) {
                return res.status(400).json({ error: `Multer 错误: ${err.message}` });
            } else if (err) {
                return res.status(400).json({ error: err.message });
            }
            next();
        });
    },
    uploadAttachments
);

export default router;
