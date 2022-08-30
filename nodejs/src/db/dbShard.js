//
const util = require('./../utils/commonUtil.js');
const dbUtil = require('./../db/dbUtil.js');
const dbNN = require('./../db/dbNN.js');
const config = require("./../../config/config.js");
const define = require("./../../config/define.js");
const cryptoUtil = require("./../sec/cryptoUtil.js");
const logger = require('./../utils/winlog.js');
const debug = require("./../utils/debug.js");

//
const shardQuerys = {
    userQuerys: [
        "DROP USER IF EXISTS ",
        "CREATE USER ",
        "GRANT SELECT ON *.* TO ",
        "flush privileges",
    ]
}

/////////////////////////////////////////////////////////////
// Shard
module.exports.dropShardUser = async () => {
    let user;

    const conn = await dbUtil.getConn();

    await util.asyncForEach(config.CFG_PATH.MARIA.SHARD_USERS, async (element, index) => {
        user = element;
        logger.debug("SHARD user : " + user);

        await util.asyncForEach(shardQuerys.userQuerys, async (element2, index) => {
            if(index === define.DB_DEFINE.SHARD_USERS_QUERY_INDEX.DROP_USER_INDEX) {
                element2 += `'${user}'@'%'`;

                [query_result] = await conn.query(element2);
            }
        });
    });

    await dbUtil.releaseConn(conn);
}

const createShardUser = async () => {
    let user;
    let pwd;

    const conn = await dbUtil.getConn();

    await util.asyncForEach(config.CFG_PATH.MARIA.SHARD_USERS, async (element, index) => {
        user = element;
        pwd = config.CFG_PATH.MARIA.SHARD_USERS_PW[index];

        logger.debug("SHARD user : " + user + ", pw : " + pwd);

        await util.asyncForEach(shardQuerys.userQuerys, async (element, index) => {
            if(index === define.DB_DEFINE.SHARD_USERS_QUERY_INDEX.DROP_USER_INDEX) {
                element += `'${user}'@'%'`;
            } else if(index === define.DB_DEFINE.SHARD_USERS_QUERY_INDEX.CREATE_USER_INDEX) {
                element += `'${user}'@'%' IDENTIFIED BY '${pwd}'`;
            } else if(index === define.DB_DEFINE.SHARD_USERS_QUERY_INDEX.GRANT_ALL_INDEX) {
                element += `'${user}'@'%' WITH GRANT OPTION`;
            }
                            
            [query_result] = await conn.query(element);
        });
    });

    await dbUtil.releaseConn(conn);
}

const dropShardServers = async () => {
    const conn = await dbUtil.getConn();

    let queryV = "SELECT Server_name FROM mysql.servers";

    [query_result] = await conn.query(queryV);
    // logger.debug("mysql.servers length : " + query_result.length);

    for(var i = 0; i < query_result.length; i++)
    {
        // for ( var keyNm in query_result[i]) {
        //     logger.debug("key : " + keyNm + ", value : " + query_result[i][keyNm]);
        // }

        queryV = "DROP SERVER if exists " + query_result[i]['Server_name'];
        // logger.debug("queryV : " + queryV);
        await conn.query(queryV);
    }

    await dbUtil.releaseConn(conn);
}

const createShardServers = async () => {
    let user;
    let pwd;
    let port;

    const conn = await dbUtil.getConn();

    await util.asyncForEach(config.CFG_PATH.MARIA.SHARD_USERS, async (element, index) => {
        user = element;
        pwd = config.CFG_PATH.MARIA.SHARD_USERS_PW[index];
        port = dbUtil.dbConfig.port;

        let nnaIpArr = cryptoUtil.getNnaIPs();
        let subNetIdArr = cryptoUtil.getNnaSubNetIds();

        logger.debug("nnaIPs.length : " + nnaIpArr.length);

        await util.asyncForEach(nnaIpArr, async (ip, index) => {
            //logger.debug("index : " + index + ", ip :" + ip);
            let queryV = `CREATE SERVER shard_db_${subNetIdArr[index]} `
                    + `FOREIGN DATA WRAPPER mysql `
                    + `OPTIONS(`
                    + `HOST '${ip}',`
                    + `USER '${user}',`
                    + `PASSWORD '${pwd}',`
                    + `PORT ${port}` + ")";
            
            logger.debug("createShardServers queryV : " + queryV);
            await conn.query(queryV);
        });
    });

    await dbUtil.releaseConn(conn);
}

