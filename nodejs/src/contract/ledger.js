//
const dbUtil = require("./../db/dbUtil.js");
const dbNN = require("./../db/dbNN.js");
const config = require("./../../config/config.js");
const define = require("./../../config/define.js");
const contractProc = require("./../contract/contractProc.js");
const account = require("./../contract/account.js");
const contractUtil = require("./../contract/contractUtil.js");
const kafkaUtil = require("./../net/kafkaUtil.js");
const util = require("./../utils/commonUtil.js");

//
const logger = require("./../utils/winlog.js");

// Balance
// //
// module.exports.setAccountBalance = async (blk_num, db_key, my_account_num, action, balance) => {
//     // logger.debug("func - setAccountBalance");

//     let balSplit = balance.split('.');
//     let mulNum = Math.pow(10, balSplit[1].length); // 10^x
//     let balanceN = util.calNum(balance, '*', mulNum);
//     // logger.debug("balSplit.length : " + balSplit + ", balSplit[0].length : " + balSplit[0].length + ", balSplit[1].length : " + balSplit[1].length + ", mulNum : " + mulNum);
//     //
//     const conn = await dbUtil.getConn();

//     let insertAccountBalanceQuery = dbNN.querys.account.account_balance.insertAccountBalance;

//     insertAccountBalanceQuery += `(${contractProc.getMySubNetId()}, `;
//     insertAccountBalanceQuery += `${BigInt(util.getDateMS().toString())}, `; // cfmd_tm
//     insertAccountBalanceQuery += `${BigInt(blk_num)}, `; // cfmd_blk_num
//     insertAccountBalanceQuery += `${BigInt(blk_num)}, `; // blk_num
//     insertAccountBalanceQuery += `${BigInt(db_key)}, `;
//     insertAccountBalanceQuery += `${BigInt(my_account_num)}, `;
//     insertAccountBalanceQuery += `${action}, `;
//     insertAccountBalanceQuery += `'${balance}', `;
//     insertAccountBalanceQuery += `${BigInt(balanceN)})`;

//     // logger.debug("insertAccountBalanceQuery : " + insertAccountBalanceQuery);

//     [query_result] = await dbUtil.exeQuery(conn, insertAccountBalanceQuery);

//     await dbUtil.releaseConn(conn);
// }

// //
// module.exports.setAccountBalanceArr = async (accountBalanceArr) => {
//     // logger.debug("func - setAccountBalance");

//     if (accountBalanceArr.length)
//     {
//         //
//         let insertAccountBalanceQuery = dbNN.querys.account.account_balance.insertAccountBalance;
//         await util.asyncForEach(accountBalanceArr, async(element, index) => {
//             let balSplit = element.balance.split('.');
//             let mulNum = Math.pow(10, balSplit[1].length); // 10^x
//             let balanceN = util.calNum(element.balance, '*', mulNum);
//             // logger.debug("balSplit.length : " + balSplit + ", balSplit[0].length : " + balSplit[0].length + ", balSplit[1].length : " + balSplit[1].length + ", mulNum : " + mulNum);

//             insertAccountBalanceQuery += `(${contractProc.getMySubNetId()}, `;
//             insertAccountBalanceQuery += `${BigInt(util.getDateMS().toString())}, `; // cfmd_tm
//             insertAccountBalanceQuery += `${BigInt(element.blk_num)}, `; // cfmd_blk_num
//             insertAccountBalanceQuery += `${BigInt(element.blk_num)}, `; // blk_num
//             insertAccountBalanceQuery += `${BigInt(element.db_key)}, `;
//             insertAccountBalanceQuery += `${BigInt(element.my_account_num)}, `;
//             insertAccountBalanceQuery += `${element.action}, `;
//             insertAccountBalanceQuery += `'${element.balance}', `;
//             insertAccountBalanceQuery += `${BigInt(balanceN)}),`;
//         });

//         insertAccountBalanceQuery = insertAccountBalanceQuery.substr(0, insertAccountBalanceQuery.length - 1);
//         // logger.debug("insertAccountBalanceQuery : " + insertAccountBalanceQuery);

//         //
//         const conn = await dbUtil.getConn();

//         [query_result] = await dbUtil.exeQuery(conn, insertAccountBalanceQuery);

//         await dbUtil.releaseConn(conn);
//     }
// }

//
// module.exports.getAccountBalanceCntByAccountNumAndAction = async (account, action) => {
//     // logger.debug("func - getAccountBalanceCntByAccountNumAndAction");

//     const conn = await dbUtil.getConn();

//     [query_result] = await dbUtil.exeQueryParam(conn, dbNN.querys.account.account_balance.selectCntByAccountNumAndAction, [account, action]);
//     // for(var i = 0; i < query_result.length; i++)
//     // {
//     //     for ( var keyNm in query_result[i])
//     //     {
//     //         if (query_result[i][keyNm])
//     //         {
//     //             logger.debug("keyNm : " + keyNm + ", value : " + query_result[i][keyNm]);
//     //         }
//     //     }
//     // }

