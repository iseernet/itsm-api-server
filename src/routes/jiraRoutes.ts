// src/routes/jiraRoutes.ts
import express from 'express';
import jiraController from '../controllers/jiraController';
import multer from 'multer';
// import { uploadAttachments } from '../controllers/uploadController';

import { test, list } from '../controllers/jiraController';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });
// 定义 Jira 相关路由

router.post('/test', jiraController.test)
router.post('/list', jiraController.list);

// router.post('/upload-attachments', upload.array('files'), uploadAttachments);


// router.post('/issues', jiraController.createIssue);

// router.post('/test', jiraController.test)
// router.post('/list', jiraController.list);
// router.get('/:issueId', getIssue);
// router.post('/', createIssue);
// router.get('/', getIssues);
// router.get('/:issueId', getIssue);
// router.post('/', createIssue);
// router.get('/issues/:id', jiraController.getIssue);
// router.put('/issues/:id', jiraController.updateIssue);
// router.delete('/issues/:id', jiraController.deleteIssue);
// 添加更多路由...

export default router;