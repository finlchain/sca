const config = require("./../../config/config.js");
const define = require("./../../config/define.js");
const winlog = require("./../utils/Winlog.js");
const util = require("./../utils/CommonUtil.js");
const timer = require("./../utils/Timer.js");
const db = require("./../db/DBUtil.js");
const keyUtil = require("./../sec/KeyUtil.js");
const fbapi = require("./../api/FBapi.js");
const contract_module = require("./../contract/Contract.js");
const redis = require('redis');

let TxPublisher;
let TxAckSubscriber;
let BlkNotiSubscriber;

const retry_strategy_func = (options) => {
    if(options.error && options.error.code === 'ECONNREFUSED') {
        // End reconnecting on a specific error and flush all commands with
        // a individual error
        return new Error('The server refused the connection');
    }
    if (options.total_retry_time > 1000 * 60 * 60) {
        // End reconnecting after a specific timeout and flush all commands
        // with a individual error
        return new Error('Retry time exhausted');
    }
    if (options.attemp > 10) {
        // End reconnecting with built in error
        return undefined
    }
    // reconnect after
    return Math.min(options.attempt * 100, 3000);
}

const redisChannelCheckCallbackPromise = async (redisClient, channel) => {
    return new Promise((resolve, reject) => {
        redisClient.pubsub("CHANNELS", channel, (err, replies) => {
            if(err) {
                reject(err);
            } else {
                resolve(replies);
            }
        });
    });
}

const redisChannelCheck = async (redisClient, channel) => {
    let res = await redisChannelCheckCallbackPromise(redisClient, channel).then((resData) => {
        return resData;
    });

    if(res.length === 0) {
        process.send(define.CLUSTER_DEFINE.REDIS_CHANNEL_ERROR);
    }
}

const CmdNotiCallback = async (command, CmdNotiAcksPublisher) => {
    winlog.info("[REDIS - SUB] [" + define.REDIS_DEFINE.CHANNEL.CMD_NOTI + "] (" + command.toString() + ")");
    const regexResult = define.REGEX.NEW_LINE_REGEX.test(command);
    let ack_msg;

    if(regexResult) {
        command = command.substring(0, command.length - 1);
    }

    if(command.toString() === define.ISA_DEFINE.CMD.DB_TRUNCATE) 
    {
        await db.truncate();
        ack_msg = define.ISA_DEFINE.CMD_ACKS.DB_TRUNCATE_ACK;
    }
    else if(command.toString() === define.ISA_DEFINE.CMD.NET_RESET) 
    {
        ack_msg = define.ISA_DEFINE.CMD_ACKS.NET_RESET_ACK;
    }
    else if(command.toString() === define.ISA_DEFINE.CMD.NET_UPDATE)
    {
        let res = await db.replication(db.scConfig);
      
        CmdNotiAcksPublisher.publish(define.REDIS_DEFINE.CHANNEL.CMD_NOTI_ACKS, 
            define.ISA_DEFINE.CMD_ACKS.HEART_BEAT_ACK + " "
            + res.fileName + " "
            + res.filePosition
        );
        ack_msg = define.ISA_DEFINE.CMD_ACKS.NET_UPDATE_ACK;
    }
    else if(command.slice(0, define.ISA_DEFINE.CONTRACT_CMD_LEN) === define.ISA_DEFINE.CMD.CONTRACT) 
    {
        let contract = command.slice(define.ISA_DEFINE.CONTRACT_CMD_LEN);

        let len = contract.length;
        let client_res = await contract_module.createTx(contract, len);
        winlog.info(JSON.stringify(client_res));

        if(client_res.ERROR_CODE !== 0) {
            ack_msg = JSON.stringify(client_res);
        }
        else {
            ack_msg = define.ISA_DEFINE.CMD_ACKS.CONTRACT_ACK;
        }
    }
    else if(command.toString() === define.ISA_DEFINE.CMD.REWARD)
    {
        await contract_module.rewardDistribute();
        ack_msg = define.ISA_DEFINE.CMD_ACKS.REWARD_SPREAD_ACK;
    }
    else {
        winlog.info("else");
    }

    if(define.REDIS_DEFINE.REDIS_PUBSUB_CHECK)
    {
        redisChannelCheck(CmdNotiAcksPublisher, define.REDIS_DEFINE.CHANNEL.CMD_NOTI_ACKS);
    }    
    winlog.info("[REDIS - PUB] [" + define.REDIS_DEFINE.CHANNEL.CMD_NOTI_ACKS + "] (" + ack_msg.toString() + ")");
    CmdNotiAcksPublisher.publish(define.REDIS_DEFINE.CHANNEL.CMD_NOTI_ACKS, ack_msg);
}

