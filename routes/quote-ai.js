const express = require('express');
const router = express.Router();
const { OpenAI } = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

router.post('/', async (req, res) => {
  const vehicle = req.body;

const prompt = `
You are a used car market analyst. Estimate realistic trade-in value ranges for the vehicle below based on current U.S. market conditions. Take into account depreciation, mileage, interior/exterior condition, accident history, number of owners, and ZIP code trends.

Respond ONLY with a JSON object. Do not include markdown or commentary.

Adjust values down for high mileage, poor condition, multiple owners, or accident history. Adjust values slightly upward for excellent condition, low mileage, or high-demand ZIP codes.

Format output exactly like this:

{
  "estimated_trade_in_values": {
    "Carvana": { "low": 7200, "high": 8600 },
    "CarMax": { "low": 7400, "high": 8800 },
    "KBB": { "low": 7000, "high": 8500 },
    "CarGurus": { "low": 7200, "high": 8700 },
    "Local Dealers": { "low": 6900, "high": 8300 }
  },
  "best_season_to_sell": "Spring",
  "platform_recommendation": {
    "best_platform": "CarMax",
    "explanation": "CarMax typically offers the most consistent trade-in values for this type of vehicle in your area."
  }
}

Vehicle info:
Year: ${vehicle.year || 'unknown'}
Make: ${vehicle.make}
Model: ${vehicle.model}
Trim: ${vehicle.trim}
Mileage: ${vehicle.mileage}
ZIP: ${vehicle.zip}
Interior: ${vehicle.interior}
Exterior: ${vehicle.exterior}
Owners: ${vehicle.owners}
Accidents: ${vehicle.accidents ? 'Yes' : 'No'}
Damage: ${vehicle.damage || 'N/A'}
`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are a used car pricing assistant that outputs clean JSON only.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.6,
    });

    const result = completion.choices[0].message.content;
    const cleanResult = result.replace(/```json|```/g, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(cleanResult);

      // ✅ Basic shape check
      if (
        !parsed.estimated_trade_in_values ||
        typeof parsed.estimated_trade_in_values !== 'object' ||
        !parsed.platform_recommendation ||
        typeof parsed.platform_recommendation !== 'object'
      ) {
        console.error('❌ Missing required keys in response:', parsed);
        return res.status(500).json({ error: 'Incomplete or unexpected structure from OpenAI.' });
      }
    } catch (err) {
      console.error('❌ Failed to parse OpenAI response:', cleanResult);
      return res.status(500).json({ error: 'Malformed response from OpenAI.' });
    }

    res.json({ quote: parsed });
  } catch (err) {
    console.error('❌ OpenAI API Error:', err);
    res.status(500).json({ error: 'Failed to generate quote' });
  }
});

module.exports = router;

