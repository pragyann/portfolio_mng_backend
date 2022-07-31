const express = require('express');
const db = require('./db_handler');
const authRoutes = require('./routes/auth_routes');
const stockRoutes = require('./routes/stock_routes');
const transactionRoutes = require('./routes/transaction_routes');
const app = express();

// db.connect((err) => {
//     if (err) throw err;
//     console.log('Connected to MySQL');
// });

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(authRoutes);
app.use('/stock', stockRoutes);
app.use('/transaction', transactionRoutes);

const port = 3000;
app.listen(port, () => {
    console.log(`Server is listening on port ${port}.`);
});