from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.db import get_database
from app.config import settings
from app.utils.jwt_handler import decode_jwt_token
import smtplib
from email.mime.text import MIMEText
from datetime import datetime

router = APIRouter(
    prefix="/api/alerts",
    tags=["Alerts"]
)

# ---------- MODELS ----------
class AlertRequest(BaseModel):
    product_id: str
    target_price: float


# ---------- EMAIL UTILITY ----------
def send_email(to_email: str, subject: str, message: str):
    msg = MIMEText(message)
    msg["Subject"] = subject
    msg["From"] = f"Real-Time Competitor Tracker <{settings.SMTP_USERNAME}>"
    msg["To"] = to_email

    try:
        with smtplib.SMTP(settings.SMTP_SERVER, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            server.send_message(msg)
        print(f"📧 Email sent to {to_email}")
    except Exception as e:
        print(f"❌ Email send failed: {e}")
        raise HTTPException(status_code=500, detail=f"Email send failed: {str(e)}")


# ---------- SUBSCRIBE TO ALERT ----------
@router.post("/subscribe")
async def subscribe_alert(
    data: AlertRequest,
    db=Depends(get_database),
    token_data=Depends(decode_jwt_token)
):
    """Subscribe user to price alert"""
    user_email = token_data.get("email") or token_data.get("sub")
    if not user_email:
        raise HTTPException(status_code=401, detail="Invalid or missing token")

    alerts = db["alerts"]

    existing = await alerts.find_one({
        "email": user_email,
        "product_id": data.product_id,
        "triggered": False
    })

    if existing:
        raise HTTPException(status_code=400, detail="Alert already exists for this product")

    await alerts.insert_one({
        "email": user_email,
        "product_id": data.product_id,
        "target_price": data.target_price,
        "triggered": False,
        "trigger_time": None
    })

    send_email(
        user_email,
        "✅ Price Alert Subscription Confirmed!",
        f"Hey {user_email.split('@')[0]},\n\nYou're now subscribed for alerts on Product ID: {data.product_id}.\nWe'll notify you when the price drops to ₹{data.target_price:,.2f} or below.\n\n- Real-Time Competitor Tracker 🛍️"
    )

    return {"message": f"✅ Alert set successfully for {user_email}"}


# ---------- CHECK & TRIGGER ALERTS ----------
async def check_and_trigger_alerts(db, product_id: str, new_price: float, product_name: str):
    """Triggered automatically when admin updates a product"""
    alerts = db["alerts"]

    active_alerts = await alerts.find({
        "product_id": product_id,
        "triggered": False
    }).to_list(100)

    for alert in active_alerts:
        if new_price <= alert["target_price"]:
            subject = f"💰 Price Drop Alert: {product_name}"
            message = (
                f"Hey there!\n\n"
                f"The price of {product_name} just dropped to ₹{new_price:,.2f}!\n"
                f"Your target price was ₹{alert['target_price']:,.2f}.\n\n"
                f"Check it out on our website 🛍️\n\n"
                f"- Real-Time Competitor Tracker"
            )
            send_email(alert["email"], subject, message)
            await alerts.update_one(
                {"_id": alert["_id"]},
                {"$set": {"triggered": True, "trigger_time": datetime.utcnow()}}
            )
            print(f"✅ Alert triggered and email sent to {alert['email']} for {product_name}")
