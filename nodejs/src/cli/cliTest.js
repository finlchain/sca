//
const config = require("./../../config/config.js");
const define = require("./../../config/define.js");
const dbUtil = require("./../db/dbUtil.js");
const contractProc = require("./../contract/contractProc.js");
const ledger = require("./../contract/ledger.js");
const account = require("./../contract/account.js");
const contractUtil = require("./../contract/contractUtil.js");
const cryptoUtil = require("./../sec/cryptoUtil.js");
const kafkaUtil = require("./../net/kafkaUtil.js");
const util = require("./../utils/commonUtil.js");
const myCluster = require("./../cluster.js");
const logger = require("./../utils/winlog.js");

// Map Test
module.exports.testContractMap = async () => {
    let account = `1980b176692a3fc0`;
    let pubkey = `05bf717e1dfb85438a9ac17333d113ed70c55fd61279e58f59a774a9e6040d6d51`;
    let contractJson = {"create_tm":"1608166505303","fintech":0,"privacy":0,"fee":"0","from_account":"0000000000000000","to_account":"0000000000000000","action":1048577,"contents":{"owner_pk":"056af57f3615368691235ded848a44bd41916eddbcf795d035ff73fdc29612a926","super_pk":"05404ff9b9f9573629b5e4b8b52b2ecbdd0118519257358265a2646dd16cbb2c56","action":0,"name":"FINL","symbol":"fin","total_supply":"1000000000","decimal_point":3,"lock_time_from":"0","lock_time_to":"0","lock_transfer":0,"black_list":"","functions":""},"memo":"","sig":"12124D9C5A88EAD211621971595AA911EE57926A098897797F8B1B6CFE43FF116D7BBDC7472A494C8E9E6CC91919EFD2FA7623B688A1C24E74D1A59B08D24F06","signed_pubkey":"05303f1795face060281b2d9d33b40cc74e8dc79ef07c8eb7086a82b997425b005"};

    // Set
    await contractProc.setContractElement(account, pubkey, contractJson);

    // Has
    let hasVal = await contractProc.hasContractElement(account, pubkey);
    logger.debug ("pubkey has : " + hasVal);

    // Del
    await contractProc.delContractElement(pubkey);

    // Has
    hasVal = await contractProc.hasContractElement(account, pubkey);
    logger.debug ("hasVal del : " + hasVal);
}

// Account Test
module.exports.testCreateAccountCode = async () => {
    let myTokenAccount = account.createTokenAccountCode(110000);
    logger.debug("myTokenAccount : " + myTokenAccount);

    let myUserAccount = account.createUserAccountCode('KR', 'SEOUL');
    logger.debug("myUserAccount : " + myUserAccount);
}

// Decimal Point Test
module.exports.testDecimalPoint = async () => {
    let splitNum = util.chkDecimalPoint('10000000.000000000');
    logger.debug("2 splitNum.length : " + splitNum.length);
    logger.debug("2 splitNum[0].length : " + splitNum[0].length);
    logger.debug("2 splitNum[1].length : " + splitNum[1].length);

    splitNum = util.chkDecimalPoint('10000000.');
    logger.debug("3 splitNum.length : " + splitNum.length);
    logger.debug("3 splitNum[0].length : " + splitNum[0].length);
    logger.debug("3 splitNum[1].length : " + splitNum[1].length);
    
    splitNum = util.chkDecimalPoint('10000000');
    logger.debug("4 splitNum.length : " + splitNum.length);
}

// Decimal Point Test
module.exports.testCalNum = async () => {
    let calVal = util.calNum('100000000000.000000000', '+', '999.999000000', define.CONTRACT_DEFINE.NANO_DECIMAL_POINT);
    logger.debug("1 calVal : " + calVal);

    calVal = util.calNum('100000000000.000000000', '-', '999.999000000', define.CONTRACT_DEFINE.NANO_DECIMAL_POINT);
    logger.debug("2 calVal : " + calVal);

    calVal = util.calNum('100000000000.000000000', '*', '999.999000000', define.CONTRACT_DEFINE.NANO_DECIMAL_POINT);
    logger.debug("3 calVal : " + calVal);

    let balVal = util.balNum('100000000000.000000000', '100000000000.001000000', define.CONTRACT_DEFINE.NANO_DECIMAL_POINT);
    logger.debug("1 balVal : " + balVal);

    balVal = util.balNum('100000000000.000000000', '100000000001.000000000', define.CONTRACT_DEFINE.NANO_DECIMAL_POINT);
    logger.debug("2 balVal : " + balVal);

    balVal = util.balNum('100000000000.000000000', '99999999999.001000000', define.CONTRACT_DEFINE.NANO_DECIMAL_POINT);
    logger.debug("3 balVal : " + balVal);
}

