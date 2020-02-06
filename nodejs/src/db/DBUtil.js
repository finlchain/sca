const mysql = require("mysql2/promise");
const winlog = require('./../utils/Winlog.js');
const util = require('./../utils/CommonUtil.js');
const config = require("./../../config/config.js");
const define = require("./../../config/define.js");
const aes = require("./../addon/build/Release/ADDON");

const maria_conn_pool = mysql.createPool(config.mysqlConfig);
const sc_conn_pool = mysql.createPool(config.mysqlSCConfig);

module.exports.dbConfig = config.mysqlConfig;

module.exports.scConfig = config.mysqlSCConfig;

const procedureQuerys = {
    querys: [
        "DROP PROCEDURE IF EXISTS SET_DB_KEY_INDEX",
        "CREATE PROCEDURE SET_DB_KEY_INDEX (IN _DBKeyString VARCHAR(20)) "
        + "BEGIN " 
        + "DECLARE _bigintDBkey BIGINT UNSIGNED; "
        + "DECLARE _stmt VARCHAR(1024); "
        + "SET _bigintDBkey = (SELECT CAST(_DBKeyString AS UNSIGNED INT)); "
        + "SET @SQL := CONCAT('ALTER TABLE contents AUTO_INCREMENT = ', _bigintDBkey); " 
        + "PREPARE _stmt FROM @SQL; "
        + "EXECUTE _stmt; "
        + "DEALLOCATE PREPARE _stmt; "
        + "END"
    ]
}

const ReplicationUserQuerys = {
    querys: [
        "DROP USER IF EXISTS ",
        "CREATE USER ",
        "GRANT REPLICATION SLAVE ON *.* TO ",
        "flush privileges",
    ]
}

const MasterQuerys = {
    querys: [
        "SET GLOBAL server_id = 1",
        "SHOW VARIABLES LIKE 'server_id'",
        "SHOW MASTER STATUS"
    ]
}

const createTables = {
    querys : [
        "CREATE OR REPLACE TABLE `contents` ("
        + "`subnet_id` smallint(5) unsigned DEFAULT NULL,"
        + "`db_key` bigint(20) unsigned NOT NULL AUTO_INCREMENT,"
        + "`contract` text DEFAULT NULL,"
        + "PRIMARY KEY (`db_key`)"
        + ") ENGINE=InnoDB",
        "CREATE OR REPLACE TABLE `ledgers` ("
        + "`subnet_id` smallint(5) unsigned DEFAULT NULL,"
        + "`idx` bigint(20) unsigned NOT NULL AUTO_INCREMENT,"
        + "`from_pk` text NOT NULL,"
        + "`revision` int(11) unsigned NOT NULL DEFAULT 0,"
        + "`db_key` bigint(20) unsigned NOT NULL DEFAULT 0,"
        + "`blk_num` bigint(20) unsigned NOT NULL DEFAULT 0,"
        + "`to_pk` text NOT NULL,"
        + "`kind` int(11) unsigned NOT NULL DEFAULT 0,"
        + "`amount` text DEFAULT NULL,"
        + "`balance` text DEFAULT NULL,"
        + "PRIMARY KEY (`to_pk`(66), `blk_num`, `db_key`, `idx`),"
        + "KEY `idx` (`idx`),"
        + "KEY `balanace` (`from_pk`(66), `revision`)"
        + ") ENGINE=InnoDB",
        "CREATE OR REPLACE TABLE `info` ("
        + "`subnet_id` smallint(5) unsigned DEFAULT NULL,"
        + "`db_key` bigint(20) unsigned NOT NULL,"
        + "`blk_num` bigint(20) unsigned DEFAULT NULL,"
        + "`bgt` bigint(20) unsigned DEFAULT NULL,"
        + "`bct` bigint(20) unsigned DEFAULT NULL,"
        + "`sc_hash` text DEFAULT NULL,"
        + "PRIMARY KEY (`db_key`),"
        + "KEY `sc_hash` (`sc_hash`(64)),"
        + "KEY `blk_num` (`blk_num` DESC)"
        + ") ENGINE=InnoDB"
    ]
}

module.exports.querys = {
    "InsertContents" : 'INSERT INTO contents(subnet_id, contract) VALUES ',
    "InsertInfoWithOutBlkNum" : 'INSERT INTO info(subnet_id, db_key, sc_hash) VALUES ',
    "UpdateBlkNum" : `UPDATE info SET blk_num = ? WHERE `,
    "UpdateBlkGenTime" : 'UPDATE info SET bgt = ? WHERE blk_num = ?',
    "SelectContents" : 'SELECT c.db_key, c.contract FROM contents AS c, info AS i WHERE blk_num = ? AND c.db_key = i.db_key',
    "InsertLedger" : "INSERT INTO ledgers(subnet_id, from_pk, revision, db_key, blk_num, to_pk, kind, amount, balance) VALUES ",
    "TruncateContents" : 'TRUNCATE contents',
    "TruncateInfo" : 'TRUNCATE info',
    "TruncateLedger" : 'TRUNCATE ledgers',
    "DBKeySet" : "CALL SET_DB_KEY_INDEX(?)"
};

