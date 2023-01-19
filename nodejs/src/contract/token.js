//
const { loggers } = require("winston");

//
const config = require("./../../config/config.js");
const define = require("./../../config/define.js");
const dbUtil = require("./../db/dbUtil.js");
const dbNN = require("./../db/dbNN.js");
const dbNNHandler = require("../db/dbNNHandler.js");
const contractProc = require("./../contract/contractProc.js");
const account = require("./../contract/account.js");
const contractUtil = require("./../contract/contractUtil.js");
const kafkaUtil = require("./../net/kafkaUtil.js");
const util = require("./../utils/commonUtil.js");
const logger = require("./../utils/winlog.js");

//
module.exports.updateAccountTokenMS = async (operator, tSupply, tAction) => {
    logger.debug("func - updateAccountTokenMS");
    logger.debug("operator : " + operator + ", tSupply : " + tSupply + ", tAction : " + tAction);

    //
    const conn = await dbUtil.getConn();

    query_result = await dbNNHandler.accountTokenCheck(tAction);
    // logger.debug("query_result.length : " + query_result.length);
    if (query_result.length)
    {
        logger.debug("market_supply : " + query_result[0].market_supply + ", operator : " + operator + ", tSupply : " + tSupply + ", decimal_point : " + query_result[0].decimal_point);
        market_supply = util.calNum(query_result[0].market_supply, operator, tSupply, query_result[0].decimal_point);

        if (market_supply >= 0)
        {
            //
            let updateMarketSupplyByActionQuery = dbNN.querys.account.account_tokens.updateMarketSupplyByAction;

            // logger.debug("updateMarketSupplyByActionQuery : " + updateMarketSupplyByActionQuery);
        
            [query_result] = await dbUtil.exeQueryParam(conn, updateMarketSupplyByActionQuery, [market_supply, tAction]);
        }
    }

    await dbUtil.releaseConn(conn);
}

module.exports.updateChangeTokenPubkeyContract = (contractJsonOrg, tokenAccont) => {
    let contractJson = {
        create_tm : contractJsonOrg.create_tm,
        fintech : contractJsonOrg.fintech,
        privacy : contractJsonOrg.privacy,
        fee : contractJsonOrg.fee,
        from_account : contractJsonOrg.from_account,
        to_account : contractJsonOrg.to_account,
        action : contractJsonOrg.action,
        contents : {
            owner_pk : contractJsonOrg.contents.owner_pk,
            super_pk : contractJsonOrg.contents.super_pk,
            action : tokenAccont.action,
            name : tokenAccont.name,
            symbol : tokenAccont.symbol,
            total_supply : tokenAccont.total_supply,
            decimal_point : tokenAccont.decimal_point,
            lock_time_from : tokenAccont.lock_time_from,
            lock_time_to : tokenAccont.lock_time_to,
            lock_transfer : tokenAccont.lock_transfer,
            black_list : tokenAccont.black_list,
            functions : tokenAccont.functions
        },
        memo : ""
    };

    logger.debug("updateLockTokenTxContract - newContractJson : " + JSON.stringify(contractJson));

    // return JSON.stringify(contractJson);
    return contractJson;
}

module.exports.updateLockTokenTxContract = (contractJsonOrg, tokenAccont) => {
    let contractJson = {
        create_tm : contractJsonOrg.create_tm,
        fintech : contractJsonOrg.fintech,
        privacy : contractJsonOrg.privacy,
        fee : contractJsonOrg.fee,
        from_account : contractJsonOrg.from_account,
        to_account : contractJsonOrg.to_account,
        action : contractJsonOrg.action,
        contents : {
            owner_pk : tokenAccont.owner_pk,
            super_pk : tokenAccont.super_pk,
            action : tokenAccont.action,
            name : tokenAccont.name,
            symbol : tokenAccont.symbol,
            total_supply : tokenAccont.total_supply,
            decimal_point : tokenAccont.decimal_point,
            lock_time_from : tokenAccont.lock_time_from,
            lock_time_to : tokenAccont.lock_time_to,
            lock_transfer : contractJsonOrg.contents.lock_tx,
            black_list : tokenAccont.black_list,
            functions : tokenAccont.functions
        },
        memo : ""
    };

    logger.debug("updateLockTokenTxContract - newContractJson : " + JSON.stringify(contractJson));

    // return JSON.stringify(contractJson);
    return contractJson;
}

