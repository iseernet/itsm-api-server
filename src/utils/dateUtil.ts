export class DateUtil {
    static formatForJira(dateTimeStr: string, timeZoneOffset = "+0800"): string {
        // dateTimeStr 格式必须是 "YYYY-MM-DD HH:mm:ss"
        const [datePart, timePart] = dateTimeStr.split(" ");
        if (!datePart || !timePart) throw new Error("Invalid dateTime string");

        return `${datePart}T${timePart}.000${timeZoneOffset}`;
    }


    static formatForJiraAuto(dateTimeStr: string): string {
        const date = new Date(dateTimeStr);
        const pad = (n: number) => (n < 10 ? "0" + n : n);

        // 获取时区偏移（分钟）
        const offsetMinutes = -date.getTimezoneOffset();
        const sign = offsetMinutes >= 0 ? "+" : "-";
        const hours = pad(Math.floor(Math.abs(offsetMinutes) / 60));
        const minutes = pad(Math.abs(offsetMinutes) % 60);

        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T` +
            `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.000` +
            `${sign}${hours}${minutes}`;
    }


    static formatDateForJiraAuto(date: Date): string {
        const pad = (n: number) => (n < 10 ? "0" + n : n);

        const offsetMinutes = -date.getTimezoneOffset(); // getTimezoneOffset 返回的是负值
        const sign = offsetMinutes >= 0 ? "+" : "-";
        const hours = pad(Math.floor(Math.abs(offsetMinutes) / 60));
        const minutes = pad(Math.abs(offsetMinutes) % 60);

        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T` +
            `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.000` +
            `${sign}${hours}${minutes}`;
    }

    static formatDateForJira(date: Date, timeZoneOffset = "+0800"): string {
        const pad = (n: number) => (n < 10 ? "0" + n : n);

        const year = date.getFullYear();
        const month = pad(date.getMonth() + 1); // 0-indexed
        const day = pad(date.getDate());
        const hours = pad(date.getHours());
        const minutes = pad(date.getMinutes());
        const seconds = pad(date.getSeconds());

        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.000${timeZoneOffset}`;
    }

    static toTimestamp(date: string | Date | null | undefined): number {
        if (!date) return NaN;

        // 已经是 Date 对象
        if (date instanceof Date) {
            return date.getTime();
        }

        // 字符串
        const time = Date.parse(date as string);
        return isNaN(time) ? NaN : time;
    }

    static formatAsInstant(timestampSeconds:number) {
        const date = new Date(timestampSeconds * 1000);

        const year   = date.getUTCFullYear();
        const month  = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day    = String(date.getUTCDate()).padStart(2, '0');
        const hour   = String(date.getUTCHours()).padStart(2, '0');
        const minute = String(date.getUTCMinutes()).padStart(2, '0');
        const second = String(date.getUTCSeconds()).padStart(2, '0');

        return `${year}-${month}-${day}T${hour}:${minute}:${second}Z`;
    }
}
