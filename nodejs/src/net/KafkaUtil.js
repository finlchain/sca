//
const rdKafka = require('node-rdkafka');

//
const config = require("./../../config/config.js");
const define = require("./../../config/define.js");
const contractProc = require('./../contract/contractProc.js');
const myCluster = require("./../cluster.js");
const util = require('./../utils/commonUtil.js');
const logger = require('./../utils/winlog.js');

////////////////////////////////////////////////////////////
//
let cTopicName; // Consumer

//
module.exports.getTopicName = () => {
    return cTopicName;
} 

module.exports.setTopicName = () => {
    let nnaConf = config.NN_NODE_JSON;
    let P2Proot = nnaConf.NODE.P2P.CLUSTER.ROOT;
    let clusterId = P2Proot.slice(
        define.P2P_DEFINE.P2P_TOPIC_NAME_SPLIT_INDEX.START, 
        define.P2P_DEFINE.P2P_TOPIC_NAME_SPLIT_INDEX.END);

        cTopicName = clusterId;
    logger.debug("cTopicName : " + cTopicName);
};

////////////////////////////////////////////////////////////
//
module.exports.setRdKafkaConsumer = async (cluster_id) => {
    logger.debug("config.KAFKA_CONSUMER_CONFIG : " + JSON.stringify(config.KAFKA_CONSUMER_CONFIG));
    let consumer = new rdKafka.KafkaConsumer(config.KAFKA_CONSUMER_CONFIG);

    consumer.on('ready', (arg) => {
        consumer.subscribe([cTopicName]);
        consumer.consume();
        logger.debug("Cluster ID : " + cluster_id + "'s Kafka Consumer ready to consume " + JSON.stringify(arg));
        logger.debug(`Consumption topic name [${cTopicName}] `);
    });

    consumer.on('data', async (data) => {
        logger.debug("Recieved Contract From Wallet");
        logger.debug(data.value);

        let contractJson = Buffer.from(data.value).toString();

//        let len = data.value.toString().length; // - 1
        // let contract_res = await contractProc.inspectContract(JSON.parse(JSON.stringify(contractJson))); // OK
        // let contract_res = await contractProc.inspectContract(contractJson); // OK
        // logger.debug(JSON.stringify(contract_res));
        // await myCluster.sendTxsArrToMaster();
        
        if(util.isJsonString(contractJson))
        {
            // // Option 1
            // myCluster.sendRawTxsToMaster(contractJson);

            // Option 2
            let data = {jsonData : contractJson};
            contractProc.pushContractArray(data);
        }
        else
        {
            logger.error("inspectContract - CONTRACT_ERROR_JSON.JSON_FORMAT");
            // return config.CONTRACT_ERROR_JSON.JSON_FORMAT;
        }
    });

    consumer.on('disconnected', (arg) => {
        logger.error("Kafka Consumer Disconnected : " + JSON.stringify(arg));
    });

    consumer.on('event.error', (err) => {
        logger.error("Kafka Consumer Error : ", err);
    });

    consumer.connect();
}
