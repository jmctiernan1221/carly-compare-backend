const express = require('express');
const router = express.Router();
const { fetchEdmundsTradeIn } = require('../utils/edmundsFetcher');
const { OpenAI } = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

router.post('/', async (req, res) => {
  const vehicle = req.body;

  // Step 1: Get baseline from Edmunds
  let edmunds;
  try {
    edmunds = await fetchEdmundsTradeIn({
      year: vehicle.year,
      make: vehicle.make,
      model: vehicle.model,
      mileage: vehicle.mileage,
      zip: vehicle.zip,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to get Edmunds baseline value' });
  }

  const baseline = edmunds.adjustedTradeIn;

  // Step 2: Build prompt for GPT
  const prompt = `
You are a cautious used car market analyst. Start with the Edmunds trade-in baseline of $${baseline} and simulate what other platforms would typically offer.

Apply these adjustments:
- CarMax: +5–10% above baseline if clean title and average condition.
- Carvana: -5–10% below baseline unless low mileage.
- KBB: ~match or slightly lower (1–3% under).
- CarGurus: 10–15% below for older/high-mileage vehicles.
- Local Dealers: 10–20% under baseline.

Vehicle:
- Year: ${vehicle.year}
- Make: ${vehicle.make}
- Model: ${vehicle.model}
- Trim: ${vehicle.trim}
- Mileage: ${vehicle.mileage}
- Interior: ${vehicle.interior}
- Exterior: ${vehicle.exterior}
- Owners: ${vehicle.owners}
- Accidents: ${vehicle.accidents ? 'Yes' : 'No'}
- ZIP: ${vehicle.zip}

Respond ONLY in this format:

{
  "estimated_trade_in_values": {
    "Carvana": { "low": 0, "high": 0 },
    "CarMax": { "low": 0, "high": 0 },
    "KBB": { "low": 0, "high": 0 },
    "CarGurus": { "low": 0, "high": 0 },
    "Local Dealers": { "low": 0, "high": 0 }
  },
  "best_season_to_sell": "<Winter|Spring|Summer|Fall>",
  "platform_recommendation": {
    "best_platform": "<Carvana|CarMax|KBB|CarGurus|Local Dealers>",
    "explanation": "Why this platform fits the vehicle’s condition and location"
  }
}
`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You return clean JSON car pricing estimates only.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.4,
    });

    const content = completion.choices[0].message.content;
    const jsonResponse = JSON.parse(content.replace(/```json|```/g, '').trim());

    res.json({
      edmunds: edmunds,
      quote: jsonResponse
    });
  } catch (err) {
    console.error('❌ OpenAI or parsing error:', err.message);
    res.status(500).json({ error: 'Failed to generate quote from OpenAI' });
  }
});

module.exports = router;
