const express = require('express');
const router = express.Router();
const { OpenAI } = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

router.post('/', async (req, res) => {
  const vehicle = req.body;
  const mode = vehicle.mode || 'cash'; // default to cash

  const prompt = mode === 'trade-in' ? tradeInPrompt(vehicle) : cashPrompt(vehicle);

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

      const key = mode === 'trade-in' ? 'estimated_trade_in_values' : 'estimated_cash_offers';

      if (
        !parsed[key] ||
        typeof parsed[key] !== 'object' ||
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

function tradeInPrompt(vehicle) {
  return `
You are a conservative, market-aware used car valuation analyst. You will generate realistic **trade-in value ranges** based on your internal estimate of base value, average depreciation, platform behavior, and vehicle condition. DO NOT provide private-party pricing — this is for **trade-in only**.

Start your logic by estimating a **realistic trade-in base value** based on the vehicle's:
- Make, model, trim, year
- Mileage (assume 12,000 miles/year is average)
- Typical depreciation curve:
  - Year 1: -15% to -20%
  - Year 2: -10% to -15%
  - Each additional year: -10% to -12%
- Luxury/exotic vehicles tend to depreciate faster.
- ZIP ${vehicle.zip} is in Metro Atlanta — average demand, no regional premiums.

Then adjust based on:

1. **Mileage impact**:
   - Deduct $500–$1,000 per 10,000 miles *over* average for vehicle’s age.
   - Vehicles over 100K miles should have heavy depreciation.

2. **Condition modifiers**:
   - “Excellent” = slightly better than average for its age.
   - “Good” = average. Don’t adjust.
   - 1–2 owners or no accidents help slightly.
   - Body or frame damage = reduce value.

3. **Platform behavior**:
   - **Carvana**: 25–35% below retail; cautious on high-mileage or older cars.
   - **CarMax**: Higher-than-average on clean, no-accident cars (+5–10% vs KBB).
   - **KBB**: Use this as your core average trade-in value.
   - **CarGurus**: Conservative, 10–15% below KBB.
   - **Local Dealers**: Typically 10–20% below KBB unless car is in high demand.

Also include a top-level key in your JSON called "base_value_reasoning" — explain in 2–3 sentences how you estimated the starting trade-in value for this vehicle before platform adjustments.

Return ONLY in the following JSON format:

{
  "base_value_reasoning": "Your explanation here",
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
}

module.exports = router;
