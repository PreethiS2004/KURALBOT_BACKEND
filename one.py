import torch
import numpy as np
from transformers import AutoTokenizer, AutoModel
import json
import pymongo
import sys

# Set a fixed seed for reproducibility
torch.manual_seed(42)
np.random.seed(42)

# Load the MuRIL BERT model
model_name = "google/muril-base-cased"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModel.from_pretrained(model_name)

def generate_embeddings(texts):
    if not isinstance(texts, list) or not all(isinstance(text, str) for text in texts):
        raise ValueError("Input must be a list of strings.")
    
    inputs = tokenizer(texts, padding=True, truncation=True, return_tensors="pt", max_length=512)
    
    with torch.no_grad():
        outputs = model(**inputs)
        
    embeddings = outputs.last_hidden_state.mean(dim=1).numpy()
    
    # Ensure embeddings are in float format for compatibility with JSON serialization
    return embeddings.astype(float)

def process_input(value, field):
    if not isinstance(value, str) or not isinstance(field, str):
        raise ValueError("Both value and field must be strings.")
    
    # Generate embeddings for the input value
    embeddings = generate_embeddings([value])
    emb1 = embeddings[0]
    # Debugging print
    
    # Fetch values for the specified field from MongoDB
    field_values = fetch_field_values_from_mongodb(field)
    
    if not field_values:
        # No values found for the field in MongoDB
        return {'numbers': [], 'max_similarity': 0.0}
    
    max_similarity = -1
    results = []

    # Compute similarity between the input embedding and each field value embedding
    for number, field_value in field_values.items():
        field_embeddings = generate_embeddings([field_value])
        emb2 = field_embeddings[0]
        
        similarity = cosine_similarity(emb1, emb2)
        
        if similarity > max_similarity:
            max_similarity = similarity
            results = [number]
        elif similarity == max_similarity:
            results.append(number)
    
    return {'numbers': results, 'max_similarity': float(max_similarity)}

def fetch_field_values_from_mongodb(field):
    client = pymongo.MongoClient("mongodb://127.0.0.1:27017/")
    db = client['thirukkural']
    collection = db['thirukkurals']
    
    # Create the projection dictionary to include the field and number
    projection = {'number': 1, field: 1}
    
    docs = collection.find({}, projection)
    field_values = {}
    
    for doc in docs:
        number = doc['number']
        field_value = doc.get(field, "")
        if field_value:
            field_values[number] = field_value
        
    return field_values

def cosine_similarity(vecA, vecB):
    dotProduct = np.dot(vecA, vecB)
    magnitudeA = np.linalg.norm(vecA)
    magnitudeB = np.linalg.norm(vecB)
    
    # Print intermediate values for debugging
   
    
    # Check for zero magnitude to avoid division by zero
    if magnitudeA == 0 or magnitudeB == 0:
        return 0
    
    similarity = dotProduct / (magnitudeA * magnitudeB)
    
    # Print the similarity value
    
    
    return similarity

def main():
    if len(sys.argv) != 3:
        print("Usage: python test.py <value> <field>")
        sys.exit(1)
    
    value = sys.argv[1]
    field = sys.argv[2]
    
    try:
        result = process_input(value, field)
        print(json.dumps(result))  # Return as JSON
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
