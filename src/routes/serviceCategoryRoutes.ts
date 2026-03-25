import { Router } from 'express';
import * as categoryController from '../controllers/serviceCategoryController';
import { authMiddleware } from '../middleware/auth';
import { signatureMiddleware } from '../middleware/signature';

const router = Router();

router.get('/', authMiddleware, signatureMiddleware, categoryController.getAllCategories);
router.get('/:id', authMiddleware, signatureMiddleware, categoryController.getCategoryById);
router.post('/', authMiddleware, signatureMiddleware, categoryController.createCategory);
router.put('/:id', authMiddleware, signatureMiddleware, categoryController.updateCategory);
router.delete('/:id', authMiddleware, signatureMiddleware, categoryController.deleteCategory);

export default router;
