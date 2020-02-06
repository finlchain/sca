const config = require("./../../config/config.js");
const define = require("./../../config/define.js");
const keyUtil = require("./../sec/KeyUtil.js");
const crypto = require("./../sec/Crypto.js");
const db = require("./../db/DBUtil.js");
const redis = require("./../db/RedisUtil.js");
const util = require("./../utils/CommonUtil.js");
const timer = require("./../utils/Timer.js");
const winlog = require("./../utils/Winlog.js");
const kafkaUtil = require("./../net/KafkaUtil.js");
const fbapi = require("./../api/FBapi.js");

let ContractArray = new Array();
let TxArray = new Array();
let DBKeyIndex;
let SubNetID;

module.exports.ContractArray = ContractArray;

module.exports.DBKeyIndex = DBKeyIndex; 

module.exports.getSubNetID = () => {
    return SubNetID;
}

module.exports.getContractArray = () => {
    let tempArray = [...ContractArray];
    return tempArray;
}

module.exports.setContractArray = async (array) => {
    ContractArray = await ContractArray.concat(array);
}

module.exports.reinitContractArray = async () => {
    ContractArray = new Array();
}

module.exports.setDBKeyIndex = async () => {
    winlog.info("Contract DBKey Index Set");
    const conn = await db.CreateConnection(db.scConfig);
    DBKeyIndex = await keyUtil.GenKeyIndex();
    SubNetID = await keyUtil.getSubNetID(DBKeyIndex);

    await conn.query(db.querys.DBKeySet, [DBKeyIndex]);
    await db.connectionClose(conn);
}

