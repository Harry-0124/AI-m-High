import google.generativeai as genai
from app.config import settings

# Configure Gemini
genai.configure(api_key=settings.GEMINI_API_KEY)

# List models
print("🔍 Fetching available Gemini models...\n")
for m in genai.list_models():
    print(m.name)
