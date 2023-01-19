//
const { Sema } = require("async-sema");
const cluster = require("cluster");
const os = require("os");

const TxLock = new Sema(1, { capacity : 100} );

//
const define = require("./../config/define.js");
const config = require("./../config/config.js");
const contractProc = require("./contract/contractProc.js");
const redisUtil = require("./net/redisUtil.js");
const dbUtil = require("./db/dbUtil.js");
const dbNNHandler = require("./db/dbNNHandler.js");
const dbMain = require("./db/dbMain.js");
const cryptoUtil = require("./sec/cryptoUtil.js");
const kafkaUtil = require("./net/kafkaUtil.js");
const cli = require("./cli/cli.js");
const util = require("./utils/commonUtil.js");
const timer = require("./utils/timer.js");
const logger = require("./utils/winlog.js");
const debug = require("./utils/debug.js");

module.exports.getTxLock = aysnc => {
    return TxLock;
}

let myScaWorkerId = define.CLUSTER_DEFINE.SCA1_CLUSTER_WORKER_ID;

const getScaWorkerIdStr = () => {
    return myScaWorkerId.toString();
}

const incScaWorkerId = () => {
    let scaWorkerId = myScaWorkerId;
    scaWorkerId++;

    if (scaWorkerId > (define.CLUSTER_DEFINE.DEF_CLUSTER_WORKER_NUM + define.CLUSTER_DEFINE.SCA_CLUSTER_WORKER_NUM))
    {
        scaWorkerId = define.CLUSTER_DEFINE.SCA1_CLUSTER_WORKER_ID;
    }
    myScaWorkerId = scaWorkerId;
}

const scaInfo = () => {
    logger.info("==================================================");
    logger.info("= FINL Block Chain                               =");
    logger.info("= [ SCA Ver : " + config.VERSION_INFO + " ]                            =");
    logger.info("==================================================");
}

