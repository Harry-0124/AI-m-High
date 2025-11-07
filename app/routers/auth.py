from fastapi import APIRouter, HTTPException, Depends, Security
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext
from app.db import get_database
from app.utils.jwt_handler import create_access_token, decode_jwt_token_raw

router = APIRouter(prefix="/api/auth", tags=["Auth"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

# ---------- MODELS ----------
class Signup(BaseModel):
    email: EmailStr
    password: str
    role: str = "user"

class Login(BaseModel):
    email: EmailStr
    password: str

# ---------- HELPERS ----------
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    return decode_jwt_token_raw(token)

def require_admin(user: dict = Security(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

# ---------- ROUTES ----------
@router.post("/signup")
async def signup(data: Signup, db=Depends(get_database)):
    users = db["users"]
    existing = await users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")

    hashed = hash_password(data.password)
    result = await users.insert_one({
        "email": data.email,
        "password": hashed,
        "role": data.role.lower(),
    })
    return {"message": f"{data.role.capitalize()} account created successfully", "user_id": str(result.inserted_id)}

@router.post("/login")
async def login(data: Login, db=Depends(get_database)):
    users = db["users"]
    user = await users.find_one({"email": data.email})
    if not user or not verify_password(data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"sub": user["email"], "role": user.get("role", "user")})
    return {"access_token": token, "token_type": "bearer"}

@router.get("/me")
async def get_me(token: str = Depends(oauth2_scheme)):
    payload = decode_jwt_token_raw(token)
    return {"email": payload["sub"], "role": payload.get("role", "user")}
