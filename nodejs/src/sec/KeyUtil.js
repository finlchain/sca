const config = require("./../../config/config.js");
const define = require("./../../config/define.js");
const wallet = require("./../contract/Wallet.js");
const crypto = require("./Crypto.js");
const util = require("./../utils/CommonUtil.js");
const verifier = require("./../addon/build/Release/ADDON");

const fs = require('fs');
const EdDSA = require('elliptic').eddsa;
const ECDSA = require('elliptic').ec;

const pemreader = require('crypto-key-composer');
const { createECDH, ECDH } = require("crypto");

let keyMe = new Object();
let wKeyMe = new Object();
let keyIS;

const PEMReadPublicKey = async (path) => {
    let pemRead = await pemreader.decomposePublicKey(fs.readFileSync(path));
    return pemRead;
}

const PEMReadPrivateKey = async (path) => {
    let pemRead = await pemreader.decomposePrivateKey(fs.readFileSync(path));
    return pemRead;
}

module.exports.ConvertPubKey = async (PublicKey, CurveName, delimiter) => {
    try {
        return await ECDH.convertKey(PublicKey, CurveName, "hex", "hex", delimiter);
    } catch (err) {
        console.log(err);
        return false;
    }
}

module.exports.getISPubkey = () => {
    return keyIS;
}

module.exports.setISPubkey = async (keyISPathConfig) => {
    let pemRead = await PEMReadPublicKey(keyISPathConfig);

    if(keyISPathConfig.includes("ed"))
    {
        const publickey = await util.BytesToBuffer(pemRead.keyData.bytes);
        keyIS = define.SEC_DEFINE.KEY_DELIMITER.ED25519_DELIMITER + publickey.toString('hex');
    }
    else 
    {
        const ec_point_x = await util.BytesToBuffer(pemRead.keyData.x).toString('hex');
        const ec_point_y = await util.BytesToBuffer(pemRead.keyData.y).toString('hex');

        const uncompressedpubkey = define.SEC_DEFINE.KEY_DELIMITER.SECP256_UNCOMPRESSED_DELIMITER + ec_point_x + ec_point_y;
        const publicKey = await ECDH.convertKey(uncompressedpubkey,
                                                define.SEC_DEFINE.CURVE_NAMES.ECDH_SECP256R1_CURVE_NAME,
                                                "hex",
                                                "hex",
                                                define.SEC_DEFINE.CONVERT_KEY.COMPRESSED);
        keyIS = publicKey;
    }
}

module.exports.keyMeSet = async (keyMePathConfig, wKeyMePathConfig) => {
    // for net
    keyMe.privkey = await PEMReadPrivateKey(keyMePathConfig.privkeyPath);
    keyMe.pubkey = await PEMReadPublicKey(keyMePathConfig.pubkeyPath);

    // for wallet
    wKeyMe.privkey = await PEMReadPrivateKey(wKeyMePathConfig.privkeyPath);
    wKeyMe.pubkey = await PEMReadPublicKey(wKeyMePathConfig.pubkeyPath);
}

module.exports.getMyPubkey = async (delimiter) => {
    if(config.sig_type === define.SEC_DEFINE.SIGN_KIND.EDDSA) 
    {
        let publickey;
        if(delimiter === define.SEC_DEFINE.KEY_PURPOSE.NET)
        {
            publickey = await util.BytesToBuffer(keyMe.pubkey.keyData.bytes);
        }
        else if (delimiter === define.SEC_DEFINE.KEY_PURPOSE.WALLET)
        {
            publickey = await util.BytesToBuffer(wKeyMe.pubkey.keyData.bytes);
        }
        return publickey.toString('hex');
    }
    else if (config.sig_type === define.SEC_DEFINE.SIGN_KIND.ECDSA)
    {
        let ec_point_x;
        let ec_point_y;

        if(delimiter === define.SEC_DEFINE.KEY_PURPOSE.NET)
        {
            ec_point_x = await util.BytesToBuffer(keyMe.pubkey.keyData.x).toString('hex');
            ec_point_y = await util.BytesToBuffer(keyMe.pubkey.keyData.y).toString('hex');
        }
        else if(delimiter === define.SEC_DEFINE.KEY_PURPOSE.WALLET)
        {
            ec_point_x = await util.BytesToBuffer(wKeyMe.pubkey.keyData.x).toString('hex');
            ec_point_y = await util.BytesToBuffer(wKeyMe.pubkey.keyData.y).toString('hex');
        }
        
        const uncompressedpubkey = define.SEC_DEFINE.KEY_DELIMITER.SECP256_UNCOMPRESSED_DELIMITER + ec_point_x + ec_point_y;
        const publicKey = await ECDH.convertKey(uncompressedpubkey,
                                                define.SEC_DEFINE.CURVE_NAMES.ECDH_SECP256R1_CURVE_NAME,
                                                "hex",
                                                "hex",
                                                define.SEC_DEFINE.CONVERT_KEY.COMPRESSED);
        return publicKey;
    }
}

