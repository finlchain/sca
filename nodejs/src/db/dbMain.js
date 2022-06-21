//
const dbNN = require('./../db/dbNN.js');
const dbRepl = require('./../db/dbRepl.js');
const dbShard = require('./../db/dbShard.js');

//
module.exports.initDatabase = async () => {
    await dbNN.initDatabaseNN();
    await dbRepl.initReplication();
    // await dbShard.initShard();
}