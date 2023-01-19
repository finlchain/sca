//
const config = require("./../../config/config.js");
const define = require("./../../config/define.js");
const util = require('./../utils/commonUtil.js');
const dbUtil = require('./../db/dbUtil.js');
const logger = require('./../utils/winlog.js');
const debug = require("./../utils/debug.js");

//
const procedureQuerys = {
    scQuerys: [
        // "DROP PROCEDURE IF EXISTS SET_DB_KEY_INDEX",
        "CREATE PROCEDURE IF NOT EXISTS SET_DB_KEY_INDEX (IN _DBKeyString VARCHAR(20)) "
        + "BEGIN " 
        + "DECLARE _bigintDBkey BIGINT UNSIGNED; "
        + "DECLARE _stmt VARCHAR(1024); "
        + "SET _bigintDBkey = (SELECT CAST(_DBKeyString AS UNSIGNED INT)); "
        + "SET @SQL := CONCAT('ALTER TABLE sc_contents AUTO_INCREMENT = ', _bigintDBkey); " 
        + "PREPARE _stmt FROM @SQL; "
        + "EXECUTE _stmt; "
        + "DEALLOCATE PREPARE _stmt; "
        + "END"
    ]
}

const createDbNames = {
    "sc" : "sc",
    "block" : "block",
    "account" : "account",
}

module.exports.createTableNames = {
    scQuerys : [
        "sc_contents",
        "sc_delayed_txs",
    ],
    blockQuerys : [
        "blk_txs",
    ],
    blockShardQuerys : [
        "blk_contents",
    ],
    accountQuerys : [
        "account_tokens",
        "account_users",
        "account_ledgers",
        "account_balance",
        "account_sc",
    ]
}

