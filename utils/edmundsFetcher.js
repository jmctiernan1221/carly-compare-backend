
const axios = require('axios');

async function fetchStyleId({ make, model, year }) {
  try {
    const res = await axios.get(`https://www.edmunds.com/api/vehicle/v3/styles`, {
      params: { make, model, year },
    });

    const styles = res.data.styles || [];

    if (styles.length === 0) throw new Error('No styles found for this vehicle');

    return styles[0].id; // For now, use the first result
  } catch (err) {
    console.error('❌ Error fetching styleId:', err.message);
    throw err;
  }
}

async function fetchEdmundsTradeIn({ make, model, year, mileage, zip }) {
  try {
    const styleId = await fetchStyleId({ make, model, year });

    const res = await axios.get(`https://www.edmunds.com/api/vehicle-appraisal/v1/values`, {
      params: {
        styleId,
        mileage,
        zip,
      },
    });

    const data = res.data;

    return {
      styleId,
      baseTradeIn: data.tradeIn.base,
      adjustedTradeIn: data.tradeIn.adjusted,
      dealerRetail: data.dealerRetail.adjusted,
      privateParty: data.privateParty.adjusted,
    };
  } catch (err) {
    console.error('❌ Error fetching Edmunds trade-in:', err.message);
    throw err;
  }
}

module.exports = { fetchEdmundsTradeIn };
