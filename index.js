const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config(); // load .env vars locally

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => res.send('Carly Compare Backend is running!'));

app.post('/api/getQuotes', (req, res) => {
  console.log('Received car info:', req.body);
  res.json({
    quotes: [
      { buyer: 'Carvana', price: '$15,200' },
      { buyer: 'CarMax', price: '$14,950' },
      { buyer: 'Vroom', price: '$15,100' }
    ]
  });
});

app.post('/api/waitlist', (req, res) => {
  const waitlistData = req.body;
  console.log('Received waitlist submission:', waitlistData);

  const filePath = path.join(__dirname, 'waitlist.json');
  let existing = [];
  if (fs.existsSync(filePath)) {
    try {
      existing = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (err) {
      console.error('Parse error:', err);
    }
  }

  existing.push({
    ...waitlistData,
    timestamp: new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })
  });

  fs.writeFileSync(filePath, JSON.stringify(existing, null, 2));

  res.status(200).json({ message: 'Waitlist submission saved' });
});

app.get('/dashboard', (req, res) => {
  const filePath = path.join(__dirname, 'waitlist.json');
  if (!fs.existsSync(filePath)) return res.send('<h1>No submissions yet</h1>');

  let entries = [];
  try {
    entries = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (err) {
    console.error('Failed to parse:', err);
    return res.send('<h1>Error loading submissions</h1>');
  }

  const rows = entries.map(e => `
    <tr>
      <td>${e.timestamp}</td><td>${e.name}</td><td>${e.email}</td><td>${e.make}</td>
    </tr>
  `).join('');

  res.send(`
    <html><head><title>Waitlist Dashboard</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 20px; }
      table { border-collapse: collapse; width:100%; }
      th,td { border:1px solid #999; padding:8px; }
      th { background:#eee; }
    </style></head><body>
      <h1>🚗 Carly Compare Waitlist</h1>
      <table>
        <thead>
          <tr>
            <th>Timestamp</th><th>Name</th><th>Email</th><th>Make</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </body></html>
  `);
});

app.listen(PORT, () => console.log(`Backend running at http://localhost:${PORT}`));
