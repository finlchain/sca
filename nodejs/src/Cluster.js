const define = require("./../config/define.js");
const config = require("./../config/config.js");
const winlog = require("./utils/Winlog.js");
const util = require("./utils/CommonUtil.js");
const timer = require("./utils/Timer.js");
const contract = require("./contract/Contract.js");
const redis = require("./db/RedisUtil.js");
const db = require("./db/DBUtil.js");
const keyUtil = require("./sec/KeyUtil.js");
const kafkaUtil = require("./net/KafkaUtil.js");

const { Sema } = require("async-sema");
const cluster = require("cluster");
// const os = require("os");

const TxLock = new Sema(1, { capacity : 100} );

const SCAInfo = () => {
    winlog.info("==================================================");
    winlog.info("= FINL Block Chain                               =");
    winlog.info("= [ SCA Ver : " + config.VERSION_INFO.SCA_VERSION + " ]                            =");
    winlog.info("==================================================");
}

module.exports.ClusterInit = async () => {    
    await kafkaUtil.SetTopicName();
    await keyUtil.keyMeSet(config.keyMePathConfig, config.wKeyMePathConfig);
    await keyUtil.setISPubkey(config.is_pub_key_path);

    await contract.setDBKeyIndex();

    if(cluster.isMaster) 
    {
        SCAInfo();
        await db.initDatabase(db.dbConfig);

        // await os.cpus().forEach( async(cpu) => {
        //     await cluster.fork();
        // });

        for(var i = 0; i < define.CLUSTER_DEFINE.MAX_CLUSTER_WORKER_NUM; i++) {
            cluster.fork();
        }

        cluster.on("online", (worker) => {
            // Each Worker Online then something TODO Here
            // console.log("[M] workerid : " + worker.id + " is online");
        });

        cluster.on("exit", (worker, code, signal) => {
            // When some worker eixt then code here
            winlog.info("[M] " + worker.id + "'s worker is exit"); 

            // exit code error Handle
            // code : process exit code
            // if(code === define.CLUSTER_DEFINE.EXIT_CODE.NORMAL) {
            //     cluster.fork();
            // }
            winlog.error("[M] " + worker.id + "'s worker exit code : " + code.toString());
            winlog.error("[M] " + worker.id + "'s worker exit signal : " + signal);
            cluster.fork();
        });

        cluster.on("message", async (worker, message) => {
            // recv from kafka worker's contract data
            // then merge array of contract data
            // and send to NNA Worker

            if(util.isArray(message)) {
                // winlog.info("[M] received");
                await contract.setContractArray(message);
            } else if(parseInt(message) === define.CLUSTER_DEFINE.REDIS_CHANNEL_ERROR) {
                winlog.error("SCA Process Exit : Redis Channel Check Error");
                process.exit(define.CLUSTER_DEFINE.EXIT_CODE.NORMAL);
            }
        });

        // setInterval(PassTxsToNNAWorker, define.CLUSTER_DEFINE.SEND_TXS_TO_NNA_INTERVAL);
    } 
    else if (cluster.worker.id === define.CLUSTER_DEFINE.NNA_CLUSTER_WORKER_ID) 
    {
        // Worker for Communicate with NNA
        await redis.setNNARedis();

        process.on('message', async (message) => {
            if(util.isArray(message) && message.length) {
                await contract.setContractArray(message);
            }
        });
    } 
    else if (cluster.worker.id === define.CLUSTER_DEFINE.ISA_CLUSTER_WORKER_ID) 
    {
        // Worker for Communicate with ISA and SCA's cli
        await redis.setISARedis();
    }
    else 
    {
        // Worker for Consume contract using kafka
        await kafkaUtil.setKafkaConsumer(cluster.worker.id);
    }

    // setContractScheduleTimer
    await timer.setContractScheduler(cluster, TxLock);
}