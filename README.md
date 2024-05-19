# Auction Bot

This is a bot for buying items in an auction system. Follow the instructions below to set up and run the bot.

## Configuration

1. Open `config.js` and set the desired configuration for buying items.
2. Adjust the liquidity settings in `priceEmpireGetLiquid.js` according to your requirements.
3. Run priceEmpireGetLiquid.js
```
node .\priceEmpireGetLiquid.js 
```

## Whitelisting and Blacklisting

- To specify whitelisted items, add them to the `whitelist.txt` file, with each item on a separate line.
- To specify blacklisted items, add them to the `blacklist.txt` file, with each item on a separate line.

## Running the Bot

1. Make sure you have Node.js installed on your system.
2. Open a terminal or command prompt and navigate to the project directory.
3. Install the required dependencies by running the following command:
```
npm install
```
4. Run the `priceEmpireGetLiquid.js` script to update the liquidity:
```
node priceEmpireGetLiquid.js
```
5. Start the auction bot by running the following command:
```
node auction.js
```
The bot will now be running and will attempt to buy items based on the provided configuration, whitelist, and blacklist.

## Troubleshooting

- If you encounter any issues or errors, please check the console output for detailed information.
- Make sure you have properly configured the settings in `config.js` and `priceEmpireGetLiquid.js`.
- Ensure that the `whitelist.txt` and `blacklist.txt` files are properly formatted, with each item on a separate line.

If you need further assistance, please contact the bot developer or refer to the documentation.

## TODO

- [ ] Run everything from `main.js` for centralized control.
- [ ] Implement functionality to accept trades on Steam.
- [ ] Switch from file-based storage to using a SQL database for improved data management.
- [ ] Send trade received confirmation or initiate a dispute using an API if the trade is not received within 27 minutes.
- [ ] Integrate the SQL database with Google Sheets for data visualization and analysis.
- [ ] Full testing
- [ ] Refactor code to be more modular
- [ ] Add configuration to use with multiple Steam accounts

## Useful libraries

https://steamapi.xpaw.me/#IEconService/GetTradeHistory

https://github.com/DoctorMcKay/node-steam-tradeoffer-manager

https://github.com/Jessecar96/SteamDesktopAuthenticator


Happy bidding!

