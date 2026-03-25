import { Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { uploadAttachmentsToIssue } from '../services/uploadService';
import multer from 'multer';

//上传附件
export const uploadAttachments = async (req: Request, res: Response) => {

    const { issueIdOrKey } = req.body;
    const files = req.files as Express.Multer.File[];
    const filePaths = files.map((file) => path.resolve(file.path));
    if (!issueIdOrKey) {
        // return res.status(400).json({ error: '缺少 issueIdOrKey 或上传文件' });
        return res.send({
            success: false,
            message: 'idOrKey is missing'
        });
    }

    if (!files || files.length === 0) {
        return res.send({
            success: false,
            message: 'Files is missing'
        });
    }

    try {
        const result = await uploadAttachmentsToIssue((req as any).user, issueIdOrKey, filePaths);

        // 清理临时文件
        // filePaths.forEach((filePath) => fs.unlinkSync(filePath));
        return res.send({
            success: true,
            data: result.data
        });

    } catch (err: any) {
        console.error('上传失败:', err.message);
        // res.status(500).json({ error: err.message });
        return res.send({
            success: false,
            message: err.message
        });
    } finally {
        // 🔐 无论上传成功与否都清理文件
        filePaths.forEach((filePath) => {
            fs.existsSync(filePath) && fs.unlinkSync(filePath);
        });
    }
};
