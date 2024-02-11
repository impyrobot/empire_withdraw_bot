require('dotenv').config();
const io = require('socket.io-client');
const axios = require('axios');
const http = require('http');
const url = require('url');
const fs = require('fs');
const logFilePath = 'priceEmpireLog.txt'; // Path to your log file

// main.js
const api = require('./api');
const { getBuff, cache } = require('./priceEmpireItemsPrices');
const { getBuffItem } = require('./priceEmpireApi');

// getBuff called to get buff data
(async () => {
    try {
        // Example usage
        const itemName = 'AK-47 | Redline (Field-Tested)'; // Use your actual item name
        const coins = 1906; // Use your actual coins value
        const result = await getBuff(itemName, coins);
        // console.log(result);
    } catch (error) {
        console.error('Failed to get buff data:', error);
    }
})();

let userBalance;
// Use the imported functions
api.getBalance().then((balance) => {
    console.log("Fetched balance successfully.");
    userBalance = balance; // Use the resolved value directly
}).catch((error) => {
    console.error("Error fetching balance:", error);
});

const csgoempireApiKey = process.env.CSGOEMPIRE_API_KEY;
// Set the authorization header globally
axios.defaults.headers.common['Authorization'] = `Bearer ${csgoempireApiKey}`;

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

let filteredItemStorage = [];

const reccomenedPrice= 15;

filters = {
    price_min: 0,
    price_max: 3928,
    // price_max: 999999,
    // wear_max: 0.38,
    // is_commodity: false,
}


