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
You are a cautious used car pricing analyst. Your job is to generate **realistic instant cash offer ranges** from major platforms (Carvana, CarMax, KBB, CarGurus, Local Dealers) based on the car's **wholesale base value**.

These are **cash offers**, not trade-in values. Cash offers are **15–35% lower** than trade-in values and lower than typical retail or KBB estimates. Be conservative.

### Process:
1. Estimate **wholesale base value** using:
   - Year, make, model, trim
   - Mileage (assume 12,000/year is average)
   - Depreciation from original MSRP:
     - Year 1: -20%
     - Year 2: -15%
     - Each additional year: -12%
   - Adjust based on:
     - Interior/exterior condition
     - Number of owners
     - Accident history
     - ZIP code trends (e.g. resale interest in Metro Atlanta — ZIP ${vehicle.zip})

2. From that base, apply platform-specific behavior to simulate cash offers:
   - **Carvana**: low to moderate range
   - **CarMax**: slightly higher range, but cautious with damage
   - **KBB Instant Cash Offer**: uses wide ranges, mid-high depending on data
   - **CarGurus**: conservative cash buyer behavior
   - **Local Dealers**: bottom of market, lowest offers

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




