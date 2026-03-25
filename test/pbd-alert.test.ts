import dotenv from 'dotenv';
import {rnGenerateSignature, rnGetFaultType, rnReportPDBIDCIssueState, sortJsonKeys} from "../src/utils/rn/RNClient";
import XhsHwrisSignature from "../src/utils/rn/xhs-hwris-signature";
dotenv.config({});

import {getAlertDetail} from "../src/utils/pbdalert/pbdAlert";

async function getAlert(alarmId:string){
    const res = await getAlertDetail(alarmId);
    if(res.code == 1000){
        console.log(res.data);
    }
    else{
        console.log(res.msg);
    }
}

getAlert("dbfdc8a1-18b2-49fd-a74b-ab659d2a8c52");
