const db = require('../db_handler');

class User {
    constructor(full_name, email, password, phone) {
        this.full_name = full_name;
        this.email = email;
        this.password = password;
        this.phone = phone;
    }

    async save() {
        const sql = `INSERT INTO user(full_name, email,password,phone) VALUES ('${this.full_name}','${this.email}','${this.pasword}','${this.phone}')`;
        const result = await db.execute(sql);
        return result;
    }
}

module.exports = User;