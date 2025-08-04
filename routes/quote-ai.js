const express = require('express');
const router = express.Router();
const { OpenAI } = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

router.post('/', async (req, res) => {
  const vehicle = req.body;

  const prompt = `
You are a conservative, market-aware used car valuation analyst. You will generate realistic **trade-in value ranges** based on actual depreciation, platform behavior, and vehicle condition. Use fair but cautious logic. DO NOT provide private-party pricing — this is for **trade-in only**.

Use the following rules:

1. **Mileage impact**:
   - Average = 12,000 miles/year.
   - Deduct $500–$1,000 per 10,000 miles *over* average for the vehicle’s age.
   - 100K+ miles vehicles face steep depreciation.

2. **Condition modifiers**:
   - “Good” = average condition for age. Don’t add any bonus.
   - 1–2 owners or no accidents help slightly but should not significantly raise value.
   - Frame or body damage lowers value; cosmetic damage has a minor impact.

3. **Platform behaviors**:
   - **Carvana**: Pays 25–35% below their own retail list prices. Be cautious with high-mileage cars.
   - **CarMax**: Tends to give higher-than-average offers for clean, no-accident vehicles — about 5–10% above KBB trade-in.
   - **KBB**: Use this as the core estimate. Reflect ZIP, mileage, and average market value.
   - **CarGurus**: Conservative. Usually 10–15% below KBB for high-mileage or older vehicles.
   - **Local Dealers**: Usually lowest — often 10–20% below KBB unless it’s a very high-demand car.

4. **Region**:
   - ZIP ${vehicle.zip} is Metro Atlanta — normal demand, not inflated. No regional premium.

Return your response ONLY in this JSON format:

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
    "explanation": "Explain why that platform is the best fit for the vehicle’s age, mileage, condition, or location."
  }
}

Vehicle Info:
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
        { role: 'system', content: 'You are a used car pricing analyst. Only return JSON.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
    });

    const result = completion.choices[0].message.content;
    const cleanResult = result.replace(/```json|```/g, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(cleanResult);

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
