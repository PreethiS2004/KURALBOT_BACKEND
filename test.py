import sys
import json
from transformers import AutoTokenizer, AutoModel
import torch

# Load the MuRIL BERT model and tokenizer
model_name = "google/muril-base-cased"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModel.from_pretrained(model_name)

def generate_embeddings(text):
    inputs = tokenizer(text, padding=True, truncation=True, return_tensors="pt", max_length=512)
    with torch.no_grad():
        outputs = model(**inputs)
    embeddings = outputs.last_hidden_state.mean(dim=1).numpy()
    return embeddings.tolist()

def main():
    if len(sys.argv) != 3:
        print("Usage: python test.py <text> <field>")
        sys.exit(1)
    
    input_text = sys.argv[1]
    field = sys.argv[2]
    
    embeddings = generate_embeddings([input_text])
    print(json.dumps({"embeddings": embeddings, "field": field}))

if __name__ == "__main__":
    main()
