# app/routers/llm.py
from fastapi import APIRouter
from pydantic import BaseModel
import google.generativeai as genai
from app.config import settings

router = APIRouter()

class LLMRequest(BaseModel):
    query: str

# ✅ Configure Gemini API
genai.configure(api_key=settings.GEMINI_API_KEY)

def _generate_insight_text(query: str) -> dict:
    try:
        model = genai.GenerativeModel("models/gemini-2.5-flash")
        response = model.generate_content(query)
        text = response.text.strip() if hasattr(response, "text") else str(response)
        return {"success": True, "query": query, "insight": text}
    except Exception as e:
        return {"success": False, "query": query, "error": f"LLM error: {str(e)}"}

@router.post("/insight")
async def get_llm_insight(req: LLMRequest):
    """
    Generates AI insights using Google's Gemini 2.5 model.
    """
    return _generate_insight_text(req.query)

# Alias endpoint for milestone compatibility
@router.post("/generate")
async def generate_llm(req: LLMRequest):
    return _generate_insight_text(req.query)