//CONNECT TO SOCKET
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
            // socket.on('updated_item', (data) => console.log(`updated_item: ${JSON.stringify(data)}`));
            socket.on('trade_status', (data) => console.log(`trade_status: ${JSON.stringify(data)}`));
            

            // Listen for new items, filters items, then adds them to the storage array and prints to console
            socket.on('new_item', async (data) => {

                const now = new Date();
                const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short' };
                const timestamp = now.toLocaleString(undefined, options);

                const filteredItems = data.filter(item => 
                    whitelist.includes(item.market_name) && !blacklist.some(keyword => item.market_name.includes(keyword)) && item.above_recommended_price <= reccomenedPrice);

                // Initialize a new array to hold items after further filtering based on buffPercentage
                let furtherFilteredItems = [];

                // Process the filtered items with a for loop to await getBuff and further filter by buffPercentage
                for (const item of filteredItems) {
                    try {
                        const buffData = await getBuff(item.market_name, item.purchase_price);
                        if (buffData && buffData.buffPercentage !== undefined) {
                            let buffPercentage = parseFloat(buffData.buffPercentage.toFixed(2));
                            let buffLiquidity = parseFloat(buffData.buffLiquidity.toFixed(2));

                            // Further filter out items where buffPercentage is greater than 94
                            if (buffPercentage <= 94) {

                                // Construct the log message for items that meet all criteria
                                const logMessage = `NEW ITEM: ${timestamp}, ${item.id}, ${item.market_name}, ${item.purchase_price}, ${item.above_recommended_price}, ${buffPercentage}% buff, ${buffLiquidity} liquid\n`;

                                // Write to console
                                console.log('\x1b[32m%s\x1b[0m', logMessage);

                                // Add the item to the furtherFilteredItems array
                                furtherFilteredItems.push(item);

                                //// BID HERE
                                // api.placeBid(item.id, item.purchase_price + 2).then((response) => {
                                //     console.log(`Bid placed successfully ${item.market_name} @ ${item.purchase_price + 1}:` , response);
                                // }).catch((error) => {
                                //     console.error("Error placing bid:", error);
                                // }
                                // );

                            } else {
                                console.log(`Item ${item.market_name} with Buff Percentage: ${buffPercentage} filtered out as it's above the threshold.`);
                            }
                        } else {
                            console.log('Buff data not found or buffPercentage is undefined for', item.market_name);
                        }
                    } catch (error) {
                        console.error('Error fetching buff data for', item.market_name, error);
                    }
                }

                // Add the further filtered items to the storage array
                filteredItemStorage.push(...furtherFilteredItems);
            });
           
            
            
            // socket.on('auction_update', (data) => console.log(`Auction Update: ${JSON.stringify(data, null, 2)}`));

            // socket.on('auction_update', (data) => {
            //     const now = new Date();
            //     const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short' };
            //     const timestamp = now.toLocaleString(undefined, options);
            
            //     // Normalize data to always be an array
            //     const updated_items = Array.isArray(data) ? data : [data];

            
            //     updated_items.forEach(item => {
            //         // Find the item in the storage
            //         const storageItemIndex = filteredItemStorage.findIndex(storageItem => storageItem.id === item.id);
            
            //         if (storageItemIndex !== -1) {
                    
            //             // If the item exists in 'filteredItemStorage' and the update contains valid price data, update it
            //             if (typeof item.auction_highest_bid !== 'undefined' && item.auction_highest_bid !== null) {
                            
            //                 filteredItemStorage[storageItemIndex].purchase_price = item.auction_highest_bid;
            //                 filteredItemStorage[storageItemIndex].above_recommended_price = item.above_recommended_price;
            //                 filteredItemStorage[storageItemIndex].auction_number_of_bids = item.auction_number_of_bids;
                            
            //                 // Assuming logItem is a function for logging, you might want to adjust its usage according to your implementation
                            
            //                 logItem(filteredItemStorage[storageItemIndex], timestamp, 'ITEM_UPDATED');
            //             }
            

            //         }
            //     });
            // });

            socket.on('auction_update', async (data) => {
                const now = new Date();
                const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short' };
                const timestamp = now.toLocaleString(undefined, options);
            
                // Normalize data to always be an array
                const updated_items = Array.isArray(data) ? data : [data];
            
                for (const item of updated_items) {
                    const storageItemIndex = filteredItemStorage.findIndex(storageItem => storageItem.id === item.id);
            
                    if (storageItemIndex !== -1) {
                        // Re-fetch buff data to calculate the latest buff percentage based on the updated bid
                        try {
                            const buffData = await getBuff(filteredItemStorage[storageItemIndex].market_name, item.auction_highest_bid);
                            if (buffData && buffData.buffPercentage !== undefined) {
                                let newBuffPercentage = parseFloat(buffData.buffPercentage.toFixed(2));
            
                                // Check if the new buff percentage is <= 94
                                if (newBuffPercentage <= 94) {
                                    // Update the item with the new auction data
                                    filteredItemStorage[storageItemIndex].purchase_price = item.auction_highest_bid;
                                    filteredItemStorage[storageItemIndex].above_recommended_price = item.above_recommended_price;
                                    filteredItemStorage[storageItemIndex].auction_number_of_bids = item.auction_number_of_bids;
                                    filteredItemStorage[storageItemIndex].buffPercentage = newBuffPercentage;
                                    // Log the updated item information
                                    logItem(filteredItemStorage[storageItemIndex], timestamp, 'ITEM_UPDATED');

                                    console.log("Bid on item here")
                                    //BID HERE
                                } else {
                                    console.log(`Updated bid for item ${item.id} exceeds 94% buff value, not updating.`);
                                }
                            }
                        } catch (error) {
                            console.error('Error updating buff data for', item.id, error);
                        }
                    }
                }
            });
            

            
            socket.on('deleted_item', (data) => {

                const now = new Date();
                const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short' };
                const timestamp = now.toLocaleString(undefined, options);

                // Assuming data is an array of itemIDs
                data.forEach(id => {
                    
                    // Check if the current item ID matches the 'id' key in any object within filteredItemStorage
                    const isDeletedItemInStorage = filteredItemStorage.some(item => item.id === id);
                    
                    if (isDeletedItemInStorage) {
                        logDeletedItemInfo(id);
                        console.log('\x1b[31m%s\x1b[0m', `ITEM DELETED: ${timestamp}, ${id}`);
                    }
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

async function logItem(item, timestamp, logType) {
    // Define a base log message
    let logMessage = `TIMESTAMP: ${timestamp}, ID: ${item.id}`;

    // Append details to the log message based on the log type
    switch(logType) {
        case 'NEW_ITEM':
            logMessage = `\x1b[32mNEW ITEM: ${logMessage}, ${item.market_name}, ${item.price}, ${item.above_recommended_price}, ${item.buffPercentage}\x1b[0m`;
            break;
        case 'ITEM_UPDATED':
            logMessage = `\x1b[38;5;208mITEM UPDATED: ${logMessage}, ${item.market_name}, ${item.purchase_price}, ${item.above_recommended_price}, ${item.auction_number_of_bids} bids, ${item.buffPercentage}%\x1b[0m`;
            break;
        case 'ITEM_DELETED':
            logMessage = `\x1b[31mITEM DELETED: ${logMessage}\x1b[0m`;
            break;
        default:
            logMessage = `UNKNOWN EVENT: ${logMessage}`;
    }

    // Log the message
    console.log(logMessage);
}

// Function to log deleted item information
async function logDeletedItemInfo(itemId) {
    // Find the item in the storage
    const item = filteredItemStorage.find(i => i.id === itemId);
    if (item) {
        try {
            // Await the result from getBuff
            result = await getBuff(item.market_name, item.purchase_price);

            result.buffPercentage = result.buffPercentage.toFixed(2);
            result.buffLiquidity = result.buffLiquidity.toFixed(2);

            // Now logMessage will include the defined buffPercentage
            const logMessage = `${item.id},${item.market_name}, ${item.purchase_price}, ${item.above_recommended_price}, ${result.buffPercentage}%, ${result.buffLiquidity}\n`;

            // Append the log message to the file
            fs.appendFile(logFilePath, logMessage, (err) => {
                if (err) {
                    console.error('Error writing to the log file:', err);
                } else {
                    console.log('Logged deleted item to file:', logMessage);
                }
            });

            // Optionally, remove the item from the storage to keep it up-to-date
            const index = filteredItemStorage.indexOf(item);
            if (index > -1) {
                filteredItemStorage.splice(index, 1);
            }
        } catch (error) {
            console.error('Error getting buffPercentage:', error);
        }
    }
}

initSocket();