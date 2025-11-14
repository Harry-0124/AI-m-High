from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from bson import ObjectId
from datetime import datetime
from app.db import get_database
from app.routers.auth import require_admin

# ---------- Router Initialization ----------
# ✅ All routes here fall under /api/admin
router = APIRouter(prefix="/api/admin", tags=["Admin"])

# ---------- Data Model ----------
class Product(BaseModel):
    name: str
    brand: str
    category: str
    price: float
    description: str | None = None


# ---------- Create Product ----------
@router.post("/products")
async def create_product(data: Product, db=Depends(get_database), user=Depends(require_admin)):
    products = db["products"]
    existing = await products.find_one({"name": data.name})
    if existing:
        raise HTTPException(status_code=400, detail="Product already exists")

    result = await products.insert_one({
        **data.dict(),
        "last_updated": datetime.utcnow()  # add timestamp on creation
    })
    return {"message": "Product added successfully", "product_id": str(result.inserted_id)}


# ---------- Get All Products ----------
@router.get("/products")
async def get_products(db=Depends(get_database), user=Depends(require_admin)):
    products = db["products"]
    data = await products.find().to_list(200)
    for p in data:
        p["_id"] = str(p["_id"])
        # Convert datetime to string for JSON serialization
        if "last_updated" in p and isinstance(p["last_updated"], datetime):
            p["last_updated"] = p["last_updated"].isoformat()
    return {"products": data}


# ---------- Update Product (Triggers Alerts if Price Drops) ----------
@router.put("/products/{product_id}")
async def update_product(product_id: str, data: Product, db=Depends(get_database), user=Depends(require_admin)):
    products = db["products"]

    if not ObjectId.is_valid(product_id):
        raise HTTPException(status_code=400, detail="Invalid product ID")

    old_product = await products.find_one({"_id": ObjectId(product_id)})
    if not old_product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Update with new price, description, and timestamp
    update_data = {
        **data.dict(),
        "last_updated": datetime.utcnow()  # 🕒 mark last change
    }

    await products.update_one({"_id": ObjectId(product_id)}, {"$set": update_data})

    # ✅ If the new price is lower, trigger alerts
    old_price = float(old_product.get("price", float("inf")))
    if data.price < old_price:
        try:
            from app.routers.alerts import check_and_trigger_alerts
            await check_and_trigger_alerts(db, product_id, data.price, data.name)
            print(f"📩 Alert triggered for {data.name}: old ₹{old_price} → new ₹{data.price}")
        except Exception as e:
            print(f"⚠️ Error triggering alerts for {data.name}: {e}")

    return {"message": "Product updated successfully"}


# ---------- Delete Product ----------
@router.delete("/products/{product_id}")
async def delete_product(product_id: str, db=Depends(get_database), user=Depends(require_admin)):
    products = db["products"]

    if not ObjectId.is_valid(product_id):
        raise HTTPException(status_code=400, detail="Invalid product ID")

    result = await products.delete_one({"_id": ObjectId(product_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")

    return {"message": "Product deleted successfully"}
