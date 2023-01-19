//
const { del } = require("request");

//
const cryptoSsl = require("./../../../../addon/crypto-ssl");

//
const config = require("../../config/config.js");
const define = require("../../config/define.js");
const cryptoUtil = require("../sec/cryptoUtil.js");
const dbUtil = require("../db/dbUtil.js");
const dbNN = require("../db/dbNN.js");
const dbNNHandler = require("../db/dbNNHandler.js");
const redisUtil = require("../net/redisUtil.js");
const util = require("../utils/commonUtil.js");
const kafkaUtil = require("../net/kafkaUtil.js");
const myCluster = require("../cluster.js");
const account_module = require("./account.js");
const token = require("./token.js");
const user = require("./user.js");
const sc = require("./sc.js");
const contractChecker = require("./contractChecker.js");
const ledger = require("./ledger.js");
const cliTest = require("../cli/cliTest.js");
const logger = require("../utils/winlog.js");
const debug = require("../utils/debug.js");

let contractArray = new Array();
// let txArray = new Array();
// let secLedgerArray = new Array();
// let utiLedgerArray = new Array();
// let tokenArray = new Array();
// let userArray = new Array();

let myDbKeyIndex;
let mySubNetId;

let myCurBN = 0;
let myGapBN = 0;
let myClusterNum = 0;

let contract_map = new Map();

module.exports.contractArray = contractArray;

module.exports.myDbKeyIndex = myDbKeyIndex; 

module.exports.getMySubNetId = () => {
    return mySubNetId;
}

module.exports.setMySubNetId = () => {
    let keyIndex = cryptoUtil.initDbKeyIndex();
    mySubNetId = cryptoUtil.getParsedSubNetId(keyIndex);

    logger.debug("mySubNetId : " + mySubNetId);
}

module.exports.getMyClusterNum = () => {
    return myClusterNum;
}

module.exports.setMyClusterNum = (clusterNum) => {
    myClusterNum = clusterNum;

    myGapBN = BigInt(myClusterNum * define.ACCOUNT_DEFINE.CONFIRM_BN_GAP);

    logger.debug("myClusterNum : " + myClusterNum + ", myGapBN : " + myGapBN);
}

module.exports.getContractArray = () => {
    let tempArray = [...contractArray];
    return tempArray;
}

module.exports.getContractArrayLen = () => {
    return contractArray.length;
}

module.exports.setContractArray = async (array) => {
    contractArray = await contractArray.concat(array);
}

module.exports.pushContractArray = (data) => {
    // logger.debug("data.jsonData : " + data.jsonData);
    contractArray.push(data);
}

module.exports.reinitContractArray = async () => {
    contractArray = new Array();
}

//
module.exports.getContractElement = async (fromAccount, pubkey) => {
    let already_exist = true;

    let retVal = contract_map.get(pubkey);
    if (retVal === undefined)
    {
        already_exist = false;
    }

    return already_exist;
}

module.exports.hasContractElement = async (fromAccount, pubkey) => {
    let already_exist;

    already_exist = contract_map.has(pubkey);

    return already_exist;
}

module.exports.setContractElement = async (fromAccount, pubkey, contractJson) => {
    let logined = false;

    // From IS
    if (pubkey === cryptoUtil.getIsPubkey())
    {
        return logined;
    }

    // From Others
    logined = contract_map.set(pubkey, contractJson);

    return logined;
}

module.exports.delContractElement = async (pubkey) => {
    contract_map.delete(pubkey);
}

module.exports.logoutProcess = async (pubkeyArr) => {
    await util.asyncForEach(pubkeyArr, async (element, index) => {
        // logger.debug("logout Process signed_pubkey[" + index + "] : " + element.signed_pubkey);
        await this.delContractElement(element.signed_pubkey);
    });
}

//
module.exports.setDbKeyIndex = () => {
    this.myDbKeyIndex = cryptoUtil.initDbKeyIndex();

    logger.debug("Set Contract myDbKeyIndex : " + this.myDbKeyIndex);
}

