from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from app.db import get_database
from app.config import settings
import smtplib
from email.mime.text import MIMEText

router = APIRouter()

# ---------- Models ----------
class AlertRequest(BaseModel):
    email: EmailStr
    product_id: str
    target_price: float


# ---------- Email Sender ----------
def send_email(to_email: str, subject: str, message: str):
    msg = MIMEText(message)
    msg["Subject"] = subject
    msg["From"] = settings.SMTP_USERNAME
    msg["To"] = to_email

    try:
        with smtplib.SMTP(settings.SMTP_SERVER, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            server.send_message(msg)
        print(f"📧 Email sent to {to_email}")
    except Exception as e:
        print("❌ Email failed:", e)
        raise HTTPException(status_code=500, detail=f"Email send failed: {str(e)}")


# ---------- Routes ----------
@router.post("/subscribe")
async def subscribe_alert(data: AlertRequest, db=Depends(get_database)):
    alerts = db["alerts"]

    existing = await alerts.find_one({
        "email": data.email,
        "product_id": data.product_id,
        "triggered": False
    })

    if existing:
        raise HTTPException(status_code=400, detail="Alert already exists for this product and email")

    await alerts.insert_one({
        "email": data.email,
        "product_id": data.product_id,
        "target_price": data.target_price,
        "triggered": False
    })

    return {"message": "Alert subscription created successfully"}


# ---------- Instant Trigger Logic ----------
async def check_and_trigger_alerts(db, product_id: str, new_price: float, product_name: str):
    """
    Called automatically when product price updates.
    Sends email instantly if price <= target and marks alert as triggered.
    """
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
                f"The price of **{product_name}** just dropped to ₹{new_price:.2f}!\n"
                f"Your target price was ₹{alert['target_price']}\n\n"
                f"Check it out on our website 🛍️"
            )
            send_email(alert["email"], subject, message)
            await alerts.update_one(
                {"_id": alert["_id"]},
                {"$set": {"triggered": True}}
            )
            print(f"✅ Alert triggered for {alert['email']} (Product: {product_name})")
