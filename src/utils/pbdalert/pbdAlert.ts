import FormData from "form-data";
import axios from "axios";

const BASE_URL = process.env.PBD_ALERT_BASE_URL;
const token = process.env.PBD_ALERT_TOKEN;

export async function confirmAlert(alertId:string, acknowledgedBy: string, notes: string) {
    const url = `${BASE_URL}/inner/alertConfirm`;
    const formData = new FormData();
    formData.append("alertId", alertId);
    formData.append("acknowledgedBy", acknowledgedBy);
    formData.append("notes", notes);

    try {
        const res = await axios.post(url, formData, {
            headers: {
                Authorization: `Bearer ${token}`,
                ...formData.getHeaders(),
            },
        });
        console.log("alertConfirm Response:", res.data);
    } catch (err) {
        console.error("Alert Confirm Error:", err);
    }
}

export async function alertRecover(alertId: string) {
    const url = `${BASE_URL}/inner/alertRecover`;
    const formData = new FormData();
    formData.append("alertId", alertId);
    formData.append("recoverSource", "itsm");

    try {
        const res = await axios.post(url, formData, {
            headers: {
                Authorization: `Bearer ${token}`,
                ...formData.getHeaders(),
            },
        });
        console.log("alertRecover Response:", res.data);

        return res.data;
    } catch (error) {
        console.error("Alert Recover Error:", error);
    }

}

export async function getAlertDetail(alertId: string) {
    const url = `${BASE_URL}/inner/alerts?alert_id=${alertId}`;

    try {
        const res:any = await axios.get(url, {
            headers: {
                Authorization: `Bearer ${token}`
            },
        });
        return res.data;
    } catch (error) {
        console.error("Get alert detail Error:", error);
    }

}
