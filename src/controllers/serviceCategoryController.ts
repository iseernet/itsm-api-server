import { Request, Response } from 'express';
import { pool } from '../utils/db/db';
import * as categoryModel from '../services/serviceCategoryService';
import * as serviceModel from '../services/serviceService';

//列表
export const getAllCategories = async (req: Request, res: Response) => {
    try {
        // const tree = req.query.tree === 'true'; // ?tree=true 时返回树形
        const ret = await categoryModel.getAllCategories(true);
        return res.send({ success: true, data: ret });
    } catch (error: any) {
        return res.send({ success: false, message: '获取分类失败', error: error.message || error });
    }
};

//详情
export const getCategoryById = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const ret = await categoryModel.getCategoryById(id);
        if (!ret) return res.send({ success: false, message: '分类不存在' });
        return res.send({ success: true, data: ret });
    } catch (error: any) {
        return res.send({ success: false, message: '获取分类失败', error: error.message || error });
    }
};

//新增
export const createCategory = async (req: Request, res: Response) => {
    try {
        const ret = await categoryModel.createCategory(req.body);
        return res.send({ success: true, data: ret });
    } catch (error: any) {
        return res.send({ success: false, message: '创建分类失败', error: error.message || error });
    }
};

//更新
export const updateCategory = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const ret = await categoryModel.updateCategory(id, req.body);
        if (!ret) return res.send({ success: false, message: '分类不存在' });
        return res.send({ success: true, data: ret });
    } catch (error: any) {
        return res.send({ success: false, message: '更新分类失败', error: error.message || error });
    }
};

//删除
export const deleteCategory = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);

        // 先检查分类下是否有服务
        const relatedServices = await serviceModel.getServicesByCategoryId(id);
        if (relatedServices && relatedServices.length > 0) {
            return res.send({
                success: false,
                message: 'Delete Failed, because there are related data'
            });
        }

        // 再执行删除
        const success = await categoryModel.deleteCategory(id);
        if (!success) {
            return res.send({ success: false, message: '分类不存在' });
        }

        return res.send({ success: true, data: { success: true } });
    } catch (error: any) {
        return res.send({
            success: false,
            message: '删除分类失败',
            error: error.message || error
        });
    }
};

