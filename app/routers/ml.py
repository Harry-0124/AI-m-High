from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import pickle
import numpy as np
from pathlib import Path

router = APIRouter()

# ---------- Request Model ----------
class PredictRequest(BaseModel):
    features: dict

# ---------- Load Model ----------
MODEL_PATH = Path(__file__).resolve().parents[2] / "ml" / "model.pkl"
model_bundle = None

def load_model():
    global model_bundle
    if model_bundle is None:
        if not MODEL_PATH.exists():
            raise HTTPException(status_code=404, detail="Model file not found")
        with open(MODEL_PATH, "rb") as f:
            model_bundle = pickle.load(f)
    return model_bundle


# ---------- Route ----------
@router.post("/predict_price")
async def predict_price(req: PredictRequest):
    try:
        bundle = load_model()
        features = bundle["features"]

        # Build feature vector in correct order
        x = [req.features.get(f, 0.0) for f in features]
        x = np.array(x, dtype=float).reshape(1, -1)

        # Apply preprocessing
        x = bundle["imputer"].transform(x)
        x = bundle["scaler"].transform(x)

        # Weighted ensemble prediction
        rf = bundle["models"]["rf"]
        gb = bundle["models"]["gb"]
        w_rf = bundle["weights"]["rf"]
        w_gb = bundle["weights"]["gb"]

        pred = w_rf * rf.predict(x)[0] + w_gb * gb.predict(x)[0]
        return {"predicted_price": round(float(pred), 2)}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