//     await dbUtil.releaseConn(conn);

//     return query_result;
// }

// //
// module.exports.getAccountBalanceByAccountNum = async (account) => {
//     // logger.debug("func - getAccountBalanceByAccountNum");

//     const conn = await dbUtil.getConn();

//     [query_result] = await dbUtil.exeQueryParam(conn, dbNN.querys.account.account_balance.selectByAccountNum, [account]);
//     // for(var i = 0; i < query_result.length; i++)
//     // {
//     //     for ( var keyNm in query_result[i])
//     //     {
//     //         if (query_result[i][keyNm])
//     //         {
//     //             logger.debug("keyNm : " + keyNm + ", value : " + query_result[i][keyNm]);
//     //         }
//     //     }
//     // }

//     await dbUtil.releaseConn(conn);

//     return query_result;
// }

// //
// module.exports.getAccountBalanceByAccountNumAndAction = async (account, action) => {
//     // logger.debug("func - getAccountBalanceByAccountNumAndAction");

//     const conn = await dbUtil.getConn();

//     [query_result] = await dbUtil.exeQueryParam(conn, dbNN.querys.account.account_balance.selectByAccountNumAndAction, [account, action]);
//     // for(var i = 0; i < query_result.length; i++)
//     // {
//     //     for ( var keyNm in query_result[i])
//     //     {
//     //         if (query_result[i][keyNm])
//     //         {
//     //             logger.debug("keyNm : " + keyNm + ", value : " + query_result[i][keyNm]);
//     //         }
//     //     }
//     // }

//     await dbUtil.releaseConn(conn);

//     return query_result;
// }

// //
// module.exports.getAccountBalanceBySubNetId = async (subNetId) => {
//     // logger.debug("func - getAccountBalanceBySubNetId");

//     const conn = await dbUtil.getConn();

//     [query_result] = await dbUtil.exeQueryParam(conn, dbNN.querys.account.account_balance.selectBySubNetId, [subNetId]);
//     // logger.debug("query_result.length : " + query_result.length)
//     // for(var i = 0; i < query_result.length; i++)
//     // {
//     //     for ( var keyNm in query_result[i])
//     //     {
//     //         if (query_result[i][keyNm])
//     //         {
//     //             logger.debug("keyNm : " + keyNm + ", value : " + query_result[i][keyNm]);
//     //         }
//     //     }
//     // }

//     await dbUtil.releaseConn(conn);

//     return query_result;
// }

// //
// module.exports.getAccountBalanceByAccountNumAndActionWithMaxBN = async(maxBN, accountNum, action) => {
//     // logger.debug("func - getAccountBalanceByAccountNumAndActionWithMaxBN");

//     // Update Balance
//     query_result = await this.getAccountBalanceByAccountNumAndAction(accountNum, action);
//     // logger.debug("query_result.length : " + query_result.length);
//     if (query_result.length)
//     {
//         aBal = query_result[0];

//         let minBN = BigInt(aBal.cfmd_blk_num);
//         let cfmdBal = aBal.balance;

//         //
//         let splitNum = util.chkDecimalPoint(aBal.balance);
//         let decimal_point = splitNum[1].length;
//         // logger.debug("decimal_point : " + decimal_point);

//         if (minBN > 0)
//         {
//             let uncfmdBal = 0;
//             query_result = await this.selectAccountLedgerAmountList(aBal.my_account_num, aBal.action, minBN, maxBN);

//             await util.asyncForEach(query_result, async(aLedger, index) => {
//                 uncfmdBal = util.calNum(uncfmdBal, '+', aLedger.amount, decimal_point);
//             });
    
//             // logger.debug("get accountNum : " + accountNum + ", action : " + action + ", cfmdBal : " + cfmdBal + ", uncfmdBal : " + uncfmdBal);
    
//             return {action : action, cfmdBal : cfmdBal, uncfmdBal : uncfmdBal};
//         }
//         else
//         {
//             logger.error("Error - minBN");
//         }
//     }
//     else
//     {
//         logger.error("Error - Balance action");
//     }

//     return define.ERR_CODE.ERROR;
// }

// //
// module.exports.updateAccountBalanceV = async (cfmd_tm, cfmd_blk_num, blk_num, db_key, balance, account, action) => {
//     // logger.debug("func - updateAccountBalanceV");

//     //
//     let balSplit = balance.split('.');
//     let mulNum = Math.pow(10, balSplit[1].length); // 10^x
//     let balanceN = util.calNum(balance, '*', mulNum);

//     //
//     const conn = await dbUtil.getConn();

//     let updateAccountBalanceQuery = dbNN.querys.account.account_balance.updateAccountBalance;

//     // logger.debug("updateAccountBalanceQuery : " + updateAccountBalanceQuery);

