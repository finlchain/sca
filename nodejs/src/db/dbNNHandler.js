//

//
const config = require("./../../config/config.js");
const define = require("./../../config/define.js");
const util = require('./../utils/commonUtil.js');
const dbUtil = require('./dbUtil.js');
const dbNN = require('./dbNN.js');
const contractProc = require("./../contract/contractProc.js");
const contractChecker = require("./../contract/contractChecker.js");
const contractUtil = require("./../contract/contractUtil.js");
const account_module = require("./../contract/account.js");
const ledger = require("./../contract/ledger.js");
const token = require("./../contract/token.js");
const myCluster = require("./../cluster.js");
const logger = require('./../utils/winlog.js');
const debug = require("./../utils/debug.js");

//
module.exports.setDbKey = async (db_key, subnet_id) => {
    //let ret;
    const conn = await dbUtil.getConn();

    try {
        //
        let sql = dbNN.querys.sc.useSC;
        await conn.query(sql);

        //
        await conn.query(dbNN.querys.sc.DBKeySet, [db_key]);

    } catch (err) {
        debug.error(err);
    }
    
    await dbUtil.releaseConn(conn);
}

//
module.exports.selectDbKeyFromBlkTxs = async (BN) => {
    const conn = await dbUtil.getConn();
    // await exeQuery(conn, dbNN.querys.block.useBlock);

    [query_result] = await dbUtil.exeQueryParam(conn, dbNN.querys.block.blk_txs.selectDbKeyBlkTxs, [BN]);

    let dbKey = new Array();

    for(var i = 0; i < query_result.length; i++)
    {
        for ( var keyNm in query_result[i])
        {
            if (query_result[i][keyNm])
            {
                dbKey.push(query_result[i][keyNm]);
            }
        }
    }

    // logger.debug("dbKey : " + dbKey);

    await dbUtil.releaseConn(conn);

    return dbKey;
}

//
module.exports.selectMaxBlkNumFromBlkContents = async () => {
    const conn = await dbUtil.getConn();
    // await exeQuery(conn, dbNN.querys.block.useBlock);

    [query_result] = await dbUtil.exeQuery(conn, dbNN.querys.block.blk_contents.selectLastBlkNumBlkContents);

    let lastBN = '0';

    if (query_result.length)
    {
        if (query_result[0].max_blk_num !== null)
        {
            lastBN = query_result[0].max_blk_num;
        }
    }

    // for(var i = 0; i < query_result.length; i++)
    // {
    //     for ( var keyNm in query_result[i])
    //     {
    //         logger.debug("query_result[i][keyNm] : [" + i +"] " + keyNm + " - " + query_result[i][keyNm]);
    //         if (query_result[i][keyNm])
    //         {
    //             lastBN = query_result[i][keyNm];
    //         }
    //     }
    // }

    logger.debug("lastBN : " + lastBN);

    await dbUtil.releaseConn(conn);

    return lastBN;
}

//
module.exports.getScContentsByFromAccount = async (fromAccount) => {
    const conn = await dbUtil.getConn();
    // await dbUtil.exeQuery(conn, dbNN.querys.sc.useSC);

    let selectLastAccount = dbNN.querys.sc.sc_contents.selectByFromAccount;

    // logger.debug("selectLastAccount : " + selectLastAccount);

    [query_result] = await dbUtil.exeQueryParam(conn, selectLastAccount, [fromAccount]);
    // for(var i = 0; i < query_result.length; i++)
    // {
    //     for ( var keyNm in query_result[i])
    //     {
    //         //if (query_result[i][keyNm])
    //         {
    //             logger.debug("keyNm : " + keyNm + ", value : " + query_result[i][keyNm]);
    //         }
    //     }
    // }

    await dbUtil.releaseConn(conn);

    return query_result;
}

//
module.exports.selectAccountFromScContents = async (fromAccount) => {
    const conn = await dbUtil.getConn();
    // await dbUtil.exeQuery(conn, dbNN.querys.sc.useSC);

    let selectLastAccount = dbNN.querys.sc.sc_contents.selectByFromAccountAndCreateTm;

    // logger.debug("selectLastAccount : " + selectLastAccount);

    [query_result] = await dbUtil.exeQueryParam(conn, selectLastAccount, [fromAccount]);
    // for(var i = 0; i < query_result.length; i++)
    // {
    //     for ( var keyNm in query_result[i])
    //     {
    //         //if (query_result[i][keyNm])
    //         {
    //             logger.debug("keyNm : " + keyNm + ", value : " + query_result[i][keyNm]);
    //         }
    //     }
    // }

    await dbUtil.releaseConn(conn);

    return query_result;
}

//
module.exports.selectFromScContentsWithDbKey = async (minDbKey, maxDbKey) => {
    const conn = await dbUtil.getConn();
    // await dbUtil.exeQuery(conn, dbNN.querys.sc.useSC);

    // let selectScContents = `SELECT signed_pubkey, confirmed, from_account, to_account, action, amount, err_code `
    // selectScContents += ` FROM sc.sc_contents WHERE ${minDbKey} <= db_key and db_key <= ${maxDbKey}`;

    // // logger.debug("selecScContents : " + selectScContents);

    // [query_result] = await dbUtil.exeQuery(conn, selectScContents);

    let selectScContents = dbNN.querys.sc.sc_contents.selectByDbKey;
    [query_result] = await dbUtil.exeQueryParam(conn, selectScContents, [minDbKey, maxDbKey]);
    // for(var i = 0; i < query_result.length; i++)
    // {
    //     for ( var keyNm in query_result[i])
    //     {
    //         //if (query_result[i][keyNm])
    //         {
    //             logger.debug("keyNm : " + keyNm + ", value : " + query_result[i][keyNm]);
    //         }
    //     }
    // }

    await dbUtil.releaseConn(conn);

    return query_result;
}

