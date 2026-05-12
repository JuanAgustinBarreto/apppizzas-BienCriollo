const express = require('express');
const cors = require('cors');
const db = require('./database');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

// --- PRODUCTS ---
app.get('/api/products', (req, res) => {
  try {
    const products = db.prepare('SELECT * FROM products').all();
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- SALES ---
app.get('/api/sales', (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let query = `
      SELECT s.*, p.name as product_name, p.price as product_price 
      FROM sales s 
      LEFT JOIN products p ON s.product_id = p.id
    `;
    const params = [];
    
    if (startDate && endDate) {
      query += ' WHERE s.date BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }
    
    query += ' ORDER BY s.date DESC, s.time DESC';
    
    const sales = db.prepare(query).all(params);
    res.json(sales);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/sales', (req, res) => {
  try {
    const { date, time, location, seller, quantity, product_id, total } = req.body;
    const stmt = db.prepare(
      'INSERT INTO sales (date, time, location, seller, quantity, product_id, total) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    const info = stmt.run(date, time, location, seller, quantity, product_id, total);
    res.status(201).json({ id: info.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/sales/:id', (req, res) => {
  try {
    const stmt = db.prepare('DELETE FROM sales WHERE id = ?');
    const info = stmt.run(req.params.id);
    if (info.changes > 0) res.json({ success: true });
    else res.status(404).json({ error: 'Sale not found' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- EXPENSES ---
app.get('/api/expenses', (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let query = 'SELECT * FROM expenses';
    const params = [];
    
    if (startDate && endDate) {
      query += ' WHERE date BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }
    
    query += ' ORDER BY date DESC, id DESC';
    
    const expenses = db.prepare(query).all(params);
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/expenses', (req, res) => {
  try {
    const { date, description, amount, responsible } = req.body;
    const stmt = db.prepare(
      'INSERT INTO expenses (date, description, amount, responsible) VALUES (?, ?, ?, ?)'
    );
    const info = stmt.run(date, description, amount, responsible);
    res.status(201).json({ id: info.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/expenses/:id', (req, res) => {
  try {
    const stmt = db.prepare('DELETE FROM expenses WHERE id = ?');
    const info = stmt.run(req.params.id);
    if (info.changes > 0) res.json({ success: true });
    else res.status(404).json({ error: 'Expense not found' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- DASHBOARD SUMMARY ---
app.get('/api/dashboard', (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let salesQuery = 'SELECT * FROM sales';
    let expensesQuery = 'SELECT * FROM expenses';
    const params = [];

    if (startDate && endDate) {
      salesQuery += ' WHERE date BETWEEN ? AND ?';
      expensesQuery += ' WHERE date BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    const sales = db.prepare(salesQuery).all(params);
    const expenses = db.prepare(expensesQuery).all(params);

    let totalSales = 0;
    let totalPizzas = 0;
    let salesDiego = { total: 0, count: 0 };
    let salesAriel = { total: 0, count: 0 };
    
    sales.forEach(sale => {
      totalSales += sale.total;
      totalPizzas += sale.quantity;
      if (sale.seller === 'Diego') {
        salesDiego.total += sale.total;
        salesDiego.count += 1;
      } else if (sale.seller === 'Ariel') {
        salesAriel.total += sale.total;
        salesAriel.count += 1;
      }
    });

    let totalExpenses = 0;
    let expensesDiego = 0;
    let expensesAriel = 0;

    expenses.forEach(exp => {
      totalExpenses += exp.amount;
      if (exp.responsible === 'Diego') {
        expensesDiego += exp.amount;
      } else if (exp.responsible === 'Ariel') {
        expensesAriel += exp.amount;
      }
    });

    res.json({
      totalSales,
      totalPizzas,
      totalExpenses,
      netProfit: totalSales - totalExpenses,
      sellers: {
        Diego: {
          salesTotal: salesDiego.total,
          salesCount: salesDiego.count,
          expensesTotal: expensesDiego,
          netProfit: salesDiego.total - expensesDiego
        },
        Ariel: {
          salesTotal: salesAriel.total,
          salesCount: salesAriel.count,
          expensesTotal: expensesAriel,
          netProfit: salesAriel.total - expensesAriel
        }
      }
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
