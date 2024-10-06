from pymongo import MongoClient

# Connect to MongoDB
client = MongoClient("mongodb://localhost:27017/")  # Use your MongoDB connection URL
db = client['CHATBOT']  # Replace with your database name
collection = db['DETAIL1']  # Replace with your collection name

# Define the number (for example, Kural number) to identify the document
kural_number = 368 # Replace with the specific number

# Define the new field and its value
new_field = "section_eng"  # Replace with your new field name
new_value = "Assertion of the Strength of Virtue"  # Replace with the value you want to assign to the new field

# Update the document that matches the number
result = collection.update_one(
    {"number": kural_number},  # Filter by the specific number (replace 'Kural_Number' with your actual field name)
    {"$set": {new_field: new_value}}  # Add or update the new field with the given value
)

# Check if the update was successful
if result.modified_count > 0:
    print("Document updated successfully!")
else:
    print("No document was updated. Check the filter criteria.")
