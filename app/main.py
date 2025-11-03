from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db import connect_to_mongo, close_mongo_connection
from app.utils.scheduler import start_scheduler, scheduler
from app.routers import static_scraper

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
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- Include Routers ----------
app.include_router(ml.router, prefix="/api/ml", tags=["ML"])
app.include_router(llm.router, prefix="/api/llm", tags=["LLM"])
app.include_router(products.router, prefix="/api/products", tags=["Products"])
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(admin_products.router, prefix="/api/admin", tags=["Admin"])
app.include_router(alerts.router, prefix="/api/alerts", tags=["Alerts"])
app.include_router(static_scraper.router, prefix="/api/static", tags=["Static Scraper"])


# ---------- Startup & Shutdown Events ----------
@app.on_event("startup")
async def on_startup():
    await connect_to_mongo()
    start_scheduler()  # Start background alert jobs
    print("🚀 Server Started Successfully!")

@app.on_event("shutdown")
async def on_shutdown():
    await close_mongo_connection()
    scheduler.shutdown()
    print("🛑 Server Shutdown Complete.")

# ---------- Root Route ----------
@app.get("/")
async def root():
    return {
        "message": "Real-Time Competitor Backend (Enhanced) - ML, LLM, Alerts, Static Scraper Active"
    }
