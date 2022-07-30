const db = require('../db_handler');

const getCompanyStock = (req, res) => {
    const getCompanyStock = 'SELECT * FROM company_stock WHERE quantity <> 0';
    db.query(getCompanyStock, (err, result) => {
        if (err) console.log(err);
        res.json({ data: result });
    });
}

const getMarketStock = (req, res) => {
    const user_id = req.user.id;
    const getMarketStock = `SELECT sfs.*, cs.name, cs.acr, cs.current_ppu FROM stock_for_sale sfs INNER JOIN company_stock cs on cs.id = sfs.stock_id WHERE sfs.user_id <> ${user_id}`;
    db.query(getMarketStock, (err, result) => {
        if (err) console.log(err);
        res.json({ data: result });
    });
}

const getUserStock = (req, res) => {
    const user_id = req.user.id;

    const getUserTransac = `SELECT us.*, cs.name, cs.acr, cs.initial_ppu, cs.current_ppu FROM user_stock us INNER JOIN company_stock cs on cs.id = us.stock_id WHERE us.user_id = ${user_id}`;
    db.query(getUserTransac, (err, result) => {
        if (err) throw err;


        res.status(200).json({ data: result });
    })
}

module.exports = {
    getCompanyStock,
    getMarketStock,
    getUserStock,
};