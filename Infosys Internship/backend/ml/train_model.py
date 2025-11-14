import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
import pickle

# Load and encode data
data = pd.read_csv('ml/watches.csv')
data_encoded = pd.get_dummies(data, columns=['brand', 'model', 'connectivity', 'build_material'])
X = data_encoded.drop('price', axis=1)
y = data_encoded['price']

X_train, X_test, y_train, y_test = train_test_split(X, y, random_state=42)
model = RandomForestRegressor(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

# Save ONLY the trained model object (not a dict)
with open('ml/model.pkl', 'wb') as f:
    pickle.dump(model, f)
