const express = require('express');
const router = express.Router();
const { OpenAI } = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

router.post('/', async (req, res) => {
  const vehicle = req.body;

const prompt = `
You are a cautious used car pricing analyst. Your job is to generate realistic **trade-in value ranges** using conservative estimates based on depreciation, condition, platform behaviors, and recent market activity. This is NOT private party value. Be realistic — avoid inflated numbers.

Assume:
- Vehicles with 100K+ miles are depreciated significantly.
- Average mileage = 12,000 mi/year. Deduct $500–$1,000 per 10K miles above average.
- “Good” condition is average — not excellent.
- No accidents and 1–2 owners slightly help value but don’t raise it much.

Trade-in platform logic:
- **Carvana**: Pays 25–35% below their retail price.
- **CarMax**: Slightly more generous than average (5–10%) if clean title + decent condition.
- **KBB**: Base estimate using trade-in tool adjusted for ZIP, mileage, and condition.
- **CarGurus**: Mid-to-low range estimates unless vehicle is newer or high demand.
- **Local Dealers**: Usually lowest — estimate 10–20% below KBB on older or high-mileage vehicles.

Location:
- ZIP ${vehicle.zip} = Metro Atlanta. Normal demand, no inflation. Adjust accordingly.

Output ONLY JSON in this format (no extra text):

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
    "explanation": "Why this platform suits the vehicle’s mileage, condition, ZIP, or platform behavior."
  }
}

Vehicle:
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
      temperature: 0.3,
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





