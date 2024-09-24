import torch
import numpy as np
from transformers import AutoTokenizer, AutoModel
import json
import pymongo
import sys
import string
import warnings

warnings.filterwarnings("ignore", category=FutureWarning)

# Set a fixed seed for reproducibility
torch.manual_seed(42)
np.random.seed(42)

# Load the MuRIL BERT model
model_name = "bert-base-multilingual-cased"
tokenizer = AutoTokenizer.from_pretrained(model_name,clean_up_tokenization_spaces=True)
model = AutoModel.from_pretrained(model_name)

def preprocess_text(text):
    # Lowercase the text
    text = text.lower()
    # Remove punctuation
    text = text.translate(str.maketrans("", "", string.punctuation))
    return text

def generate_embeddings(texts):
    if not isinstance(texts, list) or not all(isinstance(text, str) for text in texts):
        raise ValueError("Input must be a list of strings.")
    
    inputs = tokenizer(texts, padding=True, truncation=True, return_tensors="pt", max_length=512)
    
    with torch.no_grad():
        outputs = model(**inputs)
    
    # Use mean pooling to get embeddings for each text
    embeddings = outputs.last_hidden_state.mean(dim=1).numpy()
   
    return embeddings

def cosine_similarity(vecA, vecB):
    magnitudeA = np.linalg.norm(vecA)
    magnitudeB = np.linalg.norm(vecB)
    
    # If either vector is zero, return 0 similarity
    if magnitudeA == 0 or magnitudeB == 0:
        return 0.0
    
    dotProduct = np.dot(vecA, vecB)
    return dotProduct / (magnitudeA * magnitudeB)

def fetch_field_from_mongodb(field):
    client = pymongo.MongoClient("mongodb://127.0.0.1:27017/")
    db = client['thirukkural']
    collection = db['thirukkurals']
    docs = collection.find({}, {field: 1, 'number': 1})
    field_data = {}
    for doc in docs:
        number = doc['number']
        field_data[number] = doc.get(field, "")
    return field_data

def process_input(user_text, field):
    if not isinstance(user_text, str) or not isinstance(field, str):
        raise ValueError("Both user_text and field must be strings.")
    
    # Preprocess the user input text
    user_text = preprocess_text(user_text)
    
    # Generate embedding for the user input text
    embeddings_user_text = generate_embeddings([user_text])
    
    if len(embeddings_user_text) == 0:
        raise ValueError("Failed to generate embeddings for the user text.")
    
    field_data = fetch_field_from_mongodb(field)
    
    if not field_data:
        raise ValueError(f"No data found in MongoDB for field: {field}")
    
    # Generate embeddings for MongoDB field data
    embeddings_field_data = generate_embeddings([preprocess_text(text) for text in field_data.values()])
    
    # Compute cosine similarity
    similarities = []
    for i, (number, field_text) in enumerate(field_data.items()):
        emb1 = embeddings_user_text[0]
        
        emb2 = embeddings_field_data[i]
        similarity = cosine_similarity(emb1, emb2)
        similarities.append((number, float(similarity)))
    
    if not similarities:
        raise ValueError("No similarities computed.")
    
    # Find the maximum similarity value
    max_similarity = max(similarity for _, similarity in similarities)
    
    # Collect all numbers with the maximum similarity
    best_numbers = [number for number, similarity in similarities if similarity == max_similarity]
    
    return {'numbers': best_numbers}
def main():
    if len(sys.argv) != 3:
        print(json.dumps({"error": "Usage: python test.py <value> <field>"}))
        sys.exit(1)
    
    user_text = sys.argv[1]
    field = sys.argv[2]
    
    try:
        result = process_input(user_text, field)
        print(json.dumps(result))  # Ensure this is the only output
    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    main()
