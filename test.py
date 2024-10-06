import torch
import numpy as np
from transformers import AutoTokenizer, AutoModel
import json
import pymongo
import sys
import string
import warnings
import logging
from rapidfuzz import fuzz

# Ignore future warnings
warnings.filterwarnings("ignore", category=FutureWarning)

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Set a fixed seed for reproducibility
torch.manual_seed(42)
np.random.seed(42)

# Load the MuRIL BERT model
model_name = "bert-base-multilingual-cased"

def load_model():
    try:
        tokenizer = AutoTokenizer.from_pretrained(model_name, clean_up_tokenization_spaces=True)
        model = AutoModel.from_pretrained(model_name)
        logging.info("Model and tokenizer loaded successfully.")
        return tokenizer, model
    except Exception as e:
        logging.error(f"Error loading model: {str(e)}")
        sys.exit(1)

tokenizer, model = load_model()

def preprocess_text(text):
    # Lowercase the text and remove punctuation
    return text.lower().translate(str.maketrans("", "", string.punctuation))

def generate_embeddings(texts):
    if not isinstance(texts, list) or not all(isinstance(text, str) for text in texts):
        raise ValueError("Input must be a list of strings.")
    
    inputs = tokenizer(texts, padding=True, truncation=True, return_tensors="pt", max_length=512)
    
    with torch.no_grad():
        outputs = model(**inputs)
    
    # Use mean pooling to get embeddings for each text
    embeddings = outputs.last_hidden_state[:, 0, :].numpy()
    return embeddings

def cosine_similarity(vecA, vecB):
    magnitudeA = np.linalg.norm(vecA)
    magnitudeB = np.linalg.norm(vecB)
    
    if magnitudeA == 0 or magnitudeB == 0:
        return 0.0
    
    dotProduct = np.dot(vecA, vecB)
    return dotProduct / (magnitudeA * magnitudeB)

def fetch_field_from_mongodb(field):
    client = pymongo.MongoClient("mongodb://127.0.0.1:27017/")
    db = client['CHATBOT']
    collection = db['DETAIL1']
    
    # Fetch documents that contain the specified field and the 'number' field
    docs = collection.find({field: {"$exists": True}, 'number': {"$exists": True}}, {field: 1, 'number': 1})
    
    field_data = {}
    for doc in docs:
        number = doc.get('number')
        if number is not None:
            field_data[number] = doc.get(field, "")
    
    if not field_data:
        logging.warning(f"No data found in MongoDB for field: {field}")
    else:
        logging.info(f"Fetched field data: {field_data}")
    
    return field_data

def process_input(user_text, field):
    if not isinstance(user_text, str) or not isinstance(field, str):
        raise ValueError("Both user_text and field must be strings.")
    
    # Preprocess the user input text
    user_text = preprocess_text(user_text)
    logging.info(f"Preprocessed user text: {user_text}")
    
    # Generate embedding for the user input text
    embeddings_user_text = generate_embeddings([user_text])
    
    if len(embeddings_user_text) == 0:
        raise ValueError("Failed to generate embeddings for the user text.")
    
    field_data = fetch_field_from_mongodb(field)
    
    if not field_data:
        raise ValueError(f"No data found in MongoDB for field: {field}")
    
    # Generate embeddings for MongoDB field data
    embeddings_field_data = generate_embeddings([preprocess_text(text) for text in field_data.values()])
    
    similarities = []
    for i, (number, field_text) in enumerate(field_data.items()):
        if not field_text:
            continue
        
        emb1 = embeddings_user_text[0]
        emb2 = embeddings_field_data[i]
        
        # Cosine similarity
        cosine_sim = cosine_similarity(emb1, emb2)
        
        # Fuzzy matching using token_sort_ratio
        fuzzy_sim = fuzz.token_sort_ratio(user_text, preprocess_text(field_text)) / 100.0
        
        # Weighted sum of cosine similarity and fuzzy similarity
        combined_similarity = (0.7 * cosine_sim) + (0.3 * fuzzy_sim)
        
        similarities.append((number, combined_similarity))
        logging.info(f"Similarity for {number}: Cosine {cosine_sim}, Fuzzy {fuzzy_sim}, Combined {combined_similarity}")
    
    if not similarities:
        raise ValueError("No similarities computed.")
    
    max_similarity = max(similarity for _, similarity in similarities)
    best_numbers = [number for number, similarity in similarities if similarity == max_similarity]
    
    logging.info(f"Best numbers: {best_numbers}")
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