//
module.exports.updateScContentsWhereDbKey = async (minDbKey, maxDbKey, BN) => {
    const conn = await dbUtil.getConn();
    // await exeQuery(conn, dbNN.querys.sc.useSC);

    let updateScContents =dbNN.querys.sc.sc_contents.updateConfirmed;
    logger.debug("updateScContents : " + updateScContents);
    [query_result] = await dbUtil.exeQueryParam(conn, updateScContents, [minDbKey, maxDbKey]);

    // let updateScContents = `UPDATE IGNORE sc_contents SET blk_num = ${BN} WHERE ${minDbKey} <= db_key and db_key <= ${maxDbKey}`;
    // logger.debug("updateScContents : " + updateScContents);

    // [query_result] = await dbUtil.exeQuery(conn, updateScContents);

    await dbUtil.releaseConn(conn);
}

//
module.exports.updateAccountsBlkNumWhereDbKey = async (minDbKey, maxDbKey, BN) => {
    const conn = await dbUtil.getConn();
    // await exeQuery(conn, dbNN.querys.account.useAccount);

    // // account_tokens
    // let updateBlkNum = dbNN.querys.account.account_tokens.updateBlkNumByDbKey;
    // // logger.debug("1 updateBlkNum : " + updateBlkNum);
    // [query_result] = await dbUtil.exeQueryParam(conn, updateBlkNum, [BN, minDbKey, maxDbKey]);

    // // account_users
    // updateBlkNum = dbNN.querys.account.account_users.updateBlkNumByDbKey;
    // // logger.debug("2 updateBlkNum : " + updateBlkNum);
    // [query_result] = await dbUtil.exeQueryParam(conn, updateBlkNum, [BN, minDbKey, maxDbKey]);

    // account_ledgers
    updateBlkNum = dbNN.querys.account.account_ledgers.updateBlkNumByDbKey;
    // logger.debug("3 updateBlkNum : " + updateBlkNum);
    [query_result] = await dbUtil.exeQueryParam(conn, updateBlkNum, [BN, minDbKey, maxDbKey]);

    // // account_balance
    // updateBlkNum = dbNN.querys.account.account_balance.updateBlkNumByDbKey;
    // // logger.debug("4 updateBlkNum : " + updateBlkNum);
    // [query_result] = await dbUtil.exeQueryParam(conn, updateBlkNum, [BN, minDbKey, maxDbKey]);

    // // account_sc
    // updateBlkNum = dbNN.querys.account.account_sc.updateBlkNumByDbKey;
    // // logger.debug("5 updateBlkNum : " + updateBlkNum);
    // [query_result] = await dbUtil.exeQueryParam(conn, updateBlkNum, [BN, minDbKey, maxDbKey]);

    await dbUtil.releaseConn(conn);
}

//
module.exports.insertBlkTxsV = async (txArray) => {
    const conn = await dbUtil.getConn();
    // await dbUtil.exeQuery(conn, dbNN.querys.block.useBlock);

    let insertBlkTxsQuery = dbNN.querys.block.blk_txs.insertBlkTxs;
    //
    await util.asyncForEach(txArray, async(element, index) => {
        insertBlkTxsQuery += `(${contractProc.getMySubNetId()}, ${BigInt(0)}, ${BigInt(element.db_key)}, "${element.sc_hash}"),`;
    });

    insertBlkTxsQuery = insertBlkTxsQuery.substr(0, insertBlkTxsQuery.length - 1);

    [query_result] = await dbUtil.exeQuery(conn, insertBlkTxsQuery);

    await dbUtil.releaseConn(conn);
}

//
module.exports.accountLegerCheck = async (account_num, action) => {
    const conn = await dbUtil.getConn();

    // logger.debug("accountLegerCheck - account_num : " + account_num + ", action : " + action);
    [query_result] = await dbUtil.exeQueryParam(conn, dbNN.querys.account.account_ledgers.selectAccountLegers, [action, account_num]);

    await dbUtil.releaseConn(conn);

    return query_result;
}

//
module.exports.setAccountLedgers = async (create_tm, db_key, my_account_num, action, amount, balance) => {
    //
    const conn = await dbUtil.getConn();

    let insertAccountLedgerQuery = dbNN.querys.account.account_ledgers.insertAccountLedgers;

    insertAccountLedgerQuery += `(${contractProc.getMySubNetId()}, `;
    insertAccountLedgerQuery += `${BigInt(create_tm)}, `; // create_tm
    insertAccountLedgerQuery += `${BigInt(0)}, `; // blk_num
    insertAccountLedgerQuery += `${BigInt(db_key)}, `;
    insertAccountLedgerQuery += `${BigInt(my_account_num)}, `;
    insertAccountLedgerQuery += `${BigInt(0)}, `; // account_num
    insertAccountLedgerQuery += `${action}, `;
    insertAccountLedgerQuery += `'${amount}', `;
    insertAccountLedgerQuery += `'${balance}')`;

    // logger.debug("insertAccountLedgerQuery : " + insertAccountLedgerQuery);

    [query_result] = await dbUtil.exeQuery(conn, insertAccountLedgerQuery);

    await dbUtil.releaseConn(conn);
}