const createTableFields = {
    scQuerys : [
        // sc_contents
          "`subnet_id` smallint(5) unsigned DEFAULT 0 NOT NULL,"
        + "`create_tm` bigint(20) unsigned DEFAULT 0 NOT NULL COMMENT 'Contract Create Time', "
        // + "`prv_db_key` bigint(20) unsigned DEFAULT 0 NOT NULL,"
        // + "`blk_num` bigint(20) unsigned DEFAULT 0 NOT NULL COMMENT 'Block Number', "
        // + "`db_key` bigint(20) unsigned NOT NULL AUTO_INCREMENT,"
        + "`db_key` bigint(20) unsigned NOT NULL,"
        + "`confirmed` tinyint(3) NOT NULL DEFAULT 0,"
        + "`from_account` bigint(20) unsigned DEFAULT 0 NOT NULL,"
        + "`to_account` bigint(20) unsigned DEFAULT 0 NOT NULL,"
        + "`action` int(11) unsigned NOT NULL DEFAULT 0,"
        + "`c_action` int(11) unsigned NOT NULL DEFAULT 0,"
        + "`dst_account` bigint(20) unsigned DEFAULT 0 NOT NULL,"
        + "`amount` text NOT NULL,"
        + "`signed_pubkey` text NOT NULL COMMENT 'Signed Public Key', "
        + "`err_code` smallint(5) NOT NULL DEFAULT 0,"
        + "`contract` json DEFAULT NULL,"
        + "KEY `action` (`action`, `create_tm`) USING BTREE, "
        + "KEY `c_action` (`action`, `c_action`) USING BTREE, "
        + "KEY `to_account` (`to_account`) USING BTREE, "
        + "KEY `from_account` (`from_account`) USING BTREE, "
        + "KEY `dst_account` (`dst_account`) USING BTREE, "
        + "KEY `db_key` (`db_key`, `confirmed`) USING BTREE, "
        + "KEY `create_tm` (`create_tm`) USING BTREE, "
        + "KEY `subnet_id` (`subnet_id`) USING BTREE, "
        + "UNIQUE KEY `uk_db_key` (`db_key`, `subnet_id`), "
        + "PRIMARY KEY (`db_key`, `confirmed`, `create_tm`, `to_account`, `from_account`, `subnet_id`) USING BTREE",

        // sc_delayed_txs
          "`subnet_id` smallint(5) unsigned DEFAULT 0 NOT NULL,"
        + "`idx` bigint(20) unsigned NOT NULL AUTO_INCREMENT,"
        + "`create_tm` bigint(20) unsigned DEFAULT 0 NOT NULL COMMENT 'Contract Create Time', "
        + "`executed` tinyint(1) NOT NULL DEFAULT 0,"
        + "`from_account` bigint(20) unsigned DEFAULT 0 NOT NULL,"
        + "`to_account` bigint(20) unsigned DEFAULT 0 NOT NULL,"
        + "`action` int(11) unsigned NOT NULL DEFAULT 0,"
        + "`c_action` int(11) unsigned NOT NULL DEFAULT 0,"
        + "`dst_account` bigint(20) unsigned DEFAULT 0 NOT NULL,"
        + "`amount` text NOT NULL,"
        + "`signed_pubkey` text NOT NULL COMMENT 'Signed Public Key', "
        + "`err_code` smallint(5) NOT NULL DEFAULT 0,"
        + "`contract` json DEFAULT NULL,"
        + "KEY `executed1` (`executed`, `action`, `from_account`, `to_account`) USING BTREE, "
        + "KEY `executed2` (`executed`, `create_tm`) USING BTREE, "
        + "KEY `create_tm` (`create_tm`) USING BTREE, "
        + "UNIQUE KEY `uk_idx` (`idx`, `subnet_id`), "
        + "PRIMARY KEY (`idx`, `executed`, `create_tm`, `action`, `from_account`, `to_account`, `subnet_id`) USING BTREE",
    ],
    blockQuerys : [
        // blk_txs
          "`subnet_id` smallint(5) unsigned DEFAULT 0 NOT NULL, "
        + "`blk_num` bigint(20) unsigned DEFAULT 0 NOT NULL COMMENT 'Block Number', "
        + "`db_key` bigint(20) unsigned DEFAULT 0 NOT NULL COMMENT 'DB Key', "
        + "`sc_hash` text NOT NULL COMMENT 'Transaction Hash', "
        + "KEY `sc_hash` (`sc_hash`(64)) USING BTREE, "
        + "UNIQUE KEY `uk_db_key` (`db_key`, `subnet_id`), "
        + "PRIMARY KEY (`db_key`, `blk_num`, `sc_hash`(64), `subnet_id`) USING BTREE",
    ],
    blockShardQuerys : [
        // blk_contents
          "`subnet_id` smallint(5) unsigned DEFAULT 0 NOT NULL, "
        + "`blk_num` bigint(20) unsigned DEFAULT 0 NOT NULL COMMENT 'Block Number',"
        + "`p2p_addr` bigint(20) unsigned DEFAULT 0 NOT NULL COMMENT 'BP P2PAddrss', "
        + "`bgt` bigint(20) unsigned DEFAULT 0 NOT NULL COMMENT 'Block Genration Time', "
        + "`pbh` text NOT NULL COMMENT 'Previous Block Hash', "
        + "`tx_cnt` int(11) unsigned DEFAULT 0 NOT NULL COMMENT 'Number of transaction the block has', "
        + "`blk_hash` text NOT NULL COMMENT 'Block Hash', "
        + "`sig` text NOT NULL COMMENT 'Signature of BP',"
        + "`pubkey` text NOT NULL COMMENT 'Signed Public Key',"
        + "`bct`  bigint(20) unsigned, "
        + "KEY `blk_hash` (`blk_hash`(64)) USING BTREE, "
        + "KEY `bgt` (`bgt`) USING BTREE, "
        + "UNIQUE KEY `uk_blk_num` (`blk_num`, `subnet_id`), "
        + "PRIMARY KEY (`blk_num`, `tx_cnt`, `blk_hash`(64), `subnet_id`) USING BTREE",
    ],
    accountQuerys : [
        // account_tokens
          "`subnet_id` smallint(5) unsigned DEFAULT 0 NOT NULL, "
        + "`idx` bigint(20) unsigned NOT NULL AUTO_INCREMENT,"
        + "`revision` bigint(20) unsigned DEFAULT 0 NOT NULL COMMENT 'Revision', "
        + "`create_tm` bigint(20) unsigned DEFAULT 0 NOT NULL COMMENT 'Contract Create Time', "
        + "`blk_num` bigint(20) unsigned DEFAULT 0 NOT NULL COMMENT 'Block Number', "
        + "`db_key` bigint(20) unsigned DEFAULT 0 NOT NULL COMMENT 'DB Key', "
        //+ "`confirmed` tinyint(3) DEFAULT 0,"
        + "`owner_pk` text NOT NULL COMMENT 'Owner Public Key', "
        + "`super_pk` text NOT NULL COMMENT 'Super Owner Public Key', "
        //+ "`signed_pubkey` text NOT NULL COMMENT 'Signed Public Key', "
        + "`account_num` bigint(20) unsigned DEFAULT 0 NOT NULL COMMENT 'Account Number', "
        + "`action` int(11) unsigned NOT NULL DEFAULT 0, "
        + "`name` text BINARY DEFAULT NULL, "
        + "`symbol` text BINARY DEFAULT NULL, "
        + "`total_supply` text DEFAULT 0 NOT NULL, "
        + "`market_supply` text DEFAULT 0 NOT NULL, "
        + "`decimal_point` smallint(5) unsigned DEFAULT 0 NOT NULL, "
        + "`lock_time_from` bigint(20) unsigned DEFAULT 0 NOT NULL COMMENT 'Lock Time From', "
        + "`lock_time_to` bigint(20) unsigned DEFAULT 0 NOT NULL COMMENT 'Lock Time To', "
        + "`lock_transfer` tinyint(3) DEFAULT 0 NOT NULL,"
        + "`black_list` json DEFAULT NULL, "
        + "`functions` longtext DEFAULT NULL, "
        + "KEY `revision` (`revision`) USING BTREE, "
        + "KEY `pubkey` (`owner_pk`(64), `super_pk`(64)) USING BTREE, "
        + "KEY `owner_pk` (`owner_pk`(64)) USING BTREE, "
        + "KEY `super_pk` (`super_pk`(64)) USING BTREE, "
        + "KEY `action` (`action`) USING BTREE, "
        + "KEY `account` (`action`, `account_num`) USING BTREE, "
        + "UNIQUE KEY `uk_idx` (`idx`, `subnet_id`), "
        + "PRIMARY KEY (`db_key`, `blk_num`, `subnet_id`) USING BTREE",
        // + "PRIMARY KEY (`action`, `account_num`, `db_key`, `blk_num`, `owner_pk`(64), `super_pk`(64), `subnet_id`) USING BTREE",
        
        // account_users
          "`subnet_id` smallint(5) unsigned DEFAULT 0 NOT NULL, "
        + "`idx` bigint(20) unsigned NOT NULL AUTO_INCREMENT,"
        + "`revision` bigint(20) unsigned DEFAULT 0 NOT NULL COMMENT 'Revision', "
        + "`create_tm` bigint(20) unsigned DEFAULT 0 NOT NULL COMMENT 'Contract Create Time', "
        + "`blk_num` bigint(20) unsigned DEFAULT 0 NOT NULL COMMENT 'Block Number', "
        + "`db_key` bigint(20) unsigned DEFAULT 0 NOT NULL COMMENT 'DB Key', "
        //+ "`confirmed` tinyint(3) DEFAULT 0,"
        + "`owner_pk` text NOT NULL COMMENT 'Owner Public Key', "
        + "`super_pk` text NOT NULL COMMENT 'Super Owner Public Key', "
        //+ "`signed_pubkey` text NOT NULL COMMENT 'Signed Public Key', "
        + "`account_num` bigint(20) unsigned DEFAULT 0 NOT NULL COMMENT 'Account Number', "
        + "`account_id` text BINARY DEFAULT NULL,"
        + "KEY `revision` (`revision`) USING BTREE, "
        + "KEY `pubkey` (`owner_pk`(64), `super_pk`(64)) USING BTREE, "
        + "KEY `owner_pk` (`owner_pk`(64)) USING BTREE, "
        + "KEY `super_pk` (`super_pk`(64)) USING BTREE, "
        + "UNIQUE KEY `uk_idx` (`idx`, `subnet_id`), "
        // + "PRIMARY KEY (`account_num`, `db_key`, `blk_num`, `subnet_id`) USING BTREE",
        + "PRIMARY KEY (`db_key`, `account_num`, `blk_num`, `owner_pk`(64), `super_pk`(64), `subnet_id`) USING BTREE",

        // account_ledgers
          "`subnet_id` smallint(5) unsigned DEFAULT 0 NOT NULL, "
        + "`idx` bigint(20) unsigned NOT NULL AUTO_INCREMENT,"
        + "`create_tm` bigint(20) unsigned DEFAULT 0 NOT NULL COMMENT 'Contract Create Time', "
        + "`blk_num` bigint(20) unsigned DEFAULT 0 NOT NULL COMMENT 'Block Number', "
        + "`db_key` bigint(20) unsigned DEFAULT 0 NOT NULL COMMENT 'DB Key', "
        //+ "`confirmed` tinyint(3) DEFAULT 0,"
        //+ "`signed_pubkey` text NOT NULL COMMENT 'Signed Public Key', "
        + "`my_account_num` bigint(20) unsigned DEFAULT 0 NOT NULL COMMENT 'Sending Account Number', "
        //+ "`from_to` tinyint(3) DEFAULT NULL,"
        + "`account_num` bigint(20) unsigned DEFAULT 0 NOT NULL COMMENT 'Receved Account Number', "
        + "`action` int(11) unsigned NOT NULL DEFAULT 0,"
        + "`amount` text DEFAULT NULL, "
        + "`balance` text DEFAULT NULL, "
        + "KEY `balance1` (`my_account_num`, `action`, `create_tm`) USING BTREE, "
        + "KEY `balance2` (`action`, `my_account_num`, `create_tm`) USING BTREE, "
        + "KEY `subnet_id` (`subnet_id`) USING BTREE, "
        + "KEY `action_account` (`action`, `my_account_num`) USING BTREE, "
        + "UNIQUE KEY `uk_idx` (`idx`, `subnet_id`), "
        + "PRIMARY KEY (`idx`, `db_key`, `my_account_num`, `action`, `blk_num`, `create_tm`, `subnet_id`) USING BTREE",

        // account_balance
          "`subnet_id` smallint(5) unsigned DEFAULT 0 NOT NULL, "
        + "`idx` bigint(20) unsigned NOT NULL AUTO_INCREMENT,"
        + "`cfmd_tm` bigint(20) unsigned DEFAULT 0 NOT NULL COMMENT 'Confirmed Time', "
        + "`cfmd_blk_num` bigint(20) unsigned DEFAULT 0 NOT NULL COMMENT 'Confirmed Block Number', "
        + "`blk_num` bigint(20) unsigned DEFAULT 0 NOT NULL COMMENT 'Block Number', "
        + "`db_key` bigint(20) unsigned DEFAULT 0 NOT NULL COMMENT 'DB Key', " 
        + "`my_account_num` bigint(20) unsigned DEFAULT 0 NOT NULL COMMENT 'Sending Account Number', "
        + "`action` int(11) unsigned NOT NULL DEFAULT 0,"
        + "`balance` text DEFAULT NULL, "
        + "`balanceN` bigint(20) unsigned DEFAULT NULL, "
        + "KEY `balance1` (`my_account_num`, `action`) USING BTREE, "
        + "KEY `balance2` (`action`, `my_account_num`) USING BTREE, "
        + "KEY `subnet_id` (`subnet_id`) USING BTREE, "
        + "UNIQUE KEY `uk_idx` (`idx`, `subnet_id`), "
        + "PRIMARY KEY (`idx`, `my_account_num`, `action`, `balance`(20), `balanceN`, `cfmd_blk_num`, `blk_num`, `cfmd_tm`, `db_key`, `subnet_id`) USING BTREE",

        // account_sc
          "`subnet_id` smallint(5) unsigned DEFAULT 0 NOT NULL, "
        + "`idx` bigint(20) unsigned NOT NULL AUTO_INCREMENT,"
        + "`create_tm` bigint(20) unsigned DEFAULT 0 NOT NULL COMMENT 'Contract Create Time', "
        + "`blk_num` bigint(20) unsigned DEFAULT 0 NOT NULL COMMENT 'Block Number', "
        + "`db_key` bigint(20) unsigned DEFAULT 0 NOT NULL COMMENT 'DB Key', "
        + "`sc_action` int(11) unsigned NOT NULL DEFAULT 0,"
        + "`action_target` int(11) unsigned NOT NULL DEFAULT 0,"
        + "`from_account_num` bigint(20) unsigned DEFAULT 0 NOT NULL COMMENT 'Sending Account Number', "
        + "`to_account_num` bigint(20) unsigned DEFAULT 0 NOT NULL COMMENT 'Receved Account Number', "
        + "`sub_id` int(11) unsigned NOT NULL DEFAULT 0,"
        + "`sc` json DEFAULT NULL,"
        + "KEY `actions1` (`action_target`, `sc_action`, `sub_id`) USING BTREE, "
        + "KEY `actions2` (`sc_action`, `sub_id`) USING BTREE, "
        + "KEY `subnet_id` (`subnet_id`) USING BTREE, "
        + "UNIQUE KEY `uk_idx` (`idx`, `subnet_id`), "
        + "PRIMARY KEY (`db_key`, `sc_action`, `action_target`, `blk_num`, `subnet_id`) USING BTREE",
    ]
}

