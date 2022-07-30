require('dotenv').config();

module.exports = {
    dbKeys: {
        host: process.env.DATABASE_HOST,
        user: process.env.DATABASE_USER,
        password: process.env.DATABASE_PASSWORD,
        database: process.env.DATABASE,
    },
    jwt_secret: process.env.JWT_SECRET,
}