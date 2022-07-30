const db = require('../db_handler')
const bcrypt = require('bcrypt');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const { jwt_secret } = require('../keys');

const signup = (req, res) => {
    const { full_name, email, password, phone } = req.body;
    // check if empty
    if (!full_name || !email || !password || !phone) {
        return res.status(403).json({ message: 'All fields are required.' });
    }

    // checking if user email exists
    var getUsersWithReqEmail = `SELECT * FROM user WHERE email = '${email}' `;
    db.query(getUsersWithReqEmail, (err, result) => {
        if (err) throw err;
        if (result.length > 0) {
            return res.status(403).json({ message: 'User with the email already exists.' });
        }

        // hashing password
        bcrypt.hash(password, 12).then(hassedPassword => {

            // inserting to table
            var user = { full_name, password: hassedPassword, email, phone };
            var insertQuery = 'INSERT INTO user set ?';
            db.query(insertQuery, user, (err, result) => {
                if (err) throw err

                // getting inserted row
                var getQuery = `SELECT * FROM user WHERE id = ${result.insertId}`;
                db.query(getQuery, (err, result) => {
                    if (err) throw err

                    // excluding password
                    const { password, ...data } = result[0];

                    // generating token
                    const token = jwt.sign(data, jwt_secret);
                    data.token = token;

                    return res.json({ message: 'Sign up successfull.', data: data });
                });
            });
        }).catch(err => console.log(err));
    });
}

const login = (req, res) => {
    const { email, password } = req.body;

    // check if empty
    if (!email || !password) {
        return res.status(403).json({ message: 'All fields are required.' });
    }

    // get user from db
    var getUser = `SELECT * FROM user WHERE email = '${email}'`;
    db.query(getUser, (err, result) => {
        if (err) throw err

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
            });
    });
}

module.exports = {
    signup,
    login,
};