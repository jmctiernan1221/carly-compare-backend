const express = require('express');
const router = express.Router();
const { OpenAI } = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

router.post('/', async (req, res) => {
  const vehicle = req.body;

  const prompt = `
Generate estimated trade-in value ranges for the following car:

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

Return estimates from: Carvana, CarMax, KBB, CarGurus, and Local Dealers.
Also include:
- A recommendation on the best season to sell
- A short explanation of which platform might offer the best deal and why

Respond with a JSON object.
`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are a used car pricing assistant that outputs clean JSON.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.6,
    });

    const result = completion.choices[0].message.content;
    res.json({ quote: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate quote' });
  }
});

module.exports = router;