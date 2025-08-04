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
You are a cautious, market-aware used car pricing analyst. Your job is to generate **realistic cash offer ranges** from major platforms based on vehicle details, depreciation, and platform behavior.

Do NOT estimate trade-in values. These are **instant cash offers** for sellers who are NOT buying another vehicle.

Start your logic by estimating a **realistic base value** for this car, considering:

- Make, model, trim, year
- Original MSRP
- Typical depreciation curve:
  - Year 1: -15% to -20%
  - Year 2: -10% to -15%
  - Each additional year: -10% to -12%
- Mileage (assume 12,000/year is normal)
- Condition (interior/exterior)
- Ownership and accident history
- ZIP ${vehicle.zip} (Metro Atlanta – average demand)

Then adjust for platform-specific cash offer behavior:

1. **Carvana** – Offers are 25–35% below retail resale value. Conservative on high-mileage or older cars.
2. **CarMax** – Typically offers higher cash deals for clean, ready-to-resell vehicles. 5–10% better than others on well-maintained SUVs/sedans.
3. **KBB Instant Cash Offer** – Mid-range benchmark. Estimate based on base value minus 10–15%.
4. **CarGurus** – Offers ~15% below KBB unless low mileage or newer.
5. **Local Dealers** – Conservative. Often 15–25% below KBB unless they need that car type.

Also include a top-level key called **"base_value_reasoning"** explaining your logic in 2–3 sentences before platform adjustments.

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