//
module.exports.setAccountLedgersArr = async (accountLedgerArray) => {
    //
    if (accountLedgerArray.length)
    {
        let insertAccountLedgerQuery = dbNN.querys.account.account_ledgers.insertAccountLedgers;

        await util.asyncForEach(accountLedgerArray, async(element, index) => {
            insertAccountLedgerQuery += `(${contractProc.getMySubNetId()}, `;
            insertAccountLedgerQuery += `${BigInt(element.create_tm)}, `; // create_tm
            insertAccountLedgerQuery += `${BigInt(0)}, `; // blk_num
            insertAccountLedgerQuery += `${BigInt(element.db_key)}, `;
            insertAccountLedgerQuery += `${BigInt(element.my_account_num)}, `;
            insertAccountLedgerQuery += `${BigInt(0)}, `; // account_num
            insertAccountLedgerQuery += `${element.action}, `;
            insertAccountLedgerQuery += `'${element.amount}', `;
            insertAccountLedgerQuery += `${element.balance}),`;
        });

        insertAccountLedgerQuery = insertAccountLedgerQuery.substr(0, insertAccountLedgerQuery.length - 1);
        // logger.debug("insertAccountLedgerQuery : " + insertAccountLedgerQuery);

        const conn = await dbUtil.getConn();

        [query_result] = await dbUtil.exeQuery(conn, insertAccountLedgerQuery);

        await dbUtil.releaseConn(conn);
    }
}

//
module.exports.insertAccountSecLedger = async (secLedgerArray) => {
    let blk_num = 0;
    let fromAccountInt;
    let toAccountInt;
    let action;

    //
    const conn = await dbUtil.getConn();
    // await dbUtil.exeQuery(conn, dbNN.querys.account.useAccount);
    
    // //
    // let accountBalanceArr = new Array();

    //
    let insertAccountLedgerQuery = dbNN.querys.account.account_ledgers.insertAccountLedgers;
    //
    await util.asyncForEach(secLedgerArray, async(element, index) => {
        contractJson = element['contractJson'];

        //
        fromAccountInt = util.hexStrToBigInt(contractJson.from_account);
        toAccountInt = util.hexStrToBigInt(contractJson.to_account);

        //
        if (contractJson.action === define.CONTRACT_DEFINE.ACTIONS.CONTRACT.DEFAULT.TOKEN_TX)
        {
            action = contractJson.contents.action;
        }
        else // (contractJson.action === define.CONTRACT_DEFINE.ACTIONS.SECURITY_TOKEN)
        {
            action = contractJson.action;
        }

        // To Account Ledger Balance
        let tBalVal = contractJson.contents.amount;
        let tAccountLeger = await this.accountLegerCheck(toAccountInt, action);
        if (tAccountLeger.length)
        {
            //
            let splitNum = util.chkDecimalPoint(tAccountLeger[0].balance);
            let decimal_point = splitNum[1].length;
            // logger.debug("decimal_point : " + decimal_point);

            tBalVal = util.calNum(tAccountLeger[0].balance, '+', contractJson.contents.amount, decimal_point);
            if (tBalVal === define.ERR_CODE.ERROR)
            {
                tBalVal = tAccountLeger[0].balance; // ?????????????
            }
        }
        
        // Account Ledger
        if (contractJson.from_account === define.CONTRACT_DEFINE.SEC_TOKEN_ACCOUNT)
        { // Distributted by Security Token Account
            // Update Token Market Supply
            await token.updateAccountTokenMS('+', contractJson.contents.amount, action);

            //
            insertAccountLedgerQuery += `(${contractProc.getMySubNetId()}, `;
            insertAccountLedgerQuery += `${BigInt(contractJson.create_tm)}, `; // create_tm
            insertAccountLedgerQuery += `${BigInt(blk_num)}, `; // blk_num
            insertAccountLedgerQuery += `${BigInt(element.db_key)}, `;
            insertAccountLedgerQuery += `${BigInt(toAccountInt)}, `;
            insertAccountLedgerQuery += `${BigInt(fromAccountInt)}, `;
            insertAccountLedgerQuery += `${action}, `;
            insertAccountLedgerQuery += `'${contractJson.contents.amount}', `;
            insertAccountLedgerQuery += `'${tBalVal}'),`;
        }
        else
        {
            // From Account Ledger Balance
            let fBalVal = contractJson.contents.amount;
            let fAccountLeger = await this.accountLegerCheck(fromAccountInt, action);
            if (fAccountLeger.length)
            {
                //
                logger.debug("fAccountLeger : " + JSON.stringify(fAccountLeger));
                logger.debug("fAccountLeger.balance : " + fAccountLeger[0].balance);
                let splitNum = util.chkDecimalPoint(fAccountLeger[0].balance);
                let decimal_point = splitNum[1].length;
                // logger.debug("decimal_point : " + decimal_point);
    
                fBalVal = util.calNum(fAccountLeger[0].balance, '-', contractJson.contents.amount, decimal_point);
                if (fBalVal === define.ERR_CODE.ERROR)
                {
                    fBalVal = fAccountLeger[0].balance; // ?????????????
                }
            }

            // From Account
            insertAccountLedgerQuery += `(${contractProc.getMySubNetId()}, `;
            insertAccountLedgerQuery += `${BigInt(contractJson.create_tm)}, `; // create_tm
            insertAccountLedgerQuery += `${BigInt(blk_num)}, `; // blk_num
            insertAccountLedgerQuery += `${BigInt(element.db_key)}, `;
            insertAccountLedgerQuery += `${BigInt(fromAccountInt)}, `;
            insertAccountLedgerQuery += `${BigInt(toAccountInt)}, `;
            insertAccountLedgerQuery += `${action}, `;
            insertAccountLedgerQuery += `'-${contractJson.contents.amount}', `;
            insertAccountLedgerQuery += `'${fBalVal}'),`;

            // To Account
            insertAccountLedgerQuery += `(${contractProc.getMySubNetId()}, `;
            insertAccountLedgerQuery += `${BigInt(contractJson.create_tm)}, `; // create_tm
            insertAccountLedgerQuery += `${BigInt(blk_num)}, `; // blk_num
            insertAccountLedgerQuery += `${BigInt(element.db_key)}, `;
            insertAccountLedgerQuery += `${BigInt(toAccountInt)}, `;
            insertAccountLedgerQuery += `${BigInt(fromAccountInt)}, `;
            insertAccountLedgerQuery += `${action}, `;
            insertAccountLedgerQuery += `'${contractJson.contents.amount}', `;
            insertAccountLedgerQuery += `'${tBalVal}'),`;
        }

        // // Account Balance Init
        // let query_result = await ledger.getAccountBalanceByAccountNumAndAction(toAccountInt, action);
        // // logger.debug("insertAccountSecLedger - query_result.length : " + query_result.length);
        // if (!query_result.length)
        // {
        //     // await ledger.setAccountBalance(blk_num, element.db_key, toAccountInt, action, contractJson.contents.amount);
        //     accountBalanceArr.push({blk_num : blk_num, db_key : element.db_key, my_account_num : toAccountInt, action : action, balance : contractJson.contents.amount});
        // }
    });

    insertAccountLedgerQuery = insertAccountLedgerQuery.substr(0, insertAccountLedgerQuery.length - 1);
    // logger.debug("insertAccountLedgerQuery : " + insertAccountLedgerQuery);

    [query_result] = await dbUtil.exeQuery(conn, insertAccountLedgerQuery);

    // //
    // await ledger.setAccountBalanceArr(accountBalanceArr);

    await dbUtil.releaseConn(conn);
}