const tableAppendix = {
    "tableName" : `myTableName`,
    "appendix" : `myAppendix`,
    "shard_exp" : `_shard`,
    "innoDB" : `ENGINE=InnoDB`,
    "spider" : `ENGINE=spider COMMENT='wrapper "mysql", table`,
    "partition" : `PARTITION BY KEY (subnet_id)`,
}

module.exports.createTables = {
    scQuerys : [
        `CREATE TABLE IF NOT EXISTS ${tableAppendix.tableName} (`
        + createTableFields.scQuerys[0]
        + `) ${tableAppendix.appendix}`,
        `CREATE TABLE IF NOT EXISTS ${tableAppendix.tableName} (`
        + createTableFields.scQuerys[1]
        + `) ${tableAppendix.appendix}`,
    ],
    blockQuerys : [
        `CREATE TABLE IF NOT EXISTS ${tableAppendix.tableName} (`
        + createTableFields.blockQuerys[0]
        + `) ${tableAppendix.appendix}`,
    ],
    blockShardQuerys : [
        `CREATE TABLE IF NOT EXISTS ${tableAppendix.tableName} (`
        + createTableFields.blockShardQuerys[0]
        + `) ${tableAppendix.appendix}`,
    ],
    accountQuerys : [
        `CREATE TABLE IF NOT EXISTS ${tableAppendix.tableName} (`
        + createTableFields.accountQuerys[0]
        + `) ${tableAppendix.appendix}`,
        `CREATE TABLE IF NOT EXISTS ${tableAppendix.tableName} (`
        + createTableFields.accountQuerys[1]
        + `) ${tableAppendix.appendix}`,
        `CREATE TABLE IF NOT EXISTS ${tableAppendix.tableName} (`
        + createTableFields.accountQuerys[2]
        + `) ${tableAppendix.appendix}`,
        `CREATE TABLE IF NOT EXISTS ${tableAppendix.tableName} (`
        + createTableFields.accountQuerys[3]
        + `) ${tableAppendix.appendix}`,
        `CREATE TABLE IF NOT EXISTS ${tableAppendix.tableName} (`
        + createTableFields.accountQuerys[4]
        + `) ${tableAppendix.appendix}`,
    ]
}

