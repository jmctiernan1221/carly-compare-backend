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
You are a cautious, market-aware used car pricing analyst. Your job is to generate **realistic instant cash offer ranges** from major platforms based on vehicle details, depreciation, and platform behavior.

These are **cash offers**, not trade-in values. Emphasize realism — cash offers are always lower than trade-in values because no vehicle purchase is occurring.

Start by estimating a **base resale value** (not private party) for this vehicle using:

- Year, make, model, trim
- Mileage (assume 12,000/year is average)
- Typical depreciation curve:
  - Year 1: -15% to -20%
  - Year 2: -10% to -15%
  - Each year after: -10% to -12%
- Original MSRP (estimated if not known)
- Interior & exterior condition
- Number of owners and accident history
- ZIP ${vehicle.zip} (Metro Atlanta – average demand)

Then generate **cash offer ranges**, applying platform-specific discount behavior:

1. **Carvana** – 30–40% below resale value for high-mileage or older cars.
2. **CarMax** – Conservative but competitive. 10–15% below resale value.
3. **KBB Instant Cash Offer** – Baseline. 15–20% below resale value.
4. **CarGurus** – 20–25% below KBB, unless low mileage or newer vehicle.
5. **Local Dealers** – Conservative. Often 25–30% below resale unless in high demand.

Always return consistent estimates when the exact same vehicle inputs are repeated. Limit variation to ±5% for repeated identical requests.

Include the following top-level keys in your JSON:

- **base_value_reasoning**: Explain how the resale value was calculated.
- **estimated_cash_offers**: A dictionary of platform: {low, high} cash offer ranges.
- **best_season_to_sell**
- **platform_recommendation**: Best platform and why.

Return ONLY this JSON format:

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

