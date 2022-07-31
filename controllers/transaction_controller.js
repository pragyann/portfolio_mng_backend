const pool = require('../db_handler');

const buyFromCompany = async (req, res) => {
    const { stock_id, quantity } = req.body;
    const user_id = req.user.id;
    const db = await pool.getConnection();

    // check if empty
    if (!stock_id || !quantity) {
        return res.status(403).json({ message: 'All fields are required.' });
    }

    // check stock quantity
    const getStockQty = `SELECT * FROM company_stock WHERE id = ${stock_id}`;
    var [stockQty, _] = await db.query(getStockQty);

    // quantity is less than requested
    if (stockQty[0].quantity < quantity) {
        return res.status(403).json({ message: 'Number of quantity exceeded.' });
    }

    var currentPPU = stockQty[0].current_ppu;

    try {
        await db.beginTransaction();
        // decrement from company_stock
        var decFromCompStock = `UPDATE company_stock SET quantity = quantity - ${quantity} WHERE id = ${stock_id}`;
        await db.query(decFromCompStock);

        // insert into user_transac
        var insertTransac = 'INSERT INTO user_transac SET ?'
        var transac = { user_id, stock_id, quantity, ppu: currentPPU, transac_type: 'Buy' };
        await db.query(insertTransac, transac);

        // add or increment in user_stock
        var getUserStock = `SELECT * FROM user_stock WHERE user_id = ${user_id} AND stock_id = ${stock_id}`;
        var [userStock, _] = await db.query(getUserStock);

        // add if not present
        if (userStock.length == 0) {
            var insert = 'INSERT INTO user_stock SET ?';
            data = { user_id, stock_id, quantity, usable_qty: quantity };
            await db.query(insert, data);
        } else {
            // increment if already present
            var update = `UPDATE user_stock SET quantity = quantity + ${quantity}, usable_qty = usable_qty + ${quantity} WHERE user_id = ${user_id} AND stock_id = ${stock_id}`;
            await db.query(update);
        }
        await db.commit();
        db.release();

        return res.status(200).json({ message: 'Purchase successfull' });

    } catch (err) {
        await db.rollback();
        db.release();

        return res.status(500).json({ message: 'An error occured.' });
    }
}

const addToMarket = async (req, res) => {
    const { stock_id, quantity, ppu } = req.body;
    const user_id = req.user.id;
    const db = await pool.getConnection();

    // check if empty
    if (!stock_id || !quantity || !ppu) {
        return res.status(403).json({ message: 'All fields are required.' });
    }

    try {
        // check if stock is already in market
        var getStockFromMarket = `SELECT * FROM stock_for_sale WHERE user_id = ${user_id} AND stock_id = ${stock_id}`;
        var [stockFromMarket, _] = await db.query(getStockFromMarket);

        if (stockFromMarket.length > 0) {
            return res.status(403).json({ message: 'Stock has already been placed in market.' });
        }

        // check stock quantity
        var getStockFromUserStock = `SELECT * FROM user_stock WHERE user_id = ${user_id} AND stock_id = ${stock_id}`;
        var [stockFromUserStock, _] = await db.query(getStockFromUserStock);

        // if no such stock
        if (stockFromUserStock.length == 0) {
            return res.status(403).json({ message: 'No stock found.' });
        }

        // quantity is less than requested
        if (stockFromUserStock[0].usable_qty < quantity) {
            return res.status(403).json({ message: 'Number of quantity exceeded.' });
        }

        await db.beginTransaction();

        // insert into stock_for_sale
        const insert = 'INSERT INTO stock_for_sale SET ?';
        const stockInfo = { user_id, stock_id, quantity, ppu };
        await db.query(insert, stockInfo);

        // decrease usable_qty from user_stock
        const decrease = `UPDATE user_stock SET usable_qty = usable_qty - ${quantity} WHERE user_id = ${user_id} AND stock_id = ${stock_id}`;
        await db.query(decrease);

        await db.commit();
        db.release();

        return res.status(200).json({ message: 'Stocks placed in market successfully.' });
    } catch (err) {
        await db.rollback();
        db.release();

        return res.status(500).json({ message: 'An error occured.' });
    }
}

