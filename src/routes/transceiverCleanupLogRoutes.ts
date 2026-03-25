import express, {NextFunction, Request, Response} from 'express';

import { authMiddleware } from '../middleware/auth';
import { signatureMiddleware } from '../middleware/signature';
import {
    checkNeedCleanup,
    createCleanupLog,
    deleteCleanupLog,
    getCleanupLogById,
    getCleanupLogPage,
    updateCleanupLog
} from "../controllers/transceiverCleanupLogController";
import multer from "multer";

const router = express.Router();

const uploadPath = process.env.ITSM_TRANSCEIVER_UPLOAD_DIR || '';

const uploadMiddleware = (req: Request, res: Response, next: NextFunction) => {
    if (process.env.NODE_ENV === 'production') {
        upload.array('files')(req, res, (err) => {
            if (err instanceof multer.MulterError) {
                return res.status(400).json({ error: `Multer 错误: ${err.message}` });
            } else if (err) {
                return res.status(400).json({ error: err.message });
            }
            next();
        });
    }else {
        const devUpload = multer().any();

        devUpload(req, res, (err) => {
            if (err) {
                return res.status(400).json({ error: `解析失败: ${err.message}` });
            }
            next();
        });
    }
};

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
});

//分页查询 TransceiverCleanupLog
router.get('/', authMiddleware, signatureMiddleware, getCleanupLogPage);

//根据id查询 TransceiverCleanupLog
router.get('/:id', authMiddleware, signatureMiddleware, getCleanupLogById);

//创建 TransceiverCleanupLog
router.post(
    '/',
    authMiddleware,
    // signatureMiddleware, // 如有签名校验可开启
    uploadMiddleware,
    createCleanupLog
);

//更新 TransceiverCleanupLog
router.put('/:id',
    authMiddleware,
    // signatureMiddleware,
    uploadMiddleware,
    updateCleanupLog
);

//删除 TransceiverCleanupLog
router.delete('/:id', authMiddleware, signatureMiddleware, deleteCleanupLog);

//查询30天内是否有清洁记录，针对 Server和 Rack类型
router.post('/checkCleanup', authMiddleware, signatureMiddleware, checkNeedCleanup);

export default router;