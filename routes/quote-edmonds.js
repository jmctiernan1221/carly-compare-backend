const express = require('express');
const router = express.Router();
const { fetchEdmundsTradeIn } = require('../utils/edmundsFetcher'); // ← This is the import

router.post('/', async (req, res) => {
  const { year, make, model, mileage, zip } = req.body;

  try {
    const quote = await fetchEdmundsTradeIn({ year, make, model, mileage, zip });
    res.json({ success: true, edmunds: quote });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
