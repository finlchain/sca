const config = require("./../../config/config.js");
const define = require("./../../config/define.js");
const Kafka = require('node-rdkafka');
const contract = require('./../contract/Contract.js');
const winlog = require('./../utils/Winlog.js');

let topicName;

module.exports.getTopicName = () => {
    return topicName;
} 

module.exports.SetTopicName = () => {
    let NNAconf = config.nn_node_json;
    let P2Proot = NNAconf.NODE.P2P.CLUSTER.ROOT;
    let TopicName = P2Proot.slice(
        define.P2P_DEFINE.P2P_TOPIC_NAME_SPLIT_INDEX.START, 
        define.P2P_DEFINE.P2P_TOPIC_NAME_SPLIT_INDEX.END);

    topicName = TopicName;
};

module.exports.setKafkaConsumer = async (cluster_id) => {
    let consumer = new Kafka.KafkaConsumer(config.KafkaConfig);

    consumer.on('ready', (arg) => {
        consumer.subscribe([topicName]);
        consumer.consume();
        winlog.info("Cluster ID : " + cluster_id + "'s Kafka Consumer ready to consume " + JSON.stringify(arg));
        winlog.info(`Consumption topic name [${topicName}] `);
    });

    consumer.on('data', async (data) => {
        winlog.info("Recieved Contract From Wallet");
        winlog.info(data.value);

//        let len = data.value.toString().length; // - 1
        let contract_res = await contract.createTx(JSON.parse(JSON.stringify(Buffer.from(data.value).toString())));
        // let contract_res = await contract.createTx(data.value.toString());
        winlog.info(JSON.stringify(contract_res));
    });

    consumer.on('disconnected', (arg) => {
        winlog.info("Kafka Consumer Disconnected" + JSON.stringify(arg));
    });

    consumer.on('event.error', (err) => {
        winlog.info("Kafka Consumer Error : ", err);
    });

    consumer.connect();

}