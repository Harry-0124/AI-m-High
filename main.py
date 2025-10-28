from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from datetime import datetime
import hashlib
from typing import List, Optional
from pymongo import MongoClient
import os

app = FastAPI()

# MongoDB configuration
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "competitor_tracker")

# Connect to MongoDB
client = MongoClient(MONGODB_URL)
db = client[DATABASE_NAME]

# Collections
users_collection = db["users"]
analyses_collection = db["analyses"]
products_collection = db["products"]

# Models
class User(BaseModel):
    email: str
    password: str

class PriceAnalysisRequest(BaseModel):
    current_price: float
    predicted_price: float
    competitor_price: float
    actual_cost: float

class Product(BaseModel):
    website: str
    product_name: str
    price: str
    rating: str
    reviews: str
    link: str
    timestamp: str
    brand: str
    category: str

class ProductResponse(Product):
    id: str

# Simple password hashing
def hash_password(password: str) -> str:
    return hashlib.md5(password.encode()).hexdigest()

# Initialize products data in MongoDB
def initialize_products():
    if products_collection.count_documents({}) == 0:
        products_data = [
            {
                "website": "Amazon",
                "product_name": "Samsung Galaxy Watch 7 Classic 46mm Bluetooth",
                "price": "₹32,999",
                "rating": "4.5",
                "reviews": "2,450 ratings",
                "link": "https://www.amazon.in/Samsung-Galaxy-Watch-Classic-Bluetooth/dp/B0D4X8KJ9P/",
                "timestamp": "2025-10-27T18:30:00.000000",
                "brand": "Samsung",
                "category": "Smartwatch"
            },
            {
                "website": "Flipkart",
                "product_name": "Noise ColorFit Pulse 2 Max 1.85\" Display Smart Watch",
                "price": "₹2,499",
                "rating": "4.1",
                "reviews": "18,542 ratings",
                "link": "https://www.flipkart.com/noise-colorfit-pulse-2-max-1-85-display-smart-watch/p/itm856d892337bc4",
                "timestamp": "2025-10-27T18:31:00.000000",
                "brand": "Noise",
                "category": "Smartwatch"
            },
            {
                "website": "Amazon",
                "product_name": "Fire-Boltt Ninja Call Pro Plus 1.83\" Smart Watch",
                "price": "₹1,799",
                "rating": "4.0",
                "reviews": "12,345 ratings",
                "link": "https://www.amazon.in/Fire-Boltt-Ninja-Call-Pro-Plus/dp/B0D5Y7L9KQ/",
                "timestamp": "2025-10-27T18:32:00.000000",
                "brand": "Fire-Boltt",
                "category": "Smartwatch"
            },
            {
                "website": "Reliance Digital",
                "product_name": "Garmin Venu 3 GPS Smartwatch with AMOLED Display",
                "price": "₹49,999",
                "rating": "4.6",
                "reviews": "Available in stores",
                "link": "https://www.reliancedigital.in/garmin-venu-3-gps-smartwatch-amoled-display/p/8584977",
                "timestamp": "2025-10-27T18:33:00.000000",
                "brand": "Garmin",
                "category": "Smartwatch"
            },
            {
                "website": "Croma",
                "product_name": "Fitbit Versa 4 Health & Fitness Smartwatch",
                "price": "₹22,999",
                "rating": "4.3",
                "reviews": "Store ratings available",
                "link": "https://www.croma.com/fitbit-versa-4-health-fitness-smartwatch/p/309466",
                "timestamp": "2025-10-27T18:34:00.000000",
                "brand": "Fitbit",
                "category": "Smartwatch"
            },
            {
                "website": "Amazon",
                "product_name": "boAt Wave Flex Connect 1.69\" Smart Watch",
                "price": "₹1,499",
                "rating": "4.2",
                "reviews": "45,678 ratings",
                "link": "https://www.amazon.in/boAt-Wave-Flex-Connect-Smartwatch/dp/B0D6Z8M9LP/",
                "timestamp": "2025-10-27T18:35:00.000000",
                "brand": "boAt",
                "category": "Smartwatch"
            },
            {
                "website": "Flipkart",
                "product_name": "Amazfit GTS 4 Mini Smart Watch with GPS",
                "price": "₹8,999",
                "rating": "4.4",
                "reviews": "7,890 ratings",
                "link": "https://www.flipkart.com/amazfit-gts-4-mini-smart-watch-gps/p/itm867d892337bc5",
                "timestamp": "2025-10-27T18:36:00.000000",
                "brand": "Amazfit",
                "category": "Smartwatch"
            },
            {
                "website": "Amazon",
                "product_name": "Fossil Gen 6 Wellness Edition Smartwatch",
                "price": "₹19,999",
                "rating": "4.3",
                "reviews": "3,210 ratings",
                "link": "https://www.amazon.in/Fossil-Gen-6-Wellness-Edition/dp/B0D7A9N8MQ/",
                "timestamp": "2025-10-27T18:37:00.000000",
                "brand": "Fossil",
                "category": "Smartwatch"
            },
            {
                "website": "Reliance Digital",
                "product_name": "OnePlus Watch 2 with Sapphire Glass",
                "price": "₹24,999",
                "rating": "4.2",
                "reviews": "Available in stores",
                "link": "https://www.reliancedigital.in/oneplus-watch-2-sapphire-glass/p/8584978",
                "timestamp": "2025-10-27T18:38:00.000000",
                "brand": "OnePlus",
                "category": "Smartwatch"
            },
            {
                "website": "Croma",
                "product_name": "Realme Watch 3 Pro Smartwatch with SpO2 Monitor",
                "price": "₹4,999",
                "rating": "4.0",
                "reviews": "Store ratings available",
                "link": "https://www.croma.com/realme-watch-3-pro-smartwatch-spo2-monitor/p/309467",
                "timestamp": "2025-10-27T18:39:00.000000",
                "brand": "Realme",
                "category": "Smartwatch"
            }
        ]
        products_collection.insert_many(products_data)

