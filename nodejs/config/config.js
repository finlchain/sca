//
const fs = require("fs");

//
const cryptoSsl = require("./../../../addon/crypto-ssl");

//
const logger = require("./../src/utils/winlog.js");

//
const NETCONF_JSON = JSON.parse(fs.readFileSync("./../../conf/netconf.json"));

//
module.exports.KEY_PATH = {
    PW_SEED: NETCONF_JSON.DEF_PATH.PW_DB_ME + '/' + NETCONF_JSON.DB.PW.NAME.SEED, 
    PW_MARIA : NETCONF_JSON.DEF_PATH.PW_DB_ME + '/' + NETCONF_JSON.DB.PW.NAME.MARIA, 
    PW_REDIS : NETCONF_JSON.DEF_PATH.PW_DB_ME + '/' + NETCONF_JSON.DB.PW.NAME.REDIS, 
    PW_SHARD : NETCONF_JSON.DEF_PATH.PW_DB_ME + '/' + NETCONF_JSON.DB.PW.NAME.SHARD, 
    PW_REPL_NN : NETCONF_JSON.DEF_PATH.PW_DB_ME + '/' + NETCONF_JSON.DB.PW.NAME.REPL_NN, 
    IS_PUBKEY: NETCONF_JSON.DEF_PATH.KEY_REMOTE_IS + '/' + NETCONF_JSON.KEY.NAME.ED_PUBKEY, 
}

//
module.exports.INFO_PATH = {
    KEY_SEED : cryptoSsl.aesDecPw(this.KEY_PATH.PW_SEED, this.KEY_PATH.PW_MARIA), 
}

// 
module.exports.CFG_PATH = {
    CONTRACT_ACTIONS : NETCONF_JSON.DEF_INFO.CONTRACT_ACTIONS, 
    CONTRACT_ERROR : NETCONF_JSON.DEF_INFO.CONTRACT_ERROR, 
    LOCATION : NETCONF_JSON.DEF_INFO.LOCATION, 
    NODE_CFG : NETCONF_JSON.DEF_INFO.NODE_CFG, 
    NET_CFG : {
        NNA_PATH_JSON : NETCONF_JSON.NNA.PATH_JSON, 
        NNA_RRNET_JSON: NETCONF_JSON.NNA.RRNET_JSON, 
        NNA_NODE_JSON: NETCONF_JSON.NNA.NODE_JSON, 
    }, 
    MARIA : {
        DB_HOST : NETCONF_JSON.DB.MARIA.HOST, 
        DB_PORT : NETCONF_JSON.DB.MARIA.PORT, 
        DB_USER : NETCONF_JSON.DB.MARIA.USER, 
        PW_MARIA : cryptoSsl.aesDecPw(this.KEY_PATH.PW_SEED, this.KEY_PATH.PW_MARIA),
        REPL_USERS : [
            NETCONF_JSON.DB.REPL.USER_NN, 
        ],
        REPL_USERS_PW : [
            cryptoSsl.aesDecPw(this.KEY_PATH.PW_SEED, this.KEY_PATH.PW_REPL_NN), 
        ],
        SHARD_USERS : [
            NETCONF_JSON.DB.SHARD.USER_NN, 
        ],
        SHARD_USERS_PW : [
            cryptoSsl.aesDecPw(this.KEY_PATH.PW_SEED, this.KEY_PATH.PW_SHARD), 
        ]
    },
    REDIS : {
        HOST : NETCONF_JSON.DB.REDIS.HOST, 
        PORT : NETCONF_JSON.DB.REDIS.PORT, 
        PW_REDIS : cryptoSsl.aesDecPw(this.KEY_PATH.PW_SEED, this.KEY_PATH.PW_REDIS)
    },
    KAFKA : {
        GROUP_ID : NETCONF_JSON.KAFKA.GROUP_ID_KAFKA,
        BROKER_LIST : NETCONF_JSON.KAFKA.BROKER_LIST, 
    },
}

// Version info
module.exports.paddy = (num, padLen, padChar) => {
    var pad_char = typeof padChar !== 'undefined' ? padChar : '0';
    var pad = new Array(1 + padLen).join(pad_char);

    return (pad + num).slice(-pad.length);
}

const getVerInfo = () => {
    //
    let mainVerInfo = '0';
    let subVerInfo = '0';

    //
    let lineArr = fs.readFileSync(this.CFG_PATH.NODE_CFG).toString().split('\n');

    for (idx in lineArr)
    {
        if (lineArr[idx].includes('VER_INFO_MAIN'))
        {
            mainVerInfo = lineArr[idx].split(' ')[2];
        }
        else if (lineArr[idx].includes('VER_INFO_SUB'))
        {
            subVerInfo = lineArr[idx].split(' ')[2];
        }
    }

    let verInfo = mainVerInfo + '.' + this.paddy(subVerInfo, 4);

    return verInfo;
}

//
module.exports.VERSION_INFO = getVerInfo();

// NN's node.json
module.exports.NN_NODE_JSON = JSON.parse(fs.readFileSync(this.CFG_PATH.NET_CFG.NNA_NODE_JSON));

// NN's path.json
const NN_PATH_JSON = JSON.parse(fs.readFileSync(this.CFG_PATH.NET_CFG.NNA_PATH_JSON));
module.exports.NN_PATH_JSON = NN_PATH_JSON;

