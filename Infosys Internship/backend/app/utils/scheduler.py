from apscheduler.schedulers.background import BackgroundScheduler
from app.db import db
from app.config import settings
import smtplib
from email.mime.text import MIMEText
import asyncio

scheduler = BackgroundScheduler()

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


async def check_price_alerts():
    # If DB is not initialized yet, skip this run gracefully
    if db is None:
        print("⏳ Scheduler: DB not ready yet, skipping price alert check.")
        return

    alerts = db["alerts"]
    products = db["products"]

    all_alerts = await alerts.find().to_list(100)
    for alert in all_alerts:
        product = await products.find_one({"_id": alert.get("product_id")})
        if not product:
            continue

        current_price = product.get("price")
        target = alert.get("target_price")
        if current_price is not None and target is not None and current_price <= target:
            subject = f"💰 Price Drop Alert: {product.get('name', 'Product')}"
            message = (
                f"Hey there!\n\n"
                f"The price of **{product.get('name','Product')}** has dropped to ₹{current_price}!\n"
                f"Your target price was ₹{target}\n\n"
                f"Check it out on our website 🛍️"
            )
            send_email(alert.get("email", ""), subject, message)
            print(f"📩 Alert sent to {alert.get('email','(unknown)')} for {product.get('name','Product')}")


def start_scheduler():
    # Stagger first run to allow DB startup to complete
    scheduler.add_job(lambda: asyncio.run(check_price_alerts()), "interval", minutes=10, next_run_time=None)
    scheduler.start()
    print("✅ Price Drop Scheduler Started (every 10 minutes)")
