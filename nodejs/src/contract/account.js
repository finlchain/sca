//
const config = require("./../../config/config.js");
const define = require("./../../config/define.js");
const iso31661 = require("./../../config/iso_3166_1.js");
const dbUtil = require("./../db/dbUtil.js");
const util = require("./../utils/commonUtil.js");
const logger = require("./../utils/winlog.js");

//
module.exports.getAreaCode  = (country, region) => {
    let countryCode = iso31661.COUNTRIES.ROK.NUM;
    let regionCode = iso31661.COUNTRIES.ROK.ISO_3166_2.SEOUL.NUM;

    switch (country)
    {
    case iso31661.COUNTRIES.ROK.ALPHA2 :
    case iso31661.COUNTRIES.ROK.ALPHA3 :
    {
        countryCode = iso31661.COUNTRIES.ROK.NUM;

        switch (region)
        {
        case iso31661.COUNTRIES.ROK.ISO_3166_2.SEOUL.STR :
            regionCode = iso31661.COUNTRIES.ROK.ISO_3166_2.SEOUL.NUM;
            break;

        case iso31661.COUNTRIES.ROK.ISO_3166_2.GYEONGGI.STR :
            regionCode = iso31661.COUNTRIES.ROK.ISO_3166_2.GYEONGGI.NUM;
            break;
        
        default :
            break;
        }
        break;
    }
    default :
        break;
    }

    let areaCode = util.paddy(parseInt(countryCode).toString(16), 3) + util.paddy(parseInt(regionCode).toString(16), 2);
    return areaCode;
}

module.exports.createTokenAccountCode = (tokenNum, myCountryCode, myRegionCode) => {
    let account = 0;

    //////////////////////////////////
    // Gen Random to improve random complexity
    let genRandCntHex = util.getRandomNumBuf(1).toString('hex');
    // logger.debug("genRandCnt : " + util.hexStrToInt(genRandCntHex));
    util.getRandomNumBuf(util.hexStrToInt(genRandCntHex));
    //////////////////////////////////

    let myAreaCode;
    let randNum2;

    //
    let randNum1 = parseInt(define.CONTRACT_DEFINE.ACCOUNT_TOKEN_DELI).toString(16);

    //
    if (parseInt(tokenNum) === define.CONTRACT_DEFINE.ACTIONS.TOKEN.SECURITY_TOKEN)
    {
        myAreaCode = util.paddy(parseInt(0).toString(16), 5);
    }
    else
    {
        let countryCode = typeof myCountryCode !== 'undefined' ? myCountryCode : config.LOCATION_JSON.LOC.COUNTRY;
        let regionCode = typeof myRegionCode !== 'undefined' ? myRegionCode : config.LOCATION_JSON.LOC.REGION;
        myAreaCode = this.getAreaCode(countryCode, regionCode);
    }

    //
    // randNum2 = util.paddy(util.getRandomNumBuf(1).toString('hex'), 2);
    randNum2 = util.paddy(parseInt(0).toString(16), 2);

    //
    let tokenNumStr = util.paddy(parseInt(tokenNum).toString(16), 8);

    account = randNum1 + myAreaCode + randNum2 + tokenNumStr;

    // logger.debug("randNum1 : " + randNum1 + ", myAreaCode : " + myAreaCode + ", randNum2 : " + randNum2 + ",  tokenNumStr : " + tokenNumStr + ", account : " + account);

    return account;
}