# Initialize products on startup
initialize_products()

# Health check
@app.get("/health")
def health_check():
    total_products = products_collection.count_documents({})
    total_brands = len(products_collection.distinct("brand"))
    
    return {
        "status": "ok", 
        "timestamp": datetime.now().isoformat(),
        "total_products": total_products,
        "total_brands": total_brands,
        "database": DATABASE_NAME
    }

# Sign up
@app.post("/signup")
def signup(user: User):
    # Check if user exists
    existing_user = users_collection.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already exists")
    
    # Add user
    user_data = {
        "email": user.email,
        "password": hash_password(user.password),
        "created_at": datetime.now()
    }
    result = users_collection.insert_one(user_data)
    return {"id": str(result.inserted_id), "email": user.email, "message": "User created"}

# Login
@app.post("/login")
def login(user: User):
    user_data = users_collection.find_one({
        "email": user.email, 
        "password": hash_password(user.password)
    })
    if user_data:
        return {"message": "Login successful", "email": user.email}
    raise HTTPException(status_code=400, detail="Invalid credentials")

# Analyze price
@app.post("/analyze-price")
def analyze_price(request: PriceAnalysisRequest):
    # Simple calculation
    recommended_price = (request.current_price + request.competitor_price) / 2
    
    # Ensure it's above cost
    if recommended_price < request.actual_cost:
        recommended_price = request.actual_cost * 1.2
    
    analysis_data = {
        "current_price": request.current_price,
        "competitor_price": request.competitor_price,
        "actual_cost": request.actual_cost,
        "recommended_price": round(recommended_price, 2),
        "analysis": f"Recommended price: {recommended_price:.2f} based on market average",
        "timestamp": datetime.now()
    }
    result = analyses_collection.insert_one(analysis_data)
    analysis_data["id"] = str(result.inserted_id)
    
    return analysis_data

# Get analysis history
@app.get("/analysis-history")
def get_analysis_history():
    analyses = list(analyses_collection.find().sort("timestamp", -1))
    for analysis in analyses:
        analysis["id"] = str(analysis["_id"])
        del analysis["_id"]
    return analyses

