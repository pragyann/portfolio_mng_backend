const pool = require('../db_handler')
const bcrypt = require('bcrypt');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const { jwt_secret } = require('../keys');
const User = require('../models/user_model');

const signup = async (req, res) => {
    const { full_name, email, password, phone } = req.body;
    const db = await pool.getConnection();

    // check if empty
    if (!full_name || !email || !password || !phone) {
        return res.status(403).json({ message: 'All fields are required.' });
    }

    try {
        // checking if user email exists
        var getUsersWithReqEmail = `SELECT * FROM user WHERE email = '${email}' `;
        var [existingUser, _] = await db.query(getUsersWithReqEmail);
        if (existingUser.length > 0) {
            return res.status(403).json({ message: 'User with the email already exists.' });
        }

        // hashing password
        bcrypt.hash(password, 12).then(async hassedPassword => {

            // inserting to table
            var user = { full_name, password: hassedPassword, email, phone };
            var insertQuery = 'INSERT INTO user set ?';

            var [result, _] = await db.query(insertQuery, user);

            // getting inserted row
            var getQuery = `SELECT * FROM user WHERE id = ${result.insertId}`;
            var [newUser, _] = await db.query(getQuery);

            // excluding password
            const { password, ...data } = newUser[0];

            // generating token
            const token = jwt.sign(data, jwt_secret);
            data.token = token;

            return res.json({ message: 'Sign up successfull.', data: data });
        }).catch(err => console.log(err));

        db.release();

    } catch (err) {
        return res.status(200).json({ message: err.toString() });

    }
}

const login = async (req, res) => {
    const { email, password } = req.body;
    const db = await pool.getConnection();
    // check if empty
    if (!email || !password) {
        return res.status(403).json({ message: 'All fields are required.' });
    }
    try {
        // get user from db
        var getUser = `SELECT * FROM user WHERE email = '${email}'`;
        var [result, _] = await db.query(getUser);

        // check if user exists
        if (result.length == 0) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }
        var user = result[0];

        // compare password
        bcrypt.compare(password, user.password)
            .then(hasMatch => {
                if (!hasMatch) {
                    return res.status(401).json({ message: 'Invalid email or password.' });
                }

                // excluding password
                const { password, ...data } = user;

                // generating token
                const token = jwt.sign(data, jwt_secret);
                data.token = token;
                return res.status(200).json({ message: 'Log in succesfull.', data: data });
            }).catch(err => {
                return res.status(200).json({ message: err.toString() });
            });
        db.release();

    } catch (err) {
        return res.status(200).json({ message: err.toString() });
    }
}



module.exports = {
    signup,
    login,
};