// CreateTransaction from WalletContract
// Pass to NNA
module.exports.createTx = async (data) => {
    if(!util.isJson(data))
    {
        return define.CONTRACT_ERROR.JSON_FORMAT;
    }

    var contractJson = JSON.parse(data);

    // check Contract Form
    if(!(contractJson.hasOwnProperty(define.CONTRACT_DEFINE.CONTRACT_PROPERTY.REVISION)
        && contractJson.hasOwnProperty(define.CONTRACT_DEFINE.CONTRACT_PROPERTY.PREV_KEY_ID)
        && contractJson.hasOwnProperty(define.CONTRACT_DEFINE.CONTRACT_PROPERTY.CONTRACT_CREATE_TIME)
        && contractJson.hasOwnProperty(define.CONTRACT_DEFINE.CONTRACT_PROPERTY.FINTECH)
        && contractJson.hasOwnProperty(define.CONTRACT_DEFINE.CONTRACT_PROPERTY.FROM)
        && contractJson.hasOwnProperty(define.CONTRACT_DEFINE.CONTRACT_PROPERTY.BALANCE)
        && contractJson.hasOwnProperty(define.CONTRACT_DEFINE.CONTRACT_PROPERTY.NOTE_PRIVACY)
        && contractJson.hasOwnProperty(define.CONTRACT_DEFINE.CONTRACT_PROPERTY.NOTE)
        && contractJson.hasOwnProperty(define.CONTRACT_DEFINE.CONTRACT_PROPERTY.SIGNATURE)))
    {
        return define.CONTRACT_ERROR.CONTRACT_FORM;
    }

    let from_arg = contractJson.From;
    let fintech = contractJson.Fintech;
    let is_Index_Server = false;
    let is_regist = true;
    let contract_error_code = define.CONTRACT_ERROR.VALID;
    let to_arg_valid;

    // Verifying Signature
    if (from_arg.slice(define.SEC_DEFINE.KEY_DELIMITER.START_INDEX, 
                       define.SEC_DEFINE.KEY_DELIMITER.DELIMITER_LEN) 
        == define.SEC_DEFINE.KEY_DELIMITER.ED25519_DELIMITER)
    {
        var verifyResult = await keyUtil.EddsaVerify(from_arg.slice(define.SEC_DEFINE.KEY_DELIMITER.DELIMITER_LEN), contractJson, contractJson.Signature);
    }
    else
    {
        var SigR = contractJson.Signature.slice(define.SEC_DEFINE.SIGNATURE.SIG_R_START_INDEX, define.SEC_DEFINE.SIGNATURE.SIG_R_LEN);
        var SigS = contractJson.Signature.slice(define.SEC_DEFINE.SIGNATURE.SIG_S_START_INDEX, define.SEC_DEFINE.SIGNATURE.SIG_S_LEN);

        var verifyResult = await keyUtil.EcdsaR1Verify(from_arg, contractJson, SigR, SigS);
        if (verifyResult == false)
            verifyResult = await keyUtil.EcdsaK1Verify(from_arg, contractJson, SigR, SigS);
    }

    // Verify that only one contract has been performed by the user's public key.

    // check if from PublicKey is IndexServer's Public Key
    if(from_arg === keyUtil.getISPubkey())
        is_Index_Server = true;

    // Signature Verify Valid
    if (verifyResult) 
    {
        // check contract create time
        let currUtcTimestamp = new Date().getTime();
        let utc_time_error = currUtcTimestamp - parseInt(contractJson.ContractCreateTime);
        if(utc_time_error < define.CONTRACT_DEFINE.UTC_MILLISEC_NEGATIVE_ERROR || utc_time_error > define.CONTRACT_DEFINE.UTC_MILLISEC_ERROR)
        {
            return define.CONTRACT_ERROR.CREATE_TIME;
        }        

        if(fintech === define.CONTRACT_DEFINE.FINTECH.NON_FINANCIAL_TX) 
        {
            // Registration
            let api_req_argv;
            if(contractJson.Note[0].Kind === define.CONTRACT_DEFINE.KIND.LOGOUT_USER_TIMEOUT) 
            {
                api_req_argv = {
                    "pubkey" : contractJson.Note[0].Content.PublicKey,
                    "kind" : define.CONTRACT_DEFINE.KIND.SECURITY_COIN
                };
            }
            else 
            {
                api_req_argv = {
                    "pubkey" : from_arg,
                    "kind" : define.CONTRACT_DEFINE.KIND.SECURITY_COIN
                };
            }
            // let api_res = await fbapi.APICall(config.FBAccountStatusConfig, api_req_argv);
            let fb_url = config.FBURL + "/account/status";
            let api_res = await fbapi.APICall_GET(fb_url, api_req_argv);

            if(api_res === define.FB_API_DEFINE.NOT_FOUND
                || api_res.errorCode === define.FB_API_DEFINE.RESULT_CODE.NOT_REGIST)
            {
                is_regist = false;
                // return define.CONTRACT_ERROR.FB_NO_DATA;
            }
            
            // Already Registed User
            if(api_res.errorCode === define.FB_API_DEFINE.RESULT_CODE.SUCCESS)
            {
                // check revision and previous key
                if(contractJson.PreviousKeyID !== api_res.contents.previous_key 
                    || parseInt(contractJson.Revision) !== (parseInt(api_res.contents.revision) + 1))
                {
                    return define.CONTRACT_ERROR.REVISION;
                }
            }

            if(api_res.erroCode === define.FB_API_DEFINE.RESULT_CODE.NOT_REGIST)
            {
                if(contractJson.PreviousKeyID !== 0 && contractJson.Revision !== 0)
                {
                    return define.CONTRACT_ERROR.REVISION;
                }
            }

            if(!is_Index_Server && contractJson.Note.length > 1)
            {
                return define.CONTRACT_ERROR.USER_REG_NOTE;
            }

            // check if Fintech and Regist Mixed in Note
            await util.asyncForEach(contractJson.Note, (element, index) => {
                // check Note Form
                if(!(element.hasOwnProperty(define.CONTRACT_DEFINE.NOTE_PROPERTY.TO)
                    && element.hasOwnProperty(define.CONTRACT_DEFINE.NOTE_PROPERTY.FEE)
                    && element.hasOwnProperty(define.CONTRACT_DEFINE.NOTE_PROPERTY.KIND)
                    && element.hasOwnProperty(define.CONTRACT_DEFINE.NOTE_PROPERTY.CONTENT)
                    && element.hasOwnProperty(define.CONTRACT_DEFINE.NOTE_PROPERTY.DATE)))
                {
                    contract_error_code = define.CONTRACT_ERROR.NOTE_FORM;
                }

                if(!element.hasOwnProperty(define.CONTRACT_DEFINE.NOTE_PROPERTY.KIND) 
                    || element.Kind <= define.CONTRACT_DEFINE.KIND.COIN_TYPE_LAST_NUMBER) 
                {
                    contract_error_code = define.CONTRACT_ERROR.CONTRACT_KIND;
                }
            });

            if(contract_error_code !== define.CONTRACT_ERROR.VALID)
                return contract_error_code;

            await util.asyncForEach(contractJson.Note, async (element, index) => {
                let is_note_form_valid = true;
                let content = element.Content;

                // check Kind and content form
                if((element.Kind === define.CONTRACT_DEFINE.KIND.ADD_USER
                    || element.Kind === define.CONTRACT_DEFINE.KIND.CHANGE_USER_ID
                    || element.Kind === define.CONTRACT_DEFINE.KIND.CHANGE_USER_PUB_KEY
                    || element.Kind === define.CONTRACT_DEFINE.KIND.LOGOUT_USER_TIMEOUT)
                    && !(content.hasOwnProperty(define.CONTRACT_DEFINE.CONTENT_PROPERTY.ID)
                        && content.hasOwnProperty(define.CONTRACT_DEFINE.CONTENT_PROPERTY.PUBLIC_KEY))) 
                {
                    is_note_form_valid = false;
                } 
                else if((element.Kind === define.CONTRACT_DEFINE.KIND.LOGIN_USER
                        || element.Kind === define.CONTRACT_DEFINE.KIND.LOGOUT_USER)
                        && !(content.hasOwnProperty(define.CONTRACT_DEFINE.CONTENT_PROPERTY.IP))) 
                {
                    is_note_form_valid = false;
                }
                else if((element.Kind === define.CONTRACT_DEFINE.KIND.ADD_HW
                        || element.Kind === define.CONTRACT_DEFINE.KIND.CHANGE_HW_ID
                        || element.Kind === define.CONTRACT_DEFINE.KIND.CHANGE_HW_PUB_KEY
                        || element.Kind === define.CONTRACT_DEFINE.KIND.CHANGE_HW_SN)
                        && !(content.hasOwnProperty(define.CONTRACT_DEFINE.CONTENT_PROPERTY.ID)
                            && content.hasOwnProperty(define.CONTRACT_DEFINE.CONTENT_PROPERTY.PUBLIC_KEY)
                            && content.hasOwnProperty(define.CONTRACT_DEFINE.CONTENT_PROPERTY.HW_SN))) 
                {
                    is_note_form_valid = false;
                }
                else if ((element.Kind === define.CONTRACT_DEFINE.KIND.ADD_KAFKA
                        && !(content.hasOwnProperty(define.CONTRACT_DEFINE.CONTENT_PROPERTY.IDX)
                            && content.hasOwnProperty(define.CONTRACT_DEFINE.CONTENT_PROPERTY.BROKER_LIST)
                            && content.hasOwnProperty(define.CONTRACT_DEFINE.CONTENT_PROPERTY.TOPIC_LIST))))
                {
                    is_note_form_valid = false;
                }
                else if ((element.Kind === define.CONTRACT_DEFINE.KIND.REWARD_POLICY
                    && !(content.hasOwnProperty(define.CONTRACT_DEFINE.SMART_CONTRACT_PROPERTY.COIN_TYPE)
                        && content.hasOwnProperty(define.CONTRACT_DEFINE.SMART_CONTRACT_PROPERTY.PERIOD)
                        && content.hasOwnProperty(define.CONTRACT_DEFINE.SMART_CONTRACT_PROPERTY.TOTAL_REWARD)
                        && content.hasOwnProperty(define.CONTRACT_DEFINE.SMART_CONTRACT_PROPERTY.REWARD_FEE_RATIO)))
                    || (element.Kind === define.CONTRACT_DEFINE.KIND.REWARD_POLICY && !is_Index_Server))
                {
                    contract_error_code = define.CONTRACT_ERROR.SMART_CONTRACT_FORM;
                }

                if(!is_note_form_valid) 
                {
                    contract_error_code = define.CONTRACT_ERROR.NOTE_FORM;
                }

                // check Note Date
                utc_time_error = parseInt(currUtcTimestamp / 1000) - parseInt(element.Date);
                if(utc_time_error < define.CONTRACT_DEFINE.UTC_SEC_NEGATIVE_ERROR || utc_time_error > define.CONTRACT_DEFINE.UTC_SEC_ERROR)
                {
                    contract_error_code = define.CONTRACT_ERROR.NOTE_DATE;
                }     

                // Already Reigst User Check -> Can't re-registration
                if(api_res.errorCode === define.FB_API_DEFINE.RESULT_CODE.SUCCESS
                    && (from_arg === content.PublicKey)
                    && (element.Kind === define.CONTRACT_DEFINE.KIND.ADD_USER))
                {
                    contract_error_code = define.CONTRACT_ERROR.ALREADY_REG;
                }
                
                // Can't HW Regist except IS
                if((element.Kind >= define.CONTRACT_DEFINE.KIND.ADD_HW 
                    && element.Kind <= define.CONTRACT_DEFINE.KIND.NODE_JSON) && !is_Index_Server)
                {
                    contract_error_code = define.CONTRACT_ERROR.HW_REG;
                }

                // The user registration contract can be made only by himself
                if((from_arg !== content.PublicKey)
                    && (element.Kind === define.CONTRACT_DEFINE.KIND.ADD_USER
                        || element.Kind === define.CONTRACT_DEFINE.KIND.CHANGE_USER_ID)
                    && !is_Index_Server)
                {
                    contract_error_code = define.CONTRACT_ERROR.ADD_USER;
                }

                if(element.Kind === define.CONTRACT_DEFINE.KIND.REWARD_POLICY && is_Index_Server)
                {
                    if((content.CoinType < 0 || content.ConinType > define.CONTRACT_DEFINE.KIND.COIN_TYPE_LAST_NUMBER)
                        || (content.Period < 0)
                        || (parseFloat(content.TotalReward) < 0)
                        || (parseFloat(content.RewardFeeRatio <= 0)))
                    {
                        contract_error_code = define.CONTRACT_ERROR.SMART_CONTRACT_FORM;
                    }
                }

                if(is_regist)
                {
                    // Login users cannot login again
                    if(api_res.contents.status === define.ACCOUNT_DEFINE.STATUS.LOGIN
                        && element.Kind === define.CONTRACT_DEFINE.KIND.LOGIN_USER)
                    {
                        contract_error_code = define.CONTRACT_ERROR.ALREADY_LOGIN;
                    }

                    // can login only logout status
                    if(api_res.contents.status !== define.ACCOUNT_DEFINE.STATUS.LOGOUT 
                        && element.Kind === define.CONTRACT_DEFINE.KIND.LOGIN_USER
                        || api_res === define.FB_API_DEFINE.NOT_FOUND)
                    {
                        contract_error_code = define.CONTRACT_ERROR.NOT_LOGOUT_STATUS;
                    }

                    // can logout only login status
                    if(api_res.contents.status !== define.ACCOUNT_DEFINE.STATUS.LOGIN
                        && element.Kind === define.CONTRACT_DEFINE.KIND.LOGIN
                        || api_res === define.FB_API_DEFINE.NOT_FOUND)
                    {
                        contract_error_code = define.CONTRACT_ERROR.NOT_LOGIN_STATUS;
                    }

                    // change id can only by owner
                    if(api_res.contents.id !== content.ID && 
                        element.Kind === define.CONTRACT_DEFINE.KIND.CHANGE_USER_PUB_KEY)
                    {
                        contract_error_code = define.CONTRACT_ERROR.OWNER_PK;
                    }

                    // change public key can only by owner
                    if(from_arg !== content.PublicKey
                        && (element.Kind === define.CONTRACT_DEFINE.KIND.ADD_USER
                            || element.Kind === define.CONTRACT_DEFINE.KIND.CHANGE_USER_ID))
                    {
                        contract_error_code = define.CONTRACT_ERROR.OWNER_ID;
                    }
                }
                else 
                {
                    // Unregistered users cannot log in
                    if(element.Kind === define.CONTRACT_DEFINE.KIND.LOGIN_USER)
                    {
                        contract_error_code = define.CONTRACT_ERROR.UNREG_LOGIN;
                    }

                    // Unregistered user cannot log out
                    if(element.Kind === define.CONTRACT_DEFINE.KIND.LOGOUT_USER)
                    {
                        contract_error_code = define.CONTRACT_ERROR.UNREG_LOGOUT;
                    }

                    // Unregistered user cannot timeout log out
                    if(element.Kind === define.CONTRACT_DEFINE.KIND.LOGOUT_USER_TIMEOUT)
                    {
                        contract_error_code = define.CONTRACT_ERROR.UNREG_LOGOUT_TIMEOUT;
                    }   

                    // Unregistered user cannot change id
                    if(element.Kind === define.CONTRACT_DEFINE.KIND.CHANGE_USER_ID)
                    {
                        contract_error_code = define.CONTRACT_ERROR.CHG_ID_UNREG;
                    }
                
                    // Unregistered user cannot change pubkey
                    if(element.Kind === define.CONTRACT_DEFINE.KIND.CHANGE_USER_PUB_KEY)
                    {
                        contract_error_code = define.CONTRACT_ERROR.CHG_PK_UNREG;
                    }
                }

                // time out logout can only make by self
                if(element.Kind === define.CONTRACT_DEFINE.KIND.LOGOUT_USER_TIMEOUT)
                {
                    let my_pubkey = await keyUtil.getMyPubkey(define.SEC_DEFINE.KEY_PURPOSE.NET);
                    my_pubkey = config.sig_type === define.SEC_DEFINE.SIGN_KIND.EDDSA ? define.SEC_DEFINE.KEY_DELIMITER.ED25519_DELIMITER + my_pubkey : my_pubkey;
                    if(my_pubkey !== from_arg)
                    {
                        contract_error_code = define.CONTRACT_ERROR.NOT_MY_SUBNET;
                    }

                    if(api_res.errorCode !== define.FB_API_DEFINE.RESULT_CODE.SUCCESS
                        || api_res.contents.status !== define.ACCOUNT_DEFINE.STATUS.LOGIN) 
                    {
                        contract_error_code = define.CONTRACT_ERROR.UNREG_LOGOUT_TIMEOUT;                 
                    }
                }

                // add kafka can only by IndexServer
                if((element.Kind === define.CONTRACT_DEFINE.KIND.ADD_KAFKA) && !is_Index_Server)
                {
                    contract_error_code = define.CONTRACT_ERROR.ADD_KFK;
                }

            });
        }
        else if(fintech === define.CONTRACT_DEFINE.FINTECH.FINANCIAL_TX)
        {
            // Financial Transaction
            let api_req_argv = {
                "pubkey" : from_arg,
                "kind" : contractJson.Note[0].Kind
            };
            let fb_url = config.FBURL + "/account/status";
            let api_res = await fbapi.APICall_GET(fb_url, api_req_argv);

            let kind_pivot = contractJson.Note[0].Kind;
            let myTopicName = await kafkaUtil.getTopicName();
            let balance = api_res.contents.balance;
            balance = parseFloat(balance);

            if(api_res === define.FB_API_DEFINE.NOT_FOUND)
            {
                contract_error_code = define.CONTRACT_ERROR.FB_NO_DATA;
            }

            // check if From Address is Regist
            if(api_res.errorCode === define.FB_API_DEFINE.RESULT_CODE.NOT_REGIST) 
            {
                contract_error_code = define.CONTRACT_ERROR.FROM_UNREG;
            }

            // check if From Address is Login
            // and kafka topic name is my subnet
            if((api_res.contents.status !== define.ACCOUNT_DEFINE.STATUS.LOGIN || 
                api_res.contents.topic_name !== myTopicName) && !is_Index_Server) 
            {
                contract_error_code = define.CONTRACT_ERROR.USER_STATUS;
            }

            // check balance
            if(balance !== parseFloat(contractJson.Balance) && !is_Index_Server) 
            {
                contract_error_code = define.CONTRACT_ERROR.INV_BALANCE;
            }

            // check revision and previous key
            if(contractJson.PreviousKeyID !== api_res.contents.previous_key 
                || parseInt(contractJson.Revision) !== (parseInt(api_res.contents.revision) + 1))
            {
                contract_error_code = define.CONTRACT_ERROR.REVISION;
            }

            // check if Fintech and Regist Mixed in Note
            await util.asyncForEach(contractJson.Note, (element, index) => {
                if(element.Kind > define.CONTRACT_DEFINE.KIND.ADD_USER 
                    || kind_pivot !== element.Kind) 
                {
                    contract_error_code = define.CONTRACT_ERROR.CONTRACT_KIND;
                }
            });

            // check Note Form
            await util.asyncForEach(contractJson.Note, async (element, index) => {
                if(!(element.hasOwnProperty(define.CONTRACT_DEFINE.NOTE_PROPERTY.TO)
                    && element.hasOwnProperty(define.CONTRACT_DEFINE.NOTE_PROPERTY.FEE)
                    && element.hasOwnProperty(define.CONTRACT_DEFINE.NOTE_PROPERTY.KIND)
                    && element.hasOwnProperty(define.CONTRACT_DEFINE.NOTE_PROPERTY.CONTENT)
                    && element.hasOwnProperty(define.CONTRACT_DEFINE.NOTE_PROPERTY.DATE)))
                {
                    contract_error_code = define.CONTRACT_ERROR.NOTE_FORM;
                }
            });

            if(contract_error_code !== define.CONTRACT_ERROR.VALID)
                return contract_error_code;

            // Check each note
            try {
                await util.asyncForEach(contractJson.Note, async (element, index) => {
                    let content = element.Content;
                    // Check content Form
                    if(!content.hasOwnProperty(define.CONTRACT_DEFINE.CONTENT_PROPERTY.AMOUNT)
                        && element.Kind <= define.CONTRACT_DEFINE.KIND.COIN_TYPE_LAST_NUMBER)
                    {   
                        contract_error_code = define.CONTRACT_ERROR.CONTENT_FORM;
                    }

                    let amount = content.Amount;
                    amount = parseFloat(amount);

                    // check Note Date
                    utc_time_error = (currUtcTimestamp / 1000) - parseInt(element.Date);
                    if(utc_time_error < define.CONTRACT_DEFINE.UTC_SEC_NEGATIVE_ERROR || utc_time_error > define.CONTRACT_DEFINE.UTC_SEC_ERROR)
                    {
                        contract_error_code = define.CONTRACT_ERROR.NOTE_DATE;
                    }    

                    if(!is_Index_Server) 
                    {
                        // check Amount value is negative
                        if(amount < 0) 
                        {
                            contract_error_code = define.CONTRACT_ERROR.AMOUNT;
                        }

                        // check Balance is sufficient
                        balance -= amount;
                        if (balance < 0) 
                        {
                            contract_error_code = define.CONTRACT_ERROR.INS_BALANCE;
                        }
                    }

                    if(!(is_Index_Server && element.To === define.ACCOUNT_DEFINE.TO_PK_ALL_ZERO))
                    {
                        // if To Address is secp256r1 or secp256k1 pub key check if address valid
                        if(element.To.substr(define.SEC_DEFINE.KEY_DELIMITER.START_INDEX, 
                                            define.SEC_DEFINE.KEY_DELIMITER.END_INDEX) 
                                            == define.SEC_DEFINE.KEY_DELIMITER.SECP256_COMPRESSED_EVEN_DELIMITER 
                            || element.To.substr(define.SEC_DEFINE.KEY_DELIMITER.START_INDEX, 
                                            define.SEC_DEFINE.KEY_DELIMITER.END_INDEX) 
                                            == define.SEC_DEFINE.KEY_DELIMITER.SECP256_COMPRESSED_ODD_DELIMITER) 
                        {
                            let is_secp256r1 = await keyUtil.ConvertPubKey(element.To, define.SEC_DEFINE.CURVE_NAMES.ECDH_SECP256R1_CURVE_NAME, define.SEC_DEFINE.CONVERT_KEY.UNCOMPRESSED);
                            let is_secp256k1 = await keyUtil.ConvertPubKey(element.To, define.SEC_DEFINE.CURVE_NAMES.ECDH_SECP256K1_CURVE_NAME, define.SEC_DEFINE.CONVERT_KEY.UNCOMPRESSED);

                            if(!(is_secp256r1 || is_secp256k1))
                            {
                                contract_error_code = define.CONTRACT_ERROR.TO_PK;
                            }
                        }

                        api_req_argv = {
                            "pubkey" : element.To,
                            "kind" : element.Kind
                        }
                        api_res = await fbapi.APICall_GET(fb_url, api_req_argv);

                        if(api_res === define.FB_API_DEFINE.NOT_FOUND)
                        {
                            contract_error_code = define.CONTRACT_ERROR.FB_NO_DATA;
                        }

                        // check if To Address is Registed
                        if(api_res.errorCode !== define.FB_API_DEFINE.RESULT_CODE.SUCCESS) 
                        {
                           contract_error_code = define.CONTRACT_ERROR.TO_UNREG;               
                        }
                    }
                });
                to_arg_valid = true;
            } catch (err) {
                to_arg_valid = false;
            } 

            if(to_arg_valid == false) {
                contract_error_code = define.CONTRACT_ERROR.TO_PK;
            } 
        }

        if(contract_error_code === define.CONTRACT_ERROR.VALID)
        {
            ContractArray.push(JSON.stringify(contractJson));
        }
    } 
    else {
        winlog.error("Signature Is Invalid(Verify failed)");
        contract_error_code = define.CONTRACT_ERROR.SIGNATURE
    }

    return contract_error_code;
}