module.exports.querys = {
    // sc database
    sc : {
        createSC : "CREATE DATABASE IF NOT EXISTS `sc`",
        useSC : "USE `sc`",
        //
        // truncateScContents : `TRUNCATE sc.${this.createTableNames.scQuerys[0]}`,
        // truncateScDelayedTxs : `TRUNCATE sc.${this.createTableNames.scQuerys[1]}`,
        truncateScContents : dbUtil.truncate(`sc.${this.createTableNames.scQuerys[0]}`),
        truncateScDelayedTxs : dbUtil.truncate(`sc.${this.createTableNames.scQuerys[1]}`),
        DBKeySet : `CALL SET_DB_KEY_INDEX(?)`,
        //
        sc_contents : {
            insertScContents : `INSERT IGNORE INTO sc.sc_contents(subnet_id, create_tm, db_key, confirmed, from_account, to_account, action, c_action, dst_account, amount, signed_pubkey, err_code, contract) VALUES `,
            //
            selectByDbKey: `SELECT signed_pubkey, confirmed, from_account, to_account, action, amount, err_code FROM sc.sc_contents WHERE ? <= db_key and db_key <= ?`,
            selectByFromAccount : `SELECT * FROM sc.sc_contents as a WHERE from_account = ? ORDER BY create_tm DESC LIMIT 1`, 
            selectByFromAccountAndCreateTm : `SELECT create_tm, confirmed, db_key FROM sc.sc_contents as a WHERE from_account = ? and a.create_tm = (select MAX(create_tm) from sc.sc_contents) ORDER BY db_key DESC LIMIT 1`,
            //
            updateConfirmed : `UPDATE IGNORE sc.sc_contents SET confirmed = 1 WHERE ? <= db_key AND db_key <= ?`,
        },
        sc_delayed_txs : {
            insertScDelayedTxs : `INSERT IGNORE INTO sc.sc_delayed_txs(subnet_id, create_tm, executed, from_account, to_account, action, c_action, dst_account, amount, signed_pubkey, err_code, contract) VALUES `,
            // selectScContents : `SELECT c.db_key, c.contract FROM sc.sc_contents AS c, block.blk_txs AS i WHERE blk_num = ? AND c.db_key = i.db_key`,
            selectByActionAndAccount : `SELECT * FROM sc.sc_delayed_txs WHERE executed = 0 AND action = ? AND from_account = ? AND to_account = ?`,
            selectByCreateTm : `SELECT * FROM sc.sc_delayed_txs WHERE executed = 0 AND create_tm <= ?`,
            //
            updateExecutedByCreateTm : `UPDATE IGNORE sc.sc_delayed_txs SET executed = 1 WHERE executed = 0 AND create_tm <= ?`,
        },
    }, 
    // block database
    block : {
        createBlock : "CREATE DATABASE IF NOT EXISTS `block`",
        useBlock : "USE `block`",
        // truncateBlkTxs : `TRUNCATE block.${this.createTableNames.blockQuerys[0]}`,
        truncateBlkTxs : dbUtil.truncate(`block.${this.createTableNames.blockQuerys[0]}`),
        //
        blk_txs : {
            insertBlkTxs : `INSERT IGNORE INTO block.blk_txs(subnet_id, blk_num, db_key, sc_hash) VALUES `,
            selectDbKeyBlkTxs : `SELECT MIN(db_key), MAX(db_key) FROM block.blk_txs WHERE blk_num = ?`,
        },
        blk_contents : {
            selectLastBlkNumBlkContents : `SELECT MAX(blk_num) as max_blk_num FROM block.blk_contents`,
        },
    }, 
    // account database
    account : {
        createAccount : "CREATE DATABASE IF NOT EXISTS `account`",
        useAccount : "USE `account`",
        // truncateAccountTokens : `TRUNCATE account.${this.createTableNames.accountQuerys[0]}`,
        // truncateAccountUsers : `TRUNCATE account.${this.createTableNames.accountQuerys[1]}`,
        // truncateAccountLedgers : `TRUNCATE account.${this.createTableNames.accountQuerys[2]}`,
        // truncateAccountBalance : `TRUNCATE account.${this.createTableNames.accountQuerys[3]}`,
        truncateAccountTokens : dbUtil.truncate(`account.${this.createTableNames.accountQuerys[0]}`),
        truncateAccountUsers : dbUtil.truncate(`account.${this.createTableNames.accountQuerys[1]}`),
        truncateAccountLedgers : dbUtil.truncate(`account.${this.createTableNames.accountQuerys[2]}`),
        truncateAccountBalance : dbUtil.truncate(`account.${this.createTableNames.accountQuerys[3]}`),

        //
        account_tokens : {
            //
            insertAccountTokens : `INSERT IGNORE INTO account.account_tokens(subnet_id, revision, create_tm, blk_num, db_key, owner_pk, super_pk, account_num, action, name, symbol, total_supply, market_supply, decimal_point, lock_time_from, lock_time_to, lock_transfer, black_list, functions) VALUES `,
            //
            // selectAccountTokenT : `SELECT * FROM account.account_tokens WHERE action = ? ORDER BY create_tm DESC LIMIT 1`,
            selectAccountTokenT : `SELECT A.subnet_id, A.idx, A.revision, A.create_tm, B.blk_num, A.db_key, A.owner_pk, A.super_pk, `
                                + `A.account_num, A.action, A.name, A.symbol, A.total_supply, A.market_supply, A.decimal_point, `
                                + `A.lock_time_from, A.lock_time_to, A.lock_transfer, A.black_list, A.functions `
                                + `FROM account.account_tokens AS A INNER JOIN block.blk_txs AS B ON A.db_key = B.db_key `
                                + `WHERE B.blk_num > 0 AND A.action = ? ORDER BY A.create_tm DESC LIMIT 1`,
            // selectAccountTokenTNS : `SELECT * FROM account.account_tokens WHERE action = ? OR name = ? OR symbol = ? ORDER BY create_tm DESC LIMIT 1`,
            selectAccountTokenTNS : `SELECT A.subnet_id, A.idx, A.revision, A.create_tm, B.blk_num, A.db_key, A.owner_pk, A.super_pk, `
                                + `A.account_num, A.action, A.name, A.symbol, A.total_supply, A.market_supply, A.decimal_point, `
                                + `A.lock_time_from, A.lock_time_to, A.lock_transfer, A.black_list, A.functions `
                                + `FROM account.account_tokens AS A INNER JOIN block.blk_txs AS B ON A.db_key = B.db_key `
                                + `WHERE B.blk_num > 0 AND ( A.action = ? OR A.name = ? OR A.symbol = ? ) ORDER BY A.create_tm DESC LIMIT 1`,
            // selectAccountTokenKey : `SELECT * FROM account.account_tokens WHERE owner_pk = ? OR super_pk = ? OR owner_pk = ? OR super_pk = ? ORDER BY create_tm DESC LIMIT 1`,
            selectAccountTokenKey : `SELECT A.subnet_id, A.idx, A.revision, A.create_tm, B.blk_num, A.db_key, A.owner_pk, A.super_pk, `
                                + `A.account_num, A.action, A.name, A.symbol, A.total_supply, A.market_supply, A.decimal_point, `
                                + `A.lock_time_from, A.lock_time_to, A.lock_transfer, A.black_list, A.functions `
                                + `FROM account.account_tokens AS A INNER JOIN block.blk_txs AS B ON A.db_key = B.db_key `
                                + `WHERE B.blk_num > 0 AND ( A.owner_pk = ? OR A.super_pk = ? OR A.owner_pk = ? OR A.super_pk = ? ) ORDER BY A.create_tm DESC LIMIT 1`,
            // selectAccountTokenAccount : `SELECT * FROM account.account_tokens WHERE account_num = ? ORDER BY create_tm DESC LIMIT 1`,
            selectAccountTokenAccount : `SELECT A.subnet_id, A.idx, A.revision, A.create_tm, B.blk_num, A.db_key, A.owner_pk, A.super_pk, `
                                + `A.account_num, A.action, A.name, A.symbol, A.total_supply, A.market_supply, A.decimal_point, `
                                + `A.lock_time_from, A.lock_time_to, A.lock_transfer, A.black_list, A.functions `
                                + `FROM account.account_tokens AS A INNER JOIN block.blk_txs AS B ON A.db_key = B.db_key `
                                + `WHERE B.blk_num > 0 AND ( A.account_num = ? ) ORDER BY A.create_tm DESC LIMIT 1`,
            //
            updateMarketSupplyByAction : "UPDATE IGNORE account.account_tokens SET market_supply = ? WHERE action = ?",
            updateBlkNumByDbKey : `UPDATE IGNORE account.account_tokens SET blk_num = ? WHERE ? <= db_key and db_key <= ?`,
        },
        account_users : {
            //
            insertAccountUsers : `INSERT IGNORE INTO account.account_users(subnet_id, revision, create_tm, blk_num, db_key, owner_pk, super_pk, account_num, account_id) VALUES `,
            //
            // selectAccountUsersByAccountId : `SELECT * FROM account.account_users WHERE account_id = ? ORDER BY create_tm DESC LIMIT 1`, 
            selectAccountUsersByAccountId : `SELECT A.subnet_id, A.idx, A.revision, A.create_tm, B.blk_num, A.db_key, A.owner_pk, A.super_pk, A.account_num, A.account_id ` 
                                        + `FROM account.account_users AS A INNER JOIN block.blk_txs AS B ON A.db_key = B.db_key ` 
                                        + `WHERE B.blk_num > 0 AND A.account_id = ? ORDER BY A.create_tm DESC LIMIT 1`, 
            // selectAccountUsersByAccountNum : `SELECT * FROM account.account_users WHERE account_num = ? ORDER BY create_tm DESC LIMIT 1`, 
            selectAccountUsersByAccountNum : `SELECT A.subnet_id, A.idx, A.revision, A.create_tm, B.blk_num, A.db_key, A.owner_pk, A.super_pk, A.account_num, A.account_id ` 
                                        + `FROM account.account_users AS A INNER JOIN block.blk_txs AS B ON A.db_key = B.db_key ` 
                                        + `WHERE B.blk_num > 0 AND A.account_num = ? ORDER BY A.create_tm DESC LIMIT 1`, 
            // selectAccountUsersByKeysAndAccountId : `SELECT * FROM account.account_users WHERE owner_pk = ? OR super_pk = ? OR owner_pk = ? OR super_pk = ? OR account_id = ? ORDER BY create_tm DESC LIMIT 1`,
            selectAccountUsersByKeysAndAccountId : `SELECT A.subnet_id, A.idx, A.revision, A.create_tm, B.blk_num, A.db_key, A.owner_pk, A.super_pk, A.account_num, A.account_id ` 
                                                + `FROM account.account_users AS A INNER JOIN block.blk_txs AS B ON A.db_key = B.db_key ` 
                                                + `WHERE B.blk_num > 0 AND ( A.owner_pk = ? OR A.super_pk = ? OR A.owner_pk = ? OR A.super_pk = ? OR A.account_id = ? ) ORDER BY A.create_tm DESC LIMIT 1`, 
            // selectAccountUsersByKey : `SELECT * FROM account.account_users WHERE owner_pk = ? OR super_pk = ? OR owner_pk = ? OR super_pk = ? ORDER BY idx DESC LIMIT 1`, 
            selectAccountUsersByKey : `SELECT A.subnet_id, A.idx, A.revision, A.create_tm, B.blk_num, A.db_key, A.owner_pk, A.super_pk, A.account_num, A.account_id ` 
                                    + `FROM account.account_users AS A INNER JOIN block.blk_txs AS B ON A.db_key = B.db_key ` 
                                    + `WHERE B.blk_num > 0 AND ( A.owner_pk = ? OR A.super_pk = ? OR A.owner_pk = ? OR A.super_pk = ? ) ORDER BY A.create_tm DESC LIMIT 1`,
            //
            updateBlkNumByDbKey : `UPDATE IGNORE account.account_users SET blk_num = ? WHERE ? <= db_key and db_key <= ?`,
        },
        account_ledgers : {
            //
            insertAccountLedgers : `INSERT IGNORE INTO account.account_ledgers(subnet_id, create_tm, blk_num, db_key, my_account_num, account_num, action, amount, balance) VALUES `,

            //
            // selectAccountLegers : `SELECT * FROM account.account_ledgers WHERE blk_num > 0 AND action = ? AND my_account_num = ?`,
            selectAccountLegers : `SELECT A.subnet_id, A.idx, A.create_tm, A.db_key, A.my_account_num, A.account_num, A.action, A.amount, A.balance ` 
                                + `FROM account.account_ledgers AS A ` 
                                + `WHERE A.action = ? AND A.my_account_num = ? ORDER BY A.create_tm DESC LIMIT 1`, 
            selectAccountLegersWithBN : `SELECT A.subnet_id, A.idx, A.create_tm, B.blk_num, A.db_key, A.my_account_num, A.account_num, A.action, A.amount, A.balance ` 
                                + `FROM account.account_ledgers AS A INNER JOIN block.blk_txs AS B ON A.db_key = B.db_key ` 
                                + `WHERE A.action = ? AND A.my_account_num = ? AND B.blk_num > 0 ORDER BY A.create_tm DESC LIMIT 1`, 
            selectAccountLegersWithDbKeyOrBN : `SELECT A.subnet_id, A.idx, A.create_tm, A.db_key, A.my_account_num, A.account_num, A.action, A.amount, A.balance ` 
                                + `FROM account.account_ledgers AS A INNER JOIN block.blk_txs AS B ON A.db_key = B.db_key ` 
                                + `WHERE A.action = ? AND A.my_account_num = ? AND (A.db_key = ? OR B.blk_num > 0) ORDER BY A.create_tm DESC LIMIT 1`, 
            //
            // selectByAccountNumAndActionAndBN : `SELECT * FROM account.account_ledgers as a WHERE my_account_num = ? and action = ? and blk_num > ? and blk_num <= ? ORDER BY create_tm ASC, create_tm ASC`,
            selectByAccountNumAndActionAndBN : `SELECT A.subnet_id, A.idx, A.create_tm, B.blk_num, A.db_key, A.my_account_num, A.account_num, A.action, A.amount, A.balance `
                                            + `FROM account.account_ledgers AS A INNER JOIN block.blk_txs AS B ON A.db_key = B.db_key ` 
                                            + `WHERE A.my_account_num = ? and A.action = ? and B.blk_num > ? and B.blk_num <= ? ORDER BY A.create_tm ASC, A.create_tm ASC`, 
            //
            updateBlkNumByDbKey : `UPDATE IGNORE account.account_ledgers SET blk_num = ? WHERE ? <= db_key and db_key <= ?`,
        },
        account_balance : {
            // //
            // insertAccountBalance : `INSERT IGNORE INTO account.account_balance(subnet_id, cfmd_tm, cfmd_blk_num, blk_num, db_key, my_account_num, action, balance, balanceN) VALUES `,
            // //
            // updateAccountBalance : `UPDATE IGNORE account.account_balance SET cfmd_tm = ?, cfmd_blk_num = ?, blk_num = ?, db_key = ?, balance = ?, balanceN = ? WHERE my_account_num = ? and action = ?`,
            // //
            // selectCntByAccountNumAndAction : `SELECT COUNT(*) AS total_count FROM account.account_balance WHERE my_account_num = ? and action = ?`, 
            // //
            // // selectByAccountNum : `SELECT * FROM account.account_balance WHERE my_account_num = ?`, 
            // selectByAccountNum : `SELECT A.subnet_id, A.idx, A.cfmd_tm, A.cfmd_blk_num, B.blk_num, A.db_key, A.my_account_num, A.action, A.balance, A.balanceN `
            //                     + `FROM account.account_balance AS A LEFT JOIN block.blk_txs AS B ON A.db_key = B.db_key `
            //                     + `WHERE A.my_account_num = ?`, 
            // selectByAccountNumAndAction : `SELECT my_account_num, action, cfmd_blk_num, balance FROM account.account_balance WHERE my_account_num = ? and action = ?`, 
            // // selectBySubNetId : `SELECT * FROM account.account_balance WHERE subnet_id = ?`, 
            // selectBySubNetId : `SELECT A.subnet_id, A.idx, A.cfmd_tm, A.cfmd_blk_num, B.blk_num, A.db_key, A.my_account_num, A.action, A.balance, A.balanceN `
            //                 + `FROM account.account_balance AS A LEFT JOIN block.blk_txs AS B ON A.db_key = B.db_key `
            //                 + `WHERE B.blk_num > 0 AND A.subnet_id = ?`, 
            // //
            // updateBlkNumByDbKey : `UPDATE IGNORE account.account_balance SET blk_num = ? WHERE ? <= db_key and db_key <= ?`,
        },
        account_sc : {
            //
            insertAccountSc : `INSERT IGNORE INTO account.account_sc(subnet_id, create_tm, blk_num, db_key, sc_action, action_target, from_account_num, to_account_num, sub_id, sc) VALUES `, 
            // //
            // selectCntByScAction : "SELECT COUNT(*) AS total_count FROM account.account_sc WHERE sc_action = ?", 
            //
            selectByScAction : `SELECT * FROM account.account_sc WHERE sc_action = ?`, 
            selectByScActionLimit : `SELECT * FROM account.account_sc WHERE sc_action = ? ORDER BY idx DESC LIMIT 1`, 
            selectByScActionAndActionTarget : `SELECT * FROM account.account_sc WHERE sc_action = ? and action_target != ?`, 
            selectByScActionAndActionTargetLimit : `SELECT * FROM account.account_sc WHERE sc_action = ? and action_target != ? ORDER BY idx DESC LIMIT 1`,
            //
            updateBlkNumByDbKey : `UPDATE IGNORE account.account_sc SET blk_num = ? WHERE ? <= db_key and db_key <= ?`,
        },
    }, 
};