const buyFromMarket = async (req, res) => {
    const { sale_id, quantity } = req.body;
    const user_id = req.user.id;
    const db = await pool.getConnection();

    // check if empty
    if (!sale_id || !quantity) {
        return res.status(403).json({ message: 'All fields are required.' });
    }

    try {
        // check stock quantity
        const getStock = `SELECT * FROM stock_for_sale WHERE sale_id = ${sale_id}`;
        var [stock, _] = await db.query(getStock);

        // quantity is less than requested
        if (stock[0].quantity < quantity) {
            return res.status(403).json({ message: 'Number of quantity exceeded.' });
        }

        const marketUserId = stock[0].user_id;
        const marketStockId = stock[0].stock_id;
        const marketQuantity = stock[0].quantity;
        const marketPpu = stock[0].ppu;

        await db.beginTransaction();

        // enter record in transaction 
        const insertRecord = `INSERT INTO user_transac SET ?`;
        const buyerRecordData = { user_id, stock_id: marketStockId, quantity, ppu: marketPpu, transac_type: 'Buy' };
        const sellerRecordData = { user_id: marketUserId, stock_id: marketStockId, quantity, ppu: marketPpu, transac_type: 'Sell' };

        await db.query(insertRecord, buyerRecordData);
        await db.query(insertRecord, sellerRecordData);

        // update current price in company_stock
        const update = `UPDATE company_stock SET current_ppu = ${marketPpu} WHERE id = ${marketStockId}`;
        await db.query(update);

        // update seller's stock in user_stock
        const updateSellerStock = `UPDATE user_stock SET quantity = quantity - ${quantity}  WHERE user_id = ${marketUserId} AND stock_id = ${marketStockId} `;
        await db.query(updateSellerStock);

        // update or add buyer's stock in user_stock
        const getBuyerStock = `SELECT * FROM user_stock WHERE user_id = ${user_id} AND stock_id = ${marketStockId}`;
        var [buyerStock, _] = await db.query(getBuyerStock);

        // if not present add to user_stock
        if (buyerStock.length == 0) {
            const addToUserStock = 'INSERT INTO user_stock SET ?';
            const userStockData = { user_id, stock_id: marketStockId, quantity, usable_qty: quantity };
            await db.query(addToUserStock, userStockData);
        } else {
            // if present update user_stock
            const updateBuyerStock = `UPDATE user_stock SET quantity = quantity + ${quantity},usable_qty = usable_qty + ${quantity} WHERE user_id = ${user_id} AND stock_id = ${marketStockId} `
            await db.query(updateBuyerStock);
        }

        // remove from stock_for_sale if all stocks are getting bought
        if (marketQuantity == quantity) {
            const remove = `DELETE FROM stock_for_sale WHERE sale_id = ${sale_id}`;
            await db.query(remove);
        } else {
            // update if not
            const update = `UPDATE stock_for_sale SET quantity = quantity - ${quantity} WHERE sale_id = ${sale_id}`;
            await db.query(update);
        }

        await db.commit();
        db.release();

        return res.status(200).json({ message: 'Purchase successfull' });

    } catch (err) {
        await db.rollback();
        db.release();

        return res.status(500).json({ message: 'An error occured.' });
    }
}

const getUserTransactions = async (req, res) => {
    const user_id = req.user.id;
    const db = await pool.getConnection();

    const getUserTransac = `SELECT ut.*, cs.name, cs.initial_ppu, cs.current_ppu, cs.acr FROM user_transac ut INNER JOIN company_stock cs ON cs.id = ut.stock_id WHERE ut.user_id = ${user_id} ORDER BY ut.transac_date DESC`;
    const [result, _] = await db.query(getUserTransac);
    db.release();

    res.status(200).json({ data: result });
}

module.exports = {
    buyFromCompany,
    addToMarket,
    buyFromMarket,
    getUserTransactions
};