// 500 ms interval
module.exports.sendTxArrToNNA = async () => {
    try {
        if(util.isArray(ContractArray) && ContractArray.length) {
            let transferArray;
            if(parseInt(ContractArray.length) >= define.CONTRACT_DEFINE.MAX_TX_CNT) {
                // TxCnt >= Maximum Tx Cnt per communication
                transferArray = await ContractArray.slice(0, define.CONTRACT_DEFINE.MAX_TX_CNT);
                ContractArray = await ContractArray.slice(define.CONTRACT_DEFINE.MAX_TX_CNT, ContractArray.length);
            } else {
                // TxCnt < Maximum Tx Cnt per communication 
                transferArray = await [...ContractArray];
            }

            const connection = await db.CreateConnection(db.scConfig);
            let contracts_insert_query = db.querys.InsertContents;
            let info_insert_query = db.querys.InsertInfoWithOutBlkNum;
    
            await util.asyncForEach(transferArray, async (element, index) => {
                if (index === transferArray.length - 1) {
                    contracts_insert_query += `(${SubNetID}, '${JSON.stringify(element)}')`;
                } else {
                    contracts_insert_query += `(${SubNetID}, '${JSON.stringify(element)}'),`;
                }
            });

            [query_result] = await db.executeQueryWithOutParam(connection, contracts_insert_query);

            for(var i = 0; i < query_result.affectedRows; i++) {
                var db_key = (BigInt(query_result.insertId) + BigInt(i)).toString();
                winlog.info(db_key);
                TxArray.push({ db_key : db_key, hash : await crypto.GenerateHash(db_key + JSON.stringify(transferArray[i])) });
            }

            await util.asyncForEach(TxArray, async(element, index) => {
                if(index === TxArray.length - 1) {
                    info_insert_query += `(${SubNetID}, ${BigInt(element.db_key)}, "${element.hash}")`;
                } else {
                    info_insert_query += `(${SubNetID}, ${BigInt(element.db_key)}, "${element.hash}"),`;
                }
            });

            [query_result] = await db.executeQueryWithOutParam(connection, info_insert_query);

            let ret = await redis.writeTxs(TxArray);
            if(ret) {
                winlog.info("Transactions Publish to NN Redis Success");    


                if (parseInt(transferArray.length) < define.CONTRACT_DEFINE.MAX_TX_CNT) {
                    ContractArray = new Array();
                } else {
                    ContractArray = await ContractArray.slice(define.CONTRACT_DEFINE.MAX_TX_CNT, ContractArray.length);
                }
                
            } else {
                winlog.info("Transactions Publish to NN Redis Fail");                    
            }

            transferArray = new Array();
            TxArray = new Array();
            await db.connectionClose(connection);
        } 
    } catch (err) {
        console.log(err);
        winlog.info("Contract.js sendTxArrToNNA Func");
        winlog.info(err);
    }
}