const readTxAcks = async (message) => {
    winlog.info("[REDIS - SUB] [" + define.REDIS_DEFINE.CHANNEL.TX_ACKS + "] -> (" + message.toString() + ")");
        
    const connection = await db.CreateConnection(db.scConfig);
    
    let txCnt = message.length / define.REDIS_DEFINE.TX_ACK_LEN.HEX_STR_DB_KEY_LEN - 1;
    let pos = 0;
    let BN;
    let UpdateBlkNumQuery = db.querys.UpdateBlkNum;

    let resString = message.toString();
    BN = resString.substr(pos, define.REDIS_DEFINE.TX_ACK_LEN.HEX_STR_BN_LEN);
    BN = BigInt("0x" + BN).toString();
    pos += define.REDIS_DEFINE.TX_ACK_LEN.HEX_STR_BN_LEN;

    let KeyID = resString.substr(pos, define.REDIS_DEFINE.TX_ACK_LEN.HEX_STR_DB_KEY_LEN);
    KeyID = BigInt("0x" + KeyID).toString();
    pos += define.REDIS_DEFINE.TX_ACK_LEN.HEX_STR_DB_KEY_LEN * (txCnt - 1);
    UpdateBlkNumQuery += "db_key >= " + KeyID + " AND ";

    KeyID = resString.substr(pos, define.REDIS_DEFINE.TX_ACK_LEN.HEX_STR_DB_KEY_LEN);
    KeyID = BigInt("0x" + KeyID).toString();
    UpdateBlkNumQuery += "db_key <= " + KeyID;

    await db.executeQueryWithParam(connection, UpdateBlkNumQuery, [BN]);
    await db.connectionClose(connection);

    isTxPublish = true;
}

