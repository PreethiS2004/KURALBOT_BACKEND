import json
from pymongo import MongoClient

# Connect to MongoDB
client = MongoClient("mongodb://127.0.0.1:27017/")
db = client['thirukkural']
collection = db['Details']

# Load JSON data from the file
with open('alldata.json', 'r', encoding='utf-8') as file:
    data = json.load(file)

# Extract the inner dictionary and insert it
for key in data:
    collection.insert_one(data[key])

print("Data imported successfully.")
