from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

class User(BaseModel):
    email: str
    password: str

class UserInDB(User):
    id: Optional[str] = None
    created_at: datetime = datetime.utcnow()

class UserResponse(BaseModel):
    id: str
    email: str
    created_at: datetime

class LoginRequest(BaseModel):
    email: str
    password: str

class PriceAnalysisRequest(BaseModel):
    current_price: float
    predicted_price: float
    competitor_price: float
    actual_cost: float

class PriceAnalysisResponse(BaseModel):
    recommended_price: float
    analysis: str

class CompetitorData(BaseModel):
    brand: str
    model: str
    price: float
    features: dict
    timestamp: datetime = datetime.utcnow()