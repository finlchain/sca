var winston = require('winston');
require('winston-daily-rotate-file');
require('date-utils');

var winlog = winston.createLogger({
  transports: [
    new winston.transports.DailyRotateFile({
      filename: './log/SCA.log', // store log on file name : system.log
      zippedArchive: false, // isCompress?
      format: winston.format.printf(
        info => `[${info.level.toUpperCase()}] [${new Date().toFormat('YYYY-MM-DD HH24:MI:SS')}] ${info.message}`)
    }),
    new winston.transports.Console({
      format : winston.format.printf(
        info => `[${info.level.toUpperCase()}] [${new Date().toFormat('YYYY-MM-DD HH24:MI:SS')}] ${info.message}`)
    })
  ]
});

module.exports = winlog;