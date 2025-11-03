from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from bson import ObjectId
from app.db import get_database
from app.routers.auth import require_admin
from app.routers.alerts import check_and_trigger_alerts  # ✅ for instant email alerts

router = APIRouter()

# ---------- MODELS ----------
class Product(BaseModel):
    name: str
    brand: str
    category: str
    price: float
    description: str | None = None


# ---------- ROUTES ----------

# ✅ Create product
@router.post("/admin/products")
async def create_product(data: Product, db=Depends(get_database), user=Depends(require_admin)):
    products = db["products"]

    existing = await products.find_one({"name": data.name})
    if existing:
        raise HTTPException(status_code=400, detail="Product already exists")

    result = await products.insert_one(data.dict())
    return {"message": "Product added successfully", "product_id": str(result.inserted_id)}


# ✅ Get all products
@router.get("/admin/products")
async def get_products(db=Depends(get_database), user=Depends(require_admin)):
    products = db["products"]
    data = await products.find().to_list(100)
    for p in data:
        p["_id"] = str(p["_id"])
    return {"products": data}


# ✅ Update product — triggers email alerts if price drops
@router.put("/admin/products/{product_id}")
async def update_product(product_id: str, data: Product, db=Depends(get_database), user=Depends(require_admin)):
    products = db["products"]

    if not ObjectId.is_valid(product_id):
        raise HTTPException(status_code=400, detail="Invalid product ID")

    old_product = await products.find_one({"_id": ObjectId(product_id)})
    if not old_product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Update product data
    result = await products.update_one({"_id": ObjectId(product_id)}, {"$set": data.dict()})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")

    # ✅ Trigger alert instantly if price dropped
    old_price = old_product.get("price", float("inf"))
    if data.price < old_price:
        try:
            await check_and_trigger_alerts(db, product_id, data.price, data.name)
            print(f"📩 Alert triggered for {data.name}: old ₹{old_price} → new ₹{data.price}")
        except Exception as e:
            print(f"⚠️ Error triggering alerts for {data.name}: {e}")

    return {"message": "Product updated successfully"}


# ✅ Delete product
@router.delete("/admin/products/{product_id}")
async def delete_product(product_id: str, db=Depends(get_database), user=Depends(require_admin)):
    products = db["products"]

    if not ObjectId.is_valid(product_id):
        raise HTTPException(status_code=400, detail="Invalid product ID")

    result = await products.delete_one({"_id": ObjectId(product_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")

    return {"message": "Product deleted successfully"}
