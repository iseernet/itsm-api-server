import { Request, Response } from 'express';
import { SlaRulePayload, SlaRuleQueryPayload } from '../types/slaRule';
import { SlaRuleService } from '../services/slaRuleService';

export const getSlaRules = async (
    req: Request<{}, {}, {}, SlaRuleQueryPayload>,
    res: Response
) => {
    try {
        const query: SlaRuleQueryPayload = {
            ...req.query,
            id: req.query.id ? Number(req.query.id) : undefined,
            responce_time: req.query.responce_time ? Number(req.query.responce_time) : undefined,
            resolve_time: req.query.resolve_time ? Number(req.query.resolve_time) : undefined,
            pageIndex: req.query.pageIndex ? Number(req.query.pageIndex) : undefined,
            pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
        };

        const ret = await SlaRuleService.getAll(query);
        return res.send({ success: true, data: ret });
    } catch (error: any) {
        return res.send({ success: false, message: '获取 SLA 规则失败', error: error.message || error });
    }
};

export const getSlaRuleById = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const ret = await SlaRuleService.getById(id);
        if (!ret) return res.send({ success: false, message: 'SLA 规则不存在' });
        return res.send({ success: true, data: ret });
    } catch (error: any) {
        return res.send({ success: false, message: '获取 SLA 规则失败', error: error.message || error });
    }
};

export const createSlaRule = async (req: Request, res: Response) => {
    try {

        const rule: SlaRulePayload = req.body;
        const loginUser = (req as any).user;
        rule.update_by = loginUser.username;
        const ret = await SlaRuleService.create(rule);
        return res.send({ success: true, data: ret });
    } catch (error: any) {
        return res.send({ success: false, message: '创建 SLA 规则失败', error: error.message || error });
    }
};

export const updateSlaRule = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const loginUser = (req as any).user;
        req.body.update_by = loginUser.username;
        const ret = await SlaRuleService.update(id, req.body);
        if (!ret) return res.send({ success: false, message: 'SLA 规则不存在' });
        return res.send({ success: true, data: ret });
    } catch (error: any) {
        return res.send({ success: false, message: '更新 SLA 规则失败', error: error.message || error });
    }
};

export const deleteSlaRule = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const success = await SlaRuleService.delete(id);
        if (!success) return res.send({ success: false, message: 'SLA 规则不存在' });
        return res.send({ success: true });
    } catch (error: any) {
        return res.send({ success: false, message: '删除 SLA 规则失败', error: error.message || error });
    }
};
