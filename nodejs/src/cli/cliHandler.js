//
const cryptoSsl = require("./../../../../addon/crypto-ssl");

//
const dbUtil = require("./../db/dbUtil.js");
const dbRepl = require("./../db/dbRepl.js");
const dbNN = require("./../db/dbNN.js");
const dbNNHandler = require("../db/dbNNHandler.js");
const config = require("./../../config/config.js");
const define = require("./../../config/define.js");
const contractProc = require("./../contract/contractProc.js");
const ledger = require("./../contract/ledger.js");
const cryptoUtil = require("./../sec/cryptoUtil.js");
const kafkaUtil = require("./../net/kafkaUtil.js");
const util = require("./../utils/commonUtil.js");
const cliTest = require("./../cli/cliTest.js");
const myCluster = require("./../cluster.js");

const logger = require("./../utils/winlog.js");

//
module.exports.handler = async (cmd) => {
    let retVal = true;

    logger.debug('SCA CLI Received Data : ' + cmd);

    let cmdSplit = cmd.split(' ');

    //
    if(cmd.toString() === "dt") 
    {
        logger.info("DB Truncated");

        //
        await dbNN.truncateScDB();
        await dbNN.truncateBlockDB();
        await dbNN.truncateAccountDB();
    }
    else if(cmd.slice(0,9) === "act query"){
        await dbUtil.actQuery(cmd.slice(10));
    }
    else if(cmd.slice(0,12) === "maria passwd")
    {
        let pw = cmd.slice(13);
        let EncResult = cryptoSsl.aesEncPw(null, pw, pw.length, "key/me/maria_enc_pw");

        if(EncResult === true)
        {
            logger.debug("maria Passwd Encrypt Success : " + pw);
        }
        else
        {
            logger.error("maria Passwd Encrypt Fail");
        }
    }
    else if(cmd.slice(0, 12) === "maria pw dec")
    {
        let pw = cryptoSsl.aesDecPw("key/me/seed", "key/me/maria_enc_pw");
        logger.debug("maria Passwd Decrypt : " + pw);
    }
    else if (cmd.slice(0, 12) === "redis passwd")
    {
        let pw = cmd.slice(13);
        let EncResult = cryptoSsl.aesEncPw("key/me/seed", pw, pw.length, "key/me/redis_enc_pw");

        if (EncResult === true)
        {
            logger.error("Redis Passwd Encrypt Success : " + pw);
        }
        else
        {
            logger.error("Redis Passwd Encrypt Fail");
        }
    }
    else if(cmd.slice(0, 12) === "redis pw dec")
    {
        let pw = cryptoSsl.aesDecPw("key/me/seed", "key/me/redis_enc_pw");
        logger.debug("Redis Passwd Decrypt : " + pw);
    }
    else if(cmd.slice(0, 9) === "dn passwd")
    {
        let pw = cmd.slice(10);
        let EncResult = cryptoSsl.aesEncPw("key/me/seed", pw, pw.length, "key/me/dn_enc_pw");

        if (EncResult === true)
        {
            logger.debug("DN User Passwd Encrypt Success : " + pw);
        }
        else
        {
            logger.error("DN User Passwd Encrypt Fail");
        }
    }
    else if(cmd.slice(0, 9) === "dn pw dec")
    {
        let pw = cryptoSsl.aesDecPw("key/me/seed", "key/me/dn_enc_pw");

        logger.debug("DN Passwd Decrypt : " + pw);
    }
    else if(cmd.slice(0, 10) === "dbn passwd")
    {
        let pw = cmd.slice(11);
        let EncResult = cryptoSsl.aesEncPw("key/me/seed", pw, pw.length, "key/me/dbn_enc_pw");

        if (EncResult === true)
        {
            logger.debug("DBN User Passwd Encrypt Success : " + pw);
        }
        else
        {
            logger.error("DBN User Passwd Encrypt Fail");
        }
    }
    else if(cmd.slice(0, 10) === "dbn pw dec")
    {
        let pw = cryptoSsl.aesDecPw("key/me/seed", "key/me/dbn_enc_pw");

        logger.error("DBN Passwd Decrypt : " + pw);
    }
    else if(cmd.slice(0, 11) === "test pw enc")
    {
        let pw = cmd.slice(12);
        let EncResult = cryptoSsl.aesEncPw("key/me/seed", pw, pw.length, "key/me/test_enc_pw");

        if (EncResult === true)
        {
            logger.debug("Test Passwd Encrypt Success : " + pw);
        }
        else
        {
            logger.error("Test Passwd Encrypt Fail");
        }
    }
    else if(cmd.slice(0, 11) === "test pw dec")
    {
        let pw = cryptoSsl.aesDecPw("key/me/seed", "key/me/test_enc_pw");
        logger.debug("Test Passwd Decrypt : " + pw);
    }
    else if (cmd === "api post test")
    {
        //
    }
    else if (cmd === "api get test")
    {
        //
    }
    else if (cmd === "topic name test")
    {
        logger.debug(await kafkaUtil.getTopicName());
    }
    else if (cmd === "exit test")
    {
        process.send({cmd : define.CMD_DEFINE.REDIS_CHK_CFM, data : define.CLUSTER_DEFINE.REDIS_CHANNEL_ERROR});
    }
    else if (cmd.slice(0, 10) === "replM test")
    {
        res = await dbRepl.setReplMaster();
        logger.debug("fileName : " + res.fileName + ", filePosition : " + res.filePosition);
    }
    else if (cmd.slice(0, 11) === "replS start")
    {
        await dbRepl.startReplSlaves();
    }
    else if (cmd.slice(0, 10) === "replS stop")
    {
        await dbRepl.stopReplSlaves();
    }
    else if (cmd.slice(0, 11) === "replS reset")
    {
        await dbRepl.resetReplSlaves();
    }
    else if (cmd.slice(0, 13) === "replS restart")
    {
        await dbRepl.restartReplSlaves();
    }
    else if (cmd.slice(0, 9) === "replS get")
    {
        await dbRepl.getReplSlaves();
    }
    else if (cmd.slice(0, 10) === "replS test")
    {
        let logFile = cmd.slice(11, 28);
        let subNetId = cmd.slice(29, 31);
        let ip = cmd.slice(32, 45);
        let logPos = cmd.slice(46);

        logger.debug("ip : " + ip + ", subNetId : " + subNetId + ", logFile : " + logFile + ", logPos : " + logPos);

        await dbRepl.resetReplSlaves();
        await dbRepl.setReplSlaveNN(subNetId, ip, logFile, logPos);
        await dbRepl.startReplSlaves();
    }
    else if (cmd.slice(0, 8) === "test map")
    {
        await cliTest.testContractMap();
    }
    else if (cmd.slice(0, 8) === "user chk")
    {
        let owner_pk = cmd.slice(9, 75);
        let super_pk = cmd.slice(76, 142);
        let account_id = cmd.slice(143);
        logger.debug("user chk owner_pk : " + owner_pk);
        logger.debug("user chk super_pk : " + super_pk);
        logger.debug("user chk account_id : " + account_id);
        let userAccount = await dbNNHandler.accountUserCheck(owner_pk, super_pk, account_id);
        logger.debug("user chk userAccount : " + userAccount.length);
    }
    else if(cmd.slice(0, 16) === "new account test") 
    {
        await cliTest.testCreateAccountCode();
    }
    else if(cmd.slice(0, 14) === "dec point test") 
    {
        cliTest.testDecimalPoint();
    }
    else if(cmd.slice(0, 12) === "cal num test") 
    {
        cliTest.testCalNum();
    }
    else if(cmd.slice(0, 16) === "get account test") 
    {
        let account = cmd.slice(13);
        logger.debug("get account test Account : " + account);
        await dbNNHandler.selectAccountFromScContents(account);
    }
    else if(cmd.slice(0, 12) === "balance test") 
    {
        await cliTest.testInsertAccountBalance(16);
        // await cliTest.testAccountLedgerBalance(16);
    }
    else if(cmd.slice(0, 8) === "bal test") 
    {
        // await ledger.getAccountBalanceBySubNetId('1234');
    }
    else if (cmd === "null test") {
        process.send({cmd : define.CMD_DEFINE.NULL_TXS_IND, data : ""});
    }
    else if(cmd.slice(0, 13)  === "contract test") 
    {
        let txCnt = cmdSplit[2];

        await cliTest.testContract(txCnt, false);
    }
    else if(cmd.slice(0, 12)  === "contract arr") 
    {
        let txCnt = cmdSplit[2];

        await cliTest.testContract(txCnt, true);
    }
    else if(cmd.slice(0, 12)  === "contract chk") 
    {
        let sigChkMode = cmdSplit[2];

        myCluster.sendContractMode(sigChkMode);
    }
    else if (cmd === "get my net pubkey")
    {
        let my_net_pubkey = cryptoUtil.getMyPubkey();
        console.log(typeof my_net_pubkey);
        console.log(my_net_pubkey);
    }
    else if (cmd === "is enc prikey")
    {
        console.log(config.IS_ENC_PRIKEY);    
    }
    else if  (cmd.slice(0,3) === "ips")
    {
        let localIPs = util.getMyIPs();
        //
        await util.asyncForEach(localIPs, async(element, index) => {
            logger.debug("ip[" + index + "] : " + element);
        });
    }
    else
    {
        retVal = false;
        logger.error("[CLI] " + cmd + ' is an incorrect command. See is --help');
    }

    return retVal;
}