module.exports.genDbKeyIndex = () => {
    //
    let mySubNetIdHexStr = util.intStrToHexStr(this.getMySubNetId());
    let genRandNumHexStr = util.getRandomNumBuf(1, 0, 15).toString('hex');
    let curMsHexStr = util.intStrToHexStr(util.getDateMS());
    let myMsHexStr = util.paddy(curMsHexStr, 11);

    // logger.debug("mySubNetIdHexStr : " + mySubNetIdHexStr);
    // logger.debug("genRandNumHexStr : " + genRandNumHexStr);
    // logger.debug("curMsHexStr : " + curMsHexStr);
    // logger.debug("myMsHexStr : " + myMsHexStr);
    
    let myDbKeyHexStr = mySubNetIdHexStr + genRandNumHexStr.slice(1) + myMsHexStr;

    return (myDbKeyHexStr);
}

//
module.exports.setClusterNum = () => {
     let clusterNum = cryptoUtil.getNnaNum();

     this.setMyClusterNum(clusterNum);
}

// Create Transaction from Wallet Contract
// Pass to NNA
module.exports.inspectContract = async (data) => {
    if(!util.isJsonString(data))
    {
        logger.error("inspectContract - CONTRACT_ERROR_JSON.JSON_FORMAT");
        return config.CONTRACT_ERROR_JSON.JSON_FORMAT;
    }

    let contractJson = JSON.parse(data);

    // logger.debug("CREATE_TM : " + contractJson.hasOwnProperty(define.CONTRACT_DEFINE.CONTRACT_PROPERTY.CREATE_TM));
    // logger.debug("FINTECH : " + contractJson.hasOwnProperty(define.CONTRACT_DEFINE.CONTRACT_PROPERTY.FINTECH));
    // logger.debug("PRIVACY : " + contractJson.hasOwnProperty(define.CONTRACT_DEFINE.CONTRACT_PROPERTY.PRIVACY));
    // logger.debug("FEE : " + contractJson.hasOwnProperty(define.CONTRACT_DEFINE.CONTRACT_PROPERTY.FEE));
    // logger.debug("FROM_ACCOUNT : " + contractJson.hasOwnProperty(define.CONTRACT_DEFINE.CONTRACT_PROPERTY.FROM_ACCOUNT));
    // logger.debug("TO_ACCOUNT : " + contractJson.hasOwnProperty(define.CONTRACT_DEFINE.CONTRACT_PROPERTY.TO_ACCOUNT));
    // logger.debug("ACTION : " + contractJson.hasOwnProperty(define.CONTRACT_DEFINE.CONTRACT_PROPERTY.ACTION));
    // logger.debug("CONTENTS : " + contractJson.hasOwnProperty(define.CONTRACT_DEFINE.CONTRACT_PROPERTY.CONTENTS));
    // logger.debug("SIG : " + contractJson.hasOwnProperty(define.CONTRACT_DEFINE.CONTRACT_PROPERTY.SIG));
    // logger.debug("SIGNED_PUPKEY : " + contractJson.hasOwnProperty(define.CONTRACT_DEFINE.CONTRACT_PROPERTY.SIGNED_PUPKEY));

    // check Contract Form
    if(!(contractJson.hasOwnProperty(define.CONTRACT_DEFINE.CONTRACT_PROPERTY.CREATE_TM)
        && contractJson.hasOwnProperty(define.CONTRACT_DEFINE.CONTRACT_PROPERTY.FINTECH)
        && contractJson.hasOwnProperty(define.CONTRACT_DEFINE.CONTRACT_PROPERTY.PRIVACY)
        && contractJson.hasOwnProperty(define.CONTRACT_DEFINE.CONTRACT_PROPERTY.FEE)
        && contractJson.hasOwnProperty(define.CONTRACT_DEFINE.CONTRACT_PROPERTY.FROM_ACCOUNT)
        && contractJson.hasOwnProperty(define.CONTRACT_DEFINE.CONTRACT_PROPERTY.TO_ACCOUNT)
        && contractJson.hasOwnProperty(define.CONTRACT_DEFINE.CONTRACT_PROPERTY.ACTION)
        && contractJson.hasOwnProperty(define.CONTRACT_DEFINE.CONTRACT_PROPERTY.CONTENTS)
        && contractJson.hasOwnProperty(define.CONTRACT_DEFINE.CONTRACT_PROPERTY.SIG)
        && contractJson.hasOwnProperty(define.CONTRACT_DEFINE.CONTRACT_PROPERTY.SIGNED_PUPKEY)))
    {
        logger.error("inspectContract - CONTRACT_ERROR_JSON.CONTRACT_FORM");
        return config.CONTRACT_ERROR_JSON.CONTRACT_FORM;
    }

    //
    let contract_error_code = config.CONTRACT_ERROR_JSON.VALID;

    do
    {
        // Signature Verify Valid
        if (config.CONTRACT_SIG_CHK_MODE === true)
        {
            var verifyResult = false;

            // Verifying Signature
            verifyResult = cryptoUtil.verifySign(contractJson.signed_pubkey, contractJson);
            logger.debug("inspectContract - verifyResult : " + verifyResult);

            if (verifyResult === false)
            {
                logger.error("Signature Is Invalid(Verify failed)");
                contract_error_code = config.CONTRACT_ERROR_JSON.SIGNATURE;

                break;
            } 
        }

        if (config.CONTRACT_TEST_MODE === false)
        {
            // Contract Checker
            let retVal = await contractChecker.chkContract(contractJson);
            if (retVal === define.ERR_CODE.ERROR)
            {
                logger.error("inspectContract - CONTRACT_ERROR_JSON.CONTENT_FORM");
                contract_error_code = config.CONTRACT_ERROR_JSON.CONTENT_FORM;

                break;
            }
        }

        // // check if from PublicKey is IndexServer's Public Key
        // let is_Index_Server = false;
        // if(contractJson.signed_pubkey === cryptoUtil.getIsPubkey())
        // {
        //     is_Index_Server = true;
        //     logger.debug("Signed Pubkey of Contract is the IS Public Key.");
        // }
        
        // check contract create time
        if (Number(contractJson.create_tm) <= util.getDateMS())
        {
            if (Number(contractJson.create_tm) >= (util.getDateMS() - define.FIXED_VAL.TEN_MIN_MS)) // Valid until preivious several minutes.
            {
                let myDbKey = this.genDbKeyIndex();
                // logger.debug('myDbKey : ' + myDbKey);

                let data = {errCode : contract_error_code["ERROR_CODE"], jsonData : JSON.stringify(contractJson), dbKey : myDbKey};

                // // Option 1
                // myCluster.sendValidTxsToMaster(JSON.stringify(data));
    
                // Option 2
                this.pushContractArray(data);
    
                // // Option 3
                // await dbNNHandler.insertScDelayedTxsV(contract_error_code["ERROR_CODE"], contractJson);
            }
            else
            {
                contract_error_code = config.CONTRACT_ERROR_JSON.CREATE_TIME;
            }
        }
        else
        {
            logger.debug("into insertScDelayedTxsV() : " + JSON.stringify(contractJson));
            await dbNNHandler.insertScDelayedTxsV(contract_error_code["ERROR_CODE"], JSON.stringify(contractJson));
        }
    } while(0);

    // if(contract_error_code !== config.CONTRACT_ERROR_JSON.VALID)
    // {
    //     await this.delContractElement(contractJson.signed_pubkey);
    // }

    return contract_error_code;
}