module.exports.clusterInit = async () => {    
    kafkaUtil.setTopicName();
    cryptoUtil.setMyKey(config.MY_KEY_PATH_CONFIG);

    cryptoUtil.setIsPubkey();

    contractProc.setDbKeyIndex();
    contractProc.setMySubNetId();
    contractProc.setClusterNum();

    if(cluster.isMaster) 
    {
        scaInfo();

        //
        logger.debug("dbUtil.dbConfig" + JSON.stringify(dbUtil.dbConfig));
        await dbMain.initDatabase();
        // await dbNNHandler.setDbKey(contractProc.myDbKeyIndex, contractProc.getMySubNetId());

        // await os.cpus().forEach( async(cpu) => {
        //     await cluster.fork();
        //});

        let cpuCount = os.cpus().length;
        logger.debug("cpuCount " + cpuCount);

        for(let i = 0; i < (define.CLUSTER_DEFINE.DEF_CLUSTER_WORKER_NUM + define.CLUSTER_DEFINE.SCA_CLUSTER_WORKER_NUM); i++)
        {
            cluster.fork();
        }

        cluster.on("online", (worker) => {
            // Each Worker Online then something TODO Here
            // console.log("[M] workerid : " + worker.id + " is online");
        });

        cluster.on("exit", (worker, code, signal) => {
            // When some worker eixt then code here
            logger.debug("[M] " + worker.id + "'s worker is exit"); 

            logger.error("[M] " + worker.id + "'s worker exit code : " + code.toString());
            logger.error("[M] " + worker.id + "'s worker exit signal : " + signal);

            var env = worker.process.env;
            var newWorker = cluster.fork(env);
            newWorker.process.env = env;
        });

        cluster.on("message", async (worker, msg) => {
            // recv from kafka worker's Contract data
            // then merge array of Contract data
            // and send to NNA Worker

            // let txsWokerIdStr = define.CLUSTER_DEFINE.NNA_CLUSTER_WORKER_ID_STR;
            let txsWokerIdStr = getScaWorkerIdStr();

            switch (msg.cmd)
            {
            case define.CMD_DEFINE.RCV_RAW_TXS_IND :
                // logger.debug("received CMD " + msg.cmd + " from " + worker);
                if(msg['data'].length && util.isJsonString(msg['data']))
                {
                    cluster.workers[txsWokerIdStr].send(msg);
                    incScaWorkerId();
                }
                break;
            case define.CMD_DEFINE.RCV_RAW_TXS_ARR_IND :
                // logger.debug("received CMD " + msg.cmd + " from " + worker);
                if(msg['data'].length && util.isArray(msg['data']))
                {
                    cluster.workers[txsWokerIdStr].send(msg);
                    incScaWorkerId();
                }
                break;
            case define.CMD_DEFINE.VALID_TXS_IND :
                // logger.debug("received CMD " + msg.cmd + " from " + worker);
                if(msg['data'].length && util.isJsonString(msg['data']))
                {
                    // logger.debug("VALID_TXS_IND - MASTER");
                    cluster.workers[define.CLUSTER_DEFINE.NNA_CLUSTER_WORKER_ID_STR].send(msg);
                }
                break;
            case define.CMD_DEFINE.RCV_TXS_ARR_IND :
                // logger.debug("received CMD " + msg.cmd + " from " + worker);
                if(msg['data'].length && util.isArray(msg['data']))
                {
                    cluster.workers[define.CLUSTER_DEFINE.NNA_CLUSTER_WORKER_ID_STR].send(msg);
                }
                break;
            case define.CMD_DEFINE.NULL_TXS_IND :
                cluster.workers[define.CLUSTER_DEFINE.NNA_CLUSTER_WORKER_ID_STR].send(msg);
                break;
            case define.CMD_DEFINE.BLK_NOTI_IND :
                // 
                cluster.workers[define.CLUSTER_DEFINE.DB_CLUSTER_WORKER_ID_STR].send(msg);
                //
                cluster.workers[define.CLUSTER_DEFINE.NNA_CLUSTER_WORKER_ID_STR].send(msg);
                cluster.workers[define.CLUSTER_DEFINE.ISA_CLUSTER_WORKER_ID_STR].send(msg);
                cluster.workers[define.CLUSTER_DEFINE.KFK_CLUSTER_WORKER_ID_STR].send(msg);
                break;
            case define.CMD_DEFINE.REDIS_CHK_CFM :
                logger.error("SCA Process Exit : Redis Channel Check Error");
                process.exit(define.CLUSTER_DEFINE.EXIT_CODE.NORMAL);
                break;
            case define.CMD_DEFINE.LOGOUT_REQ :
                cluster.workers[define.CLUSTER_DEFINE.NNA_CLUSTER_WORKER_ID_STR].send(msg);
                break;
            case define.CMD_DEFINE.CONTRACT_MODE_REQ:
                for(var i = 0; i < define.CLUSTER_DEFINE.SCA_CLUSTER_WORKER_NUM; i++)
                {
                    let cmWorkIdStr = (define.CLUSTER_DEFINE.SCA1_CLUSTER_WORKER_ID + i).toString();
                    cluster.workers[cmWorkIdStr].send(msg);
                }
                break;
            default :
                // Error
                break;
            }
        });
    } 
    else if (cluster.worker.id === define.CLUSTER_DEFINE.NNA_CLUSTER_WORKER_ID) 
    {
        logger.debug("worker ID [" + cluster.worker.id +"] to Communicate with NNA");

        //
        timer.setIntervalTxArrToDB();

        // Worker to Communicate with NNA
        await redisUtil.setNNAPubRedis();

        // From other workers to NNA (Local Use only)
        await redisUtil.setNNALocalSubRedis();

        // Worker to Communicate with Rx NNA
        await redisUtil.setNNASubRedis();

        // to NNA (Local Use only)
        await redisUtil.setLocalPubRedis();

        //
        process.on('message', async (msg) => {
            switch (msg.cmd)
            {
            case define.CMD_DEFINE.RCV_RAW_TXS_IND :
                if(msg['data'].length && util.isJsonString(msg['data']))
                {
                    await contractProc.inspectContract(msg['data']);
                    // await TxLock.acquire();
                    // await contractProc.sendTxArrToDB();
                    // await TxLock.release();
                }
                break;
            case define.CMD_DEFINE.RCV_RAW_TXS_ARR_IND :
                if(msg['data'].length && util.isArray(msg['data']))
                {
                    await util.asyncForEach(msg['data'], async (element, index) => {
                        await contractProc.inspectContract(element.jsonData);
                    });
                    
                    // await TxLock.acquire();
                    // await contractProc.sendTxArrToDB();
                    // await TxLock.release();
                }
                break;
            case define.CMD_DEFINE.RCV_TXS_ARR_IND :
                if(msg['data'].length && util.isArray(msg['data']))
                {
                    await contractProc.setContractArray(msg['data']);
                }
            case define.CMD_DEFINE.VALID_TXS_IND :
                if(msg['data'].length && util.isJsonString(msg['data']))
                {
                    // logger.debug("VALID_TXS_IND - NNA");
                    let contractJson = JSON.parse(msg['data']);
                    logger.debug("contractJson.errCode : " + contractJson.errCode);
                    logger.debug("contractJson.jsonData : " + contractJson.jsonData);
                    logger.debug("contractJson.dbKey : " + contractJson.dbKey);
                    contractProc.pushContractArray(contractJson);

                    // await TxLock.acquire();
                    // await contractProc.sendTxArrToDB();
                    // await TxLock.release();
                }
                break;
            case define.CMD_DEFINE.NULL_TXS_IND :
                await TxLock.acquire();
                await contractProc.sendTxArrToDB();
                await TxLock.release();
                break;
            case define.CMD_DEFINE.BLK_NOTI_IND :
                if(msg['data'].length)
                {
                    await contractProc.getBNFromRcvdBlkNoti(msg['data']);
                }
                break;
            case define.CMD_DEFINE.LOGOUT_REQ :
                await contractProc.logoutProcess(msg['data']);
                break;
            default :
                // Error
                break;
            }
        });
    }
    else if (cluster.worker.id === define.CLUSTER_DEFINE.DB_CLUSTER_WORKER_ID) 
    {
        logger.debug("worker ID [" + cluster.worker.id +"] to Communicate with DB");

        //
        // timer.setIntervalChkBlk();

        //
        process.on('message', async (msg) => {
            switch (msg.cmd)
            {
            case define.CMD_DEFINE.BLK_NOTI_IND :
                if(msg['data'].length) {
                    await contractProc.rcvdBlkNotiFromNNA(msg['data']);
                }
                break;
            default :
                // Error
                break;
            }
        });
    }
    else if (cluster.worker.id === define.CLUSTER_DEFINE.ISA_CLUSTER_WORKER_ID) 
    {
        logger.debug("worker ID [" + cluster.worker.id +"] to Communicate with ISA and SCA's cli");
        // Worker to Communicate with ISA and SCA's cli
        await redisUtil.setISARedis();

        // to NNA (Local Use only)
        await redisUtil.setLocalPubRedis();

        //
        cli.cliCallback();

        //
        process.on('message', async (msg) => {
            switch (msg.cmd)
            {
            case define.CMD_DEFINE.BLK_NOTI_IND :
                if(msg['data'].length) {
                    await contractProc.getBNFromRcvdBlkNoti(msg['data']);
                }
                break;
            default :
                // Error
                break;
            }
        });
    }
    else if (cluster.worker.id === define.CLUSTER_DEFINE.KFK_CLUSTER_WORKER_ID) 
    {
        logger.debug("worker ID [" + cluster.worker.id +"] to Consume Contract using kafka");

        //
        timer.setIntervalRawTxArrToNna();

        // Worker to Consume Contract using kafka
        await kafkaUtil.setRdKafkaConsumer(cluster.worker.id);

        // to NNA (Local Use only)
        await redisUtil.setLocalPubRedis();

        //
        process.on('message', async (msg) => {
            switch (msg.cmd)
            {
            case define.CMD_DEFINE.BLK_NOTI_IND :
                if(msg['data'].length) {
                    await contractProc.getBNFromRcvdBlkNoti(msg['data']);
                }
                break;
            default :
                // Error
                break;
            }
        });
    }
    else if (cluster.worker.id >= define.CLUSTER_DEFINE.SCA1_CLUSTER_WORKER_ID) 
    {
        logger.debug("worker ID [" + cluster.worker.id +"] to check Transaction Validation");

        //
        timer.setIntervalTxsArrToNna();

        //
        process.on('message', async (msg) => {
            logger.debug("worker ID [" + cluster.worker.id +"] msg.cmd : " + msg.cmd);
            switch (msg.cmd)
            {
            case define.CMD_DEFINE.RCV_RAW_TXS_IND :
                if(msg['data'].length && util.isJsonString(msg['data']))
                {
                    await contractProc.inspectContract(msg['data']);
                }
                break;
            case define.CMD_DEFINE.RCV_RAW_TXS_ARR_IND :
                if(msg['data'].length && util.isArray(msg['data']))
                {
                    await util.asyncForEach(msg['data'], async (element, index) => {
                        await contractProc.inspectContract(element.jsonData);
                    });
                }
                break;
            case define.CMD_DEFINE.CONTRACT_MODE_REQ:
                if (msg['data'] === 'sigtrue')
                {
                    config.setContractSigChkMode(true);
                }
                else if (msg['data'] === 'sigfalse')
                {
                    config.setContractSigChkMode(false);
                }
                else if (msg['data'] === 'true')
                {
                    config.setContractSigChkMode(true);
                    config.setContractTestMode(false);
                }
                else
                {
                    config.setContractSigChkMode(false);
                    config.setContractTestMode(true);
                }

                break;
            default :
                // Error
                break;
            }
        });
    }

    debug.catchException();

    debug.exceptionHandler();

    process.on('unhandledRejection', debug.unhandledRejection);

    process.on('uncaughtException', debug.uncaughtException);
}

