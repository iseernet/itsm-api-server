import { Request, Response } from 'express';
import { ServiceFaultTypeService } from '../services/serviceFaultTypeService';
import {rnCreateEvent, rnGetFaultType} from "../utils/rn/RNClient";

export class ServiceFaultTypeController {
    static async getAll(req: Request, res: Response) {
        try {
            const result = await ServiceFaultTypeService.getAll(req.query);
            return res.send({
                success: true,
                data: result
            });
        } catch (error: any) {
            console.error('查询 service_fault_type 失败:', error.message);
            return res.send({
                success: false,
                message: error.message
            });
        }
    }

    static async getFromRn(req: Request, res: Response) {
        try {
            const rnResult: any = await rnGetFaultType(null);
            console.log(rnResult.data);
        } catch (error: any) {
            console.error('查询 RN Fault Type 失败:', error.message);
            return res.send({
                success: false,
                message: error.message
            });
        }
    }
}
