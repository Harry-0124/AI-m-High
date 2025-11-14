from fastapi import APIRouter, HTTPException, status, Depends, Security
from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from fastapi.security import OAuth2PasswordBearer
from app.db import get_database

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ---------- JWT CONFIG ----------
SECRET_KEY = "supersecretkey123"  # move to .env in production
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

# ---------- MODELS ----------
class Signup(BaseModel):
    email: EmailStr
    password: str
    role: str = "user"  # default role

class Login(BaseModel):
    email: EmailStr
    password: str


# ---------- HELPERS ----------
def hash_password(password: str):
    return pwd_context.hash(password)

def verify_password(plain, hashed):
    return pwd_context.verify(plain, hashed)

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def verify_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token payload")
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

def get_current_user(token: str = Depends(oauth2_scheme)):
    return verify_token(token)

def require_admin(user: dict = Security(get_current_user)):
    if user["role"] != "admin":
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
        "role": data.role.lower(),  # user or admin
    })

    return {
        "message": f"{data.role.capitalize()} account created successfully",
        "user_id": str(result.inserted_id),
    }


@router.post("/login")
async def login(data: Login, db=Depends(get_database)):
    users = db["users"]
    user = await users.find_one({"email": data.email})
    if not user or not verify_password(data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token(
        {"sub": user["email"], "role": user["role"]},
        timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return {"access_token": token, "token_type": "bearer"}


@router.get("/users")
async def list_users(db=Depends(get_database)):
    users = db["users"]
    data = await users.find().to_list(100)
    for u in data:
        u["_id"] = str(u["_id"])
    return {"users": data}


@router.get("/me")
async def get_me(token: str = Depends(oauth2_scheme)):
    user_data = verify_token(token)
    return {"email": user_data["sub"], "role": user_data["role"]}


@router.get("/admin/dashboard")
async def admin_dashboard(user: dict = Depends(require_admin)):
    return {"message": f"Welcome Admin {user['sub']}!"}
