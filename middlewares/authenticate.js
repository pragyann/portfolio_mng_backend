const { jwt_secret } = require('../keys');
const jwt = require('jsonwebtoken');

const authenticate = (req, res, next) => {
    const { authorization } = req.headers;

    // check if empty
    if (!authorization) {
        return res.json({ message: 'You need to be logged in.' });
    }

    // verify token
    jwt.verify(authorization, jwt_secret, (err, data) => {
        if (err) return res.json({ message: 'Unauthenticated.' });

        req.user = data;
        next();
    });

};

module.exports = authenticate;