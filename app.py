import os
import platform
import logging
import requests
import json
import time
from collections import deque
import threading
import argparse
import sys
import z


logging.basicConfig(
    filename='bot.log', 
    level=logging.INFO, 
    format='%(asctime)s - %(message)s', 
    encoding='utf-8'  # Specify UTF-8 encoding here
)

# ANSI escape codes for some colors
RED = '\033[91m'
GREEN = '\033[92m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
MAGENTA = '\033[95m'
CYAN = '\033[96m'
WHITE = '\033[97m'
RESET = '\033[0m'




class WithdrawalBot:
    def __init__(self, api_key, websocket_url):
        self.api_key = api_key
        self.websocket_url = websocket_url
        self.base_url = "https://csgoempire.com"  # Replace with the actual API base URL
        self.blacklist = self.load_blacklist('blacklist.txt')
        self.whitelist = self.load_whitelist('whitelist.txt')
        self.request_queue = deque(maxlen=120)  # Queue to hold timestamps of the last 120 requests
        self.logged_item_ids = set()  # Initialize the set for logged item IDs

    def on_message(self, ws, message):
        # Handle incoming WebSocket message
        print("Received message:", message)

    def on_error(self, ws, error):
        # Handle error
        print("Error:", error)

    def on_close(self, ws, close_status_code, close_msg):
        # Handle WebSocket closing
        print("WebSocket closed")

    def on_open(self, ws):
        # Called when the connection is opened
        print("WebSocket connection opened")
        # Send token and signature after opening the connection
        auth_data = {
            "token": "YOUR_TOKEN",
            "signature": "YOUR_SIGNATURE"
        }
        ws.send(json.dumps(auth_data))


    def run_websocket(self):
        # WebSocket main function
        z.enableTrace(True)
        ws = z.WebSocketApp(self.websocket_url,
                                    on_message=self.on_message,
                                    on_error=self.on_error,
                                    on_close=self.on_close)

        ws.on_open = self.on_open
        ws.run_forever()

    def start(self):
        # Start the WebSocket in a separate thread
        threading.Thread(target=self.run_websocket).start()
        # Start the main bot functionality
        self.run()


    def load_blacklist(self, file_path):
        blacklist = []
        try:
            with open(file_path, 'r') as file:
                blacklist = [line.strip() for line in file]
        except FileNotFoundError:
            print(f"Blacklist file not found: {file_path}")
        return blacklist
    
    def load_whitelist(self, file_path):
        whitelist = []
        try:
            with open(file_path, 'r', encoding='utf-8') as file:
                whitelist = [line.strip() for line in file]
        except FileNotFoundError:
            print(f"Whitelist file not found: {file_path}")
        return whitelist

    def send_request(self, endpoint, method='GET', data=None):

        while len(self.request_queue) == 120 and (time.time() - self.request_queue[0]) < 10:
            time.sleep(0.1)  # Wait briefly

        # Proceed with the request
        self.request_queue.append(time.time())  # Record the time of this request

        url = f"{self.base_url}/{endpoint}"
        headers = {'Authorization': f'Bearer {self.api_key}', 'Content-Type': 'application/json'}

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            else:
                response = requests.post(url, headers=headers, data=json.dumps(data))

            response.raise_for_status()  # This will raise an HTTPError for 4XX/5XX responses
            if response.text:  # Check if the response has any text
                return response.json()
            return {}  # Return an empty dictionary if the response is empty

        except requests.exceptions.HTTPError as e:
            print(f"HTTP error occurred: {e} - {response.text}")
        except requests.exceptions.RequestException as e:
            print(f"Other error occurred: {e}")
        return None  # Return None in case of any exception

        
    def get_available_items(self, price_min, price_max, wear_min, wear_max, sort, order, page):
        #Gets items listed on the market

        endpoint = "api/v2/trading/items"
        query_string = f"?per_page=160&not_category=Container&price_min={price_min}&price_max={price_max}&wear_min={wear_min}&wear_max={wear_max}&price_max_above=0&delivery_time_long_max=720&commodity=no&auction=yes&sort={sort}&order={order}&page={page}"
        query_string = f"?per_page=160&not_category=Container&price_min={price_min}&price_max={price_max}&wear_min={wear_min}&wear_max={wear_max}&price_max_above=-6&delivery_time_long_max=720&commodity=no&auction=no&sort={sort}&order={order}&page={page}"
        url = f"{endpoint}{query_string}"

        response = self.send_request(url)

        if response: 

            total_items = response.get("total", 0)
            worthwhile_items = []

            items = response.get("data", [])

            for item in items:

                market_name = item.get("market_name", "N/A")
                market_value = item.get("market_value", "N/A")
                market_id = item.get("id")
                above_market_price = item.get("above_recommended_price")

                if any(substring in market_name for substring in self.blacklist):
                    continue
                
                if any(substring in market_name for substring in self.whitelist):
                    if market_id not in self.logged_item_ids:  # Check if the item's ID is not in the logged IDs
                        self.logged_item_ids.add(market_id)  # Add the ID to the logged IDs
                        worthwhile_items.append(item)
                        logging.info(f"Market Name: {market_name}, Market Value: {market_value}, ID: {market_id}, Above Market Price: {above_market_price}") 
                else:
                    continue  
            if len(worthwhile_items):
                print(YELLOW + f"Total items listed: {total_items}"  + RESET)
                print(GREEN + f"Worthwile items listed: {len(worthwhile_items)}"  + RESET)
                print(BLUE + f"Items logged: {len(self.logged_item_ids)}"  + RESET)
    
        else:
            print("Failed to get a valid response")
    
    def get_metadata(self):
        endpoint = "api/v2/metadata/socket"
        metadata = self.send_request(endpoint, method='GET')
        return metadata
    
    
    def get_active_auctions(self):
        # This method calls the API endpoint to get active auctions
        endpoint = "api/v2/trading/user/auctions"  # Adjust the endpoint as necessary
        return self.send_request(endpoint)


    def withdraw_item(self, item_id):
        # Example implementation - adjust according to actual API
        withdrawal_response = self.send_request('withdraw', method='POST', data={'item_id': item_id})
        return withdrawal_response

    def run(self):
        # Main bot logic

        # Set the start time
        start_time = time.time()

        # Set the desired run duration in seconds (10 minutes = 600 seconds)
        run_duration = 600

        # Define the interval between requests based on the rate limit (30 requests per minute)
        request_interval = 10 / 20  # 0.5 seconds between each request

        request_interval = 3


        while True:
            try:
                current_time = time.time()
                elapsed_time = current_time - start_time

                # Check if the desired run duration has been reached
                if elapsed_time >= run_duration:
                    break

                # Call the get_available_items method
                self.get_available_items(1000, 30000, 0, 0.380, "asc", "above_recommended_price", 1)
                
                # Wait for the next request interval
                time.sleep(request_interval)

            except Exception as e:
                logging.error(f"An error occurred: {e}")