//
module.exports.sendTxArrToDB = async () => {
    try {
        let txArray = new Array();
        let secLedgerArray = new Array();
        let utiLedgerArray = new Array();
        let tokenArray = new Array();
        let userArray = new Array();
        let scActionArray = new Array();

        // logger.debug("contractArray : " + util.isArray(contractArray) + ", len : " +  contractArray.length);
        if(util.isArray(contractArray) && contractArray.length)
        {
            // 
            let transferArray;
            if(parseInt(contractArray.length) >= define.CONTRACT_DEFINE.MAX_TX_CNT)
            {
                // TxCnt >= Maximum Tx Cnt per communication
                transferArray = contractArray.slice(0, define.CONTRACT_DEFINE.MAX_TX_CNT);
                contractArray = contractArray.slice(define.CONTRACT_DEFINE.MAX_TX_CNT, contractArray.length);
            }
            else
            {
                // TxCnt < Maximum Tx Cnt per communication 
                transferArray = [...contractArray];
                await this.reinitContractArray();
            }

            // logger.debug("sendTxArrToDB getConn STT " + util.getDateMS());

            // insert sc.sc_contents
            let scArray = new Array();
            let insertScContentsQuery = dbNN.querys.sc.sc_contents.insertScContents;

            await util.asyncForEach(transferArray, async (element, index) => {
                let contractJson = JSON.parse(element['jsonData']);
                let from_account = contractJson.from_account;
                let myDbKey = element['dbKey'];
                // logger.debug('myDbKey : ' + myDbKey);

                //
                // let already_exist = await this.hasContractElement(contractJson.from_account, contractJson.signed_pubkey);
                // logger.debug ("getVal mid : " + already_exist);
                // if (!already_exist)
                {
                    await this.setContractElement(contractJson.from_account, contractJson.signed_pubkey, contractJson);
                    //
                    scArray.push(element);

                    //insertScContentsQuery += `(${mySubNetId}, '${JSON.stringify(element['jsonData'])}'),`;
                    insertScContentsQuery += `(${mySubNetId}, `; // subnet_id
                    insertScContentsQuery += `${BigInt(contractJson.create_tm)}, `; // create_tm
                    insertScContentsQuery += `${BigInt(util.hexStrToBigInt(myDbKey))}, `; // db_key
                    insertScContentsQuery += `0, `; // confirmed
                    insertScContentsQuery += `${BigInt(util.hexStrToBigInt(from_account))}, `; // from_account
                    insertScContentsQuery += `${BigInt(util.hexStrToBigInt(contractJson.to_account))}, `; // to_account

                    //
                    insertScContentsQuery += `${contractJson.action}, `; // action

                    //
                    if (contractJson.action === define.CONTRACT_DEFINE.ACTIONS.CONTRACT.DEFAULT.TOKEN_TX)
                    {
                        insertScContentsQuery += `${contractJson.contents.action}, `; // c_action

                        if (contractJson.to_account === define.CONTRACT_DEFINE.TO_DEFAULT) // multiple transaction
                        {
                            insertScContentsQuery += `${BigInt(util.hexStrToBigInt(contractJson.to_account))}, `; // dst_account
                            insertScContentsQuery += `'${contractJson.contents.total_amount}', `; // amount
                        }
                        else if (contractJson.contents.action <= define.CONTRACT_DEFINE.ACTIONS.TOKEN.SECURITY_TOKEN)
                        {
                            insertScContentsQuery += `${BigInt(util.hexStrToBigInt(contractJson.to_account))}, `; // dst_account
                            insertScContentsQuery += `'${contractJson.contents.amount}', `; // amount
                        }
                        else if (contractJson.contents.action <= define.CONTRACT_DEFINE.ACTIONS.TOKEN.UTILITY_TOKEN_MAX)
                        {
                            insertScContentsQuery += `${BigInt(util.hexStrToBigInt(contractJson.contents.dst_account))}, `; // dst_account
                            insertScContentsQuery += `'${contractJson.contents.amount}', `; // amount
                        }
                    }
                    else
                    {
                        insertScContentsQuery += `${define.CONTRACT_DEFINE.ACTIONS.NONE}, `;

                        insertScContentsQuery += `${BigInt(0)}, `; // dst_account
                        insertScContentsQuery += `'0', `; // amount
                    }

                    insertScContentsQuery += `'${contractJson.signed_pubkey}', `; // signed_pubkey
                    insertScContentsQuery += ` ${element['errCode']}, `; // err_code
                    insertScContentsQuery += `${JSON.stringify(element['jsonData'])}),`;
                    // insertScContentsQuery += `'${JSON.stringify(element['jsonData'])}'),`;
                }
            });

            // Error Case
            if(!scArray.length)
            {
                logger.err("Error - No Contract");
                txArray = new Array();
                return;
            }

            const connSC = await dbUtil.getConn();
            // await dbUtil.exeQuery(connSC, dbNN.querys.sc.useSC);

            insertScContentsQuery = insertScContentsQuery.substr(0, insertScContentsQuery.length - 1);
            // logger.debug("insertScContentsQuery : " + insertScContentsQuery);

            [query_result] = await dbUtil.exeQuery(connSC, insertScContentsQuery);
            await dbUtil.releaseConn(connSC);

            // insert block.blk_txs
            // logger.debug("sendTxArrToDB affectedRows : " + query_result.affectedRows);
            for(var i = 0; i < query_result.affectedRows; i++)
            {
                let contractJson = JSON.parse(scArray[i]['jsonData']);

                if (scArray[i]['errCode'] === config.CONTRACT_ERROR_JSON.VALID['ERROR_CODE']) // Remove?
                {
                    await this.setContractElement(contractJson.from_account, contractJson.signed_pubkey, contractJson);
                    
                    // let db_key = (BigInt(query_result.insertId) + BigInt(i)).toString();
                    let db_key = (BigInt(util.hexStrToBigInt(scArray[i]['dbKey']))).toString();
                    // logger.debug(db_key);
                    // block.blk_txs
                    // logger.debug(scArray[i]['jsonData']);
                    txArray.push({ db_key : db_key, sc_hash : cryptoSsl.genSha256Str(db_key + scArray[i]['jsonData']) });

                    // account.account_ledegers
                    if (contractJson.action === define.CONTRACT_DEFINE.ACTIONS.TOKEN.SECURITY_TOKEN)
                    {
                        // secLedgerArray
                        secLedgerArray.push({ db_key : db_key, contractJson : contractJson });
                    }
                    else if (contractJson.action <= define.CONTRACT_DEFINE.ACTIONS.TOKEN.UTILITY_TOKEN_MAX)
                    {
                        //  utiLedgerArray
                        utiLedgerArray.push({ db_key : db_key, contractJson : contractJson });
                    }
                    // else if (contractJson.action <= define.CONTRACT_DEFINE.ACTIONS.CONTRACT.DEFAULT.TOKEN_TX)
                    else if (contractJson.action === define.CONTRACT_DEFINE.ACTIONS.CONTRACT.DEFAULT.TOKEN_TX)
                    {
                        if (contractJson.to_account === define.CONTRACT_DEFINE.TO_DEFAULT) // multiple transaction
                        {
                            //
                            let myTxInfo = JSON.parse(contractJson.contents.tx_info);

                            await util.asyncForEach(myTxInfo, async(element, index) => {
                                //
                                if (contractJson.contents.action === define.CONTRACT_DEFINE.ACTIONS.TOKEN.SECURITY_TOKEN)
                                {
                                    // secLedgerArray
                                    let newContractJson = token.updateMultiTxSecTokenContract(contractJson, element);

                                    secLedgerArray.push({ db_key : db_key, contractJson : newContractJson });
                                }
                                else if (contractJson.contents.action <= define.CONTRACT_DEFINE.ACTIONS.TOKEN.UTILITY_TOKEN_MAX)
                                {
                                    //  utiLedgerArray
                                    let newContractJson = token.updateMultiTxUtilTokenContract(contractJson, element);

                                    utiLedgerArray.push({ db_key : db_key, contractJson : newContractJson });
                                }
                                else
                                {
                                    // Error
                                    logger.error("Error - contractJson.contents.action 1");
                                }
                            });
                        }
                        else
                        {
                            //
                            if (contractJson.contents.action === define.CONTRACT_DEFINE.ACTIONS.TOKEN.SECURITY_TOKEN)
                            {
                                // secLedgerArray
                                secLedgerArray.push({ db_key : db_key, contractJson : contractJson });
                            }
                            else if (contractJson.contents.action <= define.CONTRACT_DEFINE.ACTIONS.TOKEN.UTILITY_TOKEN_MAX)
                            {
                                //  utiLedgerArray
                                utiLedgerArray.push({ db_key : db_key, contractJson : contractJson });
                            }
                            else
                            {
                                // Error
                                logger.error("Error - contractJson.contents.action 2");
                            }
                        }
                    }

                    // account.account_tokens
                    if (contractJson.action === define.CONTRACT_DEFINE.ACTIONS.CONTRACT.DEFAULT.TOKEN_CREATION)
                    {
                        // tokenArray
                        tokenArray.push({ db_key : db_key, revision : 0, market_supply : '0', contractJson : contractJson });
                    }
                    else if (contractJson.action === define.CONTRACT_DEFINE.ACTIONS.CONTRACT.DEFAULT.EXE_FUNC)
                    {
                        // 
                    }
                    else if (contractJson.action === define.CONTRACT_DEFINE.ACTIONS.CONTRACT.DEFAULT.CHANGE_TOKEN_PUBKEY)
                    {
                        // 
                        let tokenAccont = await dbNNHandler.accountTokenCheck(contractJson.contents.action);

                        let newContractJson = token.updateChangeTokenPubkeyContract(contractJson, tokenAccont[0]);

                        // tokenArray
                        tokenArray.push({ db_key : db_key, revision : Number(tokenAccont[0].revision) + 1, market_supply : tokenAccont[0].market_supply, contractJson : newContractJson });
                    }
                    else if (contractJson.action === define.CONTRACT_DEFINE.ACTIONS.CONTRACT.DEFAULT.LOCK_TOKEN_TX)
                    {
                        // 
                        let tokenAccont = await dbNNHandler.accountTokenCheck(contractJson.contents.action);

                        let newContractJson = token.updateLockTokenTxContract(contractJson, tokenAccont[0]);

                        // tokenArray
                        tokenArray.push({ db_key : db_key, revision : Number(tokenAccont[0].revision) + 1, market_supply : tokenAccont[0].market_supply, contractJson : newContractJson });
                    }
                    else if (contractJson.action === define.CONTRACT_DEFINE.ACTIONS.CONTRACT.DEFAULT.LOCK_TOKEN_TIME)
                    {
                        // 
                        let tokenAccont = await dbNNHandler.accountTokenCheck(contractJson.contents.action);

                        let newContractJson = token.updateLockTokenTimeContract(contractJson, tokenAccont[0]);

                        // tokenArray
                        tokenArray.push({ db_key : db_key, revision : Number(tokenAccont[0].revision) + 1, market_supply : tokenAccont[0].market_supply, contractJson : newContractJson });
                    }
                    else if (contractJson.action === define.CONTRACT_DEFINE.ACTIONS.CONTRACT.DEFAULT.LOCK_TOKEN_WALLET)
                    {
                        // 
                        let tokenAccont = await dbNNHandler.accountTokenCheck(contractJson.contents.action);

                        let newContractJson = token.updateLockTokenWalletContract(contractJson, tokenAccont[0]);

                        // tokenArray
                        tokenArray.push({ db_key : db_key, revision : Number(tokenAccont[0].revision) + 1, market_supply : tokenAccont[0].market_supply, contractJson : newContractJson });
                    }
                    
                    // account.account_users
                    if (contractJson.action === define.CONTRACT_DEFINE.ACTIONS.CONTRACT.DEFAULT.ADD_USER)
                    {
                        // userArray
                        userArray.push({ db_key : db_key, revision : 0, contractJson : contractJson });
                    }
                    else if (contractJson.action === define.CONTRACT_DEFINE.ACTIONS.CONTRACT.DEFAULT.CHANGE_USER_PUBKEY)
                    {
                        // 
                        let userAccont = await dbNNHandler.accountUserAccountIdCheck(contractJson.contents.account_id);

                        let newContractJson = user.updateChangeUserPubkeyContract(contractJson, userAccont[0]);

                        // userArray
                        userArray.push({ db_key : db_key, revision : Number(userAccont[0].revision) + 1, contractJson : newContractJson });
                    }

                    // scActionArray
                    if (contractJson.action === define.CONTRACT_DEFINE.ACTIONS.CONTRACT.DEFAULT.CREATE_SC)
                    {
                        // scActionArray
                        scActionArray.push({ db_key : db_key, contractJson : contractJson });
                    }
                    else if ((contractJson.action >= define.CONTRACT_DEFINE.ACTIONS.CONTRACT.SC.STT) &&
                        (contractJson.action <= define.CONTRACT_DEFINE.ACTIONS.CONTRACT.NFT.END))
                    {
                        let newContractJson = sc.updateTransferScContract(contractJson);
                        
                        // scActionArray
                        scActionArray.push({ db_key : db_key, contractJson : newContractJson });
                    }
                }
                // else
                // {
                //     await this.delContractElement(contractJson.signed_pubkey);
                // }
            }

            // Insert into block.blk_txs;
            if (txArray.length)
            {
                await dbNNHandler.insertBlkTxsV(txArray);

                txArray = new Array();
            }

            if (secLedgerArray.length)
            {
                await dbNNHandler.insertAccountSecLedger(secLedgerArray);

                secLedgerArray = new Array();
            }

            if (utiLedgerArray.length)
            {
                await dbNNHandler.insertAccountUtilLedger(utiLedgerArray);

                utiLedgerArray = new Array();
            }

            if (tokenArray.length)
            {
                await dbNNHandler.insertAccountTokensV(tokenArray);

                tokenArray = new Array();
            }

            if (userArray.length)
            {
                await dbNNHandler.insertAccountUsersV(userArray);

                userArray = new Array();
            }

            if (scActionArray.length)
            {
                await dbNNHandler.insertAccountScActionV(scActionArray);

                scActionArray = new Array();
            }

            if (contractArray.length)
            {
                // logger.debug("ssendNullTxsToMaster");
                myCluster.sendNullTxsToMaster();
            }
            // logger.debug("sendTxArrToDB getConn END " + util.getDateMS());
        } 
    } catch (err) {
        debug.error(err);
        logger.error("Contract.js sendTxArrToDB Func");
    }
}

