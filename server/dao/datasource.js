var mysql = require('mysql');
var config = require('../conf')
var dbConfig = config.db_conf;
var my_conn = mysql.createConnection({
    host: dbConfig.host,
    user: dbConfig.user,
    password: dbConfig.password,
    database:dbConfig.database,
    port: dbConfig.port
});
my_conn.connect();


exports.my_conn = my_conn