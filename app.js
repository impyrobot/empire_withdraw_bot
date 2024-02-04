const io = require('socket.io-client');
const axios = require('axios');
const http = require('http');
const url = require('url');
const fs = require('fs');

// Replace "YOUR API KEY HERE" with your API key
const csgoempireApiKey = "c07ab365478208c4b7bd710509f7776b";

// Replace domain to '.gg' if '.com' is blocked
const domain = "csgoempire.com"

const socketEndpoint = `wss://trade.${domain}/trade`;

// Read and parse the whitelist file
let whitelist = [];
fs.readFile('whitelist.txt', 'utf8', (err, data) => {
    if (err) {
        console.error('Error reading the whitelist file:', err);
        return;
    }
    whitelist = data.split('\n').map(line => line.trim()); // Trim each line to remove whitespace
});

// Read and parse the blacklist file
let blacklist = [];
fs.readFile('blacklist.txt', 'utf8', (err, data) => {
    if (err) {
        console.error('Error reading the blacklist file:', err);
        return;
    }
    blacklist = data.split('\n').map(line => line.trim()); // Trim each line to remove whitespace
});

// Set the authorization header for all axios requests to the CSGOEmpire API Key
axios.defaults.headers.common['Authorization'] = `Bearer ${csgoempireApiKey}`;

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
                extraHeaders: { 'User-agent': `${userData.user.id} API Bot` } //this lets the server know that this is a bot
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
                    socket.emit('filters', {
                        price_min: 1000,
                        price_max: 30000,
                        wear_max: 0.38,
                        is_commodity: false,

                    });
                    
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
            // socket.on('new_item', (data) => console.log(`new_item: ${JSON.stringify(data)}`));l
            // socket.on('updated_item', (data) => console.log(`updated_item: ${JSON.stringify(data)}`));
            // socket.on('auction_update', (data) => console.log(`auction_update: ${JSON.stringify(data)}`));
            // socket.on('deleted_item', (data) => console.log(`deleted_item: ${JSON.stringify(data)}`));
            // socket.on('trade_status', (data) => console.log(`trade_status: ${JSON.stringify(data)}`));
            // socket.on("disconnect", (reason) => console.log(`Socket disconnected: ${reason}`));

            socket.on('new_item', (data) => {

                const now = new Date();
                const timestamp = now.toISOString(); // Format the timestamp as an ISO string

                // Apply filters for whitelist and blacklist and above recommended price < -6
                const filteredItems = data.filter(item => 
                    whitelist.includes(item.market_name) && !blacklist.some(keyword => item.market_name.includes(keyword)) && item.above_recommended_price < -6

                );

                // // Set vars for the filtered items
                // var market_name = filteredItems.market_name;
                // var auction_ends_at = filteredItems.auction_ends_at;
                // var auction_highest_bid = filteredItems.auction_highest_bid;
                // var auction_highest_bidder = filteredItems.auction_highest_bidder;
                // var auction_num_bids = filteredItems.auction_number_of_bids;
                // var id = filteredItems.id;
                // var above_recommended_price = filteredItems.above_recommended_price;
                // var purchase_price = filteredItems.purchase_price;

                // Process the filtered items

                filteredItems.forEach(item => {
                    const logMessage = `${timestamp} - ${item.market_name}, ${item.purchase_price}, ${item.above_recommended_price}\n`;

                    // Write to console
                    console.log(logMessage);

                    // Append to a log file
                    fs.appendFile('items_log3.txt', logMessage, (err) => {
                        if (err) {
                            console.error('Error writing to log file:', err);
                        }
                    });
                });

                

            });
            
            
        });

        // Listen for the following event to be emitted by the socket in error cases
        socket.on("close", (reason) => console.log(`Socket closed: ${reason}`));
        socket.on('error', (data) => console.log(`WS Error: ${data}`));
        socket.on('connect_error', (data) => console.log(`Connect Error: ${data}`));
    } catch (e) {
        console.log(`Error while initializing the Socket. Error: ${e}`);
    }
};

// Create an HTTP server
const server = http.createServer((req, res) => {
    const reqUrl = url.parse(req.url, true);

    // Example endpoint to trigger an action in the WebSocket
    if (reqUrl.pathname === '/send-message' && req.method === 'GET') {
        // Extract query parameters
        const message = reqUrl.query.message;
        // Implement logic to send a message or perform an action using the WebSocket
        console.log(`Received message from Python: ${message}`);
        // Respond to the Python script
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Message received');
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    }
});

// Start the server on port 3000
server.listen(3000, () => {
    console.log('Node.js server listening on port 3000');
});

// ... [rest of your WebSocket code] ...

initSocket();