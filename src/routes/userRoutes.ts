import { Router } from 'express';
import {
    createUser,
    getUsers,
    getUser,
    updateUser,
    deleteUser, updateUserToken
} from '../controllers/userController';
import { authMiddleware } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { signatureMiddleware } from '../middleware/signature';
const router = Router();
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
// ---------------- 用户管理路由 ----------------

// 创建用户
// router.post('/', authMiddleware, createUser);
// 查询用户列表（分页 + 筛选）
router.get('/', authMiddleware, signatureMiddleware, getUsers);
// 获取指定用户信息（通过 key 查询）
router.get('/:key', authMiddleware, signatureMiddleware, getUser);


// 删除用户（通过 username 删除）
router.delete('/:username', authMiddleware, signatureMiddleware, deleteUser);

// 创建用户
router.post(
    '/',
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
    createUser
);

//更新用户信息（通过 username 更新）
router.put('/:username',
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
    updateUser
);

//更新用户信息（通过 username 更新）
router.put('/:username/refreshToken',
    authMiddleware,
    updateUserToken
);

export default router;
