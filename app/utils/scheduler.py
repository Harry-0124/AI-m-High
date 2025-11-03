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
    alerts = db["alerts"]
    products = db["products"]

    all_alerts = await alerts.find().to_list(100)
    for alert in all_alerts:
        product = await products.find_one({"_id": alert["product_id"]})
        if not product:
            continue

        current_price = product.get("price")
        if current_price and current_price <= alert["target_price"]:
            subject = f"💰 Price Drop Alert: {product['name']}"
            message = (
                f"Hey there!\n\n"
                f"The price of **{product['name']}** has dropped to ₹{current_price:.2f}!\n"
                f"Your target price was ₹{alert['target_price']}\n\n"
                f"Check it out on our website 🛍️"
            )
            send_email(alert["email"], subject, message)
            print(f"📩 Alert sent to {alert['email']} for {product['name']}")


def start_scheduler():
    scheduler.add_job(lambda: asyncio.run(check_price_alerts()), "interval", minutes=10)
    scheduler.start()
    print("✅ Price Drop Scheduler Started (every 10 minutes)")
