const define = require("./../../config/define.js");
const winlog = require("./Winlog.js");
const contract = require("./../contract/Contract.js");

let logoutTimerObjMap = new Map();

const SendTxsSCAToNNA = async (TXLock) => {
    await TXLock.acquire();
    await contract.sendTxArrToNNA();
    await TXLock.release();
}

const SendTxsKafkaWorkerToMaster = async (TXLock) => {
    await TXLock.acquire();
    let tempArray = [...contract.getContractArray()];
    await process.send(tempArray);
    contract.reinitContractArray();
    await TXLock.release();
}

const SendTxsMasterToNNAWorker = async (TXLock, cluster) => {
    await TXLock.acquire();
    let tempArray = [...contract.getContractArray()];
    await cluster.workers[define.CLUSTER_DEFINE.NNA_CLUSTER_WORKER_ID_STR].send(tempArray);
    contract.reinitContractArray();
    await TXLock.release();
}

const LogoutTimerFunc = async (pubkey) => {
    let contractJson = await contract.createTimeoutContract(pubkey);
    let contract_res = await contract.createTx(JSON.stringify(contractJson));
    winlog.info(JSON.stringify(contract_res));
}

module.exports.setContractScheduler = async (cluster, TXLock) => {
    if(cluster.isMaster) 
    {
        setInterval(SendTxsMasterToNNAWorker, define.CLUSTER_DEFINE.SEND_TXS_TO_NNA_INTERVAL, TXLock, cluster);
    }
    else 
    {
        if(cluster.worker.id === define.CLUSTER_DEFINE.NNA_CLUSTER_WORKER_ID)
        {
            setInterval(SendTxsSCAToNNA, define.CLUSTER_DEFINE.SEND_TXS_TO_NNA_INTERVAL, TXLock);
        }
        else
        {
            setInterval(SendTxsKafkaWorkerToMaster, define.CLUSTER_DEFINE.SEND_TXS_TO_NNA_INTERVAL, TXLock);
        }
    }
}

module.exports.setLogoutTimer = (pubkey) => {
    let timerobj = setTimeout(LogoutTimerFunc, define.ACCOUNT_DEFINE.LOGIN_TIMEOUT_MILLI_SEC, pubkey);
    // put timerobj into map (key : pubkey, value : timerobj);
    logoutTimerObjMap.set(pubkey, timerobj);
}

module.exports.delLogoutTimer = (pubkey) => {
    let timerObj = logoutTimerObjMap.get(pubkey);
    logoutTimerObjMap.delete(pubkey);

    // delete timerobj
    clearTimeout(timerObj);
}

module.exports.getLogoutTimerObj = (pubkey) => {
    return logoutTimerObjMap.get(pubkey);
}

module.exports.sleep = (ms) => {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}