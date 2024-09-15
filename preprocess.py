import json
from datetime import datetime

# Load the JSON file with UTF-8 encoding
def load_json(file_path):
    with open(file_path, 'r', encoding='utf-8') as file:
        return json.load(file)

# Save the JSON file with UTF-8 encoding
def save_json(data, file_path):
    with open(file_path, 'w', encoding='utf-8') as file:
        json.dump(data, file, indent=4, ensure_ascii=False)

# Flatten nested JSON
def flatten_json(y):
    out = {}
    
    def flatten(x, name=''):
        if type(x) is dict:
            for a in x:
                flatten(x[a], name + a + '_')
        elif type(x) is list:
            i = 0
            for a in x:
                flatten(a, name + str(i) + '_')
                i += 1
        else:
            out[name[:-1]] = x

    flatten(y)
    return out

# Clean and preprocess the data
def preprocess_data(data):
    def clean_string(s):
        if isinstance(s, str):
            # Remove leading/trailing whitespace and normalize spaces
            return ' '.join(s.strip().split())
        return s

    # Remove duplicates
    data = [dict(t) for t in {tuple(d.items()) for d in data}]
    
    # Handle missing values and normalize data
    for entry in data:
        # Clean string fields
        for key, value in entry.items():
            entry[key] = clean_string(value)
        
        # Example of handling missing values
        if 'key' not in entry:
            entry['key'] = 'default_value'
        
        # Example of normalizing date formats
        if 'date' in entry:
            try:
                entry['date'] = datetime.strptime(entry['date'], '%Y-%m-%d').isoformat()
            except ValueError:
                entry['date'] = 'Invalid_date_format'
        
        # Example of converting a string to a numerical value
        if 'numeric_string' in entry:
            try:
                entry['numeric_value'] = float(entry['numeric_string'])
                del entry['numeric_string']
            except ValueError:
                entry['numeric_value'] = None

    # Flatten nested structures
    data = [flatten_json(entry) for entry in data]
    
    return data

# Main function
def main():
    input_file = 'data.json'
    output_file = 'preprocessed_file.json'
    
    # Load data
    data = load_json(input_file)
    
    # Preprocess data
    preprocessed_data = preprocess_data(data)
    
    # Save preprocessed data
    save_json(preprocessed_data, output_file)
    print("Data preprocessing complete. Saved to", output_file)

if __name__ == "__main__":
    main()
