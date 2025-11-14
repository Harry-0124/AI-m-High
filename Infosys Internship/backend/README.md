# Real-Time Competitor Backend (minimal)
This package includes a minimal FastAPI backend with:
- ML endpoint `/api/ml/predict_price` using an ensemble (RandomForest + GradientBoosting)
- LLM placeholder endpoint `/api/llm/price_insight`
- Minimal product/auth/admin route stubs
- Trained model saved at `ml/model.pkl`

## How to run (locally)
1. Create a venv and install dependencies:
   ```bash
   python -m venv venv
   venv\Scripts\activate    # Windows
   pip install -r requirements.txt
   ```
2. Start the server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
3. Test the ML endpoint:
   ```bash
   POST http://localhost:8000/api/ml/predict_price
   Body: { "features": { "<feature_name>": value, ... } }
   ```