# Products endpoints
@app.get("/products", response_model=List[ProductResponse])
def get_products(
    category: Optional[str] = None,
    brand: Optional[str] = None,
    website: Optional[str] = None
):
    """Get all products, optionally filtered by category, brand, or website"""
    query = {}
    if category:
        query["category"] = {"$regex": f"^{category}$", "$options": "i"}
    if brand:
        query["brand"] = {"$regex": f"^{brand}$", "$options": "i"}
    if website:
        query["website"] = {"$regex": f"^{website}$", "$options": "i"}
    
    products = list(products_collection.find(query))
    for product in products:
        product["id"] = str(product["_id"])
        del product["_id"]
    return products

@app.get("/products/{product_id}", response_model=ProductResponse)
def get_product(product_id: str):
    """Get a specific product by ID"""
    from bson.objectid import ObjectId
    try:
        product = products_collection.find_one({"_id": ObjectId(product_id)})
        if product:
            product["id"] = str(product["_id"])
            del product["_id"]
            return product
        raise HTTPException(status_code=404, detail="Product not found")
    except:
        raise HTTPException(status_code=400, detail="Invalid product ID")

@app.get("/products/brands")
def get_brands():
    """Get all available product brands"""
    brands = products_collection.distinct("brand")
    return {"brands": sorted(brands)}

@app.get("/products/categories")
def get_categories():
    """Get all available product categories"""
    categories = products_collection.distinct("category")
    return {"categories": sorted(categories)}

@app.get("/products/websites")
def get_websites():
    """Get all available websites"""
    websites = products_collection.distinct("website")
    return {"websites": sorted(websites)}

@app.get("/products/price-analysis/{product_id}")
def analyze_product_price(product_id: str):
    """Get automated price analysis for a specific product"""
    from bson.objectid import ObjectId
    try:
        product = products_collection.find_one({"_id": ObjectId(product_id)})
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        
        # Extract numeric price from string (remove ₹ and commas)
        price_str = product["price"].replace('₹', '').replace(',', '').strip()
        try:
            current_price = float(price_str)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid price format")
        
        # Get competitor prices (other products in same category)
        competitors = list(products_collection.find({
            "category": product["category"],
            "brand": {"$ne": product["brand"]}
        }).limit(3))
        
        competitor_prices = []
        for comp in competitors:
            try:
                comp_price = float(comp["price"].replace('₹', '').replace(',', '').strip())
                competitor_prices.append(comp_price)
            except ValueError:
                continue
        
        if competitor_prices:
            avg_competitor_price = sum(competitor_prices) / len(competitor_prices)
            min_competitor_price = min(competitor_prices)
            max_competitor_price = max(competitor_prices)
        else:
            avg_competitor_price = current_price * 0.9  # Default fallback
            min_competitor_price = current_price * 0.8
            max_competitor_price = current_price * 1.1
        
        # Calculate recommended price
        recommended_price = (current_price + avg_competitor_price) / 2
        if recommended_price < current_price * 0.7:  # Don't go too low
            recommended_price = current_price * 0.85
        
        # Determine pricing strategy
        if current_price > max_competitor_price:
            strategy = "Premium pricing - above competitors"
        elif current_price < min_competitor_price:
            strategy = "Competitive pricing - below competitors"
        else:
            strategy = "Market average pricing"
        
        product["id"] = str(product["_id"])
        del product["_id"]
        
        return {
            "product": product,
            "current_price": current_price,
            "avg_competitor_price": round(avg_competitor_price, 2),
            "min_competitor_price": round(min_competitor_price, 2),
            "max_competitor_price": round(max_competitor_price, 2),
            "recommended_price": round(recommended_price, 2),
            "competitors_analyzed": len(competitor_prices),
            "pricing_strategy": strategy,
            "analysis": f"Based on {len(competitor_prices)} competitors in {product['category']} category. {strategy}."
        }
    except:
        raise HTTPException(status_code=400, detail="Invalid product ID")

# Root
@app.get("/")
def root():
    total_products = products_collection.count_documents({})
    total_brands = len(products_collection.distinct("brand"))
    total_categories = len(products_collection.distinct("category"))
    
    return {
        "message": "Competitor Price Tracker API is running",
        "database": DATABASE_NAME,
        "total_products": total_products,
        "total_brands": total_brands,
        "total_categories": total_categories
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)