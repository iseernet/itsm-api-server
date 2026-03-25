import { Request, Response } from 'express';
import {SlaDayPayload, SlaDayQueryPayload} from "../types/slaDay";
import {createSlaDay, createSlaDayBatch, getSlaDayPage} from "../services/SlaDayService";
import {calcDowntime} from "../cron/slaDayCron";
import {getDowntimeRecordByDate, getDowntimeRecordPoint} from "../services/DowntimeRecordService";
import dayjs from "dayjs";


export const getSlaDayList = async (req: Request<{}, {}, {}, SlaDayQueryPayload>, res: Response) => {
    try {
        const query = req.query;
        const params: SlaDayQueryPayload = {
            pageIndex: query.pageIndex ? parseInt(query.pageIndex as unknown as string) : 1,
            pageSize: query.pageSize ? parseInt(query.pageSize as unknown as string) : 10,
            startDate: query.startDate,
            endDate: query.endDate,
        };

        const ret = await getSlaDayPage(params);
        return res.send({ success: true, data: ret });
    } catch (error: any) {
        return res.send({ success: false, message: 'get sla day fail', error: error.message || error });
    }
};

export const refreshSlaDay = async (req: Request, res: Response) => {
    try {

        const dataRes = await getDowntimeRecordPoint();
        if (dataRes.length === 0) {
            console.log("SLA-Day No downtime records found.");
            return res.send({ success: true });
        }
        const startDate = dayjs(dataRes[0].min_date).format('YYYY-MM-DD 00:00:00');
        const endDate = dayjs(dataRes[0].max_date).format('YYYY-MM-DD 23:59:59');

        const records = await getDowntimeRecordByDate(startDate, endDate);
        const list = await calcDowntime(records, startDate, endDate);
        await createSlaDayBatch(list);
        // const promises = list.map(item => {
        //     const data: SlaDayPayload = {
        //         date: item.date,
        //         downtime: item.downtime,
        //         dropped_num: item.dropped_num
        //     }
        //     return createSlaDay(data);
        // });

        console.log('SLA-Day refresh finished');

        return res.send({ success: true });
    } catch (error: any) {
        return res.send({ success: false, message: 'SLA-Day refresh fail', error: error.message || error });
    }
};








