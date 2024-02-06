import requests
from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()

def getBuff(item_name, coins):
    # Convert coins to USD
    coins = float(coins) / 100
    usd = coins * 0.6142808  # Assuming a conversion rate; adjust as needed

    # Load the API key from environment variables
    priceempire_api_key = os.getenv('PRICEEMPIRE_API_KEY')
    
    # Format the URL with the item and API key
    url = f"https://api.pricempire.com/v2/items/{item_name}?api_key={priceempire_api_key}&currency=USD&source=buff"
    
    headers = {
        'accept': 'application/json',
    }

    try:
        # Make the request to the PriceEmpire API
        response = requests.get(url, headers=headers)
        
        # Check if the request was successful
        if response.status_code == 200:
            data = response.json()
            buffLiquidity = data["item"]["liquidity"]
            buffPrice = data["item"]["prices"]["buff163"]["price"] / 100  # Adjust price formatting
            
            # Calculate the percentage of the item price in buff compared to the USD value of coins
            buffPercentage = (usd / buffPrice) * 100
            
            return usd, buffPrice, buffPercentage, buffLiquidity
        else:
            print(f"Failed to fetch data: HTTP {response.status_code}")
            return None, None, None, None
    except Exception as e:
        print(f"An error occurred: {e}")
        return None, None, None, None


item_name = "AK-47 | Ice Coaled (Minimal Wear)"
coins = 1280
usd, buffPrice, buffPercentage, buffLiquidity = getBuff(item_name, coins) 

print(f"{item_name}, {coins:.2f} coins, ${usd:.2f}, buff% {buffPercentage:.2f}%, {buffLiquidity:.2f} liquidity.")