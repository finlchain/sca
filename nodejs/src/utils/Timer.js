//
const contractProc = require("./../contract/contractProc.js");
const myCluster = require("./../cluster.js");

// //////////////////////////////////////////////////
// //
// let timerObjChkBlk = 0;
// let timerObjChkBlkMsInterval = 3000;

// //
// module.exports.setIntervalChkBlk = () => {
//     if (timerObjChkBlk)
//     {
//         return false;
//     }

//     // timerObjChkBlk = setInterval(contractProc.updateAccountBalanceSubNet, timerObjChkBlkMsInterval);

//     return true;
// }

// module.exports.clrIntervalChkBlk = () => {
//     if (!timerObjChkBlk)
//     {
//         return false;
//     }

//     clearInterval(timerObjChkBlk);

//     timerObjChkBlk = 0;

//     return true;
// }
// //////////////////////////////////////////////////

//////////////////////////////////////////////////
//
let timerObjRawTxsArrToNna = 0;
let timerObjRawTxsArrToNnaMsInterval = 50;

//
module.exports.setIntervalRawTxArrToNna = () => {
    if (timerObjRawTxsArrToNna)
    {
        return false;
    }

    timerObjRawTxsArrToNna = setInterval(myCluster.sendRawTxsArrToMaster, timerObjRawTxsArrToNnaMsInterval);

    return true;
}

module.exports.clrIntervalRawTxArrToNna = () => {
    if (!timerObjRawTxsArrToNna)
    {
        return false;
    }

    clearInterval(timerObjRawTxsArrToNna);

    timerObjRawTxsArrToNna = 0;

    return true;
}
//////////////////////////////////////////////////

//////////////////////////////////////////////////
//
let timerObjTxsArrToNna = 0;
let timerObjTxsArrToNnaMsInterval = 50;

//
module.exports.setIntervalTxsArrToNna = () => {
    if (timerObjTxsArrToNna)
    {
        return false;
    }

    timerObjTxsArrToNna = setInterval(myCluster.sendTxsArrToMaster, timerObjTxsArrToNnaMsInterval);

    return true;
}

module.exports.clrIntervalTxsArrToNna = () => {
    if (!timerObjTxsArrToNna)
    {
        return false;
    }

    clearInterval(timerObjTxsArrToNna);

    timerObjTxsArrToNna = 0;

    return true;
}
//////////////////////////////////////////////////

//////////////////////////////////////////////////
//
let timerObjTxArrToDB = 0;
let timerObjTxArrToDBMsInterval = 50;

//
module.exports.setIntervalTxArrToDB = () => {
    if (timerObjTxArrToDB)
    {
        return false;
    }

    timerObjTxArrToDB = setInterval(myCluster.sendNullTxsToMaster, timerObjTxArrToDBMsInterval);

    return true;
}

module.exports.clrIntervalTxArrToDB = () => {
    if (!timerObjTxArrToDB)
    {
        return false;
    }

    clearInterval(timerObjTxArrToDB);

    timerObjTxArrToDB = 0;

    return true;
}
//////////////////////////////////////////////////
