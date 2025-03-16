const axios = require('axios');

async function trackEvent(eventName, eventParams = {}) {
  const measurementId = process.env.GAProperty;
  const apiSecret = process.env.GASecret;
  const clientId = '999999.999999'; // Optional client ID

  const payload = {
    client_id: clientId,
    events: [{
      name: eventName,
      params: eventParams
    }]
  };

  try {
    const response = await axios.post(
      `https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`,
      payload
    );
    console.log(`Event ${eventName} tracked successfully:`, eventParams);
  } catch (error) {
    console.error(`Error tracking event ${eventName}:`, error);
  }
}

module.exports = {
  trackEvent
}; 