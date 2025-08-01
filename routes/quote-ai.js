const express = require('express');
const router = express.Router();
const { OpenAI } = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

router.post('/', async (req, res) => {
  const vehicle = req.body;

  const prompt = `
Respond ONLY with a JSON object in this format:

{
  "estimated_trade_in_values": {
    "Carvana": { "low": 7000, "high": 9000 },
    "CarMax": { "low": 7200, "high": 9300 },
    "KBB": { "low": 7100, "high": 9200 },
    "CarGurus": { "low": 7000, "high": 9100 },
    "Local Dealers": { "low": 6800, "high": 9000 }
  },
  "best_season_to_sell": "Spring",
  "platform_recommendation": {
    "best_platform": "CarMax",
    "explanation": "CarMax often offers competitive trade-in values..."
  }
}

DO NOT include markdown. No extra text. Just valid JSON.

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
