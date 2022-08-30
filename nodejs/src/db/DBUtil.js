//
const mysql = require("mysql2/promise");

//
const config = require("./../../config/config.js");
const debug = require("./../utils/debug.js");
const logger = require('./../utils/winlog.js');

//
const maria_conn_pool = mysql.createPool(config.MARIA_CONFIG);

const dbConfig = config.MARIA_CONFIG;

module.exports.dbConfig = dbConfig;

//
var connNum = 0;

module.exports.getConn = async () => {
    try {
        connNum += 1;
        // logger.warn("getConn connNum " + connNum + " invalid");
        return await maria_conn_pool.getConnection(async conn => conn);
    } catch (err) {
        debug.error(err);
        logger.error("getConn Func");
    }
}

module.exports.releaseConn = async (conn) => {
    try {
        connNum -= 1;
        // logger.warn("releaseConn connNum " + connNum + " error");
        await conn.release();
    } catch (error) {
        // debug.error(error);
        logger.error("Error - releaseConn Func");
    }
}

module.exports.exeQueryParam = async (conn, queryV, param) => {
    logger.debug("queryV : " + queryV);
    logger.debug("param : " + param);
// 
    return await conn.query(queryV, param);
}

module.exports.exeQuery = async (conn, queryV) => {
    logger.debug("queryV : " + queryV);

    return await conn.query(queryV);
}

//////////////////////////////////////////////////////////////////////////////////////
//
module.exports.queryPre = async (queryV, param) => {
    // logger.debug("func : queryPre");

    const conn = await this.getConn();
    [query_result] = await this.exeQueryParam(conn, queryV, param);

    await this.releaseConn(conn);

    // logger.debug("query_result length : " + query_result.length);
    // for(var i = 0; i < query_result.length; i++)
    // {
    //     for ( var keyNm in query_result[i]) {
    //         logger.debug("key : " + keyNm + ", value : " + query_result[i][keyNm]);
    //     }
    // }

    // logger.debug("query_result : " + JSON.stringify(query_result));

    return query_result;
}

module.exports.query = async (queryV) => {
    // logger.debug("func : query");

    const conn = await this.getConn();
    [query_result] = await this.exeQuery(conn, queryV);

    await this.releaseConn(conn);
    

    // logger.debug("query_result length : " + query_result.length);
    // for(var i = 0; i < query_result.length; i++)
    // {
    //     for ( var keyNm in query_result[i]) {
    //         logger.debug("key : " + keyNm + ", value : " + query_result[i][keyNm]);
    //     }
    // }

    // logger.debug("query_result : " + JSON.stringify(query_result));

    return query_result;
}

module.exports.actQuery = async (queryV) => {
    logger.debug("actQuery queryV : " + queryV);
    let query_result =  await this.query(queryV);

    logger.debug("actQuery result : " + JSON.stringify(query_result));
}

module.exports.truncate = (dbName) => {
    let queryV = ``;
    try{
        queryV = `TRUNCATE ${dbName}`
    } catch (err) {
        // debug.error(err);
        logger.error("getConn Func");
    }

    return queryV;
}

//////////////////////////////////////////////////////////////////////////////////////
//
module.exports.tableAppendix = {
    "tableName" : `myTableName`,
    "appendix" : `myAppendix`,
    "shard_exp" : `_shard`,
    "innoDB" : `ENGINE=InnoDB`,
    "spider" : `ENGINE=spider COMMENT='wrapper "mysql", table`,
    "partition" : `PARTITION BY KEY (subnet_id)`,
}
