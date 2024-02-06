// Include necessary packages
require('dotenv').config();
const axios = require('axios');

// Define the getBuff function
const getBuff = async (item_name, coins) => {
  // Convert coins to USD and round to 2 decimal places
  const coinsInUSD = parseFloat(((parseFloat(coins) / 100) * 0.6142808).toFixed(2));

  // Load the API key from environment variables
  const priceempireApiKey = process.env.PRICEEMPIRE_API_KEY;

  // Format the URL with the item and API key
  const url = `https://api.pricempire.com/v2/items/${item_name}?api_key=${priceempireApiKey}&currency=USD&source=buff`;

  try {
    // Make the request to the PriceEmpire API
    const response = await axios.get(url, { headers: { accept: 'application/json' } });

    if (response.status && response.status === 200) {
      const { data } = response;
      const buffLiquidity = data.item.liquidity;
      const buffPrice = parseFloat((data.item.prices.buff163.price / 100).toFixed(2)); // Adjust price formatting and round to 2 decimal places

      // Calculate the percentage of the item price in buff compared to the USD value of coins and round to 2 decimal places
      const buffPercentage = parseFloat(((coinsInUSD / buffPrice) * 100).toFixed(2));

      return { usd: coinsInUSD, buffPrice, buffPercentage, buffLiquidity };
    } else {
      console.log(`Failed to fetch data: HTTP ${response.status}`);
      return null;
    }
  } catch (error) {
    console.error(`An error occurred: ${error.message}`);
    return null;
  }
};

// Export the getBuff function for use in other files
module.exports = { getBuff };