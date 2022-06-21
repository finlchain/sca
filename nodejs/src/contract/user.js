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
module.exports.updateChangeUserPubkeyContract = (contractJsonOrg, userAccont) => {
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
            account_id : userAccont.account_id
        },
        memo : ""
    };

    logger.debug("updateChangeUserPubkeyContract - newContractJson : " + JSON.stringify(contractJson));

    return JSON.stringify(contractJson);
}
