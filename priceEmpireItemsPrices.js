require('dotenv').config();
const axios = require('axios');
const fs = require('fs');

let cache = {
    data: null,
    lastFetch: 0
};

// Synchronously read and parse the whitelist file
let whitelist = [];
try {
    const data = fs.readFileSync('whitelist.txt', 'utf8');
    whitelist = data.split('\n').map(line => line.trim()); // Trim each line to remove whitespace
} catch (err) {
    console.error('Error reading the whitelist file:', err);
}

const getBuff = async (item_name, coins) => {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000; // milliseconds in one hour

    // Convert coins to USD and round to 2 decimal places
    const coinsInUSD = parseFloat(((parseFloat(coins) / 100) * 0.6142808).toFixed(2));

    // Check if cache is older than one hour or empty
    if (!cache.data || now - cache.lastFetch > oneHour) {
        console.log("Fetching new data...");

        // Load the API key from environment variables or directly use it
        const priceempireApiKey = process.env.PRICEEMPIRE_API_KEY;

        // Use the v3 endpoint to get prices for all items
        const url = `https://api.pricempire.com/v3/items/prices?api_key=${priceempireApiKey}&currency=USD&source=buff`;

        try {
            const response = await axios.get(url, { headers: { accept: 'application/json' } });

            if (response.status === 200) {
                cache.data = response.data;
                cache.lastFetch = now;
                console.log("200 OK - Price empire Data refreshed");
            } else {
                console.log(`Failed to fetch data: HTTP ${response.status}`);
                return null;
            }
        } catch (error) {
            console.error(`An error occurred: ${error.message}`);
            return null;
        }
    } else {
        console.log("Using cached data...");
    }

    // Filter cache.data based on the whitelist
    let filteredPriceData = {};
    Object.keys(cache.data).forEach(key => {
        if (whitelist.includes(key)) {
            filteredPriceData[key] = cache.data[key];
        }
    });

    const itemData = filteredPriceData[item_name];
    if (!itemData) {
        console.log(`Item ${item_name} not found.`);
        return null;
    }

    const buffLiquidity = itemData.liquidity;
    const buffPrice = parseFloat((itemData.buff.price / 100).toFixed(2));
    const buffPercentage = parseFloat(((coinsInUSD / buffPrice) * 100).toFixed(2));

    return { coinsInUSD, buffPrice, buffPercentage, buffLiquidity };
};

module.exports = { getBuff };

// (async () => {
//     try {
//         // Replace 'AK-47 | Redline (Field-Tested)' and '1906' with your actual inputs
//         const result = await getBuff("AWP | Duality (Minimal Wear)", 864);
//         console.log(result);
//     } catch (error) {
//         console.error('Failed to get buff data:', error);
//     }
// })();