const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// Temporary file-based storage (or replace with MongoDB if you prefer)
const SUBSCRIBE_FILE = path.join(__dirname, '../data/subscribers.json');

router.post('/', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  try {
    const data = fs.existsSync(SUBSCRIBE_FILE)
      ? JSON.parse(fs.readFileSync(SUBSCRIBE_FILE))
      : [];

    if (!data.includes(email)) {
      data.push(email);
      fs.writeFileSync(SUBSCRIBE_FILE, JSON.stringify(data, null, 2));
    }

    res.status(200).json({ message: 'Subscribed successfully' });
  } catch (err) {
    console.error('Error saving subscription:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
