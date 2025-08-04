const express = require('express');
const router = express.Router();
const { OpenAI } = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

router.post('/', async (req, res) => {
  const vehicle = req.body;

  const prompt = cashPrompt(vehicle); // Always use cashPrompt now

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
      console.log('🧠 GPT Base Value Reasoning:', parsed.base_value_reasoning);

      if (
        !parsed.estimated_cash_offers ||
        typeof parsed.estimated_cash_offers !== 'object' ||
        !parsed.platform_recommendation ||
        typeof parsed.platform_recommendation !== 'object' ||
        !parsed.base_value_reasoning
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

function cashPrompt(vehicle) {
  return `
You are a cautious used car pricing analyst. Your job is to generate **realistic instant cash offer ranges** from major platforms based on the car's base wholesale value.

These are **cash offers**, not trade-in values. Emphasize realism — cash offers are **15–35% lower** than trade-in values, and even lower than typical KBB or retail resale estimates.

Start by estimating a **wholesale base value**, not private-party or dealer retail. Use:

- Year, make, model, trim
- Mileage (assume 12k/year is average)
- Depreciation:
  - Year 1: -20%
  - Year 2: -15%
  - Each additional year: -12%
- Original MSRP (estimate if unknown)
- Interior & exterior condition
- Ownership and accident history
- ZIP ${vehicle.zip} (Metro Atlanta)

⚠️ Note: Users have reported inflated estimates in previous versions. Adjust cautiously downward to reflect realistic **wholesale market** pricing.

Then apply the following cash discount behavior:

1. **Carvana**: 30–40% below base value for older/high-mileage cars.
2. **CarMax**: 15–25% below base; pays more for clean cars with no accidents.
3. **KBB Instant Cash Offer**: Use as a benchmark, but reduce by 20–25%.
4. **CarGurus**: 25–35% below KBB unless low mileage.
5. **Local Dealers**: 30–40% below KBB unless they need inventory.

If the same input is repeated, you must return estimates within **±3%** of previous values.

Return only this JSON:

{
  "base_value_reasoning": "Your explanation here",
  "estimated_cash_offers": {
    "Carvana": { "low": 0, "high": 0 },
    "CarMax": { "low": 0, "high": 0 },
    "KBB Instant Cash Offer": { "low": 0, "high": 0 },
    "CarGurus": { "low": 0, "high": 0 },
    "Local Dealers": { "low": 0, "high": 0 }
  },
  "best_season_to_sell": "<Winter|Spring|Summer|Fall>",
  "platform_recommendation": {
    "best_platform": "<Carvana|CarMax|KBB Instant Cash Offer|CarGurus|Local Dealers>",
    "explanation": "Explain why that platform offers the best deal based on mileage, condition, or location."
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
}

module.exports = router;