//
module.exports.getBNFromRcvdBlkNoti = (blkNoti) => {
    let pos = 0;

    let BN = blkNoti.toString().substr(pos, define.REDIS_DEFINE.BLK_NOTI_LEN.HEX_STR_BN_LEN);
    BN = BigInt("0x" + BN).toString();
    pos += define.REDIS_DEFINE.BLK_NOTI_LEN.HEX_STR_BN_LEN;
    // logger.debug("BN : " + BN);

    myCurBN = BN;

    return BN;
}

// module.exports.updateAccountBalanceSubNet = async () => {
//     let maxBN = BigInt(myCurBN) - BigInt(myGapBN);

//     // logger.debug("func - updateAccountBalanceSubNet");
//     // logger.debug("myCurBN : " + myCurBN + ", myGapBN : " + myGapBN + ", maxBN : " + maxBN);

//     if (maxBN > 0)
//     {
//         await ledger.updateAccountBalanceSubNetIdV(maxBN, myGapBN, mySubNetId);
//     }
// }

//
module.exports.rcvdBlkNotiFromNNA = async (blkNoti) => {
    logger.debug("[rcvdBlkNotiFromNNA] -> (" + blkNoti.toString() + ")");

    let BN = this.getBNFromRcvdBlkNoti(blkNoti);

    //
    // logger.debug("rcvdBlkNotiFromNNA getConn STT " + util.getDateMS());
    let dbKey = await dbNNHandler.selectDbKeyFromBlkTxs(BN);
    // logger.debug("rcvdBlkNotiFromNNA getConn END " + util.getDateMS());

    if (dbKey.length)
    {
        let minDbKey = dbKey[0];
        let maxDbKey = dbKey[1];
        logger.debug("minDbKey : " + minDbKey + ", maxDbKey : " + maxDbKey);

        //
        await dbNNHandler.updateScContentsWhereDbKey(minDbKey, maxDbKey, BN);
        // await dbNNHandler.updateAccountsBlkNumWhereDbKey(minDbKey, maxDbKey, BN); // It should be deleted.

        //
        let query_result = await dbNNHandler.selectFromScContentsWithDbKey(minDbKey, maxDbKey);

        let pubkeyArr = new Array();
        for(var idx =0 ; idx < query_result.length ; idx++)
        {
            let signed_pubkey = query_result[idx].signed_pubkey;
            // logger.debug("query_result[" + idx + "].signed_pubkey :" + signed_pubkey);

            if (signed_pubkey !== cryptoUtil.getIsPubkey())
            {
                pubkeyArr.push({signed_pubkey : signed_pubkey});
            }
        }

        if (pubkeyArr.length)
        {
            myCluster.sendContractElementToMaster(pubkeyArr);
        }
    }

    // ////////////////////////////////////////////////////////
    // // Could be executed in timer handler
    // //
    // await this.updateAccountBalanceSubNet();

    //
    await dbNNHandler.procScDelayedTxs(util.getDateMS());
    ////////////////////////////////////////////////////////
}
