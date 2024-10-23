import torch
import numpy as np
from transformers import AutoTokenizer, AutoModel, AutoModelForSeq2SeqLM
import json
import pymongo
import sys
import string
import warnings
import logging
from rapidfuzz import fuzz
from googletrans import Translator
import requests  # To make API calls

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
    return text.translate(str.maketrans("", "", string.punctuation)).lower().strip()

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
        combined_similarity = cosine_sim
        
        similarities.append((number, combined_similarity))
        logging.info(f"Similarity for {number}: Cosine {cosine_sim}, Fuzzy {fuzzy_sim}, Combined {combined_similarity}")
    
    if not similarities:
        raise ValueError("No similarities computed.")
    
    max_similarity = max(similarity for _, similarity in similarities)
    best_numbers = [number for number, similarity in similarities if similarity == max_similarity]
    
    logging.info(f"Best numbers: {best_numbers}")
    return {'numbers': best_numbers}

def translate_to_tamil(text):
    translator = Translator()
    try:
        # Translate from Hindi to Tamil
        translated = translator.translate(text, src='hi', dest='ta')
        logging.info(f"Translated from Hindi to Tamil: {translated.text}")
        return translated.text
    except Exception as e:
        logging.error(f"Translation error: {str(e)}")
        raise ValueError("Translation from Hindi to Tamil failed.")

# Load the translation model for Russian
def load_translation_model():
    model_name = "utrobinmv/t5_translate_en_ru_zh_small_1024"
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    model = AutoModelForSeq2SeqLM.from_pretrained(model_name)
    return tokenizer, model

# Translate from Russian to English
def translate_russian_to_english(text):
    try:
        tokenizer, model = load_translation_model()
        inputs = tokenizer.encode(f"translate Russian to English: {text}", return_tensors="pt")
        outputs = model.generate(inputs, max_length=1024, num_beams=5, early_stopping=True)
        translated_text = tokenizer.decode(outputs[0], skip_special_tokens=True)
        return translated_text
    except Exception as e:
        logging.error(f"Translation error: {str(e)}")
        raise ValueError("Translation from Russian to English failed.")

# Check if the word exists in the English dictionary
def check_word_in_dictionary(word):
    try:
        response = requests.get(f"https://api.dictionaryapi.dev/api/v2/entries/en/{word}")
        return response.status_code == 200
    except Exception as e:
        logging.error(f"API call error: {str(e)}")
        return False

# Check the percentage of English words
def check_english_percentage(user_text):
    words = user_text.split()
    total_words = len(words)
    
    if total_words == 0:
        return False
    
    found_count = 0
    
    for word in words:
        if check_word_in_dictionary(word):
            found_count += 1
    
    percentage = (found_count / total_words) * 100
    logging.info(f"English word percentage: {percentage:.2f}%")
    return percentage > 50

def main():
    if len(sys.argv) != 4:
        print(json.dumps({"error": "Usage: python test.py <user_text> <field> <selected_language> "}))
        sys.exit(1)
    
    user_text = sys.argv[2]
    field = sys.argv[3]
    selected_language = sys.argv[1]
    
    original_user_text = user_text  # Save the original user text for printing later
    
    # Check the language and handle translation if necessary
    if selected_language.lower() == 'hindi':
        try:
            user_text = translate_to_tamil(user_text)
        except Exception as e:
            print(json.dumps({"error": str(e)}))
            sys.exit(1)
    
    elif selected_language.lower() == 'russian':
        try:
            user_text = translate_russian_to_english(user_text)
            # Check if the translated word exists in the dictionary
            if check_english_percentage(user_text):
                field = "Chapter_Eng"
            else:
                field = "Chapter"
        except Exception as e:
            print(json.dumps({"error": str(e)}))
            sys.exit(1)
    
    try:
        result = process_input(user_text, field)
        print(json.dumps(result))  # Ensure this is the only output
    except Exception as e:
        logging.error(f"Error in main: {str(e)}")
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    main()
