import {IssueCustomfield, IssueStatusMap} from '../../enums/issueEnum';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import {getGroupedServiceFaultTypes} from "../../services/serviceFaultTypeService";
import {getGroupedFinalServiceFaultTypes} from "../../services/serviceFaultTypeFinalService";

dayjs.extend(utc);
dayjs.extend(timezone);

const BEIJING_TZ = 'Asia/Shanghai';

let faultTypeCodeToName: Record<string, string> = {};
export async function initFaultTypeMap() {
    try {
        const grouped = await getGroupedServiceFaultTypes();
        faultTypeCodeToName = {};

        for (const category in grouped) {
            for (const code in grouped[category]) {
                const name = grouped[category][code].name?.trim();
                if (name) {
                    faultTypeCodeToName[code] = name;
                }
            }
        }
    } catch (err) {
        console.error(err);
    }
}

let finalFaultTypeCodeToName: Record<string, string> = {};
export async function initFinalFaultTypeMap() {
    try {
        const grouped = await getGroupedFinalServiceFaultTypes();
        finalFaultTypeCodeToName = {};

        for (const category in grouped) {
            for (const code in grouped[category]) {
                const name = grouped[category][code].name?.trim();
                if (name) {
                    finalFaultTypeCodeToName[code] = name;
                }
            }
        }
    } catch (err) {
        console.error(err);
    }
}

export interface ExportFieldConfig {
    label: string;
    width?: number;
    isDate?: boolean;
    valueGetter: (item: any) => any;
    jiraFieldKey?: string;
}

