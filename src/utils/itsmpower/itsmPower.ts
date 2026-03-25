import axios from "axios";

const BASE_URL = process.env.ITSM_POWER_BASE_URL;
const token = process.env.ITSM_POWER_TOKEN;

export async function ticketAutoReboot(sn:string, ticketId: string, operator: string) {
    const url = `${BASE_URL}/itsmPower/ticketAutoReboot`;
    const payload = {
        sn: sn,
        ticket_id: ticketId,
        operator: operator
    };
    try {
        const res = await axios.post(
            url,
            payload,
            {
                headers: {
                    'X-API-Key': token,
                    'Content-Type': 'application/json'
                }
            }
        );
        console.log("ticketAutoReboot Response:", res.data);
        return res.data;
    } catch (err) {
        console.error("Ticket Auto Reboot Error:", err);
        throw err;
    }
}

export async function getTicketAutoRebootStatus(ticketId: string) {
    const url = `${BASE_URL}/itsmPower/ticketRebootStatus?ticket_id=${ticketId}`;
    try {
        const res = await axios.get(
            url,
            {
                headers: {
                    'X-API-Key': token,
                }
            }
        );
        console.log("getTicketAutoRebootStatus Response:", res.data);
        return res.data;
    } catch (err) {
        console.error("Get Ticket Auto Reboot Status Error:", err);
        throw err;
    }
}

export async function getDeviceType(sn: string, operator: string) {
    const url = `${BASE_URL}/itsmPower/deviceType?sn=${sn}&operator=${operator}`;
    try {
        const res = await axios.get(
            url,
            {
                headers: {
                    'X-API-Key': token,
                }
            }
        );
        console.log("getDeviceType Response:", res.data);
        return res.data;
    } catch (err) {
        console.error("Get Device Type Error:", err);
        throw err;
    }
}

export async function getRebootingStatus(sn: string) {
    const url = `${BASE_URL}/itsmPower/rebootingStatus?sn=${sn}`;
    try {
        const res = await axios.get(
            url,
            {
                headers: {
                    'X-API-Key': token,
                }
            }
        );
        console.log("getRebootingStatus Response:", res.data);
        return res.data;
    } catch (err) {
        console.error("Get Rebooting Status Error:", err);
        throw err;
    }
}

export async function verifySN(sn: string) {
    const url = `${BASE_URL}/itsmPower/verifySN?sn=${sn}`;
    try {
        const res = await axios.get(
            url,
            {
                headers: {
                    'X-API-Key': token,
                }
            }
        );
        console.log("verifySN Response:", res.data);
        return res.data;
    } catch (err) {
        console.error("Verify SN Error:", err);
        throw err;
    }
}

