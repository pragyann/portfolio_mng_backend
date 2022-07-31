const pool = require('../db_handler');

const getCompanyStock = async (req, res) => {
    const db = await pool.getConnection();
    const getCompanyStock = 'SELECT * FROM company_stock WHERE quantity <> 0';
    const [result, _] = await db.query(getCompanyStock);
    db.release();

    res.json({ data: result });
}

const getMarketStock = async (req, res) => {
    const db = await pool.getConnection();
    const user_id = req.user.id;
    const getMarketStock = `SELECT sfs.*, cs.name, cs.acr, cs.current_ppu FROM stock_for_sale sfs INNER JOIN company_stock cs on cs.id = sfs.stock_id WHERE sfs.user_id <> ${user_id}`;
    const [result, _] = await db.query(getMarketStock);
    db.release();
    res.json({ data: result });
}

const getUserStock = async (req, res) => {
    const user_id = req.user.id;
    const db = await pool.getConnection();

    const getUserTransacBought = `
        SELECT ut.stock_id, SUM(ut.ppu*ut.quantity) AS total_inv, us.quantity, cs.current_ppu
        FROM user_transac ut        
        INNER JOIN user_stock us ON us.user_id = ut.user_id  AND us.stock_id = ut.stock_id
        INNER JOIN company_stock cs ON cs.id = ut.stock_id
        WHERE ut.user_id = ${user_id} AND ut.transac_type IN ('buy','Buy')
        GROUP BY ut.stock_id;
    `;
    var [userTransacBought, _] = await db.query(getUserTransacBought);

    const getUserTransacSold = `
        SELECT ut.stock_id, SUM(ut.ppu*ut.quantity) AS sold_amt
        FROM user_transac ut        
        WHERE ut.user_id = ${user_id} AND ut.transac_type IN ('sell','Sell')
        GROUP BY ut.stock_id;
    `;
    var [userTransacSold, _] = await db.query(getUserTransacSold);

    var userTransacAll = userTransacBought.map((a) => {
        // get the sold transaction for current stock_id
        let reqTransac = userTransacSold.filter((b) => b.stock_id == a.stock_id);
        let sold_amt = 0;
        // has been sold
        if (reqTransac.length > 0) {
            sold_amt = reqTransac[0].sold_amt
        }

        let stock_id = a.stock_id;
        let total_inv = a.total_inv;
        let quantity = a.quantity;
        let currentPpu = a.current_ppu;

        // total profit based on current PPU for remaining stock
        let profit = (quantity * currentPpu) - (total_inv - sold_amt);

        return { stock_id, total_inv, sold_amt, profit, };
    });

    const getUserStocks = `
        SELECT us.*, cs.name, cs.acr, cs.initial_ppu, cs.current_ppu 
        FROM user_stock us 
        INNER JOIN company_stock cs on cs.id = us.stock_id 
        WHERE us.user_id = ${user_id}`;

    var [userStocks, _] = await db.query(getUserStocks);

    var result = userStocks.map((userStock) => {
        // get current stock from userTransacAll
        let reqTransac = userTransacAll.filter((value) => value.stock_id == userStock.stock_id)[0];
        let { stock_id, ...summary } = reqTransac
        return { ...userStock, ...summary };
    });

    db.release();

    res.status(200).json({ data: result });
}

const getUserMarketStock = async (req, res) => {
    const user_id = req.user.id;
    const db = await pool.getConnection();
    const getUserMarketStock = `SELECT sfs.*, cs.name, cs.acr, cs.initial_ppu, cs.current_ppu FROM stock_for_sale sfs INNER JOIN company_stock cs ON sfs.stock_id = cs.id WHERE user_id = ${user_id}`;
    const [result, _] = await db.query(getUserMarketStock);
    db.release();
    res.json({ data: result });
}

const removeFromMarket = async (req, res) => {
    const { stock_id } = req.body;
    const user_id = req.user.id;
    const db = await pool.getConnection();
    // check if empty
    if (!stock_id) {
        return res.send({ 'message': 'All fields are required.' });
    }

    try {
        // check if present or not 
        var getStockFromMarket = `SELECT * FROM stock_for_sale WHERE user_id = ${user_id} AND stock_id = ${stock_id}`;
        var [stockFromMarket, _] = await db.query(getStockFromMarket);

        if (stockFromMarket.length == 0) {
            return res.status(403).json({ message: 'No such stock found.' });
        }

        const quantityForSale = stockFromMarket[0].quantity;

        await db.beginTransaction();

        // remove from stock_for_sale
        var remove = `DELETE FROM stock_for_sale WHERE user_id = ${user_id} AND stock_id = ${stock_id}`;
        await db.query(remove);

        // increment usable qty in user_stock
        var increment = `UPDATE user_stock SET usable_qty = usable_qty + ${quantityForSale} WHERE user_id = ${user_id} AND stock_id = ${stock_id}`;
        await db.query(increment);

        await db.commit();

        db.release();

        return res.send({ 'message': 'Stock removed from market successfully.' });

    } catch (e) {
        db.release();
        return res.status(500).send({ 'message': e.toString() });
    }
}

module.exports = {
    getCompanyStock,
    getMarketStock,
    getUserStock,
    getUserMarketStock,
    removeFromMarket
};