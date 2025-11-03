from jose import jwt, JWTError
from datetime import datetime, timedelta

SECRET_KEY = "your_secret_key_here"  # same as in token creation
ALGORITHM = "HS256"

def decode_jwt_token(token: str):
    """
    Decodes a JWT token and returns the payload.
    Returns None if token is invalid or expired.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload  # includes user_id, email, etc.
    except JWTError:
        return None
