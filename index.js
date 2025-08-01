const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config(); // Ensure .env has MONGO_URI

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({ origin: '*' }));
//app.options('*', cors());
app.use(express.json());

// Models & Routes
const WaitlistEntry = require('./models/waitlistentry');
const quoteAiRoute = require('./routes/quote-ai');
const subscribeRoute = require('./routes/subscribe');

// Mount routes
app.use('/api/quote-ai', quoteAiRoute);
app.use('/api/subscribe', subscribeRoute);

// Root route
app.get('/', (req, res) => res.send('Carly Compare Backend is running!'));

// Legacy mock quotes route (can be removed if unused)
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

// Save waitlist entry to MongoDB
app.post('/api/waitlist', async (req, res) => {
  try {
    const newEntry = new WaitlistEntry({
      ...req.body,
      timestamp: new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }),
    });
    await newEntry.save();
    console.log('✅ Saved to MongoDB:', newEntry);
    res.status(200).json({ message: 'Waitlist submission saved' });
  } catch (error) {
    console.error('Error saving waitlist:', error);
    res.status(500).json({ error: 'Failed to save waitlist entry' });
  }
});

// Waitlist dashboard UI
app.get('/dashboard', async (req, res) => {
  try {
    const entries = await WaitlistEntry.find().sort({ timestamp: -1 });

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
  } catch (err) {
    console.error('Error loading dashboard:', err);
    res.status(500).send('<h1>Error loading dashboard</h1>');
  }
});

// Optional: Clear waitlist (DEV use only)
app.delete('/api/waitlist/clear', async (req, res) => {
  try {
    await WaitlistEntry.deleteMany({});
    res.status(200).json({ message: 'Waitlist cleared successfully' });
  } catch (err) {
    console.error('Error clearing waitlist:', err);
    res.status(500).json({ error: 'Failed to clear waitlist' });
  }
});

// Start server
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ Connected to MongoDB Atlas');
  app.listen(PORT, () => console.log(`🚀 Backend running at http://localhost:${PORT}`));
})
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
});
