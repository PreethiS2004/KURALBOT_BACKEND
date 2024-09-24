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

# Load the MuRIL BERT model (use GPU if available)
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model_name = "bert-base-multilingual-cased"  # Consider a smaller model for faster performance
tokenizer = AutoTokenizer.from_pretrained(model_name, clean_up_tokenization_spaces=True)
model = AutoModel.from_pretrained(model_name).to(device)

def preprocess_text(text):
    # Lowercase the text and remove punctuation
    text = text.lower()
    return text.translate(str.maketrans("", "", string.punctuation))

def generate_embeddings(texts, batch_size=8, max_length=256):
    embeddings = []
    for i in range(0, len(texts), batch_size):
        batch_texts = texts[i:i + batch_size]
        inputs = tokenizer(batch_texts, padding=True, truncation=True, return_tensors="pt", max_length=max_length).to(device)

        with torch.no_grad():
            outputs = model(**inputs)
        
        # Use mean pooling to get embeddings for each batch and append them to the list
        batch_embeddings = outputs.last_hidden_state.mean(dim=1).cpu().numpy()
        embeddings.extend(batch_embeddings)
    
    return np.array(embeddings)

def cosine_similarity(vecA, vecB):
    dotProduct = np.dot(vecA, vecB)
    return dotProduct / (np.linalg.norm(vecA) * np.linalg.norm(vecB)) if (np.linalg.norm(vecA) and np.linalg.norm(vecB)) else 0.0

def fetch_data_from_mongodb():
    client = pymongo.MongoClient("mongodb://127.0.0.1:27017/")
    db = client['thirukkural']
    collection = db['Questions']
    
    # Fetch all data at once
    docs = collection.find({}, {"inputs": 1, "targets": 1})
    field_data = {doc['inputs']: doc['targets'] for doc in docs}
    
    return field_data

def process_input(user_text):
    if not isinstance(user_text, str):
        raise ValueError("The user_text must be a string.")
    
    user_text = preprocess_text(user_text)
    
    field_data = fetch_data_from_mongodb()
    
    if not field_data:
        raise ValueError("No data found in MongoDB.")
    
    # Create a list for all texts to process
    all_texts = [user_text] + list(field_data.keys())
    
    # Generate embeddings for all texts
    embeddings_all = generate_embeddings(all_texts)
    
    embeddings_user_text = embeddings_all[0]
    embeddings_field_data = embeddings_all[1:]
    
    # Compute similarities using vectorized operations
    similarities = np.array([cosine_similarity(embeddings_user_text, emb) for emb in embeddings_field_data])
    
    max_similarity_idx = np.argmax(similarities)
    best_targets = field_data[list(field_data.keys())[max_similarity_idx]]
    
    return {'targets': best_targets}

def main():
    if len(sys.argv) != 2:
        print("Usage: python test2.py <value>")
        sys.exit(1)
    
    user_text = sys.argv[1]
    
    try:
        result = process_input(user_text)
        print(json.dumps(result, ensure_ascii=False, indent=4))  # Return as JSON
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
