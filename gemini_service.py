import os
from dotenv import load_dotenv

load_dotenv()

class GeminiService:
    def __init__(self):
        # No API key required for mock service
        pass
    
    async def analyze_pricing(self, current_price: float, predicted_price: float, 
                           competitor_price: float, actual_cost: float) -> dict:
        # Mock analysis logic
        margin = (current_price - actual_cost) / actual_cost * 100
        
        if margin < 20:
            recommended_price = actual_cost * 1.25  # Ensure 25% margin
        elif competitor_price < current_price:
            recommended_price = competitor_price * 0.98  # Price slightly below competitor
        else:
            recommended_price = (current_price + predicted_price) / 2  # Average of current and predicted
        
        # Ensure price is above cost
        recommended_price = max(recommended_price, actual_cost * 1.1)
        
        analysis = f"""
        Analysis:
        - Current margin: {margin:.1f}%
        - Competitor price: {competitor_price} rupees
        - Recommended price ensures profitability while remaining competitive
        - Price positioned {('below' if recommended_price < competitor_price else 'above')} competitor
        """
        
        return {
            "recommended_price": round(recommended_price, 2),
            "analysis": analysis.strip()
        }

gemini_service = GeminiService()