const dropScDB = async () => {
    let sql = "DROP DATABASE IF EXISTS `sc`";
    await dbUtil.query(sql);
}

module.exports.truncateScDB = async () => {
    let sql;

    sql = this.querys.sc.truncateScContents;
    await dbUtil.query(sql);

    sql = this.querys.sc.truncateScDelayedTxs;
    await dbUtil.query(sql);
}

module.exports.truncateBlockDB = async () => {
    let sql;

    sql = this.querys.block.truncateBlkTxs;
    await dbUtil.query(sql);
}

module.exports.truncateAccountDB = async () => {
    let sql;

    // sql = this.querys.account.useAccount;
    // await dbUtil.query(sql);

    sql = this.querys.account.truncateAccountTokens;
    await dbUtil.query(sql);

    sql = this.querys.account.truncateAccountUsers;
    await dbUtil.query(sql);

    sql = this.querys.account.truncateAccountLedgers;
    await dbUtil.query(sql);

    sql = this.querys.account.truncateAccountBalance;
    await dbUtil.query(sql);
}

const truncate = async () => {
    if(config.DB_TEST_MODE) {
        await this.truncateScDB();
        await this.truncateBlockDB();
        await this.truncateAccountDB();
    }
}
// module.exports.truncate = truncate;

const initDatabaseSC = async () => {
    let ret;
    const conn = await dbUtil.getConn();

    try {
        let sql = this.querys.sc.createSC;
        logger.debug("createSC : " + sql);
        await conn.query(sql);

        sql = this.querys.sc.useSC;
        await conn.query(sql);

        await util.asyncForEach(this.createTables.scQuerys, async(element, index) => {
            //logger.debug("element : " + element);
            element = util.stringReplace(element, `${dbUtil.tableAppendix.tableName}`, this.createTableNames.scQuerys[index]);
            element = util.stringReplace(element, `${dbUtil.tableAppendix.appendix}`, dbUtil.tableAppendix.innoDB);
            // logger.debug("scQuerys : " + element);
            await conn.query(element);
        });

        // ????????????????
        await util.asyncForEach(procedureQuerys.scQuerys, async(element, index) => {
            await conn.query(element);
        })

        if(config.DB_TEST_MODE) {
            await this.truncateScDB();
        }
        
        ret = { res : true };
        logger.info("Database Init - sc");
    } catch (err) {
        debug.error(err);
        ret = { res : false, reason : JSON.stringify(err)};
    }

    await dbUtil.releaseConn(conn);

    return ret;
}