//
module.exports.insertAccountUtilLedger = async (utiLedgerArray) => {
    let blk_num = 0;
    // let createTmInt;
    let fromAccountInt;
    let toAccountInt;
    let action;

    //
    const conn = await dbUtil.getConn();
    // await exeQuery(conn, dbNN.querys.account.useAccount);
    
    // //
    // let accountBalanceArr = new Array();

    //
    let insertAccountLedgerQuery = dbNN.querys.account.account_ledgers.insertAccountLedgers;
    //
    await util.asyncForEach(utiLedgerArray, async(element, index) => {
        contractJson = element['contractJson'];

        fromAccountInt = util.hexStrToBigInt(contractJson.from_account);
        toAccountInt = util.hexStrToBigInt(contractJson.contents.dst_account);

        if (contractJson.action === define.CONTRACT_DEFINE.ACTIONS.CONTRACT.DEFAULT.TOKEN_TX)
        {
            action = contractJson.contents.action;
        }
        else // (contractJson.action <= define.CONTRACT_DEFINE.ACTIONS.UTILITY_TOKEN_MAX)
        {
            action = contractJson.action;
        }

        //
        if(contractChecker.chkAccountDelimiter(contractJson.from_account) === define.CONTRACT_DEFINE.ACCOUNT_TOKEN_DELI)
        {
            await token.updateAccountTokenMS('+', contractJson.contents.amount, action);
        }

        // From Account Ledger Balance
        let fBalVal = contractJson.contents.amount;
        let fAccountLeger = await this.accountLegerCheck(fromAccountInt, action);
        if (fAccountLeger.length)
        {
            //
            let splitNum = util.chkDecimalPoint(fAccountLeger[0].balance);
            let decimal_point = splitNum[1].length;
            // logger.debug("decimal_point : " + decimal_point);

            fBalVal = util.calNum(fAccountLeger[0].balance, '-', contractJson.contents.amount, decimal_point);
            if (fBalVal === define.ERR_CODE.ERROR)
            {
                fBalVal = fAccountLeger[0].balance; // ?????????????
            }
        }

        // To Account Ledger Balance
        let tBalVal = contractJson.contents.amount;
        let tAccountLeger = await this.accountLegerCheck(toAccountInt, action);
        if (tAccountLeger.length)
        {
            //
            let splitNum = util.chkDecimalPoint(tAccountLeger[0].balance);
            let decimal_point = splitNum[1].length;
            // logger.debug("decimal_point : " + decimal_point);

            tBalVal = util.calNum(tAccountLeger[0].balance, '+', contractJson.contents.amount, decimal_point);
            if (tBalVal === define.ERR_CODE.ERROR)
            {
                tBalVal = tAccountLeger[0].balance; // ?????????????
            }
        }

        // Account Ledger
        // From Account
        insertAccountLedgerQuery += `(${contractProc.getMySubNetId()}, `;
        insertAccountLedgerQuery += `${BigInt(contractJson.create_tm)}, `; // create_tm
        insertAccountLedgerQuery += `${BigInt(blk_num)}, `; // blk_num
        insertAccountLedgerQuery += `${BigInt(element.db_key)}, `;
        insertAccountLedgerQuery += `${BigInt(fromAccountInt)}, `;
        insertAccountLedgerQuery += `${BigInt(toAccountInt)}, `;
        insertAccountLedgerQuery += `${action}, `;
        insertAccountLedgerQuery += `'-${contractJson.contents.amount}', `;
        insertAccountLedgerQuery += `'${fBalVal}'),`;

        // To Account
        insertAccountLedgerQuery += `(${contractProc.getMySubNetId()}, `;
        insertAccountLedgerQuery += `${BigInt(contractJson.create_tm)}, `; // create_tm
        insertAccountLedgerQuery += `${BigInt(blk_num)}, `; // blk_num
        insertAccountLedgerQuery += `${BigInt(element.db_key)}, `;
        insertAccountLedgerQuery += `${BigInt(toAccountInt)}, `;
        insertAccountLedgerQuery += `${BigInt(fromAccountInt)}, `;
        insertAccountLedgerQuery += `${action}, `;
        insertAccountLedgerQuery += `'${contractJson.contents.amount}', `;
        insertAccountLedgerQuery += `'${tBalVal}'),`;

        // // Account Balance Init - TODO : Multi-Input
        // let query_result = await ledger.getAccountBalanceByAccountNumAndAction(toAccountInt, action);
        // logger.debug("insertAccountUtilLedger query_result.length : " + query_result.length);
        // if (!query_result.length)
        // {
        //     // await ledger.setAccountBalance(blk_num, element.db_key, toAccountInt, action, contractJson.contents.amount);
        //     accountBalanceArr.push({blk_num : blk_num, db_key : element.db_key, my_account_num : toAccountInt, action : action, balance : contractJson.contents.amount});
        // }
    });

    insertAccountLedgerQuery = insertAccountLedgerQuery.substr(0, insertAccountLedgerQuery.length - 1);
    // logger.debug("insertAccountLedgerQuery : " + insertAccountLedgerQuery);

    [query_result] = await dbUtil.exeQuery(conn, insertAccountLedgerQuery);

    // //
    // await ledger.setAccountBalanceArr(accountBalanceArr);

    await dbUtil.releaseConn(conn);
}