module.exports.sendRawTxsToMaster = async (rawTxs) => {
    await TxLock.acquire();
    process.send({cmd : define.CMD_DEFINE.RCV_RAW_TXS_IND, data : rawTxs});
    await TxLock.release();
}

module.exports.sendRawTxsArrToMaster = async () => {
    await TxLock.acquire();
    let tempArray = [...contractProc.getContractArray()];
    process.send({cmd : define.CMD_DEFINE.RCV_RAW_TXS_ARR_IND, data : tempArray});
    contractProc.reinitContractArray();
    await TxLock.release();
}

module.exports.sendTxsArrToMaster = async () => {
    await TxLock.acquire();
    let tempArray = [...contractProc.getContractArray()];
    process.send({cmd : define.CMD_DEFINE.RCV_TXS_ARR_IND, data : tempArray});
    contractProc.reinitContractArray();
    await TxLock.release();
}

module.exports.sendNullTxsToMaster = async () => {
    await process.send({cmd : define.CMD_DEFINE.NULL_TXS_IND, data : ""});
}

module.exports.sendValidTxsToMaster = async (validTxs) => {
    await TxLock.acquire();
    process.send({cmd : define.CMD_DEFINE.VALID_TXS_IND, data : validTxs});
    await TxLock.release();
}

module.exports.sendContractElementToMaster = async (pubkeyArr) => {
    await process.send({cmd : define.CMD_DEFINE.LOGOUT_REQ, data : pubkeyArr});
}

module.exports.sendContractMode = async (contractMode) => {
    await process.send({cmd : define.CMD_DEFINE.CONTRACT_MODE_REQ, data : contractMode});
}

const sendBlkNotiIndToMaster = async () => {
    await TxLock.acquire();
    let tempArray = [...contractProc.getContractArray()];
    await process.send({cmd : define.CMD_DEFINE.BLK_NOTI_IND, data : tempArray});
    contractProc.reinitContractArray();
    await TxLock.release();
}
