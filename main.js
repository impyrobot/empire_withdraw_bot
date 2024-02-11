// Include necessary packages
require('dotenv').config();
const io = require('socket.io-client');
const axios = require('axios');
const http = require('http');
const url = require('url');
const fs = require('fs');

// Requiring modules
const api = require('./api');
const fileUtils = require('./fileUtils');
const { getBuff, cache } = require('./priceEmpireItemsPrices');
const { getBuffItem } = require('./priceEmpireApi');

//Config
const logFilePath = 'priceEmpireLog.txt'; // Path to your log file
const recommendedPrice= 0; // Recommended price in empire above_recommended_price %

filters = { //Empire filters
    price_min: 0,
    price_max: 500000,
    wear_max: 0.38,
    is_commodity: false,
}

// Global Variables

//Set empire API key
const csgoempireApiKey = process.env.CSGOEMPIRE_API_KEY;
// Set the authorization header globally
axios.defaults.headers.common['Authorization'] = `Bearer ${csgoempireApiKey}`;
//Set domain
const domain = "csgoempire.com"
//Set websocket endpoint
const socketEndpoint = `wss://trade.${domain}/trade`;

// Read and parse the whitelist file
fileUtils.readFileAndParse('whitelist.txt', (err, whitelist) => {
    if (err) {
        console.error('Error processing the whitelist file:', err);
        return;
    }
    console.log('Whitelist:', whitelist);
});

// Read and parse the blacklist file
fileUtils.readFileAndParse('blacklist.txt', (err, blacklist) => {
    if (err) {
        console.error('Error processing the blacklist file:', err);
        return;
    }
    console.log('Blacklist:', blacklist);
});


//GET USER BALANCE
let userBalance;
api.getBalance().then((balance) => {
    console.log("Fetched balance successfully.");
    userBalance = balance; // Use the resolved value directly
}).catch((error) => {
    console.error("Error fetching balance:", error);
});


//CONNECT TO SOCKET
// Function for connecting to the web socket
async function initSocket() {

    console.log("Connecting to websocket...");

    try {
        // Get the user data from the socket
        const userData = (await axios.get(`https://${domain}/api/v2/metadata/socket`)).data;

        // Initalize socket connection
        const socket = io(
            socketEndpoint,
            {
                transports: ["websocket"],
                path: "/s/",
                secure: true,
                rejectUnauthorized: false,
                reconnect: true,
                extraHeaders: { 'User-agent': `${userData.user.id} API Bot` }
            }
        );

        socket.on('connect', async () => {

            // Log when connected
            console.log(`Connected to websocket`);

            // Handle the Init event
            socket.on('init', (data) => {
                if (data && data.authenticated) {
                    console.log(`Successfully authenticated as ${data.name}`);
                    
                    // Emit the default filters to ensure we receive events
                    socket.emit('filters', filters);
                    
                } else {
                    // When the server asks for it, emit the data we got earlier to the socket to identify this client as the user
                    socket.emit('identify', {
                        uid: userData.user.id,
                        model: userData.user,
                        authorizationToken: userData.socket_token,
                        signature: userData.socket_signature
                    });
                }
            })

            // Listen for the following event to be emitted by the socket after we've identified the user

            socket.on('timesync', (data) => console.log(`Timesync: ${JSON.stringify(data)}`));
            socket.on("disconnect", (reason) => console.log(`Socket disconnected: ${reason}`));

            //Check if new_item is in whitelist and <93% of buff price
            socket.on('new_item', (data) => console.log(`new_item: ${JSON.stringify(data)}`));
            //Check if new_item is in whitelist and <93% of buff price
            socket.on('auction_update', (data) => console.log(`Auction Update: ${JSON.stringify(data, null, 2)}`));
            socket.on('delete_item', (data) => console.log(`delete_item: ${JSON.stringify(data)}`));

            socket.on('trade_status', (data) => console.log(`trade_status: ${JSON.stringify(data)}`));

              
        });

        // Listen for the following event to be emitted by the socket in error cases
        socket.on("close", (reason) => console.log(`Socket closed: ${reason}`));
        socket.on('error', (data) => console.log(`WS Error: ${data}`));
        socket.on('connect_error', (data) => console.log(`Connect Error: ${data}`));
    } catch (e) {
        console.log(`Error while initializing the Socket. Error: ${e}`);
    }
}; 

initSocket();