// Contract Test
const myTestContents = (action, myNum) => {
    var content;
    switch (action)
    {
    case define.CONTRACT_DEFINE.ACTIONS.TOKEN.SECURITY_TOKEN :
        content = {
            amount : "10000.000000000",
        };
        break;
    case define.CONTRACT_DEFINE.ACTIONS.TOKEN.UTILITY_TOKEN_MAX :
        content = {
            dst_account : util.getRandomNumBuf(7).toString('hex'),
            amount : "1000.000000000"
        };
        break;
    case define.CONTRACT_DEFINE.ACTIONS.CONTRACT.DEFAULT.TOKEN_CREATION :
        content = {
            owner_pk : '05' + util.getRandomNumBuf(32).toString('hex'),
            super_pk : '05' + util.getRandomNumBuf(32).toString('hex'),
            action : myNum,
            name : "myToken" + myNum,
            symbol : "myt" + myNum,
            total_supply : "1000000000.000000000",
            decimal_point : define.CONTRACT_DEFINE.NANO_DECIMAL_POINT,
            lock_time_from : "0",
            lock_time_to : "0",
            lock_transfer : 0,
            black_list : "",
            functions : ""
        };
        break;
    case define.CONTRACT_DEFINE.ACTIONS.CONTRACT.DEFAULT.ADD_USER :
        content = {
            owner_pk : '05' + util.getRandomNumBuf(32).toString('hex'),
            super_pk : '05' + util.getRandomNumBuf(32).toString('hex'),
            account_id : util.getRandomNumBuf(5).toString('hex')
        };
        break;
    case define.CONTRACT_DEFINE.ACTIONS.CONTRACT.DEFAULT.CREATE_SC :
        content = {
            sc_action : define.CONTRACT_DEFINE.ACTIONS.CONTRACT.SC.STT,
            action_target : define.CONTRACT_DEFINE.ACTIONS.TOKEN.SECURITY_TOKEN,
            sc : '{}'
        };
        break;
    case define.CONTRACT_DEFINE.ACTIONS.CONTRACT.SC.STT :
        content = {
            sc : '{}'
        };
        break;
    default :
        break;
    }

    return content;
}

const createContract = (create_tm, fintech, privacy, fee, from_account, to_account, action, contents, memo) => {
    let contractJson = {
        // revision : (parseInt(api_res.contents.revision) + 1),
        // prev_key_id : api_res.contents.previous_key,
        create_tm : create_tm,
        fintech : fintech,
        privacy : privacy,
        fee : fee,
        from_account : from_account,
        to_account : to_account,
        action : action,
        contents : contents,
        memo : memo
    };

    //
    if (config.CONTRACT_SIG_CHK_MODE === false)
    {
        contractJson.sig = "581A2CBCB82461AFEC9D834AB885D67BFA5CB1696703454C278DB3E532AE716C853CFF5E0200731068D66E4496F107301B1AFD0D2E0E803F39818CF400AA0704";
    }
    else
    {
        contractJson.sig = "581A2CBCB82461AFEC9D834AB885D67BFA5CB1696703454C278DB3E532AE716C853CFF5E0200731068D66E4496F107301B1AFD0D2E0E803F39818CF400AA0704";
    }

    //
    let myNetPubkey = cryptoUtil.getMyPubkey();
    // logger.debug(myNetPubkey);

    contractJson.signed_pubkey = myNetPubkey;

    return contractJson;
}