module.exports.updateLockTokenTimeContract = (contractJsonOrg, tokenAccont) => {
    let contractJson = {
        create_tm : contractJsonOrg.create_tm,
        fintech : contractJsonOrg.fintech,
        privacy : contractJsonOrg.privacy,
        fee : contractJsonOrg.fee,
        from_account : contractJsonOrg.from_account,
        to_account : contractJsonOrg.to_account,
        action : contractJsonOrg.action,
        contents : {
            owner_pk : tokenAccont.owner_pk,
            super_pk : tokenAccont.super_pk,
            action : tokenAccont.action,
            name : tokenAccont.name,
            symbol : tokenAccont.symbol,
            total_supply : tokenAccont.total_supply,
            decimal_point : tokenAccont.decimal_point,
            lock_time_from : contractJsonOrg.contents.lock_time_from,
            lock_time_to : contractJsonOrg.contents.lock_time_to,
            lock_transfer : tokenAccont.lock_transfer,
            black_list : tokenAccont.black_list,
            functions : tokenAccont.functions
        },
        memo : ""
    };

    logger.debug("updateLockTokenTimeContract - newContractJson : " + JSON.stringify(contractJson));

    // return JSON.stringify(contractJson);
    return contractJson;
}

module.exports.updateLockTokenWalletContract = (contractJsonOrg, tokenAccont) => {
    let contractJson = {
        create_tm : contractJsonOrg.create_tm,
        fintech : contractJsonOrg.fintech,
        privacy : contractJsonOrg.privacy,
        fee : contractJsonOrg.fee,
        from_account : contractJsonOrg.from_account,
        to_account : contractJsonOrg.to_account,
        action : contractJsonOrg.action,
        contents : {
            owner_pk : tokenAccont.owner_pk,
            super_pk : tokenAccont.super_pk,
            action : tokenAccont.action,
            name : tokenAccont.name,
            symbol : tokenAccont.symbol,
            total_supply : tokenAccont.total_supply,
            decimal_point : tokenAccont.decimal_point,
            lock_time_from : tokenAccont.lock_time_from,
            lock_time_to : tokenAccont.lock_time_to,
            lock_transfer : tokenAccont.lock_transfer,
            black_list : contractJsonOrg.contents.pk_list,
            functions : tokenAccont.functions
        },
        memo : ""
    };

    logger.debug("updateLockTokenWalletContract - newContractJson : " + JSON.stringify(contractJson));

    // return JSON.stringify(contractJson);
    return contractJson;
}

//
module.exports.updateMultiTxSecTokenContract = (contractJsonOrg, txInfoOrg) => {
    let contractJson = {
        create_tm : contractJsonOrg.create_tm,
        fintech : contractJsonOrg.fintech,
        privacy : contractJsonOrg.privacy,
        fee : contractJsonOrg.fee,
        from_account : contractJsonOrg.from_account,
        to_account : txInfoOrg.dst_account,
        action : contractJsonOrg.action,
        contents : {
            action : contractJsonOrg.contents.action,
            amount : txInfoOrg.amount
        },
        memo : txInfoOrg.memo
    };

    logger.debug("updateMultiTxSecTokenContract - newContractJson : " + JSON.stringify(contractJson));

    // return JSON.stringify(contractJson);
    return contractJson;
}

//
module.exports.updateMultiTxUtilTokenContract = (contractJsonOrg, txInfoOrg) => {
    let contractJson = {
        create_tm : contractJsonOrg.create_tm,
        fintech : contractJsonOrg.fintech,
        privacy : contractJsonOrg.privacy,
        fee : contractJsonOrg.fee,
        from_account : contractJsonOrg.from_account,
        to_account : contractJsonOrg.contents.token_account,
        action : contractJsonOrg.action,
        contents : {
            action : contractJsonOrg.contents.action,
            dst_account : txInfoOrg.dst_account,
            amount : txInfoOrg.amount
        },
        memo : txInfoOrg.memo
    };

    logger.debug("updateMultiTxUtilTokenContract - newContractJson : " + JSON.stringify(contractJson));

    // return JSON.stringify(contractJson);
    return contractJson;
}
