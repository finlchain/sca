//
const redis = require('redis');

//
const config = require("./../../config/config.js");
const define = require("./../../config/define.js");
const util = require("./../utils/commonUtil.js");
const dbUtil = require("./../db/dbUtil.js");
const dbRepl = require("./../db/dbRepl.js");
const dbNNHandler = require("../db/dbNNHandler.js");
const contractProc = require("./../contract/contractProc.js");
const redisHandler = require("./../net/redisHandler.js");
const myCluster = require("./../cluster.js");
const cliTest = require("./../cli/cliTest.js");

const logger = require("./../utils/winlog.js");
const debug = require("./../utils/debug.js");

//
let txsPublisher;
let txAcksSubscriber;
let blkNotiSubscriber;

//
let TxContractPublisher; // Local
let TxContractSubscriber; // Local

//let TxLock;

// let ContractPublicKeyMap = new Map();
// let isTxPublish = true;

//
module.exports.makeReplGetAck = (log_file, log_pos) => {
    let replGetAck = define.ISA_DEFINE.CMD_ACKS.REPL.GET_ACK + ' ' + log_file + ' ' + log_pos;

    return replGetAck;
}

//
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

    if(!res.length) {
        process.send({cmd : 'redisChkCfm', data : define.CLUSTER_DEFINE.REDIS_CHANNEL_ERROR});
    }
}

//
module.exports.setNNAPubRedis = async () => {
    let redis_conf = config.REDIS_CONFIG;
    redis_conf.retry_strategy = retry_strategy_func;

    txsPublisher = redis.createClient(redis_conf);
}

module.exports.setNNASubRedis = async () => {
    let redis_conf = config.REDIS_CONFIG;
    redis_conf.retry_strategy = retry_strategy_func;

    txAcksSubscriber = redis.createClient(redis_conf);
    blkNotiSubscriber = redis.createClient(redis_conf);

    // subscribe -> waitting TransactionAcks From NNA
    txAcksSubscriber.on("message", async (channel, message) => {
        await redisHandler.subNnaTxAcks(message);
    });
    txAcksSubscriber.subscribe(define.REDIS_DEFINE.CHANNEL.TX_ACKS);

    // subscribe -> waitting BlockNoti From NNA
    blkNotiSubscriber.on("message", async (channel, message) => {
        await redisHandler.nnaBlockNotiCB(message);
    });
    blkNotiSubscriber.subscribe(define.REDIS_DEFINE.CHANNEL.BLK_NOTI);

    logger.info("setNNASubRedis txAcksSubscriber");
    logger.info("setNNASubRedis blkNotiSubscriber");
}

module.exports.setISARedis = async () => {
    let redis_conf = config.REDIS_CONFIG;

    cmdNotiAcksPublisher = redis.createClient(redis_conf);

    cmdNotiSubscriber = redis.createClient(redis_conf);

    // subscribe -> waitting CmdNoti From IS
    cmdNotiSubscriber.on("message", async (channel, message) => {
        await redisHandler.isaCmdNotiCB(message, cmdNotiAcksPublisher);
    });
    cmdNotiSubscriber.subscribe(define.REDIS_DEFINE.CHANNEL.CMD_NOTI);

    // // Reset Replication Slaves
    // await dbRepl.resetReplSlaves();

    // Set Replication Master
    let res = await dbRepl.setReplMaster();

    if(define.REDIS_DEFINE.REDIS_PUBSUB_CHECK)
    {
        redisChannelCheck(cmdNotiAcksPublisher, define.REDIS_DEFINE.CHANNEL.CMD_NOTI_ACKS);
    }
    logger.debug("[REDIS - PUB] [" + define.REDIS_DEFINE.CHANNEL.CMD_NOTI_ACKS + "] -> (SCA start)");
    await cmdNotiAcksPublisher.publish(define.REDIS_DEFINE.CHANNEL.CMD_NOTI_ACKS, "SCA start");

    if(define.REDIS_DEFINE.REDIS_PUBSUB_CHECK)
    {
        redisChannelCheck(cmdNotiAcksPublisher, define.REDIS_DEFINE.CHANNEL.CMD_NOTI_ACKS);
    }

    let replica_info = this.makeReplGetAck(res.fileName, res.filePosition);
    logger.debug("[REDIS - PUB] [" + define.REDIS_DEFINE.CHANNEL.CMD_NOTI_ACKS + "] -> (" + replica_info.toString() + ")");
    cmdNotiAcksPublisher.publish(define.REDIS_DEFINE.CHANNEL.CMD_NOTI_ACKS, replica_info);
}

// Local
const writeLocalTxContract = async (contract) => {
    logger.debug("writeLocalTxContract STT " + util.getDateMS());
    if(define.REDIS_DEFINE.REDIS_PUBSUB_CHECK)
    {
        redisChannelCheck(TxContractPublisher, define.REDIS_DEFINE.LOCAL_CHANNEL.TX_CONTRACT);
    }  
    logger.debug("[REDIS - PUB] [" + define.REDIS_DEFINE.LOCAL_CHANNEL.TX_CONTRACT + "]");// -> (" + contract.toString() + ")");
    TxContractPublisher.publish(define.REDIS_DEFINE.LOCAL_CHANNEL.TX_CONTRACT, contract);
}

module.exports.writeLocalTxContract = writeLocalTxContract;

module.exports.setNNALocalSubRedis = async () => {
    let redis_conf = config.REDIS_CONFIG;

    TxContractSubscriber = redis.createClient(redis_conf);

    // subscribe -> waitting TransactionAcks From NNA
    TxContractSubscriber.on("message", async (channel, message) => {
        await redisHandler.localTxContractCB(message);
    });
    TxContractSubscriber.subscribe(define.REDIS_DEFINE.LOCAL_CHANNEL.TX_CONTRACT);
}

module.exports.setLocalPubRedis = async () => {
    let redis_conf = config.REDIS_CONFIG;
    redis_conf.retry_strategy = retry_strategy_func;

    TxContractPublisher = redis.createClient(redis_conf);
}