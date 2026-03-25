import dayjs from "dayjs";
import {getDowntimeRecordByDate, getDowntimeRecordPoint} from "../services/DowntimeRecordService";
import {createSlaDay} from "../services/SlaDayService";
import {SlaDayPayload} from "../types/slaDay";
import utc from 'dayjs/plugin/utc';
dayjs.extend(utc);

function isSameMinute(timeA: any, timeB: any) {
    if (!timeA || !timeB) return false;

    const a = dayjs.utc(timeA).startOf('minute');
    const b = dayjs.utc(timeB).startOf('minute');

    if (!a.isValid() || !b.isValid()) return false;

    return a.isSame(b);
}

export async function calcDowntime(records: any[], startDate: string, endDate: string) {
    const isProdCompensation = process.env.IS_UTC_ADD_16 === 'true';
    const offsetHours = isProdCompensation ? 16 : 8;

    const start = dayjs.utc(startDate).add(offsetHours, 'hour').startOf('day');
    const end = dayjs.utc(endDate).add(offsetHours, 'hour').endOf('day');
    const daysDiff = end.startOf('day').diff(start.startOf('day'), 'day') + 1;
    const result: { date: string; downtime: number; dropped_num: number }[] = [];


    for (let i = 0; i < daysDiff; i++) {
        const dayStart = start.startOf('day').add(i, 'day');
        const dayEnd = dayStart.endOf('day');
        let downtimeHours = 0;
        let downtimeCounts = 0;
        let ids = [];

        for (const record of records) {
            /** 计算所有 downtime 时间段 */
            const ranges: { start: dayjs.Dayjs; end: dayjs.Dayjs }[] = [];

            // 规则 1: fault_start_time 和 fault_end_time 都不为空
            //    Downtime = fault_end_time - fault_start_time
            if (record.fault_start_time && record.fault_end_time) {
                ranges.push({
                    start: dayjs.utc(record.fault_start_time).add(offsetHours, 'hour'),
                    end: dayjs.utc(record.fault_end_time).add(offsetHours, 'hour'),
                });
            } else {
                // 规则 2-1: fault_start_time fault_end_time 任一为空
                //    Downtime1 = response_timestamp - event_create_time
                if (record.response_timestamp && record.event_create_time) {
                    ranges.push({
                        start: dayjs.utc(record.event_create_time).add(offsetHours, 'hour'),
                        end: dayjs.utc(record.response_timestamp).add(offsetHours, 'hour'),
                    });
                }

                // 规则 2-2: Downtime2 = pbd_finish_time - authorization_pass_time
                if (record.pbd_finish_time) {
                    let effectiveStart = record.authorization_pass_time;

                    // 当年月日时分相同（忽略秒），用 response_timestamp 替代 authorization_pass_time
                    if (
                        record.response_timestamp &&
                        record.authorization_pass_time &&
                        isSameMinute(record.response_timestamp, record.authorization_pass_time)
                    ) {
                        effectiveStart = record.response_timestamp;
                    }

                    if (effectiveStart) {
                        ranges.push({
                            start: dayjs.utc(effectiveStart).add(offsetHours, 'hour'),
                            end:   dayjs.utc(record.pbd_finish_time).add(offsetHours, 'hour'),
                        });
                    }
                }
            }

            /** 判断是否命中当天（用于 dropped_num） */
            let hasDowntimeToday  = false;

            for (const range of ranges) {
                if (range.end.isAfter(dayStart) && range.start.isBefore(dayEnd)) {
                    const overlapStart = range.start.isAfter(dayStart)
                        ? range.start
                        : dayStart;
                    const overlapEnd = range.end.isBefore(dayEnd)
                        ? range.end
                        : dayEnd;

                    const diff = overlapEnd.diff(overlapStart, 'hour', true);
                    if (diff > 0) {
                        downtimeHours += diff;
                        hasDowntimeToday  = true;
                    }
                }
            }

            if (hasDowntimeToday ) {
                downtimeCounts++;
                ids.push(record.id);
            }
        }
        console.log(ids);

        result.push({
            date: dayStart.format('YYYY-MM-DD'),
            downtime: downtimeHours,
            dropped_num: downtimeCounts
        });
    }

    return result;
}

async function writeToSlaDay(list: { date: string; downtime: number, dropped_num: number }[]) {

    for (const item of list) {
        const data: SlaDayPayload = {
            date: item.date,
            downtime: item.downtime,
            dropped_num: item.dropped_num
        }
        await createSlaDay(data);
    }
}

export async function fullRefresh() {
    const dataRes = await getDowntimeRecordPoint();
    if (dataRes.length === 0) {
        console.log("[SLA-Day] No downtime records found.");
        return;
    }

    if (!dataRes[0]?.min_date || !dataRes[0]?.max_date) {
        console.log('[SLA-Day] No valid downtime time range.');
        return;
    }

    const startDate = dayjs(dataRes[0].min_date).format('YYYY-MM-DD 00:00:00');
    const endDate = dayjs(dataRes[0].max_date).format('YYYY-MM-DD 23:59:59');

    const records = await getDowntimeRecordByDate(startDate, endDate);
    const list = await calcDowntime(records, startDate, endDate);
    await writeToSlaDay(list);

}

export async function refreshYesterdayAndToday() {

    const today = dayjs();
    const yesterday = today.subtract(1, 'day');

    const startDate = yesterday.format('YYYY-MM-DD 00:00:00');
    const endDate = today.format('YYYY-MM-DD 23:59:59');

    const records = await getDowntimeRecordByDate(startDate, endDate);
    if (records.length === 0) {
        console.log("[SLA-Day] No downtime records found.");
        console.log("[SLA-Day] cron finished.");
        return;
    }
    const list = await calcDowntime(records, startDate, endDate);
    await writeToSlaDay(list);

    console.log("[SLA-Day] cron finished.");

}

export async function refreshRangeDays(startDate: string, endDate: string) {


    const startDate1 = `${startDate} 00:00:00`;
    const endDate1 = `${endDate} 23:59:59`;

    const records = await getDowntimeRecordByDate(startDate1, endDate1);
    if (records.length === 0) {
        console.log("[SLA-Day] No downtime records found.");
        console.log("[SLA-Day] cron finished.");
        return;
    }
    const list = await calcDowntime(records, startDate1, endDate1);
    await writeToSlaDay(list);

    console.log("[SLA-Day] cron finished.");

}
