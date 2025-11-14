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
# ---------- Include Routers ----------
app.include_router(ml.router, prefix="/ml", tags=["ML"])
app.include_router(llm.router, prefix="/llm", tags=["LLM"])
app.include_router(products.router, prefix="/products", tags=["Products"])
app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(admin_products.router, prefix="/admin", tags=["Admin"])
app.include_router(alerts.router, prefix="/alerts", tags=["Alerts"])
app.include_router(static_scraper.router, prefix="/static_scraper", tags=["Scraper"])

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
