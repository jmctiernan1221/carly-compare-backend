const express = require('express');
const router = express.Router();
const Subscriber = require('../models/subscriber');

router.post('/', async (req, res) => {
  const { email } = req.body;
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Valid email is required' });
  }

  try {
    const timestamp = new Date().toLocaleString('en-US', {
      timeZone: 'America/New_York',
    });

    const existing = await Subscriber.findOne({ email });
    if (existing) {
      return res.status(200).json({ message: 'Already subscribed' });
    }

    const newSubscriber = new Subscriber({ email, timestamp });
    await newSubscriber.save();
    console.log('✅ New subscriber added:', newSubscriber);

    res.status(200).json({ message: 'Subscription successful' });
  } catch (err) {
    console.error('❌ Error saving subscriber:', err);
    res.status(500).json({ error: 'Failed to save subscriber' });
  }
});

module.exports = router;
