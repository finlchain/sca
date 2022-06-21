//
const http = require('http');

//
const define = require('./../../config/define.js');
const config = require("./../../config/config.js");
const util = require("./../utils/commonUtil.js");
const logger = require("./../utils/winlog.js");

const http_CB = async(httpConfig, postData) => {
    let retryCount = 1;

    const retryRequest = error => {
        logger.error({errorCode : config.CONTRACT_ERROR_JSON.FB_SVR_ERROR.ERROR_CODE, msg : error.message});

        if (retryCount === define.FB_API_DEFINE.RETRY.THRESHOLD) 
        {
            return new Error(error);
        }

        retryCount++;

        setTimeout(() => {
            http_CB(httpConfig, postData);
        }, define.FB_API_DEFINE.RETRY.INTERVAL);
    }

    return new Promise((resolve, reject) => {
        let req = http.request(httpConfig, (res) => {
            if(res.statusCode < define.FB_API_DEFINE.HTTP_STATUS_CODE.OK 
                || res.status >= define.FB_API_DEFINE.HTTP_STATUS_CODE.MULTIPLE_CHOICES) 
            {
                return reject(new Error('statusCode=' + res.statusCode));
            }

            let resData = [];
            let concat_resData;
            res.on('data', (data) => {
                resData.push(data);
            });

            res.on('end', () => {
                try {
                    concat_resData = Buffer.concat(resData).toString();

                    if(util.isJsonString(concat_resData))
                    {
                        concat_resData = JSON.parse(concat_resData);
                    }
                } catch (e) {
                    reject(e);
                }
                resolve(concat_resData);
            });

            res.on('error', error => {
                res.abort();

                retryRequest(error);
            });
        });

        req.on('timeout', () => {
            resolve({"errorCode" : config.CONTRACT_ERROR_JSON.FB_NO_DATA});
        });

        req.on('error', (err) => {
            reject(err);
        });

        if (postData) {
            req.write(JSON.stringify(postData));
        }
        req.end();
    })
}

module.exports.APICall = async (httpConfig, data) => { 
    let ret = await http_CB(httpConfig, data).then((resData) => {
        return resData;
    }).catch((error) => {
        logger.error(JSON.stringify({errorCode : config.CONTRACT_ERROR_JSON.FB_SVR_ERROR.ERROR_CODE, msg : error.message}));
        return {errorCode : config.CONTRACT_ERROR_JSON.FB_SVR_ERROR.ERROR_CODE, msg : error.message};
    });
    return ret;
}