const initDatabaseBlock = async () => {
    let ret;
    const conn = await dbUtil.getConn();

    try {
        let sql = this.querys.block.createBlock;
        await conn.query(sql);

        sql = this.querys.block.useBlock;
        await conn.query(sql);

        await util.asyncForEach(this.createTables.blockQuerys, async(element, index) => {
            //logger.debug("element : " + element);
            element = util.stringReplace(element, `${dbUtil.tableAppendix.tableName}`, this.createTableNames.blockQuerys[index]);
            element = util.stringReplace(element, `${dbUtil.tableAppendix.appendix}`, dbUtil.tableAppendix.innoDB);
            // logger.debug("blockQuerys : " + element);
            await conn.query(element);
        });

        if(config.DB_TEST_MODE) {
            await this.truncateBlockDB();
        }

        ret = { res : true };
        logger.info("Database Init - block");
    } catch (err) {
        debug.error(err);
        ret = { res : false, reason : JSON.stringify(err)};
    }

    await dbUtil.releaseConn(conn);

    return ret;
}

const initDatabaseAccount = async () => {
    let ret;
    const conn = await dbUtil.getConn();

    try {
        let sql = this.querys.account.createAccount;
        await conn.query(sql);

        sql = this.querys.account.useAccount;
        await conn.query(sql);

        await util.asyncForEach(this.createTables.accountQuerys, async(element, index) => {
            //logger.debug("element : " + element);
            element = util.stringReplace(element, `${dbUtil.tableAppendix.tableName}`, this.createTableNames.accountQuerys[index]);
            element = util.stringReplace(element, `${dbUtil.tableAppendix.appendix}`, dbUtil.tableAppendix.innoDB);
            // logger.debug("accountQuerys : " + element);
            await conn.query(element);
        });

        if(config.DB_TEST_MODE) {
            await this.truncateAccountDB();
        }

        ret = { res : true };
        logger.info("Database Init - account");
    } catch (err) {
        debug.error(err);
        ret = { res : false, reason : JSON.stringify(err)};
    }

    await dbUtil.releaseConn(conn);

    return ret;
}

module.exports.initDatabaseNN = async () => {
    await initDatabaseSC();
    await initDatabaseBlock();
    await initDatabaseAccount();
}