//
module.exports.accountTokenCheck = async (tAction, tName, tSymbol) => {
    logger.debug("tAction : " + tAction + ", tName : " + tName + ", tSymbol : " + tSymbol);
    if ((typeof tAction !== 'undefined') && (typeof tName !== 'undefined') && (typeof tSymbol !== 'undefined'))
    {
        const conn = await dbUtil.getConn();
        [query_result] = await dbUtil.exeQueryParam(conn, dbNN.querys.account.account_tokens.selectAccountTokenTNS, [tAction, tName, tSymbol]);
        await dbUtil.releaseConn(conn);

        return query_result;
    }
    else if (typeof tAction !== 'undefined')
    {
        const conn = await dbUtil.getConn();
        [query_result] = await dbUtil.exeQueryParam(conn, dbNN.querys.account.account_tokens.selectAccountTokenT, [tAction]);
        await dbUtil.releaseConn(conn);

        return query_result;
    }

    logger.error("Error - accountTokenCheck");

    return query_result;
}

module.exports.accountTokenKeyCheck = async (owner_pk, super_pk) => {
    const conn = await dbUtil.getConn();

    [query_result] = await dbUtil.exeQueryParam(conn, dbNN.querys.account.account_tokens.selectAccountTokenKey, [owner_pk, owner_pk, super_pk, super_pk]);
    await dbUtil.releaseConn(conn);

    return query_result;
}

module.exports.accountTokenAccountCheck = async (account) => {
    const conn = await dbUtil.getConn();

    [query_result] = await dbUtil.exeQueryParam(conn, dbNN.querys.account.account_tokens.selectAccountTokenAccount, [account]);
    await dbUtil.releaseConn(conn);

    return query_result;
}

