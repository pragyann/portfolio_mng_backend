const db = require('../db_handler');

const buyFromCompany = async (req, res) => {
    const { stock_id, quantity } = req.body;
    const user_id = req.user.id;

    // check if empty
    if (!stock_id || !quantity) {
        return res.status(403).json({ message: 'All fields are required.' });
    }

    // check stock quantity
    const getStockQty = `SELECT * FROM company_stock WHERE id = ${stock_id}`;

    db.query(getStockQty, (err, result) => {
        if (err) throw err;

        // quantity is less than requested
        if (result[0].quantity < quantity) {
            return res.status(403).json({ message: 'Number of quantity exceeded.' });
        }
        var currentPPU = result[0].current_ppu;

        db.beginTransaction((err) => {
            if (err) throw err;

            // decrement from company_stock
            var decFromCompStock = `UPDATE company_stock SET quantity = quantity - ${quantity} WHERE id = ${stock_id}`;
            db.query(decFromCompStock, (err, result) => {
                if (err) {
                    db.rollback();
                    throw err;
                }

                // insert into user_transac
                var insertTransac = 'INSERT INTO user_transac SET ?'
                var transac = { user_id, stock_id, quantity, ppu: currentPPU, transac_type: 'buy' };
                db.query(insertTransac, transac, (err, result) => {
                    if (err) {
                        db.rollback();
                        throw err;
                    }

                    // add or increment in user_stock
                    var getUserStock = `SELECT * FROM user_stock WHERE user_id = ${user_id} AND stock_id = ${stock_id}`;
                    db.query(getUserStock, (err, result) => {
                        if (err) {
                            db.rollback();
                            throw err;
                        }

                        // add
                        if (result.length == 0) {
                            var insert = 'INSERT INTO user_stock SET ?';
                            data = { user_id, stock_id, quantity, usable_qty: quantity };
                            db.query(insert, data, (err, result) => {
                                if (err) {
                                    db.rollback();
                                    throw err;
                                }
                                db.commit();
                                return res.status(200).json({ message: 'Purchase successfull' });
                            });

                        } else {
                            // increment
                            var update = `UPDATE user_stock SET quantity = quantity + ${quantity}, usable_qty = usable_qty + ${quantity} WHERE user_id = ${user_id} AND stock_id = ${stock_id}`;
                            db.query(update, (err, result) => {
                                if (err) {
                                    db.rollback();
                                    throw err;
                                }
                                db.commit((err) => {
                                    if (err) throw err;

                                    return res.status(200).json({ message: 'Purchase successfull' });
                                });


                            })
                        }
                    })
                });

            });

        })
    })
}

const addToMarket = async (req, res) => {
    const { stock_id, quantity, ppu } = req.body;
    const user_id = req.user.id;

    // check if empty
    if (!stock_id || !quantity || !ppu) {
        return res.status(403).json({ message: 'All fields are required.' });
    }

    // check if stock is already in market
    var getStockFromMarket = `SELECT * FROM stock_for_sale WHERE user_id = ${user_id} AND stock_id = ${stock_id}`;
    db.query(getStockFromMarket, (err, result) => {
        if (err) throw err;

        if (result.length > 0) {
            return res.status(403).json({ message: 'Stock has already been placed in market.' });
        }

        // check stock quantity
        var getStockQty = `SELECT * FROM user_stock WHERE user_id = ${user_id} AND stock_id = ${stock_id}`;
        db.query(getStockQty, (err, result) => {
            if (err) throw err;

            // if no such stock
            if (result.length == 0) {
                return res.status(403).json({ message: 'No stock found.' });

            }

            // quantity is less than requested
            if (result[0].usable_qty < quantity) {
                return res.status(403).json({ message: 'Number of quantity exceeded.' });
            }

            db.beginTransaction((err) => {
                if (err) throw err;

                // insert into stock_for_sale
                const insert = 'INSERT INTO stock_for_sale SET ?';
                const stockInfo = { user_id, stock_id, quantity, ppu };
                db.query(insert, stockInfo, (err, result) => {
                    if (err) {
                        db.rollback();
                        throw err;
                    }

                    // decrease usable_qty from user_stock
                    const decrease = `UPDATE user_stock SET usable_qty = usable_qty - ${quantity} WHERE user_id = ${user_id} AND stock_id = ${stock_id}`;
                    db.query(decrease, (err, result) => {
                        if (err) {
                            db.rollback();
                            throw err;
                        }
                        db.commit((err) => {
                            if (err) throw err;

                            return res.status(200).json({ message: 'Stocks placed in market successfully.' });
                        });

                    });
                });
            })
        });
    });

}