const TruncateDB = async () => {
    const connection = await this.CreateConnection(this.scConfig);

    let sql = "TRUNCATE contents";
    await connection.query(sql);

    sql = "TRUNCATE ledgers";
    await connection.query(sql);

    sql = "TRUNCATE info";
    await connection.query(sql);

    await this.connectionClose(connection);
}

const createReplicationUser = async () => {
    let user;
    let pwd;

    const connection = await this.CreateConnection(this.dbConfig);

    user = define.DB_DEFINE.REPLICATION_USERS.DN_USER;
    pwd = aes.AESDecryptPw(process.env.aes_seed_path, "key/me/dn_enc_pw");

    await util.asyncForEach(ReplicationUserQuerys.querys, async (element, index) => {
        if(index === define.DB_DEFINE.QUERY_ARRAY_INDEX.DROP_USER_INDEX) {
            element += `'${user}'@'%'`;
        } else if(index === define.DB_DEFINE.QUERY_ARRAY_INDEX.CREATE_USER_INDEX) {
            element += `'${user}'@'%' IDENTIFIED BY '${pwd}'`;
        } else if(index === define.DB_DEFINE.QUERY_ARRAY_INDEX.GRANT_REPLICATION_INDEX) {
            element += user;
        }
                        
        [query_result] = await connection.query(element);
    });

    user = define.DB_DEFINE.REPLICATION_USERS.DBN_USER;
    pwd = aes.AESDecryptPw(process.env.aes_seed_path, "key/me/dbn_enc_pw");

    await util.asyncForEach(ReplicationUserQuerys.querys, async (element, index) => {
        if(index === define.DB_DEFINE.QUERY_ARRAY_INDEX.DROP_USER_INDEX) {
            element += `'${user}'@'%'`;
        } else if(index === define.DB_DEFINE.QUERY_ARRAY_INDEX.CREATE_USER_INDEX) {
            element += `'${user}'@'%' IDENTIFIED BY '${pwd}'`;
        } else if(index === define.DB_DEFINE.QUERY_ARRAY_INDEX.GRANT_REPLICATION_INDEX) {
            element += user;
        }
                        
        [query_result] = await connection.query(element);
    });

    await this.connectionClose(connection);
}

module.exports.CreateConnection = async (dbConfig) => {
    if(dbConfig.database == "sc") {
        return await sc_conn_pool.getConnection(async conn => conn);
    }
    return await maria_conn_pool.getConnection(async conn => conn);
}

module.exports.executeQueryWithParam = async (connection, query, param) => {
    return await connection.query(query, param);
}

module.exports.executeQueryWithOutParam = async (connection, query) => {
    return await connection.query(query);
}

module.exports.connectionClose = async (connection) => {
    await connection.release();
}

module.exports.truncate = () => {
    TruncateDB();
}

module.exports.initDatabase = async (dbConfig) => {
    let ret;
    const connection = await this.CreateConnection(this.dbConfig);
    let sc_conn;

    try {
        let sql = "CREATE DATABASE IF NOT EXISTS `sc`";
        await connection.query(sql);

        sc_conn = await this.CreateConnection(this.scConfig);

        await util.asyncForEach(createTables.querys, async(element, index) => {
            await sc_conn.query(element);
        });

        await util.asyncForEach(procedureQuerys.querys, async(element, index) => {
            await sc_conn.query(element);
        })

        await TruncateDB();
        await createReplicationUser();

        ret = { res : true };
        winlog.info("Database Init");
    } catch (err) {
        console.log(err);
        ret = { res : false, reason : JSON.stringify(err)};
    }

    await this.connectionClose(connection);
    await this.connectionClose(sc_conn);

    return ret;
}

module.exports.replication = async (dbConfig) => {
    let fileName;
    let filePosition;

    await util.asyncForEach(MasterQuerys.querys, async (element, index) => {
        const connection = await this.CreateConnection(dbConfig);
            
        [query_result] = await connection.query(element);
        if(util.isQueryResultObject(query_result[0])) {
            if(query_result[0].hasOwnProperty('File')) {
                fileName = query_result[0].File;
                filePosition = query_result[0].Position;
            }
        }                   
        await this.connectionClose(connection);
    });
    return { fileName : fileName, filePosition : filePosition };
}