module.exports.insertAccountTokensV = async (tokenArray) => {
    // logger.debug("func - insertAccountTokensV");

    let cnt = 0;

    let blk_num = 0;
    let insertAccountTokenQuery = dbNN.querys.account.account_tokens.insertAccountTokens;

    //
    let accountBalanceArr = new Array();
    let accountLedgerArr = new Array();

    //
    await util.asyncForEach(tokenArray, async(element, index) => {
        contractJson = element['contractJson'];

        // let token_result = await this.accountTokenCheck(contractJson.contents.action);//, contractJson.contents.name, contractJson.contents.symbol);
        // let already_existed = token_result.length;
        let already_existed = false;
        if (!already_existed)
        {
            let my_account_num = util.hexStrToBigInt(contractJson.to_account);
            //
            if (!my_account_num)
            {
                my_account_num = util.hexStrToBigInt(account_module.createTokenAccountCode(contractJson.contents.action));
            }
            
            // logger.debug("my_account_num : " + my_account_num + ", Bigint1 : " + BigInt(util.hexStrToBigInt(my_account_num)) + ", Bigint2 : " + BigInt(util.hexStrToBigInt(my_account_num)));
            
            insertAccountTokenQuery += `(${contractProc.getMySubNetId()}, `;
            insertAccountTokenQuery += `${BigInt(element.revision)}, `;
            insertAccountTokenQuery += `${BigInt(contractJson.create_tm)}, `; // create_tm
            insertAccountTokenQuery += `${BigInt(blk_num)}, `; // blk_num
            insertAccountTokenQuery += `${BigInt(element.db_key)}, `;
            insertAccountTokenQuery += `'${contractJson.contents.owner_pk}', `;
            insertAccountTokenQuery += `'${contractJson.contents.super_pk}', `;
            insertAccountTokenQuery += `${BigInt(my_account_num)}, `; // TODO : account_num
            insertAccountTokenQuery += `${contractJson.contents.action}, `;
            insertAccountTokenQuery += `'${contractJson.contents.name}', `;
            insertAccountTokenQuery += `'${contractJson.contents.symbol}', `;
            insertAccountTokenQuery += `'${contractJson.contents.total_supply}', `;
            insertAccountTokenQuery += `${element.market_supply}, `;
            insertAccountTokenQuery += `${contractJson.contents.decimal_point}, `;
            insertAccountTokenQuery += `${BigInt(contractJson.contents.lock_time_from)}, `;
            insertAccountTokenQuery += `${BigInt(contractJson.contents.lock_time_to)}, `;
            insertAccountTokenQuery += `${contractJson.contents.lock_transfer}, `;
            insertAccountTokenQuery += `'${contractJson.contents.black_list}', `;
            insertAccountTokenQuery += `'${contractJson.contents.functions}'),`;

            if (contractJson.contents.action !== define.CONTRACT_DEFINE.ACTIONS.TOKEN.SECURITY_TOKEN)
            {
                // 
                let query_result = await this.accountLegerCheck(my_account_num, contractJson.contents.action);
                if (!query_result.length)
                {
                    await this.setAccountLedgers(contractJson.create_tm, element.db_key, my_account_num, contractJson.contents.action, contractJson.contents.total_supply, contractJson.contents.total_supply);
                }

                // // Account Balance Init
                // let query_result = await ledger.getAccountBalanceByAccountNumAndAction(my_account_num, contractJson.contents.action);
                // // let query_result = await ledger.getAccountBalanceByAccountNum(my_account_num);
                // // // logger.error("getAccountBalanceByAccountNumAndAction - query_result.length : " + query_result.length);
                // if (!query_result.length)
                // {
                //     accountBalanceArr.push({blk_num : blk_num, db_key : element.db_key, my_account_num : my_account_num, action : contractJson.contents.action, balance : contractJson.contents.total_supply});
                //     accountLedgerArr.push({create_tm : contractJson.create_tm, db_key : element.db_key, my_account_num : my_account_num, action : contractJson.contents.action, amount : contractJson.contents.total_supply, balance : contractJson.contents.total_supply});
                //     // await ledger.setAccountBalance(blk_num, element.db_key, my_account_num, contractJson.contents.action, contractJson.contents.total_supply);
                //     // await this.setAccountLedgers(contractJson.create_tm, element.db_key, my_account_num, contractJson.contents.action, contractJson.contents.total_supply, contractJson.contents.total_supply);
                // }
                // else
                // {
                //     // logger.error("Error - insertAccountTokensV : Duplicated");
                //     logger.error("Error - Duplicated, my_account_num : " + my_account_num + ", action : " + contractJson.contents.action);
                // }
            }

            cnt++;
        }
    });

    // //
    // await ledger.setAccountBalanceArr(accountBalanceArr);

    //
    await this.setAccountLedgersArr(accountLedgerArr);

    if (cnt)
    {
        const conn = await dbUtil.getConn();

        insertAccountTokenQuery = insertAccountTokenQuery.substr(0, insertAccountTokenQuery.length - 1);
        // logger.debug("insertAccountTokenQuery : " + insertAccountTokenQuery);

        [query_result] = await dbUtil.exeQuery(conn, insertAccountTokenQuery);

        await dbUtil.releaseConn(conn);
    }

    //
    // accountBalanceArr = new Array();
    accountLedgerArr = new Array();
}

//
module.exports.accountUserAccountIdCheck = async (account_id) => {
    const conn = await dbUtil.getConn();

    [query_result] = await dbUtil.exeQueryParam(conn, dbNN.querys.account.account_users.selectAccountUsersByAccountId, [account_id]);

    await dbUtil.releaseConn(conn);

    return query_result;
}

//
module.exports.accountUserAccountNumCheck = async (account_num) => {
    const conn = await dbUtil.getConn();

    [query_result] = await dbUtil.exeQueryParam(conn, dbNN.querys.account.account_users.selectAccountUsersByAccountNum, [account_num]);

    await dbUtil.releaseConn(conn);

    return query_result;
}

