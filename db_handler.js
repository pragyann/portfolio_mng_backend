const mysql = require('mysql2');
require('dotenv').config();
const { dbKeys } = require('./keys');

const db = mysql.createConnection(dbKeys);

module.exports = db;