def main(api_key, run_duration, price_min, price_max, wear_min, wear_max, sort, order, max_requests_per_minute, metadata_flag):
    bot = WithdrawalBot(api_key, "wss://csgoempire.com/socket.io/?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhZG1pbiI6dHJ1ZSwiYXBpX3Rva2VuIjoiYzA3YWIzNjU0NzgyMDhjNGI3YmQ3MTA1MDlmNzc3NmIiLCJpYXQiOjE2MjQ2MzY3OTMsImV4cCI6MTYyNDYzNzA5M30.9jZ5R4q1Q4fjxXuV6aQ2X0kZk6cJYqY0lqg0UZ7QZt4&transport=websocket&EIO=3&sid=0c5a6c5d-7d8e-4f7a-8e1a-3a6b0a2d7b6d")
    if metadata_flag:
        # Execute the get_metadata related logic
        metadata = bot.get_metadata()
        if metadata is not None:
            balance = metadata['user']['balance']
            api_token = metadata['user']['api_token']
            socket_token = metadata['socket_token']
            socket_signature = metadata['socket_signature']

            print(f"Your balance is: {balance}")
            print(f"Your API token is: {api_token}")
            print(f"Your socket token is: {socket_token}")
            print(f"Your socket signature is: {socket_signature}")
        else:
            print("Failed to retrieve metadata")
    else:
        # Proceed with the normal bot operation
        bot.run_duration = run_duration
        bot.price_min = price_min
        bot.price_max = price_max
        bot.wear_min = wear_min
        bot.wear_max = wear_max
        bot.sort = sort
        bot.order = order
        bot.max_requests_per_minute = max_requests_per_minute
        bot.run()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run the WithdrawalBot")
    parser.add_argument("--api_key", type=str,default="c07ab365478208c4b7bd710509f7776b", required=False, help="API Key for authentication")
    parser.add_argument("--run_duration", type=int, default=600, help="Duration to run the bot in seconds")
    parser.add_argument("--price_min", type=int, default=1000, help="Minimum price filter")
    parser.add_argument("--price_max", type=int, default=30000, help="Maximum price filter")
    parser.add_argument("--wear_min", type=float, default=0, help="Minimum wear filter")
    parser.add_argument("--wear_max", type=float, default=0.380, help="Maximum wear filter")
    parser.add_argument("--sort", type=str, default="asc", help="Sort order")
    parser.add_argument("--order", type=str, default="above_recommended_price", help="Order type")
    parser.add_argument("--max_requests_per_minute", type=int, default=30, help="Max requests per minute")
    parser.add_argument("--metadata", action='store_true', help="Retrieve and display metadata")
    
    
    args = parser.parse_args()
    
    main(args.api_key, args.run_duration, args.price_min, args.price_max, args.wear_min, args.wear_max, args.sort, args.order, args.max_requests_per_minute, args.metadata)