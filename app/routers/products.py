from fastapi import APIRouter, Depends, HTTPException
from app.db import get_database

router = APIRouter()

@router.get("/")
async def list_products(db=Depends(get_database)):
    products_collection = db["products"]
    products = await products_collection.find().to_list(100)
    
    # Convert ObjectId to string
    for p in products:
        p["_id"] = str(p["_id"])

    return {"count": len(products), "products": products}
