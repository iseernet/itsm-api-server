// import express from 'express';
// import {
//     getIssues,
//     createIssue,
//     getIssueDetail,
//     delIssue,
//     updateIssueInfo,
//     assignIssue,
//     changeIssueState
// } from '../controllers/issueController';

// import {
//     uploadAttachments
// } from '../controllers/uploadController'

// import { authMiddleware, roleMiddleware } from '../middleware/auth';
// import { signatureMiddleware } from '../middleware/signature';
// import multer from 'multer';


// const router = express.Router();
// const storage = multer.diskStorage({
//     destination: (req, file, cb) => cb(null, 'uploads/'),
//     filename: (req, file, cb) => cb(null, file.originalname) // 保留上传者的文件名
// });
// const upload = multer({ storage });
// // router.get('/', authMiddleware, signatureMiddleware, getIssues);
// // router.post('/', authMiddleware, signatureMiddleware, createIssue);
// // router.get('/:idOrKey', authMiddleware, signatureMiddleware, getIssueDetail);
// // router.delete('/:idOrKey', authMiddleware, signatureMiddleware, delIssue);
// // router.put('/:idOrKey', authMiddleware, signatureMiddleware, updateIssueInfo);
// // router.post('/:idOrKey/assign', authMiddleware, signatureMiddleware, assignIssue);
// // router.post('/:idOrKey/change-state', authMiddleware, signatureMiddleware, changeIssueState);


// router.get('/', authMiddleware, getIssues);
// router.post('/', authMiddleware, createIssue);
// router.get('/:idOrKey', authMiddleware, getIssueDetail);
// router.delete('/:idOrKey', authMiddleware, delIssue);
// router.put('/:idOrKey', authMiddleware, updateIssueInfo);
// router.post('/:idOrKey/assign', authMiddleware, assignIssue);
// router.post('/:idOrKey/change-state', authMiddleware, changeIssueState);

// router.post(
//     '/upload-files',
//     authMiddleware,
//     upload.array('files'), // 👈 让 multer 解析文件字段
//     uploadAttachments
// );
// export default router;

import express from 'express';
import {
    getIssues,
    createIssue,
    getIssueDetail,
    delIssue,
    updateIssueInfo,
    assignIssue,
    changeIssueState, createIDCIssueFromIssue, requestRNPermission,
    getRelatedIssues,
    getRelatedMyIssues, addManualFault, manualConfirmResolved, exportIssues, getTicketRebootStatus
} from '../controllers/issueController';

import { uploadAttachments } from '../controllers/uploadController';
import { authMiddleware, roleMiddleware } from '../middleware/auth';

import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { createComment, delComment, getAttachmentContent, getCommentDetail, getComments } from '../controllers/commentController';
import { signatureMiddleware } from '../middleware/signature';
import { addPostmortemData} from "../controllers/postmortemController";

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
    // fileFilter: (req, file, cb) => {
    //     const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    //     if (allowedTypes.includes(file.mimetype)) {
    //         cb(null, true);
    //     } else {
    //         cb(new Error('仅支持上传 JPG、PNG、PDF 文件'));
    //     }
    // }
});

// ========== 工单操作接口 ==========
router.get('/', authMiddleware, signatureMiddleware, getIssues);
router.post('/', authMiddleware, signatureMiddleware, createIssue);
router.get('/:idOrKey', authMiddleware, signatureMiddleware, getIssueDetail);
router.delete('/:idOrKey', authMiddleware, signatureMiddleware, delIssue);
router.put('/:idOrKey', authMiddleware, signatureMiddleware, updateIssueInfo);
router.post('/:idOrKey/assign', authMiddleware, signatureMiddleware, assignIssue);
router.post('/:idOrKey/change-state', authMiddleware, signatureMiddleware, changeIssueState);

router.get('/:idOrKey/relatedIssues', authMiddleware, signatureMiddleware, getRelatedIssues);
router.get('/:idOrKey/relatedMyIssues', authMiddleware, signatureMiddleware, getRelatedMyIssues);

router.post('/export', authMiddleware, signatureMiddleware, exportIssues);

// // router.get('/', authMiddleware, signatureMiddleware, getIssues);
// // router.post('/', authMiddleware, signatureMiddleware, createIssue);
// // router.get('/:idOrKey', authMiddleware, signatureMiddleware, getIssueDetail);
// // router.delete('/:idOrKey', authMiddleware, signatureMiddleware, delIssue);
// // router.put('/:idOrKey', authMiddleware, signatureMiddleware, updateIssueInfo);
// // router.post('/:idOrKey/assign', authMiddleware, signatureMiddleware, assignIssue);
// // router.post('/:idOrKey/change-state', authMiddleware, signatureMiddleware, changeIssueState);

// ========== 评论接口 ==========
router.get('/:issueIdOrKey/comments', authMiddleware, signatureMiddleware, getComments);
router.get('/:issueIdOrKey/comments/:commentId', authMiddleware, signatureMiddleware, getCommentDetail);
router.delete('/:issueIdOrKey/comments/:commentId', authMiddleware, signatureMiddleware, delComment);

router.get('/comment/attachment/:id/:filename', getAttachmentContent);
router.get('/attachment/:id/:filename', getAttachmentContent);

router.post(
    '/:issueIdOrKey/comments',
    authMiddleware,
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
    createComment
);

// ========== 附件上传接口 ==========
router.post(
    '/upload-files',
    authMiddleware,
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

router.post(
    '/:issueIdOrKey/postmortem',
    authMiddleware,
    // signatureMiddleware, // 如有签名校验可开启
    (req, res, next) => {
        upload.fields([
            { name: 'files', maxCount: 10 },       // 允许 files 字段最多 10 个文件
            { name: 'files_clean', maxCount: 10 } // 允许 files_clean 字段最多 10 个文件
        ])(req, res, (err: any) => {
            if (err instanceof multer.MulterError) {
                return res.status(400).json({ error: `Multer 错误: ${err.message}` });
            } else if (err) {
                return res.status(400).json({ error: err.message });
            }
            next();
        });
    },
    addPostmortemData
);

router.post(
    '/:issueIdOrKey/manualFault',
    authMiddleware,
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
    addManualFault
);

router.post(
    '/:issueIdOrKey/manualConfirmResolved',
    authMiddleware,
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
    manualConfirmResolved
);

router.get('/:idOrKey/ticketRebootStatus', authMiddleware, signatureMiddleware, getTicketRebootStatus);

export default router;
