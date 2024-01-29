import os
import platform
import logging
import requests
import json
import time
from collections import deque

logging.basicConfig(filename='bot.log', level=logging.INFO, format='%(asctime)s - %(message)s')


class WithdrawalBot:
    def __init__(self, api_key):
        self.api_key = api_key
        self.base_url = "https://csgoempire.com"  # Replace with the actual API base URL
        self.blacklist = self.load_blacklist('blacklist.txt')
        self.request_queue = deque(maxlen=120)  # Queue to hold timestamps of the last 120 requests

    def load_blacklist(self, file_path):
        blacklist = []
        try:
            with open(file_path, 'r') as file:
                blacklist = [line.strip() for line in file]
        except FileNotFoundError:
            print(f"Blacklist file not found: {file_path}")
        return blacklist

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
            print(f"HTTP error occurred: {e}")
        except requests.exceptions.RequestException as e:
            print(f"Other error occurred: {e}")
        return None  # Return None in case of any exception

        
    def get_available_items(self, price_min, price_max, wear_min, wear_max, sort, order, page):
        #Gets items listed on the market

        endpoint = "api/v2/trading/items"
        query_string = f"?per_page=160&not_category=Container&price_min={price_min}&price_max={price_max}&wear_min={wear_min}&wear_max={wear_max}&price_max_above=0&delivery_time_long_max=720&commodity=no&auction=yes&sort={sort}&order={order}&page={page}"
        url = f"{endpoint}{query_string}"

        response = self.send_request(url)

        if response: 

            total_items = response.get("total", 0)
            print(f"Total items listed: {total_items}")

            items = response.get("data", [])

            for item in items:

                market_name = item.get("market_name", "N/A")
                market_value = item.get("market_value", "N/A")

                if any(substring in market_name for substring in self.blacklist):
                    continue

                logging.info(f"Market Name: {market_name}, Market Value: {market_value}")   
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

        # Call the get_metadata method
        # metadata = self.get_metadata()
        # if metadata is not None:
        #     balance = metadata['user']['balance']
        #     print(f"Your balance is: {balance}")

        #     api_token = metadata['user']['api_token']
        #     socket_token = metadata['socket_token']
        #     socket_signature = metadata['socket_signature']

        #     # print(f"API Token: {api_token}")
        #     # print(f"Socket Token: {socket_token}")
        #     # print(f"Socket Signature: {socket_signature}") 
        # else:
        #     print("Failed to retrieve metadata")

        while True:
            try:
                # Main bot logic

                # Call the get_avalible_items method
                price_min=1000
                price_max=30000
                wear_min=0
                wear_max=0.38
                sort="asc"
                order="above_recommended_price"
                page=1
                avalible_items = self.get_available_items(price_min, price_max, wear_min, wear_max, sort, order, page)

            except Exception as e:
                logging.error(f"An error occurred: {e}")

            time.sleep(1)

        
# Usage
api_key = "c07ab365478208c4b7bd710509f7776b"
bot = WithdrawalBot(api_key)
bot.run()