//
module.exports.accountUserCheck = async (owner_pk, super_pk, account_id) => {
    const conn = await dbUtil.getConn();

    [query_result] = await dbUtil.exeQueryParam(conn, dbNN.querys.account.account_users.selectAccountUsersByKeysAndAccountId, [owner_pk, owner_pk, super_pk, super_pk, account_id]);

    await dbUtil.releaseConn(conn);

    return query_result;
}

//
module.exports.accountUserKeyCheck = async (owner_pk, super_pk) => {
    const conn = await dbUtil.getConn();

    [query_result] = await dbUtil.exeQueryParam(conn, dbNN.querys.account.account_users.selectAccountUsersByKey, [owner_pk, owner_pk, super_pk, super_pk]);

    await dbUtil.releaseConn(conn);

    return query_result;
}

module.exports.insertAccountUsersV = async (userArray) => {
    // logger.debug("func - insertAccountUsersV");
    let cnt = 0;

    let insertAccountUserQuery = dbNN.querys.account.account_users.insertAccountUsers;
    //
    await util.asyncForEach(userArray, async(element, index) => {
        contractJson = element['contractJson'];

        // // let userAccount = await this.accountUserCheck(contractJson.contents.owner_pk, contractJson.contents.super_pk, contractJson.contents.account_id);
        // let userAccount = await this.accountUserAccountIdCheck(contractJson.contents.account_id);
        // let already_existed = userAccount.length;
        let already_existed = false;
        if (!already_existed)
        {
            let my_account_num = util.hexStrToBigInt(contractJson.to_account);
            //
            if (!my_account_num)
            {
                my_account_num = util.hexStrToBigInt(account_module.createUserAccountCode());
            }

            // logger.debug("my_account_num : " + my_account_num+ ", Bigint1 : " + BigInt(util.hexStrToBigInt(my_account_num)) + ", Bigint2 : " + BigInt(util.hexStrToBigInt(my_account_num)));

            insertAccountUserQuery += `(${contractProc.getMySubNetId()}, `;
            insertAccountUserQuery += `${BigInt(element.revision)}, `;
            insertAccountUserQuery += `${BigInt(contractJson.create_tm)}, `; // create_tm
            insertAccountUserQuery += `${BigInt(0)}, `; // blk_num
            insertAccountUserQuery += `${BigInt(element.db_key)}, `;
            insertAccountUserQuery += `'${contractJson.contents.owner_pk}', `;
            insertAccountUserQuery += `'${contractJson.contents.super_pk}', `;
            insertAccountUserQuery += `${BigInt(my_account_num)}, `; // TODO : my_account_num
            insertAccountUserQuery += `'${contractJson.contents.account_id}'),`;

            cnt ++;
        }
    });

    if (cnt)
    {
        const conn = await dbUtil.getConn();

        insertAccountUserQuery = insertAccountUserQuery.substr(0, insertAccountUserQuery.length - 1);
        // logger.debug("insertAccountUserQuery : " + insertAccountUserQuery);
    
        [query_result] = await dbUtil.exeQuery(conn, insertAccountUserQuery);
    
        await dbUtil.releaseConn(conn);
    }

}

//
module.exports.accountScActionCheck = async (scAction) => {
    const conn = await dbUtil.getConn();

    [query_result] = await dbUtil.exeQueryParam(conn, dbNN.querys.account.account_sc.selectByScActionLimit, [scAction]);

    await dbUtil.releaseConn(conn);

    return query_result;
}

//
module.exports.accounScActionAndTargetCheck = async (scAction) => {
    const conn = await dbUtil.getConn();

    [query_result] = await dbUtil.exeQueryParam(conn, dbNN.querys.account.account_sc.selectByScActionAndActionTargetLimit, [scAction, scAction]);

    await dbUtil.releaseConn(conn);

    return query_result;
}

// //
// module.exports.accounScActionCnt = async (scAction) => {
//     const conn = await dbUtil.getConn();

//     [query_result] = await dbUtil.exeQueryParam(conn, dbNN.querys.account.account_sc.selectCntByScAction, [scAction]);

//     await dbUtil.releaseConn(conn);

//     if (query_result.length)
//     {
//         return (query_result[0].total_count);
//     }

//     return 0;
// }

module.exports.insertAccountScActionV = async (scActionArray) => {
    // logger.debug("func - insertAccounScV");
    let cnt = 0;

    let insertAccountScQuery = dbNN.querys.account.account_sc.insertAccountSc;
    //
    await util.asyncForEach(scActionArray, async(element, index) => {
        contractJson = element['contractJson'];

        // let scActionAccount = await this.accountScActionCheck(contractJson.contents.sc_action);
        // let already_existed = scActionAccount.length;
        let already_existed = false;
        if (!already_existed)
        {
            //
            let fromAccountNum = util.hexStrToBigInt(contractJson.from_account);
            let toAccountNum = util.hexStrToBigInt(contractJson.to_account);

            //
            let scJson = JSON.parse(contractJson.contents.sc);

            //
            insertAccountScQuery += `(${contractProc.getMySubNetId()}, `;
            insertAccountScQuery += `${BigInt(contractJson.create_tm)}, `; // create_tm
            insertAccountScQuery += `${BigInt(0)}, `; // blk_num
            insertAccountScQuery += `${BigInt(element.db_key)}, `;
            insertAccountScQuery += `${contractJson.contents.sc_action}, `;
            insertAccountScQuery += `${contractJson.contents.action_target}, `;
            insertAccountScQuery += `${BigInt(fromAccountNum)}, `
            insertAccountScQuery += `${BigInt(toAccountNum)}, `
            insertAccountScQuery += `${scJson.sub_id}, `
            // insertAccountScQuery += `"${contractJson.contents.sc}"),`;
            insertAccountScQuery += `${JSON.stringify(contractJson.contents.sc)}),`;
            cnt ++;
        }
    });

    if (cnt)
    {
        const conn = await dbUtil.getConn();

        insertAccountScQuery = insertAccountScQuery.substr(0, insertAccountScQuery.length - 1);
        // logger.debug("insertAccountScQuery : " + insertAccountScQuery);
    
        [query_result] = await dbUtil.exeQuery(conn, insertAccountScQuery);
    
        await dbUtil.releaseConn(conn);
    }

}