module.exports.createTimeoutContract = async (pubkey) => {
    let api_res = await getAccountStatus(pubkey, define.CONTRACT_DEFINE.KIND.SECURITY_COIN);
    if(api_res === false) return;

    if(api_res.contents.status !== define.ACCOUNT_DEFINE.STATUS.LOGIN)
    {
        winlog.error("Already logout user");
        return false;
    }

    const balance = "0";
    let contract_create_time = new Date().getTime();

    let note = new Array();
    let note_element = {
        To : define.ACCOUNT_DEFINE.TO_PK_ALL_ZERO,
        Fee : "0",
        Kind : define.CONTRACT_DEFINE.KIND.LOGOUT_USER_TIMEOUT,
        Content : {
            ID : api_res.contents.id,
            PublicKey : pubkey
        },
        Date : parseInt(contract_create_time / 1000)
    }
    note.push(note_element);

    let my_net_pubkey = await keyUtil.getMyPubkey(define.SEC_DEFINE.KEY_PURPOSE.NET);
    my_net_pubkey = define.SEC_DEFINE.SIGN_KIND.EDDSA ? define.SEC_DEFINE.KEY_DELIMITER.ED25519_DELIMITER + my_net_pubkey : my_net_pubkey;

    console.log(my_net_pubkey);
    api_res = await getAccountStatus(my_net_pubkey, define.CONTRACT_DEFINE.KIND.SECURITY_COIN); 

    winlog.info(api_res);

    let contractJson = await createContract(api_res, define.CONTRACT_DEFINE.FINTECH.NON_FINANCIAL_TX, note, balance, contract_create_time)

    const signature = config.sig_type === define.SEC_DEFINE.SIGN_KIND.EDDSA ? 
                        await keyUtil.EddsaSign(contractJson, define.SEC_DEFINE.KEY_PURPOSE.NET) : await keyUtil.EcdsaSign(contractJson, define.SEC_DEFINE.KEY_PURPOSE.NET);
    contractJson.Signature = signature;

    winlog.info("Generate Logout(timeout) contract pubkey : [" + pubkey + "]");
    return contractJson;
}