export const getExportIssuesFieldMap = () : Record<string, ExportFieldConfig> => {
    return {
        issueType: {
            label: 'Issue Type',
            width: 20,
            jiraFieldKey: 'issuetype',
            valueGetter: (item) => item.fields?.issuetype?.name === 'issue' ? 'Event' : item.fields?.issuetype?.name === 'idc' ? 'IDC' : '',
        },
        eventId: {label: 'Event ID', width: 20, jiraFieldKey: 'id', valueGetter: (item) => item.id || '',},
        idcTicketId: {label: 'IDC Ticket ID', width: 20, jiraFieldKey: 'id', valueGetter: (item) => item.id || '',},
        name: {label: 'Name', width: 30, jiraFieldKey: 'summary', valueGetter: (item) => item.fields?.summary || '',},
        description: {
            label: 'Description',
            width: 40,
            jiraFieldKey: 'description',
            valueGetter: (item) => item.fields?.description || '',
        },
        service: {
            label: 'Related Service',
            width: 20,
            jiraFieldKey: IssueCustomfield['service'],
            valueGetter: (item) => item.fields?.service || '',
        },
        priority: {
            label: 'Priority Level',
            width: 15,
            jiraFieldKey: 'priority',
            valueGetter: (item) => item.fields?.priority?.name || '',
        },
        status: {
            label: 'Status', width: 15, jiraFieldKey: 'status',
            valueGetter: (item) => {
                const statusId = item.fields?.status?.id;
                return IssueStatusMap[statusId] || '';
            },
        },
        assignee: {
            label: 'Assignee',
            width: 15,
            jiraFieldKey: 'assignee',
            valueGetter: (item) => item.fields?.assignee?.name || '',
        },
        creator: {
            label: 'Creator',
            width: 15,
            jiraFieldKey: 'creator',
            valueGetter: (item) => item.fields?.creator?.name || '',
        },
        createdAt: {
            label: 'Created At', isDate: true, width: 22, jiraFieldKey: 'created',
            valueGetter: (item) => {
                const raw = item.fields?.created
                if (!raw) return '';

                try {
                    const date = dayjs.utc(raw);
                    if (!date.isValid()) return raw;
                    return date.tz(BEIJING_TZ).format('YYYY-MM-DD HH:mm:ss');
                } catch {
                    return raw;
                }
            },
        },
        attachment: {
            label: 'Attachment', isDate: true, width: 22, jiraFieldKey: 'attachment',
            valueGetter: (item) => {
                const attachments = item.fields?.attachment
                if (!attachments || !Array.isArray(attachments) || attachments.length === 0) {
                    return '';
                }

                return attachments
                    .map(att => `${process.env.PBD_ATTACHMENT_URL}/issue/attachment/${att.id}/${encodeURIComponent(att.filename)}` || '')
                    .join(', ');
            },
        },
        rnFaultId: {
            label: 'RN Fault ID',
            width: 15,
            jiraFieldKey: IssueCustomfield['rn_fault_id'],
            valueGetter: (item) => item.fields?.rn_fault_id || '',
        },
        relatedEvent: {
            label: 'Related Event',
            width: 15,
            jiraFieldKey: IssueCustomfield['relativeIssueId'],
            valueGetter: (item) => item.fields?.relativeIssueId || '',
        },
        serverSN: {
            label: 'Server SN',
            width: 15,
            jiraFieldKey: IssueCustomfield['serverSn'],
            valueGetter: (item) => item.fields?.serverSn || '',
        },
        relatedComponents: {
            label: 'Related Components',
            width: 15,
            jiraFieldKey: IssueCustomfield['relatedComponents'],
            valueGetter: (item) => item.fields?.relatedComponents || '',
        },
        isServerDown: {
            label: 'Is The Server Down ?',
            width: 15,
            jiraFieldKey: IssueCustomfield['isDown'],
            valueGetter: (item) => item.fields?.isDown?.value || '',
        },
        serverFaultType: {
            label: 'Server Fault Type',
            width: 15,
            jiraFieldKey: IssueCustomfield['faultType'],
            valueGetter: (item) => {
                const code = item.fields?.faultType;
                if (!code) return '';

                const name = faultTypeCodeToName[code];
                if (name) {
                    return name;
                }
                return code;
            },
        },
        networkSN: {
            label: 'Network SN',
            width: 15,
            jiraFieldKey: `${IssueCustomfield['networkSn']}`,
            valueGetter: (item) => item.fields?.networkSn || '',
        },
        networkDevice: {
            label: 'Network Device',
            width: 15,
            jiraFieldKey: IssueCustomfield['networkDevice'],
            valueGetter: (item) => item.fields?.networkDevice || '',
        },
        isNetworkEffectServer: {
            label: 'Has the server been affected?',
            width: 15,
            jiraFieldKey: IssueCustomfield['isNetworkEffectServer'],
            valueGetter: (item) => item.fields?.isNetworkEffectServer || '',
        },
        rackId: {
            label: 'Rack Id',
            width: 15,
            jiraFieldKey: IssueCustomfield['rackID'],
            valueGetter: (item) => item.fields?.rackID || '',
        },
        maintenanceOperation: {
            label: 'Maintenance Operation',
            width: 15,
            jiraFieldKey: IssueCustomfield['maintenanceOperation'],
            valueGetter: (item) => item.fields?.maintenanceOperation || '',
        },
        operationPermissions: {
            label: 'Operation Permissions',
            width: 15,
            jiraFieldKey: IssueCustomfield['operationPermissions'],
            valueGetter: (item) => item.fields?.operationPermissions || '',
        },
        newServerSN: {
            label: 'New Server SN',
            width: 15,
            jiraFieldKey: IssueCustomfield['newSn'],
            valueGetter: (item) => item.fields?.newSn || '',
        },
        postmortemFaultType: {
            label: 'Postmortem Fault Type',
            width: 15,
            jiraFieldKey: IssueCustomfield['postmortem_fault_type'],
            valueGetter: (item) => {
                const code = item.fields?.postmortem_fault_type;
                if (!code) return '';

                const name = finalFaultTypeCodeToName[code];
                if (name) {
                    return name;
                }
                return code;
            },
        },
        postmortemMaintenanceOperation: {
            label: 'Postmortem Maintenance Operation',
            width: 15,
            jiraFieldKey: IssueCustomfield['postmortem_maintenance_operation'],
            valueGetter: (item) => item.fields?.postmortem_maintenance_operation || '',
        },
        postmortemIsGpuDown: {
            label: 'Postmortem Service Downtime?',
            width: 15,
            jiraFieldKey: IssueCustomfield['postmortem_is_gpu_down'],
            valueGetter: (item) => {
                const value = item.fields?.postmortem_is_gpu_down;
                if (value === '0') return 'No';
                if (value === '1') return 'Yes';
                return value ?? '';
            },
        },
        postmortemServerSN: {
            label: 'Postmortem Server SN',
            width: 15,
            jiraFieldKey: IssueCustomfield['postmortem_server_sn'],
            valueGetter: (item) => item.fields?.postmortem_server_sn || '',
        },
        responseTime: {
            label: 'Response Time', width: 15, jiraFieldKey: IssueCustomfield['order_response_time'],
            valueGetter: (item) => {
                const raw = item.fields?.order_response_time
                if (!raw) return '';

                return dayjs.unix(raw).tz(BEIJING_TZ).format('YYYY-MM-DD HH:mm:ss');
            },
        },
        authorizationTime: {
            label: 'Authorization Time', width: 15, jiraFieldKey: IssueCustomfield['authorizedAt'],
            valueGetter: (item) => {
                const raw = item.fields?.authorizedAt
                if (!raw) return '';

                return dayjs.unix(raw).tz(BEIJING_TZ).format('YYYY-MM-DD HH:mm:ss');
            },
        },
        postmortemNeedLog: {
            label: 'Need Log',
            width: 15,
            jiraFieldKey: IssueCustomfield['postmortem_need_log'],
            valueGetter: (item) => {
                const value = item.fields?.postmortem_need_log;
                if (value === '0') return 'No';
                if (value === '1') return 'Yes';
                return value ?? '';
            },
        },
        collectLogTime: {
            label: 'Collect Log Time', width: 15, jiraFieldKey: IssueCustomfield['collect_log_time'],
            valueGetter: (item) => {
                const raw = item.fields?.collect_log_time
                if (!raw) return '';

                return dayjs.unix(raw).tz(BEIJING_TZ).format('YYYY-MM-DD HH:mm:ss');
            },
        },
        collectLogUploadImage: {
            label: 'Collect Log Upload Image',
            width: 15,
            jiraFieldKey: IssueCustomfield['collect_log_upload_image'],
            valueGetter: (item) => {
                const raw = item.fields?.collect_log_upload_image
                if (!raw) return '';

                return `${process.env.PBD_ATTACHMENT_URL}${item.fields?.collect_log_upload_image}`;
            },
        },
        pbdFinishTime: {
            label: 'PBD Finish Time', width: 15, jiraFieldKey: IssueCustomfield['pbd_finish_time'],
            valueGetter: (item) => {
                const raw = item.fields?.pbd_finish_time
                if (!raw) return '';

                return dayjs.unix(raw).tz(BEIJING_TZ).format('YYYY-MM-DD HH:mm:ss');
            },
        },
        confirmResolvedTimestamp: {
            label: 'Confirm Resolved Timestamp',
            width: 15,
            jiraFieldKey: IssueCustomfield['confirm_resolved_timestamp'],
            valueGetter: (item) => {
                const raw = item.fields?.confirm_resolved_timestamp
                if (!raw) return '';

                return dayjs.unix(raw).tz(BEIJING_TZ).format('YYYY-MM-DD HH:mm:ss');
            },
        },
        confirmResolvedUploadImage: {
            label: 'Confirm Resolved Upload Image',
            width: 15,
            jiraFieldKey: IssueCustomfield['manual_confirm_resolved_upload_image'],
            valueGetter: (item) => {
                const raw = item.fields?.manual_confirm_resolved_upload_image
                if (!raw) return '';

                return `${process.env.PBD_ATTACHMENT_URL}${item.fields?.manual_confirm_resolved_upload_image}`;
            },
        },
        faultStartTime: {
            label: 'Fault Start Time', width: 15, jiraFieldKey: IssueCustomfield['fault_start_time'],
            valueGetter: (item) => {
                const raw = item.fields?.fault_start_time
                if (!raw) return '';

                return dayjs.unix(raw).tz(BEIJING_TZ).format('YYYY-MM-DD HH:mm:ss');
            },
        },
        faultStartTimeUploadImage: {
            label: 'Fault Start Time Upload Image',
            width: 15,
            jiraFieldKey: IssueCustomfield['fault_start_time_upload_image'],
            valueGetter: (item) => {
                const raw = item.fields?.fault_start_time_upload_image
                if (!raw) return '';

                return `${process.env.PBD_ATTACHMENT_URL}${item.fields?.fault_start_time_upload_image}`;
            },
        },
        faultEndTime: {
            label: 'Fault End Time', width: 15, jiraFieldKey: IssueCustomfield['fault_end_time'],
            valueGetter: (item) => {
                const raw = item.fields?.fault_end_time
                if (!raw) return '';

                return dayjs.unix(raw).tz(BEIJING_TZ).format('YYYY-MM-DD HH:mm:ss');
            },
        },
        faultEndTimeUploadImage: {
            label: 'Fault End Time Upload Image',
            width: 15,
            jiraFieldKey: IssueCustomfield['fault_end_time_upload_image'],
            valueGetter: (item) => {
                const raw = item.fields?.fault_end_time_upload_image
                if (!raw) return '';

                return `${process.env.PBD_ATTACHMENT_URL}${item.fields?.fault_end_time_upload_image}`;
            },
        },
        rnTicketId: {
            label: 'RN Ticket Id',
            width: 15,
            jiraFieldKey: IssueCustomfield['rnTicketId'],
            valueGetter: (item) => item.fields?.rnTicketId || '',
        },
    }
}

export const getAllowedExportKeys = (): string[] => {
    const map = getExportIssuesFieldMap();
    return Object.keys(map);
};
