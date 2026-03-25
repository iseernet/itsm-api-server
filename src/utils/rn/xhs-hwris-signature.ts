import * as crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config({});

class XhsHwrisSignature {
    private readonly SECRET_ID: string = process.env.RN_API_SECRET_ID || '';
    private readonly SECRET_KEY: string = process.env.RN_API_SECRET_KEY || '';
    private readonly UTF8: BufferEncoding = 'utf8';

    public signCalculate(requestBody: string, queryString: string, httpMethod: string, requestUri: string, timestamp:string, nonce:string): string {
        // 计算 requestBody 的 MD5
        const requestBodyMd5: string = this.md5Hex(requestBody);
        const requestData: string = httpMethod + '\n' + requestUri + '\n' + nonce + '\n' + queryString + '\n' + requestBodyMd5;
        const hashedRequest: string = this.md5Hex(requestData);
        const stringToSign: string = `${timestamp}\n${hashedRequest}`;
        return this.hmacMD5(this.SECRET_KEY, stringToSign);
    }

    private md5Hex(data: string): string {
        const md5Hex = crypto.createHash('md5')
            .update(data, this.UTF8)
            .digest('hex')
            .toLowerCase();
        return md5Hex;
    }

    private hmacMD5(key: string, msg: string): string {
        const hmacMD5 = crypto.createHmac('md5', Buffer.from(key, this.UTF8))
            .update(Buffer.from(msg, this.UTF8))
            .digest('hex')
            .toLowerCase();
        return hmacMD5;
    }
}

export default XhsHwrisSignature;