module.exports.EddsaSign = async (contractJson, delimiter) => {
    const ed = new EdDSA(define.SEC_DEFINE.CURVE_NAMES.EDDSA_CURVE_NAME);
    let privateKey;

    if(delimiter === define.SEC_DEFINE.KEY_PURPOSE.NET)
    {
        privateKey = await util.BytesToBuffer(keyMe.privkey.keyData.seed);
    }
    else if (delimiter === define.SEC_DEFINE.KEY_PURPOSE.WALLET)
    {
        privateKey = await util.BytesToBuffer(wKeyMe.privkey.keyData.seed);
    }

    const signKey = await ed.keyFromSecret(privateKey.toString('hex'));

    const leftBuffer = wallet.leftSignBufferGenerator(contractJson);
    const rightBuffer = wallet.rightSignBufferGenerator(contractJson.Note);
    const mergedBuffer = Buffer.concat([leftBuffer, rightBuffer]);

    const transferHash = crypto.GenerateHash(mergedBuffer);
    const signature = await signKey.sign(transferHash).toHex();

    return signature;
}

module.exports.EcdsaSign = async (contractJson, delimiter) => {
    const ec = new ECDSA(define.SEC_DEFINE.CURVE_NAMES.ECDSA_SECP256R1_CURVE_NAME);
    let privateKey_hex;

    if(delimiter === define.SEC_DEFINE.KEY_PURPOSE.NET)
    {
        privateKey_hex = await util.BytesToBuffer(keyMe.privkey.keyData.d);
    }
    else if (delimiter === define.SEC_DEFINE.KEY_PURPOSE.WALLET)
    {
        privateKey_hex = await util.BytesToBuffer(wKeyMe.privkey.keyData.d);
    }

    const privateKey = ec.keyFromPrivate(privateKey_hex, 'hex');
    
    const leftBuffer = wallet.leftSignBufferGenerator(contractJson);
    const rightBuffer = wallet.rightSignBufferGenerator(contractJson.Note);
    const mergedBuffer = Buffer.concat([leftBuffer, rightBuffer]);     

    const transferHash = crypto.GenerateHash(mergedBuffer);
    const signature = privateKey.sign(transferHash);
    const SigR = signature.r.toString('hex');
    const SigS = signature.s.toString('hex');

    return SigR + SigS;
}

module.exports.EcdsaR1Verify = async (CompPubKey, contractJson, KeyR, KeyS) => {
    // // Creates the same hash as the one created in the wallet. - 2019-07-12 modified by JunSu
    const leftBuffer = wallet.leftSignBufferGenerator(contractJson);
    const rightBuffer = wallet.rightSignBufferGenerator(contractJson.Note);
    const mergedBuffer = Buffer.concat([leftBuffer, rightBuffer]);

    const transferHash = crypto.GenerateHash(mergedBuffer);
    let verifyResult = await verifier.EcdsaR1Verify(transferHash, KeyR, KeyS, CompPubKey);

    return verifyResult;
}

module.exports.EcdsaK1Verify = async (CompPubKey, contractJson, KeyR, KeyS) => {
    // // Creates the same hash as the one created in the wallet. - 2019-07-12 modified by JunSu
    const leftBuffer = wallet.leftSignBufferGenerator(contractJson);
    const rightBuffer = wallet.rightSignBufferGenerator(contractJson.Note);
    const mergedBuffer = Buffer.concat([leftBuffer, rightBuffer]);

    const transferHash = crypto.GenerateHash(mergedBuffer);
    let verifyResult = await verifier.EcdsaK1Verify(transferHash, KeyR, KeyS, CompPubKey);

    return verifyResult;
}

module.exports.EddsaVerify = async (pubKey, contractJson, signature) => {
    const leftBuffer = wallet.leftSignBufferGenerator(contractJson);
    const rightBuffer = wallet.rightSignBufferGenerator(contractJson.Note);
    const mergedBuffer = Buffer.concat([leftBuffer, rightBuffer]);
    
    const transferHash = crypto.GenerateHash(mergedBuffer);
    let verifyResult = await verifier.EddsaVerify(transferHash, signature, pubKey);

    return verifyResult;
}

module.exports.GenKeyIndex = async () => {
    let NNAconf = config.nn_node_json;
    let P2Proot = NNAconf.NODE.P2P.CLUSTER.ROOT;

    let P2Paddr = P2Proot.slice(
        define.P2P_DEFINE.P2P_ROOT_SPLIT_INDEX.START, 
        define.P2P_DEFINE.P2P_ROOT_SPLIT_INDEX.END);

    const KeyIndex = P2Paddr;
    let DBKeyIndex = KeyIndex.toString(16);
    
    DBKeyIndex = await util.Padding(
        DBKeyIndex, 
        define.DB_DEFINE.HEX_DB_KEY_LEN.KEY_INDEX_LEN,
        define.COMMON_DEFINE.PADDING_DELIMITER.FRONT);

    DBKeyIndex = await util.Padding(
        DBKeyIndex,
        define.DB_DEFINE.HEX_DB_KEY_LEN.DB_KEY_LEN,
        define.COMMON_DEFINE.PADDING_DELIMITER.BACK);
 
    let KeyID_big = BigInt("0x" + DBKeyIndex);
    return KeyID_big.toString();
}

module.exports.getSubNetID = async (DBKeyIndex) => {
    let SubNetID = parseInt(DBKeyIndex).toString(16);
    SubNetID = await util.Padding(
        SubNetID,
        define.DB_DEFINE.HEX_DB_KEY_LEN.DB_KEY_LEN,
        define.COMMON_DEFINE.PADDING_DELIMITER.FRONT);

    SubNetID = SubNetID.substr(0, define.DB_DEFINE.HEX_DB_KEY_LEN.KEY_INDEX_LEN);
    SubNetID = parseInt(SubNetID, 16);
    return SubNetID;
}