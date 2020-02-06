const http = require('http');
const request = require('request');
const define = require('./../../config/define.js');
const config = require("./../../config/config.js");
const util = require("./../utils/CommonUtil.js");

const APICall_POST_CB = async(httpConfig, postData) => {
    httpConfig.timeout = 3000;

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

                    if(util.isJson(concat_resData))
                    {
                        concat_resData = JSON.parse(concat_resData);
                    }
                } catch (e) {
                    reject(e);
                }
                resolve(concat_resData);
            })
        });

        req.on('timeout', () => {
            resolve({"errorCode" : config.contract_error_code.FB_NO_DATA});
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

const APICAll_GET_CB = async(url, propertiesObj) => {
    return new Promise((resolve, reject) => {
        request({url : url, qs : propertiesObj, timeout : 3000, method: "GET"}, (err, response, body) => {
            if(err) reject(err);

            if(response.statusCode < define.FB_API_DEFINE.HTTP_STATUS_CODE.OK 
                || response.statusCode >= define.FB_API_DEFINE.HTTP_STATUS_CODE.MULTIPLE_CHOICES)
            {
                reject(new Error('statusCode=' + response.statusCode));
            }
            else {
                resolve(body);
            }
        });
    })
}

module.exports.APICall_POST = async (httpConfig, data) => { 
    let ret = await APICall_POST_CB(httpConfig, data).then((resData) => {
        return resData;
    }).catch((error) => {
        return {errorCode : config.contract_error_code.FB_SVR_ERROR.ERROR_CODE, msg : error.message};
    });
    return ret;
}

module.exports.APICall_GET = async(url, propertiesObj) => {
    let ret = await APICAll_GET_CB(url, propertiesObj).then((resData) => {
        return JSON.parse(resData);
    }).catch((error) => {
        return {errorCode : config.contract_error_code.FB_SVR_ERROR.ERROR_CODE, msg : error.message};
    });
    return ret;
}