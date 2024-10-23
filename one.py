import sys
import json
from pymongo import MongoClient
from googletrans import Translator

# Function to translate Tamil text to English
def translate_text(tamil_text):
    translator = Translator()
    translation = translator.translate(tamil_text, src='ta', dest='en')
    return translation.text

def update_verses_with_translation():
    # Connect to MongoDB
    client = MongoClient("mongodb://127.0.0.1:27017/")
    db = client['CHATBOT']
    collection = db['DETAIL1']

    # Fetch all documents
    documents = collection.find()

    for document in documents:
        tamil_verse = document.get('verse')
        if tamil_verse:
            try:
                # Translate the Tamil verse to English
                translated_verse = translate_text(tamil_verse)

                # Update the document with the new field
                collection.update_one(
                    {'_id': document['_id']},
                    {'$set': {'verse_eng': translated_verse}}
                )
                print(f"Updated verse for document ID {document['_id']}: {translated_verse}")
            except Exception as e:
                print(f"Error translating verse for document ID {document['_id']}: {e}")

if __name__ == '__main__':
    update_verses_with_translation()

#https://huggingface.co/datasets/aitamilnadu/thirukkural_instruct?row=32