import pickle, numpy as np
from pathlib import Path

MODEL_PATH = Path(__file__).resolve().parents[2] / 'ml' / 'model.pkl'
_bundle = None

def load_model_bundle():
    global _bundle
    if _bundle is None:
        with open(MODEL_PATH, 'rb') as f:
            _bundle = pickle.load(f)
    return _bundle