const readBlockNoti = async (message) => {
    winlog.info("[REDIS - SUB] [" + define.REDIS_DEFINE.CHANNEL.BLK_NOTI + "] -> (" + message.toString() + ")");

    const connection = await db.CreateConnection(db.scConfig);
    let pos = 0;

    let BN = message.toString().substr(pos, define.REDIS_DEFINE.BLK_NOTI_LEN.HEX_STR_BN_LEN);
    BN = BigInt("0x" + BN).toString();
    pos += define.REDIS_DEFINE.BLK_NOTI_LEN.HEX_STR_BN_LEN;
    
    let BGT = message.toString().substr(pos, define.REDIS_DEFINE.BLK_NOTI_LEN.HEX_STR_BGT_LEN);
    BGT = BigInt("0x" + BGT).toString();
    pos += define.REDIS_DEFINE.BLK_NOTI_LEN.HEX_STR_BGT_LEN;
    
    const TXC = message.toString().substr(pos, define.REDIS_DEFINE.BLK_NOTI_LEN.HEX_STR_TXC_LEN);
    pos += define.REDIS_DEFINE.BLK_NOTI_LEN.HEX_STR_TXC_LEN;

    const Hash = message.toString().substr(pos, define.REDIS_DEFINE.BLK_NOTI_LEN.HEX_STR_HASH_LEN);

    await db.executeQueryWithParam(connection, db.querys.UpdateBlkGenTime, [BGT, BN]);
    let DBKeyIndex = await keyUtil.GenKeyIndex();

    [query_result] = await db.executeQueryWithParam(connection, db.querys.SelectContents, [BN]);
    
    await util.asyncForEach(query_result, async (element, index) => {
        let contract_query = db.querys.InsertLedger;
        let db_key = BigInt(element.db_key).toString();
        let contract = JSON.parse(element.contract.slice(1,(element.contract.length-1)));

        let fintech = contract.Fintech
        let blk_num = BigInt(BN).toString(); 
        let subNetID = await contract_module.getSubNetID();
        let is_Index_Server = false;

        let frompk = contract.From;
        let revision = contract.Revision;

        if(frompk === keyUtil.getISPubkey())
            is_Index_Server = true;

        if(fintech === define.CONTRACT_DEFINE.FINTECH.FINANCIAL_TX)
        {
            // Financial Transactions
            let kind = contract.Note[0].Kind;

            let api_req_argv = {
                "pubkey" : frompk,
                "kind" : kind
            }
            let fb_url = config.FBURL + "/account/status";
            let api_res = await fbapi.APICall_GET(fb_url, api_req_argv);
    
            if(api_res === define.FB_API_DEFINE.NOT_FOUND)
            {
                winlog.error("FB API error or No have User Data");
                return;
            }
    
            let balance = parseFloat(api_res.contents.balance);

            if(isNaN(balance)) balance = 0;
                
            for(var i = 0; i < contract.Note.length; i++) {
                let topk = contract.Note[i].To;
                let amount = parseFloat(contract.Note[i].Content.Amount);
                let fee = parseFloat(contract.Note[i].Fee);
    
                balance = Math.round(balance * 1e12) / 1e12;
                balance = parseFloat(balance * 1e12) - parseFloat(amount * 1e12);
                balance = parseFloat(balance) - parseFloat(fee * 1e12);
    
                // for Float Value Error Correct
                balance = Math.round(balance) / 1e12;
    
                if(is_Index_Server) balance = 0
    
                contract_query += `(${subNetID}, '${frompk}', ${revision}, ${db_key}, ${blk_num}, '${topk}', ${kind}, '${amount}', '${balance}')`
                if(i !== contract.Note.length - 1) {
                    contract_query += ', ';
                }
            }
        }
        else if(fintech === define.CONTRACT_DEFINE.FINTECH.NON_FINANCIAL_TX)
        {
            // Registration
            for(var i = 0; i < contract.Note.length; i++) 
            {
                let kind = contract.Note[i].Kind;
                let from_pk = frompk;
                let balance = 0;
                let amount = 0;
                let to_pk = define.ACCOUNT_DEFINE.TO_PK_ALL_ZERO;

                // // TODO

                if(!is_Index_Server) {
                    let api_req_argv = {
                        "pubkey" : from_pk,
                        "kind" : define.CONTRACT_DEFINE.KIND.SECURITY_COIN
                    }
                    let fb_url = config.FBURL + "/account/status"; 
                    let api_res = await fbapi.APICall_GET(fb_url, api_req_argv); 

                    balance = parseFloat(api_res.contents.balance);
                    balance = Math.round(balance * 1e12) / 1e12;
                }

                if(isNaN(balance)) balance = 0;

                if(kind === define.CONTRACT_DEFINE.KIND.ADD_USER)
                {
                    from_pk = contract.Note[i].Content.PublicKey;
                }
                else if(kind === define.CONTRACT_DEFINE.KIND.ADD_HW)
                {
                    from_pk = contract.Note[i].Content.PublicKey;
                }
                else if(kind === define.CONTRACT_DEFINE.KIND.LOGIN_USER)
                {
                    // Create Logout Timer
                    timer.setLogoutTimer(from_pk);
                }
                else if(kind === define.CONTRACT_DEFINE.KIND.LOGOUT_USER)
                {
                    // Delete Logout Timer
                    timer.delLogoutTimer(from_pk);
                }
                else if(kind === define.CONTRACT_DEFINE.KIND.LOGOUT_USER_TIMEOUT) 
                {
                    let api_req_argv = {
                        "pubkey" : contract.Note[i].Content.PublicKey,
                        "kind" : kind
                    }
                    let fb_url = config.FBURL + "/account/status"; 
                    let api_res = await fbapi.APICall_GET(fb_url, api_req_argv);
                    balance = parseFloat(api_res.contents.balance);
                    
                    if(api_res === define.FB_API_DEFINE.NOT_FOUND)
                    {
                        winlog.error("FB API error or No have User Data");
                        break;
                    }

                    from_pk = contract.Note[i].Content.PublicKey;

                    // Delete Logout Timer
                    timer.delLogoutTimer(contract.Note[i].Content.PublicKey);
                }

                contract_query += `(${subNetID}, '${from_pk}', ${revision}, ${db_key}, ${blk_num}, '${to_pk}', ${kind}, '${amount.toString()}', '${balance.toString()}')`;
                if(i !== contract.Note.length - 1) {
                    contract_query += ', ';
                }
            }
        }

        await connection.query(contract_query);

        if(is_Index_Server && fintech === define.CONTRACT_DEFINE.FINTECH.FINANCIAL_TX) 
        {
            await contract_module.rewardDistribute();

            if(define.REDIS_DEFINE.REDIS_PUBSUB_CHECK)
            {
                redisChannelCheck(CmdNotiAcksPublisher, define.REDIS_DEFINE.CHANNEL.CMD_NOTI_ACKS);
            }
            winlog.info("[REDIS - PUB] [" + define.REDIS_DEFINE.CHANNEL.CMD_NOTI_ACKS + "] -> (" + define.ISA_DEFINE.CMD_ACKS.REWARD_ACK + ")");
            CmdNotiAcksPublisher.publish(define.REDIS_DEFINE.CHANNEL.CMD_NOTI_ACKS, define.ISA_DEFINE.CMD_ACKS.REWARD_ACK);
        }
    

    });

    await db.connectionClose(connection);
}