const myTestContractContent = (cnt) => {
    const create_tm = util.getDateMS().toString();
    const fintech = define.CONTRACT_DEFINE.FINTECH.NON_FINANCIAL_TX;
    const privacy = define.CONTRACT_DEFINE.PRIVACY.PUBLIC;
    const fee = "0";
    const from_account = "f498fbe4c1d264";//util.getRandomNumBuf(7).toString('hex');
    //from_account = '00' + from_account;
    const to_account = "75d9f93b39674d";//util.getRandomNumBuf(7).toString('hex');
    //to_account = '00' + to_account;
    // const action = define.CONTRACT_DEFINE.ACTIONS.CONTRACT.DEFAULT.TOKEN_CREATION;
    // const action = define.CONTRACT_DEFINE.ACTIONS.CONTRACT.DEFAULT.CREATE_SC;
    const action = define.CONTRACT_DEFINE.ACTIONS.CONTRACT.SC.STT;
    const contents = myTestContents(action, cnt+1);
    const memo = "";

    let contractJson = createContract(create_tm, fintech, privacy, fee, from_account, to_account, action, contents, memo); 

    let contractStr = JSON.stringify(contractJson);
    // logger.debug(contractStr);

    return contractStr;
}

//
const myTestContract = async (count) => {
    for (var cnt=0; cnt<count; cnt++)
    {
        let contractStr = myTestContractContent(cnt);

        let len = contractStr.length;
        // logger.debug("len" + len);
        let client_res = await contractProc.inspectContract(contractStr);
        // logger.debug("client_res : " + JSON.stringify(client_res));
    }

    await myCluster.sendTxsArrToMaster();
}

//
const myTestRawContract = async (count) => {
    for (var cnt=0; cnt<count; cnt++)
    {
        let contractStr = myTestContractContent(cnt);

        myCluster.sendRawTxsToMaster(contractStr);
    }
}

//
const myTestRawContractArr = async (count) => {
    for (var cnt=0; cnt<count; cnt++)
    {
        let contractStr = myTestContractContent(cnt);

        let data = {jsonData : contractStr};
        contractProc.pushContractArray(data);
    }

    await myCluster.sendRawTxsArrToMaster();
}

module.exports.testContract = async (txCnt, txArr) => {
    logger.debug("testContract STT " + util.getDateMS());

    if (txCnt === undefined)
    {
        txCnt = 1;
    }

    logger.debug('txCnt : ' + txCnt);
    logger.debug('txArr : ' + txArr);

    if (txArr === true)
    {
        myTestRawContractArr(txCnt);
    }
    else
    {
        myTestRawContract(txCnt);
    }

    logger.debug("testContract END " + util.getDateMS());
}

// Balance Test
module.exports.testInsertAccountBalance = async(action) => {
    // let blk_num = 1;
    // let db_key = '6918654927547924483';
    // let account_num_0 = '0';
    // let account_num_1 = '1152921504606846987';
    // let amount = '100000000000000000';
    // // let balance = '0';

    // let query_result;

    // // Init 
    // logger.debug("testAccountLedgerBalance - init");

    // query_result = await ledger.getAccountBalanceByAccountNumAndAction(account_num_1, action);
    // if (!query_result.length)
    // {
    //     await ledger.setAccountBalance(blk_num, db_key, account_num_1, action, amount);
    // }

    // await ledger.insertAccountLedger(blk_num, db_key, account_num_1, account_num_0, action, amount);

    // await ledger.getAccountBalanceByAccountNumAndAction(account_num_1, action);
}

