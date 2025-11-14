from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings

# Global client & database
client = None
db = None

# ✅ Connect to Mongo
async def connect_to_mongo():
    global client, db
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.DB_NAME]
    print("✅ Connected to MongoDB")


# ✅ Disconnect from Mongo
async def close_mongo_connection():
    global client
    if client:
        client.close()
        print("❌ MongoDB connection closed")


# ✅ Dependency for routes
async def get_database():
    global db
    if db is None:
        raise RuntimeError("Database not initialized. Did you call connect_to_mongo()?")
    return db