const createShardTables = async () => {
    let ret;
    let subNetIdArr = cryptoUtil.getNnaSubNetIds();

    const conn = await dbUtil.getConn();

    try {
        // sc database
        let sql = dbNN.querys.sc.useSC;
        await conn.query(sql);

        await util.asyncForEach(dbNN.createTables.scQuerys, async(element, index) => {
            //logger.debug("element : " + element);
            element = util.stringReplace(element, `${dbUtil.tableAppendix.tableName}`, `${dbNN.createTableNames.scQuerys[index]}${dbUtil.tableAppendix.shard_exp}`);
            element = util.stringReplace(element, `${dbUtil.tableAppendix.appendix}`, `${dbUtil.tableAppendix.spider} "${dbNN.createTableNames.scQuerys[index]}"'`);
            element += `${dbUtil.tableAppendix.partition}`;
            element += `(`;
            await util.asyncForEach(subNetIdArr, async (subNetId, index) => {
                //logger.debug("index : " + index + ", subNetId :" + subNetId);
                element += `PARTITION shard_${subNetId} COMMENT = 'srv "shard_db_${subNetId}"'`;

                if(index < (subNetIdArr.length-1))
                {
                    element += `, `;
                }
            });
            element += `)`;
            // logger.debug("createShardTables scQuerys : " + element);
            await conn.query(element);
        });

        // block database
        sql = dbNN.querys.block.useBlock;
        await conn.query(sql);

        await util.asyncForEach(dbNN.createTables.blockQuerys, async(element, index) => {
            //logger.debug("element : " + element);
            element = util.stringReplace(element, `${dbUtil.tableAppendix.tableName}`, `${dbNN.createTableNames.blockQuerys[index]}${dbUtil.tableAppendix.shard_exp}`);
            element = util.stringReplace(element, `${dbUtil.tableAppendix.appendix}`, `${dbUtil.tableAppendix.spider} "${dbNN.createTableNames.blockQuerys[index]}"'`);
            element += `${dbUtil.tableAppendix.partition}`;
            element += `(`;
            await util.asyncForEach(subNetIdArr, async (subNetId, index) => {
                //logger.debug("index : " + index + ", subNetId :" + subNetId);
                element += `PARTITION shard_${subNetId} COMMENT = 'srv "shard_db_${subNetId}"'`;

                if(index < (subNetIdArr.length-1))
                {
                    element += `, `;
                }
            });
            element += `)`;
            logger.debug("createShardTables blockQuerys : " + element);
            await conn.query(element);
        });

        await util.asyncForEach(dbNN.createTables.blockShardQuerys, async(element, index) => {
            //logger.debug("element : " + element);
            element = util.stringReplace(element, `${dbUtil.tableAppendix.tableName}`, `${dbNN.createTableNames.blockShardQuerys[index]}${dbUtil.tableAppendix.shard_exp}`);
            element = util.stringReplace(element, `${dbUtil.tableAppendix.appendix}`, `${dbUtil.tableAppendix.spider} "${dbNN.createTableNames.blockShardQuerys[index]}"'`);
            element += `${dbUtil.tableAppendix.partition}`;
            element += `(`;
            await util.asyncForEach(subNetIdArr, async (subNetId, index) => {
                //logger.debug("index : " + index + ", subNetId :" + subNetId);
                element += `PARTITION shard_${subNetId} COMMENT = 'srv "shard_db_${subNetId}"'`;

                if(index < (subNetIdArr.length-1))
                {
                    element += `, `;
                }
            });
            element += `)`;

            // logger.debug("createShardTables blockShardQuerys : " + element);
            await conn.query(element);
        });

        // account database
        sql = dbNN.querys.account.useAccount;
        await conn.query(sql);

        await util.asyncForEach(dbNN.createTables.accountQuerys, async(element, index) => {
            //logger.debug("element : " + element);
            element = util.stringReplace(element, `${dbUtil.tableAppendix.tableName}`, `${dbNN.createTableNames.accountQuerys[index]}${dbUtil.tableAppendix.shard_exp}`);
            element = util.stringReplace(element, `${dbUtil.tableAppendix.appendix}`, `${dbUtil.tableAppendix.spider} "${dbNN.createTableNames.accountQuerys[index]}"'`);
            element += `${dbUtil.tableAppendix.partition}`;
            element += `(`;
            await util.asyncForEach(subNetIdArr, async (subNetId, index) => {
                //logger.debug("index : " + index + ", subNetId :" + subNetId);
                element += `PARTITION shard_${subNetId} COMMENT = 'srv "shard_db_${subNetId}"'`;

                if(index < (subNetIdArr.length-1))
                {
                    element += `, `;
                }
            });
            element += `)`;
            // logger.debug("createShardTables accountQuerys : " + element);
            await conn.query(element);
        });
        
        ret = { res : true };
        logger.info("Database Init - shard");
    } catch (err) {
        debug.error(err);
        ret = { res : false, reason : JSON.stringify(err)};
    }

    await dbUtil.releaseConn(conn);

    return ret;
}

module.exports.initShard = async () => {
    if (config.DB_CREATE_USER === true)
    {
        await createShardUser();
    }


    await dropShardServers();
    await createShardServers();

    await createShardTables();
}
