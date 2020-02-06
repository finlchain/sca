const define = require('./../../config/define.js');
const Int64 = require('node-int64');

module.exports.stringSplit = (text, separator, limit) => {
    let splitArray;
    if(limit != null) {
        text = text.split(separator, limit);     
    } else {
        text = text.split(separator);
    }
    splitArray = [...text];
    return splitArray;
}

module.exports.asyncForEach = async (array, callback) => {
    for(let index = 0; index < array.length; index++) {
        await callback(array[index], index, array);
    }
}

module.exports.stringReplace = (str, searchStr, replaceStr) => {
    return str.split(searchStr).join(replaceStr);
}

module.exports.checkIP = (ipAddr) => {
    if(define.REGEX.IP_ADDR_REGEX.test(ipAddr)) {
        return true;
    }
    return false;
}

module.exports.sleep = (ms) => {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}

module.exports.Padding = (data, len, separator) => {
    if(separator == define.COMMON_DEFINE.PADDING_DELIMITER.FRONT) {
        while(data.length < len) {
            data = "0" + data;
            if(data.length == len) break;
            else continue;
        }
    }
    else if(separator == define.COMMON_DEFINE.PADDING_DELIMITER.BACK) {
        while(data.length < len) {
            data = data + "0";
            if(data.length == len) break;
            else continue;
        }
    }
    return data;
}

module.exports.isIntegerValue = (strNum) => {
    return Number.isInteger(parseInt(strNum));
}

module.exports.isArray = (arr) => {
    return Array.isArray(arr);
}

module.exports.isObject = (obj) => {
    return (!!obj) && (obj.constructor === Object);
}

module.exports.isQueryResultObject = (variable) => {
    return variable === Object(variable);
}

module.exports.isJson = (obj) => {
    try {
        JSON.parse(obj);
    } catch (e) {
        return false;
    }
    return true;
}

module.exports.BytesToBuffer = (bytes) => {
    var buff = Buffer.alloc(bytes.byteLength);
    var view = new Uint8Array(bytes);
    
    for(var i = 0; i < buff.length; i++) {
        buff[i] = view[i];
    }
    return buff;
}

module.exports.hexStr2u64 = (hexStr) => {
    var u64Obj = new Int64('0x' + hexStr);
    return u64Obj.toNumber(true);
}