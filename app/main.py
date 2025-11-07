from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db import connect_to_mongo, close_mongo_connection
from app.utils.scheduler import start_scheduler, scheduler

# Import all routers
from app.routers import (
    ml,
    llm,
    products,
    auth,
    admin_products,
    alerts,
    static_scraper
)

# ---------- Initialize App ----------
app = FastAPI(title="Real-Time Competitor Backend (Enhanced)")

# ---------- CORS Configuration ----------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # You can later restrict to your frontend domain
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- Include Routers ----------
# ✅ Fixed all duplicate prefix issues
app.include_router(ml.router, prefix="/api/ml", tags=["ML"])
app.include_router(llm.router, prefix="/api/llm", tags=["LLM"])
app.include_router(products.router, prefix="/api/products", tags=["Products"])
app.include_router(auth.router)  # router already has /api/auth prefix
app.include_router(admin_products.router)  # router already has /api/admin prefix
app.include_router(alerts.router)  # router already has prefix /api/alerts
app.include_router(static_scraper.router, prefix="/api/static", tags=["Static Scraper"])

# ---------- Startup & Shutdown Events ----------
@app.on_event("startup")
async def on_startup():
    await connect_to_mongo()
    start_scheduler()  # background alert job
    print("🚀 Server Started Successfully!")

@app.on_event("shutdown")
async def on_shutdown():
    await close_mongo_connection()
    scheduler.shutdown(wait=False)
    print("🛑 Server Shutdown Complete.")

# ---------- Root Route ----------
@app.get("/")
async def root():
    return {
        "message": "Real-Time Competitor Backend (Enhanced) - ML, LLM, Alerts, Static Scraper Active"
    }