// Contract Error Code
module.exports.CONTRACT_ERROR_JSON = JSON.parse(fs.readFileSync(this.CFG_PATH.CONTRACT_ERROR));

// Contract Kind
module.exports.CONTRACT_ACTIONS_JSON = JSON.parse(fs.readFileSync(this.CFG_PATH.CONTRACT_ACTIONS));

// Location
module.exports.LOCATION_JSON = JSON.parse(fs.readFileSync(this.CFG_PATH.LOCATION));

// my key signature type "ECDSA" or "EDDSA"
module.exports.SIG_TYPE = NN_PATH_JSON.PATH.KEY.CONS.PRIKEY_NAME.includes("ed") ? "EDDSA" : "ECDSA";

//
module.exports.IS_ENC_PRIKEY = NN_PATH_JSON.PATH.KEY.CONS.PRIKEY_NAME.includes("fin") ? true : false;

// Redis
module.exports.REDIS_CONFIG = {
    host : this.CFG_PATH.REDIS.HOST,
    port : parseInt(this.CFG_PATH.REDIS.PORT),
    password : this.CFG_PATH.REDIS.PW_REDIS,
}

module.exports.MARIA_CONFIG = {
    host: this.CFG_PATH.MARIA.DB_HOST,
    port: this.CFG_PATH.MARIA.DB_PORT,
    user: this.CFG_PATH.MARIA.DB_USER,
    password: this.CFG_PATH.MARIA.PW_MARIA,
    supportBigNumbers : true,
    bigNumberStrings : true,
    connectionLimit : 10
};

// network key
module.exports.MY_KEY_PATH_CONFIG = {
    prikey : NN_PATH_JSON.PATH.KEY.CONS.MY_KEY + NN_PATH_JSON.PATH.KEY.CONS.PRIKEY_NAME,
    pubkey : NN_PATH_JSON.PATH.KEY.CONS.MY_KEY + NN_PATH_JSON.PATH.KEY.CONS.PUBKEY_NAME
}

// check redis subscribe true or false
module.exports.REDIS_PUBSUB_CHECK = false;
//
module.exports.DB_TEST_MODE = false;
module.exports.DB_TEST_MODE_DROP = false;
module.exports.DB_TEST_MODE_REPL = false;
module.exports.CONTRACT_SIG_CHK_MODE = true;
module.exports.CONTRACT_TEST_MODE = false;
module.exports.ACCOUNT_TEST_MODE = false;

//
module.exports.setDbTestMode = (testMode) => {
    this.DB_TEST_MODE = testMode;

    return this.DB_TEST_MODE;
}

module.exports.getDbTestMode = () => {
    return this.DB_TEST_MODE;
}

//
module.exports.setContractSigChkMode = (sigChkMode) => {
    this.CONTRACT_SIG_CHK_MODE = sigChkMode;

    return this.CONTRACT_SIG_CHK_MODE;
}

module.exports.getContractSigChkMode = () => {
    return this.CONTRACT_SIG_CHK_MODE;
}

//
module.exports.setContractTestMode = (testMode) => {
    this.CONTRACT_TEST_MODE = testMode;

    return this.CONTRACT_TEST_MODE;
}

module.exports.getContractTestMode = () => {
    return this.CONTRACT_TEST_MODE;
}

//
module.exports.setAccountTestMode = (testMode) => {
    this.ACCOUNT_TEST_MODE = testMode;

    return this.ACCOUNT_TEST_MODE;
}

module.exports.getAccountTestMode = () => {
    return this.ACCOUNT_TEST_MODE;
}


//
module.exports.KAFKA_CONSUMER_CONFIG = {
    'group.id': this.CFG_PATH.KAFKA.GROUP_ID,
    'metadata.broker.list': this.CFG_PATH.KAFKA.BROKER_LIST,
    //'metadata.broker.list': process.argv[2] === undefined ? this.CFG_PATH.KAFKA.BROKER_LIST : process.argv[2],
    'session.timeout.ms': 10000,
    'heartbeat.interval.ms': 3000,
    'max.poll.interval.ms': 500000,
    'auto.offset.reset': 'smallest',
    'offset_commit_cb': function (err, topicPartitions) {
        if (err) {
            logger.error(err);
        } else {
            logger.debug(topicPartitions);
        }
    }
}

//
module.exports.KAFKA_PRODUCER_CONFIG = {
    // 'client.id': this.CFG_PATH.KAFKA.GROUP_ID,
    'metadata.broker.list': this.CFG_PATH.KAFKA.BROKER_LIST,
    // 'compression.codec': 'gzip',
    // 'retry.backoff.ms': 200,
    // 'message.send.max.retries': 10,
    // 'socket.keepalive.enable': true,
    // 'queue.buffering.max.messages': 100000,
    // 'queue.buffering.max.ms': 1000,
    // 'batch.num.messages': 1000000,
    'dr_cb': true
}

//
module.exports.KAFKA_PRODUCER_STREAM_CONFIG = {
    'metadata.broker.list': this.CFG_PATH.KAFKA.BROKER_LIST,
}

// IP Control
module.exports.IP_ASSIGN = {
    CTRL : 0,
    DATA : 0,
    REPL : 0
};