module.exports.createUserAccountCode = (myCountryCode, myRegionCode) => {
    let account = 0;

    //////////////////////////////////
    // Gen Random to improve random complexity
    let genRandCntHex = util.getRandomNumBuf(1).toString('hex');
    // logger.debug("genRandCnt : " + util.hexStrToInt(genRandCntHex));
    util.getRandomNumBuf(util.hexStrToInt(genRandCntHex));
    //////////////////////////////////

    // 
    let randNum1 = util.getRandomNumBuf(1, define.CONTRACT_DEFINE.ACCOUNT_USER_DELI_MIN, define.CONTRACT_DEFINE.ACCOUNT_USER_DELI_MAX).toString('hex');

    //
    let countryCode = typeof myCountryCode !== 'undefined' ? myCountryCode : config.LOCATION_JSON.LOC.COUNTRY;
    let regionCode = typeof myRegionCode !== 'undefined' ? myRegionCode : config.LOCATION_JSON.LOC.REGION;
    let myAreaCode = this.getAreaCode(countryCode, regionCode);

    //
    let randNum2 = util.paddy(util.getRandomNumBuf(1).toString('hex'), 2);

    //
    const currentMs = util.getDateMS();
    let currentSec = (currentMs / 1000).toFixed(0);
    let mySec = util.paddy(parseInt(currentSec).toString(16), 8);

    //
    account = randNum1.slice(1) + myAreaCode + randNum2 + mySec;

    // logger.debug("randNum1 : " + randNum1.slice(1) + ", myAreaCode : " + myAreaCode + ", randNum2 : " + randNum2 + ", mySec : " + mySec + ", account : " + account);

    return account;
}

// module.exports.createAccountCode = (arg1, arg2) => {
//     let account = 0;

//     // logger.debug("typeof arg1 : " + typeof arg1);

//     //////////////////////////////////
//     // Gen Random to improve random complexity
//     let genRandCntHex = util.getRandomNumBuf(1).toString('hex');
//     // logger.debug("genRandCnt : " + util.hexStrToInt(genRandCntHex));
//     util.getRandomNumBuf(util.hexStrToInt(genRandCntHex));
//     //////////////////////////////////

//     if ((typeof arg1 === 'number')) // Token Account
//     {
//         let tokenNum = arg1;
//         let myAreaCode;
//         let randNum2;

//         //
//         let randNum1 = parseInt(define.CONTRACT_DEFINE.ACCOUNT_TOKEN_DELI).toString(16);

//         //
//         if (config.ACCOUNT_TEST_MODE === false)
//         {
//             //
//             let countryCode = typeof arg1 !== 'undefined' ? arg1 : config.LOCATION_JSON.LOC.COUNTRY;
//             let regionCode = typeof arg2 !== 'undefined' ? arg2 : config.LOCATION_JSON.LOC.REGION;
//             myAreaCode = this.getAreaCode(countryCode, regionCode);

//             //
//             randNum2 = util.paddy(util.getRandomNumBuf(1).toString('hex'), 2);
//         }
//         else
//         {
//             //
//             myAreaCode = util.paddy(parseInt(0).toString(16), 5);

//             //
//             randNum2 = util.paddy(parseInt(0).toString(16), 2);
//         }

//         //
//         let tokenNumStr = util.paddy(parseInt(tokenNum).toString(16), 8);

//         account = randNum1 + myAreaCode + randNum2 + tokenNumStr;

//         // logger.debug("randNum1 : " + randNum1 + ",  tokenNumStr : " + tokenNumStr + ", account : " + account);
//     }
//     else // User Account
//     {
//         // 
//         let randNum1 = util.getRandomNumBuf(1, define.CONTRACT_DEFINE.ACCOUNT_USER_DELI_MIN, define.CONTRACT_DEFINE.ACCOUNT_USER_DELI_MAX).toString('hex');

//         //
//         let countryCode = typeof arg1 !== 'undefined' ? arg1 : config.LOCATION_JSON.LOC.COUNTRY;
//         let regionCode = typeof arg2 !== 'undefined' ? arg2 : config.LOCATION_JSON.LOC.REGION;
//         let myAreaCode = this.getAreaCode(countryCode, regionCode);

//         //
//         let randNum2 = util.paddy(util.getRandomNumBuf(1).toString('hex'), 2);

//         //
//         const currentMs = util.getDateMS();
//         let currentSec = (currentMs / 1000).toFixed(0);
//         let mySec = util.paddy(parseInt(currentSec).toString(16), 8);

//         //
//         account = randNum1.slice(1) + myAreaCode + randNum2 + mySec;
    
//         logger.debug("randNum1 : " + randNum1.slice(1) + ", myAreaCode : " + myAreaCode + ", randNum2 : " + randNum2 + ", mySec : " + mySec + ", account : " + account);
//     }

//     return account;
// }
