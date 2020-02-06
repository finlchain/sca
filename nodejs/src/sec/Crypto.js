const define = require("./../../config/define.js");
const crypto = require("crypto");

module.exports.GenerateHash = (MessageBuffer) => {
    const sha256Result = crypto.createHash(define.SEC_DEFINE.HASH_ALGO);
    sha256Result.update(MessageBuffer);
    return sha256Result.digest("hex");
}