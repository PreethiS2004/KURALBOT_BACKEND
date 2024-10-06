from flask import Flask, request, jsonify
import nltk
from nltk.corpus import words

# Download the 'words' corpus if you haven't already
nltk.download('words')

# Create a set of English words for fast lookup
english_words = set(words.words())

app = Flask(__name__)

@app.route('/isenglish', methods=['GET'])
def is_english():
    word = request.args.get('word', '')
    # Check if the word exists in the English word corpus
    if word.lower() in english_words:
        return jsonify({"isEnglish": True})
    else:
        return jsonify({"isEnglish": False})

if __name__ == '__main__':
    app.run(debug=True)
