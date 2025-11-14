import pandas as pd
import pickle
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

with open('ml/model.pkl', 'rb') as f:
    model = pickle.load(f)

ref_data = pd.read_csv('ml/watches.csv')
encoded = pd.get_dummies(ref_data, columns=['brand', 'model', 'connectivity', 'build_material'])
ref_columns = encoded.drop('price', axis=1).columns.tolist()

@app.route('/', methods=['GET'])
def home():
    return "ML Price Prediction API is running."

@app.route('/predict', methods=['POST'])
def predict():
    content = request.json

    brand = content.get('brand', '')
    category = content.get('category', '')
    battery_mah = float(content.get('battery_mah', 200))
    screen_inch = float(content.get('screen_inch', 1.5))

    input_dict = {col: 0 for col in ref_columns}
    input_dict['battery_mah'] = battery_mah
    input_dict['screen_inch'] = screen_inch
    input_dict['ram_gb'] = 0.5
    input_dict['storage_gb'] = 8
    input_dict['waterproof_atm'] = 3
    input_dict['sensors_count'] = 8
    input_dict['rating'] = 4.0
    input_dict['warranty_months'] = 12
    input_dict['release_year'] = 2023

    if f'brand_{brand}' in input_dict:
        input_dict[f'brand_{brand}'] = 1
    if f'model_{category}' in input_dict:
        input_dict[f'model_{category}'] = 1
    if 'connectivity_Bluetooth' in input_dict:
        input_dict['connectivity_Bluetooth'] = 1
    if 'build_material_Titanium' in input_dict:
        input_dict['build_material_Titanium'] = 1

    X_input = pd.DataFrame([input_dict], columns=ref_columns)

    try:
        predicted_price = model.predict(X_input)[0]
    except Exception as e:
        return jsonify({'error': str(e)})

    return jsonify({'predicted_price': int(predicted_price)})

if __name__ == '__main__':
    app.run(debug=True)
