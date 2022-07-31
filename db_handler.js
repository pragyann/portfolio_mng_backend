const mysql = require('mysql2');
require('dotenv').config();
const { dbKeys } = require('./keys');

const pool = mysql.createPool(dbKeys);


module.exports = pool.promise();