// Balance Test
module.exports.testAccountLedgerBalance = async(action) => {
    // let blk_num = 1;
    // let db_key = '6918654927547924483';
    // let account_num_0 = '0';
    // let account_num_1 = '1152921504606846987';
    // let account_num_2 = '1152921504606846988';
    // let account_num_3 = '1152921504606846989';
    // let account_num_4 = '1152921504606846990';
    // let amount = '100000000000.000000000';
    // // let balance = '0';

    // let query_result;

    // // Init 
    // logger.debug("testAccountLedgerBalance - init");

    // query_result = await ledger.getAccountBalanceByAccountNumAndAction(account_num_1, action);
    // if (!query_result.length)
    // {
    //     await ledger.setAccountBalance(blk_num, db_key, account_num_1, action, amount);
    // }

    // await ledger.insertAccountLedger(blk_num, db_key, account_num_1, account_num_0, action, amount);

    // await ledger.getAccountBalanceByAccountNumAndAction(account_num_1, action);

    // // account_num_1 -> account_num_2
    // logger.debug("testAccountLedgerBalance - account_num_1 -> account_num_2");

    // blk_num = 2;
    // db_key = '6918654927547924484';
    // amount = '1000.1001';

    // query_result = await ledger.getAccountBalanceByAccountNumAndAction(account_num_2, action);
    // if (!query_result.length)
    // {
    //     await ledger.setAccountBalance(blk_num, db_key, account_num_2, action, amount);
    // }

    // query_result = await ledger.insertAccountLedger(blk_num, db_key, account_num_2, account_num_1, action, amount);

    // amount = '-' + amount;
    // balance = '0';
    // await ledger.insertAccountLedger(blk_num, db_key, account_num_1, account_num_2, action, amount);

    // query_result = await ledger.getAccountBalanceByAccountNumAndAction(account_num_1, action);

    // // account_num_1 -> account_num_3 : 1
    // logger.debug("testAccountLedgerBalance - account_num_1 -> account_num_3 : 1");

    // blk_num = 3;
    // db_key = '6918654927547924485';

    // amount = '999.1001';
    // query_result = await ledger.getAccountBalanceByAccountNumAndAction(account_num_3, action);
    // if (!query_result.length)
    // {
    //     await ledger.setAccountBalance(blk_num, db_key, account_num_3, action, amount);
    // }

    // query_result = await ledger.insertAccountLedger(blk_num, db_key, account_num_3, account_num_1, action, amount);

    // amount = '-' + amount;
    // balance = '0';
    // await ledger.insertAccountLedger(blk_num, db_key, account_num_1, account_num_3, action, amount);

    // // account_num_1 -> account_num_3 : 2
    // logger.debug("testAccountLedgerBalance - account_num_1 -> account_num_3 : 2");

    // blk_num = 4;
    // db_key = '6918654927547924486';

    // amount = '1234.5678';
    // query_result = await ledger.getAccountBalanceByAccountNumAndAction(account_num_3, action);
    // if (!query_result.length)
    // {
    //     await ledger.setAccountBalance(blk_num, db_key, account_num_3, action, amount);
    // }

    // query_result = await ledger.insertAccountLedger(blk_num, db_key, account_num_3, account_num_1, action, amount);

    // amount = '-' + amount;
    // balance = '0';
    // await ledger.insertAccountLedger(blk_num, db_key, account_num_1, account_num_3, action, amount);

    // // account_num_1 -> account_num_3 : 3
    // logger.debug("testAccountLedgerBalance - account_num_1 -> account_num_3 : 3");

    // blk_num = 4;
    // db_key = '6918654927547924487';

    // amount = '9012.3456';
    // query_result = await ledger.getAccountBalanceByAccountNumAndAction(account_num_3, action);
    // if (!query_result.length)
    // {
    //     await ledger.setAccountBalance(blk_num, db_key, account_num_3, action, amount);
    // }

    // query_result = await ledger.insertAccountLedger(blk_num, db_key, account_num_3, account_num_1, action, amount);

    // amount = '-' + amount;
    // balance = '0';
    // await ledger.insertAccountLedger(blk_num, db_key, account_num_1, account_num_3, action, amount);

    // // Update Balance
    // logger.debug("testAccountLedgerBalance - get Balance");

    // blk_num = 5;
    // // await ledger.getAccountBalanceByAccountNumAndActionWithMaxBN(blk_num, account_num_1, action);
    // // await ledger.getAccountBalanceByAccountNumAndActionWithMaxBN(blk_num, account_num_2, action);
    // // await ledger.getAccountBalanceByAccountNumAndActionWithMaxBN(blk_num, account_num_3, action);

    // //
    // let gab_bn = 3;
    // logger.debug("testAccountLedgerBalance - Update Balance");
    // await ledger.updateAccountBalanceSubNetIdV(blk_num, gab_bn, contractProc.getMySubNetId());
}
