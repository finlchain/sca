//
const domain = require('domain');
const fs = require('fs');
const logger = require('./winlog.js');

//
module.exports.error = (err) => {
	console.log("debug.error");
	var stack = err.stack;
	logger.error(stack);
}

module.exports.catchException = () => {
	process.stderr.write = function(str, encoding, fg) {
		logger.error("Exception Occur");
		logger.error(str);
	}
}

module.exports.unhandledRejection = (reason, promise) => {
	logger.error("process unhandledRejection occur");
	logger.error(promise);
	logger.error("reason");
	logger.error(reason);
}

module.exports.uncaughtException = (err) => {
	logger.error("process uncaughtException occur");
	logger.error("message");
	logger.error(err.message);
	logger.error("stack trace");
	logger.error(err.stack);

	fs.writeSync(
		process.stderr.fd,
		`Caught exception: ${err}\n`
	);
}

module.exports.exceptionHandler = () => {
	const d = domain.create();

	d.on('error', function(er) {
		logger.error('process error occur');
		logger.error(er);

		fs.writeSync(
			process.stderr.fd,
			`Error : ${er}`
		);
	});
}