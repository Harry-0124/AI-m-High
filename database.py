import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

class MongoDB:
    def __init__(self):
        self.client = None
        self.database = None
        self.is_connected = False
    
    def connect(self):
        try:
            # Get MongoDB URL from environment or use default
            mongodb_url = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
            print(f"🔗 Attempting to connect to MongoDB: {mongodb_url}")
            
            self.client = MongoClient(
                mongodb_url,
                serverSelectionTimeoutMS=5000
            )
            
            # Test connection with a simple command
            self.client.admin.command('ping')
            
            database_name = os.getenv("DATABASE_NAME", "competitor_tracker")
            self.database = self.client[database_name]
            self.is_connected = True
            
            print(f"✅ Successfully connected to MongoDB: {mongodb_url}")
            print(f"✅ Using database: {database_name}")
            
            # Ensure indexes
            self._ensure_indexes()
            
        except Exception as e:
            print(f"❌ MongoDB connection failed: {e}")
            self.is_connected = False
            # Don't raise the exception, just log it
            print("⚠️  Application will continue with limited functionality")
    
    def _ensure_indexes(self):
        """Create necessary indexes for performance"""
        try:
            self.database.users.create_index("email", unique=True)
            self.database.price_analyses.create_index([("timestamp", -1)])
            print("✅ Database indexes ensured")
        except Exception as e:
            print(f"⚠️ Index creation warning: {e}")
    
    def close(self):
        if self.client:
            self.client.close()
            self.is_connected = False
            print("✅ MongoDB connection closed")
    
    def get_collection(self, collection_name: str):
        if not self.is_connected or not self.database:
            raise Exception("Database not connected. Call connect() first.")
        return self.database[collection_name]

# Global database instance
mongodb = MongoDB()