///////////////////////////////////////////////////////
//
module.exports.insertScDelayedTxsV = async (errCode, contractJson) => {
    // logger.debug("func - insertScDelayedTxsV");

    let insertScDelayedTxsQuery = dbNN.querys.sc.sc_delayed_txs.insertScDelayedTxs;

    insertScDelayedTxsQuery += `(${contractProc.getMySubNetId()}, `; // subnet_id
    insertScDelayedTxsQuery += `${BigInt(contractJson.create_tm)}, `; // create_tm
    insertScDelayedTxsQuery += `0, `; // excuted
    insertScDelayedTxsQuery += `${BigInt(util.hexStrToBigInt(contractJson.from_account))}, `; // from_account
    insertScDelayedTxsQuery += `${BigInt(util.hexStrToBigInt(contractJson.to_account))}, `; // to_account
    insertScDelayedTxsQuery += `${contractJson.action}, `; // action

    //
    if (contractJson.action === define.CONTRACT_DEFINE.ACTIONS.CONTRACT.DEFAULT.TOKEN_TX)
    {
        insertScDelayedTxsQuery += `${contractJson.contents.action}, `; // c_action

        if (contractJson.contents.action <= define.CONTRACT_DEFINE.ACTIONS.TOKEN.SECURITY_TOKEN)
        {
            insertScDelayedTxsQuery += `${BigInt(util.hexStrToBigInt(contractJson.to_account))}, `; // dst_account
            insertScDelayedTxsQuery += `'${contractJson.contents.amount}', `; // amount
        }
        else if (contractJson.contents.action <= define.CONTRACT_DEFINE.ACTIONS.TOKEN.UTILITY_TOKEN_MAX)
        {
            insertScDelayedTxsQuery += `${BigInt(util.hexStrToBigInt(contractJson.contents.dst_account))}, `; // dst_account
            insertScDelayedTxsQuery += `'${contractJson.contents.amount}', `; // amount
        }
    }
    else
    {
        insertScDelayedTxsQuery += `${define.CONTRACT_DEFINE.ACTIONS.NONE}, `;

        insertScDelayedTxsQuery += `${BigInt(0)}, `; // dst_account
        insertScDelayedTxsQuery += `'0', `; // amount
    }

    insertScDelayedTxsQuery += `'${contractJson.signed_pubkey}', `; // signed_pubkey
    insertScDelayedTxsQuery += ` ${errCode}, `; // err_code
    insertScDelayedTxsQuery += `${JSON.stringify(contractJson)})`;
    // insertScDelayedTxsQuery += `'${JSON.stringify(contractJson)}')`;

    let query_result = await dbUtil.query(insertScDelayedTxsQuery);
}

//
module.exports.procScDelayedTxs = async (createTm) => {
    // logger.debug("func - procScDelayedTxs");

    let query_result = await dbUtil.queryPre(dbNN.querys.sc.sc_delayed_txs.selectByCreateTm, [createTm]);

    // logger.debug("query_result.length : " + query_result.length);

    if(query_result.length)
    {
        await util.asyncForEach(query_result, async (element, index) => {
            // logger.debug("create_tm : " + element.create_tm + ", action : " + element.action);
            // logger.debug("element.contract : " + element.contract);
            let data = {errCode : element.err_code, jsonData : element.contract};
            contractProc.pushContractArray(data);
        });

        let query_result_2 = await dbUtil.queryPre(dbNN.querys.sc.sc_delayed_txs.updateExecutedByCreateTm, [createTm]);

        await myCluster.sendTxsArrToMaster();
    }
}

//
module.exports.getAmountScDelayedTxs = async (fromAccount, toAccount, action) => {
    // logger.debug("func - getAmountScDelayedTxs");
    
    //
    let totAmount = '0';

    //
    let query_result = await this.accountTokenCheck(action);
    if (query_result.length)
    {
        let decimal_point = query_result[0].decimal_point;

        // logger.debug("market_supply : " + query_result[0].market_supply + ", operator : " + operator + ", tSupply : " + tSupply + ", decimal_point : " + query_result[0].decimal_point);

        //
        query_result = await dbUtil.queryPre(dbNN.querys.sc.sc_delayed_txs.selectByActionAndAccount, [action, fromAccount, toAccount]);

        // logger.debug("query_result.length : " + query_result.length);

        if(query_result.length)
        {
            await util.asyncForEach(query_result, async (element, index) => {
                totAmount = util.calNum(totAmount, '+', element.amount, decimal_point);
            });
        }
    }

    return totAmount;
}
