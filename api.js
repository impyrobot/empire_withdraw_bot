require('dotenv').config();
const axios = require('axios');

// Use the updated domain for the new endpoint
const domain = "csgoempire.com"; // Updated to match the new endpoint domain
const API_KEY = process.env.CSGOEMPIRE_API_KEY;

const getBalance = async () => {
    // Set the authorization header for this request
    const headers = {
        Authorization: `Bearer ${API_KEY}`
    };

    try {
        // Make the request to the new metadata/socket endpoint for balance
        const response = await axios.get(`https://${domain}/api/v2/metadata/socket`, { headers });
    
        const userBalance = response.data.user.balance; // Accessing the balance field

        console.log('User Balance:', userBalance);

    } catch (error) {
        // Log the error details
        console.error('Failed to fetch balance:', error.response ? error.response.data : error.message);
    }
};

const getActiveTrades = async () => {
    const headers = { Authorization: `Bearer ${API_KEY}` };

    try {
        const response = await axios.get(`https://${domain}/api/v2/trading/user/trades`, { headers });
        console.log('Active Trades:', response.data);
    } catch (error) {
        console.error('Failed to fetch active trades:', error.response ? error.response.data : error.message);
    }
};


const getActiveAuctions = async () => {
    const headers = { Authorization: `Bearer ${API_KEY}` };

    try {
        const response = await axios.get(`https://${domain}/api/v2/trading/user/auctions`, { headers });
        console.log('Active Auctions:', response.data);
    } catch (error) {
        console.error('Failed to fetch active auctions:', error.response ? error.response.data : error.message);
    }
};


const getTransactionHistory = async (pageNumber) => {
    const headers = { Authorization: `Bearer ${API_KEY}` };

    try {
        const response = await axios.get(`https://${domain}/api/v2/user/transactions?page=${pageNumber}`, { headers });
        console.log('Transaction History:', response.data);
    } catch (error) {
        console.error('Failed to fetch transaction history:', error.response ? error.response.data : error.message);
    }
};


const createWithdrawal = async (depositId, coinValue) => {
    const headers = { 
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
    };

    const body = {
        deposit_id: depositId,
        coin_value: coinValue
    };

    try {
        const response = await axios.post(`https://${domain}/api/v2/trading/deposit/${depositId}/withdraw`, body, { headers });
        console.log('Withdrawal Response:', response.data);
    } catch (error) {
        console.error('Failed to create withdrawal:', error.response ? error.response.data : error.message);
    }
};


const placeBid = async (depositId, bidValue) => {
    const headers = { 
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
    };

    const body = {
        bid_value: bidValue
    };

    try {
        const response = await axios.post(`https://${domain}/api/v2/trading/deposit/${depositId}/bid`, body, { headers });
        console.log('Bid Response:', response.data);
    } catch (error) {
        console.error('Failed to place a bid:', error.response ? error.response.data : error.message);
    }
};


const getListedItems = async (perPage, page) => {
    const headers = { Authorization: `Bearer ${API_KEY}` };

    try {
        const response = await axios.get(`https://${domain}/api/v2/trading/items?per_page=${perPage}&page=${page}`, { headers });
        console.log('Listed Items:', response.data);
    } catch (error) {
        console.error('Failed to fetch listed items:', error.response ? error.response.data : error.message);
    }
};

// api.js
module.exports = {
    getBalance,
    getActiveTrades,
    getActiveAuctions,
    getTransactionHistory,
    createWithdrawal,
    placeBid,
    getListedItems
};
