//
const net = require('net');
const logger = require('./../utils/winlog.js');

//
let shardSock;

module.exports.checkIP = (ipAddr) => {
    if(define.REGEX.IP_ADDR_REGEX.test(ipAddr)) {
        return true;
    }
    return false;
}

module.exports.openShardServerSock = (ip, port) => {
    
    shardSock = net.createServer( (shard) => {
        logger.info("ShardDB Connection");
        shard.on('data', async (data) => {
            logger.debug("shardSock Received Message : ");
            logger.debug(data.toString());
        });

        shard.on('error', (err) => {
            logger.error("Shard Server Socket Error : " + JSON.stringify(err));
        });

        shard.on('timeout', () => {
            logger.error("Shard Socket Timeout");
        });

        shard.on('close', () => {
            logger.error("Close Shard Socket");
        });
    });

    shardSock.listen({ port : port, host : ip}, () =>{
        logger.info("Shard DB Server Listening port : [" + port + "]");
    });
}

module.exports.closeShardServerSock = () => {
    shardSock.close();
    logger.warn("Shard Server Socket Closed");
}