//     [query_result] = await dbUtil.exeQueryParam(conn, updateAccountBalanceQuery, [cfmd_tm, cfmd_blk_num, blk_num, db_key, balance, balanceN, account, action]);

//     await dbUtil.releaseConn(conn);
// }

// //
// module.exports.updateAccountBalanceSubNetIdV = async(maxBN, gabBN, subNetId) => {
//     // logger.debug("func - updateAccountBalanceSubNetIdV");

//     let cfmd_tm = BigInt(util.getDateMS().toString());

//     // Update Balance
//     let query_result = await this.getAccountBalanceBySubNetId(subNetId);

//     await util.asyncForEach(query_result, async (aBal, index) => {
//         let minBN = BigInt(aBal.cfmd_blk_num);
//         if (!minBN)
//         {
//             minBN = BigInt(aBal.blk_num);
//         }

//         // if ((minBN > 0) && (minBN < maxBN))
//         if ((minBN > 0) && ((minBN + gabBN) < maxBN))
//         {
//             let lastBlkNum = aBal.blk_num;
//             let lastDbKey = aBal.db_key;
//             // let lastCreateTm = aBal.create_tm;
//             //
//             let splitNum = util.chkDecimalPoint(aBal.balance);
//             let decimal_point = splitNum[1].length;
//             // logger.debug("decimal_point : " + decimal_point);

//             let myBal = aBal.balance;

//             // logger.debug("1 update accountNum : " + aBal.my_account_num + ", action : " + aBal.action + ", minBN : " + minBN + ", maxBN : " + maxBN);

//             let query_result_2 = await this.selectAccountLedgerAmountList(aBal.my_account_num, aBal.action, minBN, maxBN);

//             await util.asyncForEach(query_result_2, async(aLedger, index) => {
//                 lastBlkNum = aLedger.blk_num;
//                 lastDbKey = aLedger.db_key;
//                 // lastCreateTm = aLedger.create_tm;
//                 // logger.debug("2 update accountNum : " + aBal.my_account_num + ", action : " + aBal.action + ", index : " + index + ", amount : " + aLedger.amount);
//                 myBal = util.calNum(myBal, '+', aLedger.amount, decimal_point);
//             });
    
//             // logger.debug("3 update accountNum : " + aBal.my_account_num + ", action : " + aBal.action + ", afterBal : " + myBal);
    
//             await this.updateAccountBalanceV(cfmd_tm, maxBN, lastBlkNum, lastDbKey, myBal, aBal.my_account_num, aBal.action);
//         }
//     });
// }

// Ledger
//
module.exports.insertAccountLedger = async (blk_num, db_key, my_account_num, account_num, action, amount) => {
    // logger.debug("func - insertAccountLedger");

    //
    //
    const conn = await dbUtil.getConn();

    let insertAccountLedgerQuery = dbNN.querys.account.account_ledgers.insertAccountLedgers;

    insertAccountLedgerQuery += `(${contractProc.getMySubNetId()}, `;
    insertAccountLedgerQuery += `${BigInt(util.getDateMS().toString())}, `; // create_tm
    insertAccountLedgerQuery += `${BigInt(blk_num)}, `; // blk_num
    insertAccountLedgerQuery += `${BigInt(db_key)}, `;
    insertAccountLedgerQuery += `${BigInt(my_account_num)}, `;
    insertAccountLedgerQuery += `${BigInt(account_num)}, `; // account_num
    insertAccountLedgerQuery += `${action}, `;
    insertAccountLedgerQuery += `'${amount}', `;
    insertAccountLedgerQuery += `'0')`;

    // logger.debug("insertAccountLedgerQuery : " + insertAccountLedgerQuery);

    [query_result] = await dbUtil.exeQuery(conn, insertAccountLedgerQuery);

    await dbUtil.releaseConn(conn);
}

module.exports.selectAccountLedgerAmountList = async (account, action, minBN, maxBN) => {
    // logger.debug("func - selectAccountLedgerAmountList");

    let query_result = new Array();

    if (minBN >= maxBN)
    {
        logger.debug("minBN > maxBN / minBN : " + minBN + ", maxBN : " + maxBN);

        return query_result;
    }

    const conn = await dbUtil.getConn();

    let selectAccountLedger = dbNN.querys.account.account_ledgers.selectByAccountNumAndActionAndBN;

    // logger.debug("selectAccountLedger : " + selectAccountLedger);

    [query_result] = await dbUtil.exeQueryParam(conn, selectAccountLedger, [account, action, minBN, maxBN]);
    // for(var i = 0; i < query_result.length; i++)
    // {
    //     for ( var keyNm in query_result[i])
    //     {
    //         if (query_result[i][keyNm])
    //         {
    //             logger.debug("keyNm : " + keyNm + ", value : " + query_result[i][keyNm]);
    //         }
    //     }
    // }

    await dbUtil.releaseConn(conn);

    return query_result;
}
