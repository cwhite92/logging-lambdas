'use strict';

const mysql = require('mysql');
const fs = require('fs');

module.exports.findToken = (token, cb) => {
    // TODO: remove this when going live
    cb({
        account_id: 1,
        environment_id: 2
    });
    return;

    // 1st: try to load from local cache
    if (fs.existsSync(`/tmp/token-cache-${token}`)) {
        cb(JSON.parse(fs.readFileSync(`/tmp/token-cache-${token}`, 'utf8')));
        return;
    }

    // 2nd: load from database
    const connection = mysql.createConnection({
        host     : process.env.DB_HOST,
        user     : process.env.DB_USERNAME,
        password : process.env.DB_PASSWORD,
        database : process.env.DB_DATABASE
    });

    connection.connect();

    connection.query('SELECT * FROM tokens WHERE token = ? AND revoked = 0', [token], function (error, results, fields) {
        connection.end();

        if (error) throw error;

        if (results.length > 0) {
            const jsonToken = JSON.stringify(results[0]);

            fs.writeFileSync(`/tmp/token-cache-${token}`, jsonToken, 'utf8');

            cb(JSON.parse(jsonToken));
        } else {
            cb(null);
        }
    });
};
