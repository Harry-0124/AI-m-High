from fastapi import APIRouter, HTTPException
import pymongo
from app.config import settings
from datetime import datetime
import google.generativeai as genai
import pymongo
from app.config import settings


router = APIRouter()

# Configure Gemini
genai.configure(api_key=settings.GEMINI_API_KEY)

model = genai.GenerativeModel("gemini-1.5-flash")


@router.post("/llm_predict_prices")
async def llm_predict_prices():
    """
    1. Fetch all ML predictions from 'predicted_data'
    2. Ask Gemini to generate final selling price
    3. Save LLM predicted price back into same document
    """

    try:
        # ---------- MongoDB Connect ----------
        client = pymongo.MongoClient(settings.MONGODB_URI)
        db = client[settings.DB_NAME]
        predicted_collection = db["predicted_data"]

        # Fetch all docs that don't have LLM price yet
        records = list(predicted_collection.find({
            "llm_predicted_price": {"$exists": False}
        }))

        if not records:
            return {"message": "No records found without LLM prediction."}

        updates = 0

        for record in records:
            predicted_price = record.get("predicted_price")
            competitor_price = record.get("price")

            # Clean competitor price (₹45,999 → 45999)
            import re
            competitor_price_clean = int(re.sub(r"[^\d]", "", competitor_price))

            # ------- Build Prompt -------
            prompt = (
                f"This is my ML model prediction {predicted_price}, "
                f"This is my competitor product cost {competitor_price_clean}. "
                f"Now tell me what should I keep the selling price so that I can be profitable "
                f"and give me only the price nothing else."
            )

            # ------- Gemini Response -------
            response = model.generate_content(prompt)
            llm_price = response.text.strip()

            # Clean Gemini output (keep digits only)
            llm_price_clean = int(re.sub(r"[^\d]", "", llm_price))

            # ------- Update MongoDB -------
            predicted_collection.update_one(
                {"_id": record["_id"]},
                {"$set": {
                    "llm_predicted_price": llm_price_clean,
                    "llm_prediction_time": datetime.now().isoformat()
                }}
            )
            updates += 1

        client.close()

        return {
            "status": "success",
            "message": f"LLM-based prices updated for {updates} products."
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 👉 ADD THIS GET METHOD BELOW
@router.get("/get_llm_predictions")
async def get_llm_predictions():
    import pymongo
    from app.config import settings

    client = pymongo.MongoClient(settings.MONGODB_URI)
    db = client[settings.DB_NAME]

    # Get only documents where LLM prediction exists
    data = list(db["predicted_data"].find(
        {"llm_predicted_price": {"$exists": True}},
        {"_id": 0}
    ))

    client.close()
    return data