module.exports.rewardDistribute = async () => {
    const contractJson = await createRewardDistributeContract();
    ContractArray.push(JSON.stringify(contractJson));
}

const getAccountStatus = async (pubkey, kind) => {
    let api_req_argv = {
        "pubkey" : pubkey,
        "kind" : kind
    }

    let fb_url = config.FBURL + "/account/status";
    let api_res = await fbapi.APICall_GET(fb_url, api_req_argv);

    if(api_res === define.FB_API_DEFINE.NOT_FOUND)
    {
        winlog.error("FB API error or No have User Data")
        return false;
    }

    if(api_res.errorCode !== define.FB_API_DEFINE.RESULT_CODE.SUCCESS)
    {
        winlog.error("Not Registration User Logout(timeout)");
        return false;
    }

    return api_res;
}

const createContract = (api_res, fintech, note, balance, createTime) => {
    let contractJson = {
        Revision : (parseInt(api_res.contents.revision) + 1),
        PreviousKeyID : api_res.contents.previous_key,
        ContractCreateTime : createTime,
        Fintech : fintech,
        From : api_res.contents.pub_key,
        Balance : balance,
        NotePrivacy : define.CONTRACT_DEFINE.NOTE_PRIVACY.PUBLIC,
        Note : note
    }

    return contractJson;
}

