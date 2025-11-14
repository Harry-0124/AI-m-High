from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import pickle
import numpy as np
from pathlib import Path
import pymongo
from app.config import settings
from datetime import datetime


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
    
    # ---------- NEW ROUTE: Predict from scraped_data ----------
@router.post("/predict_from_db")
async def predict_from_scraped_data():
    """
    Reads all documents from 'scraped_data',
    predicts prices using the trained ML model,
    and stores results in 'predicted_data'.
    """
    try:
        # Connect to MongoDB
        client = pymongo.MongoClient(settings.MONGODB_URI)
        db = client[settings.DB_NAME]
        scraped_collection = db["scraped_data"]
        predicted_collection = db["predicted_data"]

        # Load model
        bundle = load_model()
        features = bundle["features"]

        rf = bundle["models"]["rf"]
        gb = bundle["models"]["gb"]
        w_rf = bundle["weights"]["rf"]
        w_gb = bundle["weights"]["gb"]
        imputer = bundle["imputer"]
        scaler = bundle["scaler"]

        # Fetch scraped data
        scraped_data = list(scraped_collection.find({}))
        if not scraped_data:
            return {"message": "No scraped data found in database."}

        predictions = []
        for record in scraped_data:
            try:
                rating = float(record.get("rating", 4.5))
                reviews_text = record.get("reviews", "1000")
                reviews = float("".join(filter(str.isdigit, reviews_text)) or 1000)

                # Build feature vector in correct order
                x = [0.0] * len(features)
                for i, f in enumerate(features):
                    if f == "rating":
                        x[i] = rating
                    elif f == "reviews":
                        x[i] = reviews

                x = np.array(x, dtype=float).reshape(1, -1)
                x = imputer.transform(x)
                x = scaler.transform(x)

                predicted_price = w_rf * rf.predict(x)[0] + w_gb * gb.predict(x)[0]

                record["predicted_price"] = round(float(predicted_price), 2)
                record["prediction_time"] = datetime.now().isoformat()
                predictions.append(record)
            except Exception as sub_e:
                print(f"⚠️ Skipping one record due to error: {sub_e}")

        # Insert predictions into MongoDB
        if predictions:
            predicted_collection.insert_many(predictions)
            client.close()
            return {
                "status": "success",
                "message": f"{len(predictions)} predictions stored in 'predicted_data'."
            }
        else:
            client.close()
            return {"status": "warning", "message": "No predictions generated."}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/get_predicted_data")
async def get_predicted_data():
    import pymongo
    from app.config import settings

    client = pymongo.MongoClient(settings.MONGODB_URI)
    db = client[settings.DB_NAME]

    data = list(db["predicted_data"].find({}, {"_id": 0}))  # hide Mongo IDs

    client.close()
    return data
