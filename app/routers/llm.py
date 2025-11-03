# app/routers/llm.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import google.generativeai as genai
from app.config import settings

router = APIRouter()

class LLMRequest(BaseModel):
    query: str

# ✅ Configure Gemini API
genai.configure(api_key=settings.GEMINI_API_KEY)

@router.post("/insight")
async def get_llm_insight(req: LLMRequest):
    """
    Generates AI insights using Google's Gemini 2.5 model.
    Example: Compare smartwatches, suggest pricing strategy, etc.
    """
    try:
        model = genai.GenerativeModel("models/gemini-2.5-flash")
        response = model.generate_content(req.query)

        return {
            "query": req.query,
            "insight": response.text.strip() if hasattr(response, "text") else str(response)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM error: {str(e)}")
