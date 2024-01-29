import requests

# url = "https://csgoempire.com/api/trading/items?per_page=160&not_category=Container&price_min=1000&price_max=30000&wear_min=0&wear_max=0.38&price_max_above=0&delivery_time_long_max=720&commodity=no&auction=yes&sort=desc&order=market_value&page=1"
base_url = "https://csgoempire.com"
endpoint = "api/v2/trading/items"


#10 to 300 coins
price_min=1000 #price in coins (1000 = 10.00)
price_max=30000 #price in coins (30000 = 300.00)

#FN to FT
wear_min=0 #0.00
wear_max=0.38 # FT

#not_category=Container and commodity=no Removes cases and keys


query_string = f"?per_page=160&not_category=Container&price_min={price_min}&price_max={price_max}&wear_min={wear_min}&wear_max={wear_max}&price_max_above=0&delivery_time_long_max=720&commodity=no&auction=yes&sort=asc&order=above_recommended_price&page=1"


url = f"{base_url}/{endpoint}{query_string}"


payload = {}
headers = {
  'Authorization': 'Bearer c07ab365478208c4b7bd710509f7776b '
}

response = requests.request("GET", url, headers=headers, data=payload)

if response.status_code == 200:
    data = response.json()

    total_items = data.get("total", 0)
    print(f"Total items listed: {total_items}")

    items = data.get("data", [])

    # ★ StatTrak should cover knives that are stattrak

    # Blacklist.txt contains all bad items
    file_path = 'blacklist.txt'

    # Initialize an empty list to store the strings
    blacklist = []

    # Open the file and read each line
    with open(file_path, 'r') as file:
        for line in file:
            # Strip whitespace and add to the list
            blacklist.append(line.strip())

    for item in items:

        market_name = item.get("market_name", "N/A")
        market_value = item.get("market_value", "N/A")

        if any(substring in market_name for substring in blacklist):
            continue

        print(f"Market Name: {market_name}, Market Value: {market_value}")   
else:
    print(f"Failed to retrieve data, status code: {response.status_code}")