const createRewardDistributeContract = async () => {
    let w_pubkey = await keyUtil.getMyPubkey(define.SEC_DEFINE.KEY_PURPOSE.WALLET);
    w_pubkey = define.SEC_DEFINE.SIGN_KIND.EDDSA ? define.SEC_DEFINE.KEY_DELIMITER.ED25519_DELIMITER + w_pubkey : w_pubkey;
    let api_res = await getAccountStatus(w_pubkey, define.CONTRACT_DEFINE.KIND.SECURITY_COIN);
    if(api_res === false) {
        winlog.error("Cluster Master Wallet is Not Regist");
        return;
    }
    let balance = api_res.contents.balance;
    let note = new Array();
    let contract_create_time = new Date().getTime();

    await util.asyncForEach(config.cluster_wallet.CLUSTER.WALLET.ADDR, async (element, index) => {
        if(index !== define.CONTRACT_DEFINE.IDX.MY_WALLET_IDX) 
        {
            let to_addr = element;
            if (!(to_addr.substr(define.SEC_DEFINE.KEY_DELIMITER.START_INDEX, 
                        define.SEC_DEFINE.KEY_DELIMITER.END_INDEX) 
                        == define.SEC_DEFINE.KEY_DELIMITER.SECP256_COMPRESSED_EVEN_DELIMITER 
                || to_addr.substr(define.SEC_DEFINE.KEY_DELIMITER.START_INDEX, 
                        define.SEC_DEFINE.KEY_DELIMITER.END_INDEX) 
                        == define.SEC_DEFINE.KEY_DELIMITER.SECP256_COMPRESSED_ODD_DELIMITER))
            {
                to_addr = define.SEC_DEFINE.KEY_DELIMITER.ED25519_DELIMITER + to_addr;
            }

            // for wallet checking
            let api_res = await getAccountStatus(to_addr, define.CONTRACT_DEFINE.KIND.SECURITY_COIN);

            let note_element = {
                To : to_addr,
                Fee : (parseFloat(config.reward_distribute_amount) * config.financial_tx_fee_ratio).toString(),
                Kind : define.CONTRACT_DEFINE.KIND.SECURITY_COIN,
                Content : {
                    Amount : config.reward_distribute_amount
                },
                Date : parseInt(contract_create_time / 1000)
            }

            note.push(note_element);
        }
    });

    let contractJson = await createContract(api_res, define.CONTRACT_DEFINE.FINTECH.FINANCIAL_TX, note, balance, contract_create_time);

    const signature = config.sig_type === define.SEC_DEFINE.SIGN_KIND.EDDSA ? 
                        await keyUtil.EddsaSign(contractJson, define.SEC_DEFINE.KEY_PURPOSE.WALLET) : await keyUtil.EcdsaSign(contractJson, define.SEC_DEFINE.KEY_PURPOSE.WALLET);
    contractJson.Signature = signature;
    return contractJson;
}