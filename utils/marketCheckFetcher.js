const axios = require('axios');

const fetchMarketValue = async ({ make, model, year, trim, mileage, zip }) => {
  const apiKey = process.env.MARKETCHECK_API_KEY;

  const url = `https://api.marketcheck.com/v2/search/car/active`;
  const params = {
    api_key: apiKey,
    make,
    model,
    year,
    trim,
    start_year: year,
    end_year: year,
    car_type: 'used',
    miles_range: `${Math.max(0, mileage - 10000)}-${parseInt(mileage) + 10000}`,
    zip,
    radius: 100,
    rows: 50,
    sort_by: 'price',
  };

  try {
    const { data } = await axios.get(url, { params });
    const prices = data.listings.map((listing) => listing.price).filter(Boolean);

    if (!prices.length) {
      throw new Error('No market data found');
    }

    return {
      averagePrice: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
      priceSamples: prices,
    };
  } catch (err) {
    console.error('MarketCheck error:', err.response?.data || err.message);
    throw new Error('Failed to fetch market prices');
  }
};

module.exports = fetchMarketValue;
