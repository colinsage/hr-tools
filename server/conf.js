var fs = require('fs');
var config = JSON.parse(fs.readFileSync('conf/configure.json',{encoding:'utf-8'}));

exports.db_conf = config.db;
exports.secret = config.secret;
exports.mode = config.mode;
exports.dev = config.dev;
exports.admin = config.admin;
exports.default_pass = config.default_pass;