module.exports.setNNARedis = async () => {
    let redis_conf = config.redisConfig;
    redis_conf.retry_strategy = retry_strategy_func;

    TxPublisher = redis.createClient(redis_conf);
    TxAckSubscriber = redis.createClient(redis_conf);
    BlkNotiSubscriber = redis.createClient(redis_conf);

    // for Reward Spread
    CmdNotiAcksPublisher = redis.createClient(config.redisConfig);

    // subscribe -> waitting TxAck and BlkNoti From NNA
    TxAckSubscriber.on("message", async (channel, message) => {
        await readTxAcks(message);
    });
    TxAckSubscriber.subscribe(define.REDIS_DEFINE.CHANNEL.TX_ACKS);

    BlkNotiSubscriber.on("message", async (channel, message) => {
        await readBlockNoti(message);
    });
    BlkNotiSubscriber.subscribe(define.REDIS_DEFINE.CHANNEL.BLK_NOTI);
}

module.exports.setISARedis = async () => {

    CmdNotiAcksPublisher = redis.createClient(config.redisConfig);
    CmdNotiSubscriber = redis.createClient(config.redisConfig);

    // subscribe -> waitting TxAck and BlkNoti From NNA

    CmdNotiSubscriber.on("message", async (channel, message) => {
        await CmdNotiCallback(message, CmdNotiAcksPublisher);
    });
    CmdNotiSubscriber.subscribe(define.REDIS_DEFINE.CHANNEL.CMD_NOTI);

    let res = await db.replication(db.scConfig);

    if(define.REDIS_DEFINE.REDIS_PUBSUB_CHECK)
    {
        redisChannelCheck(CmdNotiAcksPublisher, define.REDIS_DEFINE.CHANNEL.CMD_NOTI_ACKS);
    }
    winlog.info("[REDIS - PUB] [" + define.REDIS_DEFINE.CHANNEL.CMD_NOTI_ACKS + "] -> (SCA start)");
    await CmdNotiAcksPublisher.publish(define.REDIS_DEFINE.CHANNEL.CMD_NOTI_ACKS, "SCA start");

    if(define.REDIS_DEFINE.REDIS_PUBSUB_CHECK)
    {
        redisChannelCheck(CmdNotiAcksPublisher, define.REDIS_DEFINE.CHANNEL.CMD_NOTI_ACKS);
    }
    let replica_info = define.ISA_DEFINE.CMD_ACKS.HEART_BEAT_ACK + " " + res.fileName + " " + res.filePosition;
    winlog.info("[REDIS - PUB] [" + define.REDIS_DEFINE.CHANNEL.CMD_NOTI_ACKS + "] -> (" + replica_info.toString() + ")");
    CmdNotiAcksPublisher.publish(define.REDIS_DEFINE.CHANNEL.CMD_NOTI_ACKS, replica_info);
}

const writeTxs = async (TxArray) => {
    let Txs = "";

        await util.asyncForEach(TxArray, async (element, index) => {
            let DBKeyHex = BigInt(element.db_key).toString(16);
            DBKeyHex = await util.Padding(
                DBKeyHex, 
                define.REDIS_DEFINE.TX_ACK_LEN.HEX_STR_DB_KEY_LEN, 
                define.COMMON_DEFINE.PADDING_DELIMITER.FRONT);

            Txs += (DBKeyHex + element.hash.toString()).toString();
        });

        // publish -> send to NNA Transaction Data
        try {
            if(define.REDIS_DEFINE.REDIS_PUBSUB_CHECK)
            {
                redisChannelCheck(CmdNotiAcksPublisher, define.REDIS_DEFINE.CHANNEL.TX);
            }
            winlog.info("[REDIS - PUB] [" + define.REDIS_DEFINE.CHANNEL.TX + "] -> (" + Txs.toString() + ")");
            TxPublisher.publish(define.REDIS_DEFINE.CHANNEL.TX, Txs);

            // isTxPublish = false;

            return true;
        } catch (err) {
            console.log(err);
            return false;
        }

}

module.exports.writeTxs = writeTxs;