const buyFromMarket = async (req, res) => {
    const { sale_id, quantity } = req.body;
    const user_id = req.user.id;

    // check if empty
    if (!sale_id || !quantity) {
        return res.status(403).json({ message: 'All fields are required.' });
    }

    // check stock quantity
    const getStockQty = `SELECT * FROM stock_for_sale WHERE sale_id = ${sale_id}`;
    db.query(getStockQty, (err, result) => {
        if (err) throw err;

        // quantity is less than requested
        if (result[0].quantity < quantity) {
            return res.status(403).json({ message: 'Number of quantity exceeded.' });
        }

        const marketUserId = result[0].user_id;
        const marketStockId = result[0].stock_id;
        const marketQuantity = result[0].quantity;
        const marketPpu = result[0].ppu;

        db.beginTransaction((err) => {
            if (err) throw err;

            // enter record in transaction 
            const insertRecord = `INSERT INTO user_transac SET ?`;
            const buyerRecordData = { user_id, stock_id: marketStockId, quantity, ppu: marketPpu, transac_type: 'buy' };
            const sellerRecordData = { user_id: marketUserId, stock_id: marketStockId, quantity, ppu: marketPpu, transac_type: 'sell' };

            db.query(insertRecord, buyerRecordData, (err, result) => {
                if (err) throw err;

                db.query(insertRecord, sellerRecordData, (err, result) => {
                    if (err) throw err;

                    // update current price in company_stock
                    const update = `UPDATE company_stock SET current_ppu = ${marketPpu} WHERE id = ${marketStockId}`;
                    db.query(update, (err, result) => {
                        if (err) throw err;

                        // update seller's stock in user_stock
                        const updateSellerStock = `UPDATE user_stock SET quantity = quantity - ${quantity}  WHERE user_id = ${marketUserId} AND stock_id = ${marketStockId} `
                        db.query(updateSellerStock, (err, result) => {
                            if (err) throw err;

                            // update or add buyer's stock in user_stock
                            const getBuyerStock = `SELECT * FROM user_stock WHERE user_id = ${user_id} AND stock_id = ${marketStockId}`
                            db.query(getBuyerStock, (err, result) => {
                                if (err) throw err;

                                // if not present add to user_stock
                                if (result.length == 0) {
                                    const addToUserStock = 'INSERT INTO user_stock SET ?';
                                    const userStockData = { user_id, stock_id: marketStockId, quantity, usable_qty: quantity };
                                    db.query(addToUserStock, userStockData, (err, result) => {
                                        if (err) throw err;

                                    });
                                } else {
                                    // if present update user_stock
                                    const updateBuyerStock = `UPDATE user_stock SET quantity = quantity + ${quantity},usable_qty = usable_qty + ${quantity} WHERE user_id = ${user_id} AND stock_id = ${marketStockId} `
                                    db.query(updateBuyerStock, (err, result) => {
                                        if (err) throw err;

                                    });
                                }

                                // remove from stock_for_sale if all stocks are getting bought
                                if (marketQuantity == quantity) {
                                    const remove = `DELETE FROM stock_for_sale WHERE sale_id = ${sale_id}`;
                                    db.query(remove, (err, result) => {
                                        if (err) throw err;

                                        db.commit((err) => {
                                            if (err) throw err;

                                            return res.status(200).json({ message: 'Purchase successfull' });
                                        });
                                    })
                                } else {
                                    const update = `UPDATE stock_for_sale SET quantity = quantity - ${quantity} WHERE sale_id = ${sale_id}`;
                                    db.query(update, (err, result) => {
                                        if (err) throw err;

                                        db.commit((err) => {
                                            if (err) throw err;

                                            return res.status(200).json({ message: 'Purchase successfull' });
                                        });
                                    })
                                }
                            })



                        });
                    });
                });
            })
        })
    });
}

const getUserTransactions = async (req, res) => {
    const user_id = req.user.id;

    const getUserTransac = `SELECT ut.*, cs.name, cs.initial_ppu, cs.current_ppu, cs.acr FROM user_transac ut INNER JOIN company_stock cs ON cs.id = ut.stock_id WHERE ut.user_id = ${user_id} ORDER BY ut.transac_date DESC`;
    db.query(getUserTransac, (err, result) => {
        if (err) throw err;

        res.status(200).json({ data: result });
    })
}

module.exports = {
    buyFromCompany,
    addToMarket,
    buyFromMarket,
    getUserTransactions
};