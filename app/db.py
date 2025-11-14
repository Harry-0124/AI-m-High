from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings

client: AsyncIOMotorClient | None = None
db = None

# ---------- Connect ----------
async def connect_to_mongo():
    global client, db
    if client is None:
        client = AsyncIOMotorClient(settings.MONGODB_URI)
        db = client[settings.DB_NAME]
        print("✅ Connected to MongoDB")

# ---------- Disconnect ----------
async def close_mongo_connection():
    global client
    if client:
        client.close()
        print("❌ MongoDB connection closed")

# ---------- Dependency ----------
async def get_database():
    """Lazy init for background jobs."""
    global db
    if db is None:
        await connect_to_mongo()
    return db
