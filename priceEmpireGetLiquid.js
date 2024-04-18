require('dotenv').config();
const axios = require('axios');
const fs = require('fs');

// Read the blacklist file
let blacklist = [];
try {
  const data = fs.readFileSync('blacklist.txt', 'utf8');
  blacklist = data.split('\n').map(line => line.trim().toLowerCase()); // Trim each line and convert to lowercase
} catch (err) {
  console.error('Error reading the blacklist file:', err);
}

const getLiquidItems = async () => {
  // Load the API key from environment variables or directly use it
  const priceempireApiKey = process.env.PRICEEMPIRE_API_KEY;

  // Use the v3 endpoint to get prices for all items
  const url = `https://api.pricempire.com/v3/items/prices?api_key=${priceempireApiKey}&currency=USD&source=buff`;

  try {
    const response = await axios.get(url, { headers: { accept: 'application/json' } });

    if (response.status === 200) {
      const priceData = response.data;

      // Filter the price data based on liquidity and blacklist
      const filteredPriceData = Object.entries(priceData)
        .filter(([key, value]) => value.liquidity >= 80 && !blacklist.some(keyword => key.toLowerCase().includes(keyword)))
        .map(([key, _]) => key);

      if (filteredPriceData.length > 0) {
        // Write the filtered item names to whitelist.txt
        fs.writeFileSync('whitelist.txt', filteredPriceData.join('\n'));
        console.log(`Found ${filteredPriceData.length} items. Whitelist file updated successfully.`);
      } else {
        console.log('No items found.');
      }

      return filteredPriceData;
    } else {
      console.log(`Failed to fetch data: HTTP ${response.status}`);
      return null;
    }
  } catch (error) {
    console.error(`An error occurred: ${error.message}`);
    return null;
  }
};

module.exports = { getLiquidItems };

getLiquidItems()
  .then(items => {
    if (items) {
      // No need to log individual items
    } else {
      console.log('Error occurred while fetching items.');
    }
  })
  .catch(error => {
    console.error('An error occurred:', error);
  });