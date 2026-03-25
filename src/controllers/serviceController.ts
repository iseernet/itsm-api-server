import { Request, Response } from 'express';
import { IssuePayload, IssueQueryPayload } from '../types/issue';
import { addIssue, assigneeIssue, changeIssueStatus, delIssueInfo, getIssueInfo, getIssueList, updateIssue } from '../services/issueService';
import { MaintenanceSystem, OperationPermissions, RelatedSNEnum, ServiceDataEnum } from '../enums/serviceEnum';
import * as serviceModel from '../services/serviceService';
import { ServiceQueryPayload } from '../types/service';

//分页获取Service列表
export const getServices = async (req: Request<{}, {}, {}, ServiceQueryPayload>, res: Response) => {
    try {
        const query = req.query;
        const params: ServiceQueryPayload = {
            pageIndex: query.pageIndex ? parseInt(query.pageIndex as unknown as string) : 1,
            pageSize: query.pageSize ? parseInt(query.pageSize as unknown as string) : 10,
            service_category_id: query.service_category_id ? parseInt(query.service_category_id as unknown as string) : 0,
            name: query.name,
        };

        if (!params.service_category_id) {
            return res.send({ success: false, message: 'service_category_id 必传' });
        }

        const ret = await serviceModel.getServicesByCategory(params);
        return res.send({ success: true, data: ret });
    } catch (error: any) {
        return res.send({ success: false, message: '获取服务列表失败', error: error.message || error });
    }
};

//获取Service列表，无分页
export const getAllServices = async (req: Request, res: Response) => {
    try {
        const ret = await serviceModel.getAllServices();
        return res.send({ success: true, data: ret });
    } catch (error: any) {
        return res.send({ success: false, message: '获取服务失败', error: error.message || error });
    }
};

//获取Service信息
export const getServiceById = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const ret = await serviceModel.getServiceById(id);
        if (!ret) return res.send({ success: false, message: '服务不存在' });
        return res.send({ success: true, data: ret });
    } catch (error: any) {
        return res.send({ success: false, message: '获取服务失败', error: error.message || error });
    }
};

//新增Service
export const createService = async (req: Request, res: Response) => {
    try {
        const ret = await serviceModel.createService(req.body);
        return res.send({ success: true, data: ret });
    } catch (error: any) {
        return res.send({ success: false, message: '创建服务失败', error: error.message || error });
    }
};

//更新service
export const updateService = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const ret = await serviceModel.updateService(id, req.body);
        if (!ret) return res.send({ success: false, message: '服务不存在' });
        return res.send({ success: true, data: ret });
    } catch (error: any) {
        return res.send({ success: false, message: '更新服务失败', error: error.message || error });
    }
};


//删除Service
export const deleteService = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const result = await serviceModel.deleteService(id);

        if (!result.success) {
            return res.send({ success: false, message: result.message });
        }

        return res.send({ success: true });
    } catch (error: any) {
        return res.send({ success: false, message: '删除服务失败', error: error.message || error });
    }
};


//获取Service下拉列表
export const getService = async (req: Request, res: Response) => {

    try {
        const ret = ServiceDataEnum;
        return res.send({
            success: true,
            data: ret
        });
    } catch (error: any) {
        // return res.status(500).json({ message: error.message });
        return res.send({
            success: false,
            message: error.message
        });
    }
};

//获取MaintenanceSystem下拉框数据
export const getMaintenanceSystem = async (req: Request, res: Response) => {

    try {
        const ret = MaintenanceSystem;
        return res.send({
            success: true,
            data: ret
        });
    } catch (error: any) {
        // return res.status(500).json({ message: error.message });
        return res.send({
            success: false,
            message: error.message
        });
    }


};

//获取操作权限
export const getOperationPermissions = async (req: Request, res: Response) => {

    try {
        const ret = OperationPermissions;
        return res.send({
            success: true,
            data: ret
        });
    } catch (error: any) {
        // return res.status(500).json({ message: error.message });
        return res.send({
            success: false,
            message: error.message
        });
    }


};

//获取RelatedSN列表
export const getRelatedSN = async (req: Request, res: Response) => {

    try {
        const ret = RelatedSNEnum;
        return res.send({
            success: true,
            data: ret
        });
    } catch (error: any) {
        // return res.status(500).json({ message: error.message });
        return res.send({
            success: false,
            message: error.message
        });
    }
};










