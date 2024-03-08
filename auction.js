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
const { parse } = require('path');

// getBuff called to get buff data
(async () => {
    try {
        // Example usage
        const itemName = 'AK-47 | Redline (Field-Tested)'; // Use your actual item name
        const coins = 1900; // Use your actual coins value
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



//WHITELIST AND BLACKLIST
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



//FILTER CONFIGURATION
let filteredItemStorage = [];

const recommendedPrice= 15; //Buying below +15 empire
const buffTarget = 93; //Buying below 93% buff

filters = {
    price_min: 0,
    price_max: 2877,
    wear_max: 0.38,
    is_commodity: false,
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
            });

            // Listen for the following event to be emitted by the socket after we've identified the user

            socket.on('timesync', (data) => console.log(`Timesync: ${JSON.stringify(data)}`));
            socket.on("disconnect", (reason) => console.log(`Socket disconnected: ${reason}`));
            

            // // socket.on('updated_item', (data) => console.log(`updated_item: ${JSON.stringify(data)}`));
            // socket.on('trade_status', (data) => console.log(`trade_status: ${JSON.stringify(data)}`));
            // socket.on('trade_status', (data) => {

            
            //     // Extracting information from the trade_status
            //     console.log(data.id);
            //     console.log(data.market_name);
            //     console.log(data.market_value);
                
            
            //     // Log the extracted information
            //     console.log("Trade ID:", id, "Market Name:", market_name, "Market Value:", market_value);
            // });
            

            // Listen for new items, filters items, then adds them to the storage array and prints to console
            socket.on('new_item', async (data) => {

                const now = new Date();
                const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short' };
                const timestamp = now.toLocaleString(undefined, options);

                const filteredItems = data.filter(item => 
                    whitelist.includes(item.market_name) && !blacklist.some(keyword => item.market_name.includes(keyword)) && item.above_recommended_price <= recommendedPrice);
                // Initialize a new array to hold items after further filtering based on buffPercentage
                let furtherFilteredItems = [];

                // Process the filtered items with a for loop to await getBuff and further filter by buffPercentage
                for (const item of filteredItems) {
                    try {
                        const buffData = await getBuff(item.market_name, item.purchase_price);
                        if (buffData && buffData.buffPercentage !== undefined) {
                            let buffPercentage = parseFloat(buffData.buffPercentage.toFixed(2));
                            let buffLiquidity = parseFloat(buffData.buffLiquidity.toFixed(2));

                            // Further filter out items where buffPercentage is greater than buffTarget
                            if (buffPercentage <= buffTarget) {

                                // Construct the log message for items that meet all criteria
                                const logMessage = `NEW ITEM: ${timestamp}, ${item.id}, ${item.market_name}, ${item.purchase_price}, ${item.above_recommended_price}, ${buffPercentage}% buff, ${buffLiquidity} liquid\n`;

                                // Write to console
                                console.log('\x1b[32m%s\x1b[0m', logMessage);

                                // Add the item to the furtherFilteredItems array
                                furtherFilteredItems.push(item);

                                // BID HERE

                                if (item.auction_ends_at == null) { // IF NULL NOT AUCTION SO CREATE WITHDRAWAL
                                    // If the auction has an end time, attempt to create a withdrawal.
                                    api.createWithdrawal(item.id, item.purchase_price).then((response) => {
                                        console.log(`Withdrawal created successfully ${item.market_name} @ ${item.purchase_price}:`, response);
                                    }).catch((error) => {
                                        console.error("Error creating withdrawal:", error);
                                    });
                                } else {
                                    // If the auction does have an end time, place a bid instead.
                                    
                                            // Use the integer bidValue in the API call
                                            api.placeBid(item.id, item.purchase_price).then((response) => {
                                                if (response && response.success === true) {
                                                    console.log(`Bid placed successfully for ${item.market_name} @ ${item.purchase_price}:`, response);
                                                } else {
                                                    console.log("Bid failed"); 
                                                }
                                            }).catch((error) => {
                                                console.error("Error placing bid:", error);
                                            });
                                }
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
            
                                // Check if the new buff percentage is <= buffTarget
                                if (newBuffPercentage <= buffTarget) {
                                    // Update the item with the new auction data
                                    filteredItemStorage[storageItemIndex].purchase_price = item.auction_highest_bid;
                                    filteredItemStorage[storageItemIndex].above_recommended_price = item.above_recommended_price;
                                    filteredItemStorage[storageItemIndex].auction_number_of_bids = item.auction_number_of_bids;
                                    filteredItemStorage[storageItemIndex].buffPercentage = newBuffPercentage;
                                    // Log the updated item information
                                    logItem(filteredItemStorage[storageItemIndex], timestamp, 'ITEM_UPDATED');

                                    // Calculate new bid +1%+1 coin
                                    let bidValue = calculateNewBid(parseInt(item.auction_highest_bid));

                                    let newBidBuffDate = await getBuff(filteredItemStorage[storageItemIndex].market_name, bidValue);
                                    
                                    if (newBidBuffDate && newBidBuffDate.buffPercentage !== undefined) {
                                        let newBidBuffPercentage = parseFloat(newBidBuffDate.buffPercentage.toFixed(2));

                                        if (newBidBuffPercentage <= buffTarget) {
                                            console.log(`New bid buff percentage: ${newBuffPercentage} < ${buffTarget} so placing bid.`);
                                            // Use the integer bidValue in the API call
                                            api.placeBid(item.id, bidValue).then((response) => {
                                                if (response && response.success === true) { 
                                                    console.log(`Bid placed successfully for ${item.market_name} @ ${bidValue}:`, response);
                                                } else {
                                                    console.log("Bid failed"); 
                                                } //ADD ELSE TO CHECK IF BID FAILED TRY ALTERNATE BID STRATEGY
                                            }).catch((error) => {
                                                console.error("Error placing bid:", error);
                                            });                                            
                                        } else {
                                            console.log(`Calculated bid too high using lower bid value.`);
                                            let bidValue = parseInt(item.auction_highest_bid) + 5;
                                            let newBidBuffDate = await getBuff(filteredItemStorage[storageItemIndex].market_name, bidValue);

                                            if (newBidBuffDate && newBidBuffDate.buffPercentage !== undefined) {
                                                let newBidBuffPercentage = parseFloat(newBidBuffDate.buffPercentage.toFixed(2));
        
                                                if (newBidBuffPercentage <= buffTarget) {
                                                    console.log(`New bid buff percentage: ${newBidBuffPercentage} < ${buffTarget} so placing bid for ${bidValue}.`);
                                                    // Use the integer bidValue in the API call
                                                    api.placeBid(item.id, bidValue).then((response) => {
                                                        if (response && response.success === true) { 
                                                            console.log(`Bid placed successfully for ${item.market_name} @ ${bidValue}:`, response);
                                                        } else {
                                                            console.log("Bid failed"); 
                                                        } //ADD ELSE TO CHECK IF BID FAILED TRY ALTERNATE BID STRATEGY
                                                    }).catch((error) => {
                                                        console.error("Error placing bid:", error);
                                                    });
                                                };
                                            };                       
                                        };
                                    }

                                } else {
                                    console.log(`Updated bid for item ${item.id} @ ${newBuffPercentage} exceeds ${buffTarget}% buff value, not updating.`);
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

function calculateNewBid(currentBid) {
    let newBid = Math.round(currentBid * 1.01) + 1;
    // let newBid = currentBid + 5;
    console.log(`New Bid value: ${newBid}`);
    return newBid;
}

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