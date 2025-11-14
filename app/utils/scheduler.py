import asyncio
from apscheduler.schedulers.background import BackgroundScheduler
from app.config import settings
from email.mime.text import MIMEText
import smtplib
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timedelta
import pytz

# ---------- Initialize Scheduler ----------
scheduler = BackgroundScheduler()


# ---------- EMAIL UTILITY ----------
def send_email(to_email: str, subject: str, message: str):
    """Send email using SMTP with TLS"""
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
        print(f"❌ Email failed for {to_email}: {e}")


# ---------- PRICE ALERT CHECKER ----------
async def check_price_alerts():
    """Scans for price drops and triggers alerts"""
    print("🔄 Running scheduled price alert check...")

    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.DB_NAME]
    alerts = db["alerts"]
    products = db["products"]

    # Fetch untriggered alerts
    active_alerts = await alerts.find({"triggered": False}).to_list(500)

    for alert in active_alerts:
        product = await products.find_one({"_id": alert["product_id"]})
        if not product:
            continue

        current_price = product.get("price", 0)
        if current_price and current_price <= alert["target_price"]:
            subject = f"💰 Price Drop Alert: {product.get('name', 'Unknown Product')}"
            message = (
                f"Hey there!\n\n"
                f"The price of {product.get('name', 'Unknown Product')} just dropped to ₹{current_price:.2f}!\n"
                f"Your target price was ₹{alert['target_price']:.2f}.\n\n"
                f"Check it out on our website 🛍️"
            )
            send_email(alert["email"], subject, message)
            await alerts.update_one(
                {"_id": alert["_id"]},
                {"$set": {"triggered": True, "trigger_time": datetime.utcnow()}}
            )
            print(f"✅ Alert triggered for {alert['email']} ({product.get('name')})")

    client.close()
    print("✅ Scheduler DB connection closed.")


# ---------- DAILY SMART REPORT ----------
async def send_daily_report():
    """Sends daily summary of triggered alerts"""
    print("📊 Generating daily smart report...")

    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.DB_NAME]
    alerts = db["alerts"]
    products = db["products"]

    # Fetch alerts triggered in last 24h
    since = datetime.utcnow() - timedelta(hours=24)
    triggered_alerts = await alerts.find(
        {"triggered": True, "trigger_time": {"$gte": since}}
    ).to_list(200)

    if not triggered_alerts:
        print("📭 No triggered alerts in last 24h — skipping report.")
        client.close()
        return

    lines = [
        "📊 **Daily Price Drop Summary**\n",
        f"🕒 {datetime.now(pytz.timezone('Asia/Kolkata')).strftime('%d-%b-%Y %I:%M %p')}\n",
        "─────────────────────────────\n",
    ]

    for alert in triggered_alerts:
        product = await products.find_one({"_id": alert["product_id"]})
        product_name = product.get("name", "Unknown Product") if product else "Unknown Product"
        lines.append(
            f"- {product_name} → ₹{alert.get('target_price', '?')} | Sent to {alert.get('email', '?')}"
        )

    report_message = "\n".join(lines)

    send_email(
        settings.ADMIN_EMAIL,
        "📊 Daily Price Alert Summary",
        report_message
    )

    print("✅ Daily Smart Report sent to admin.")
    client.close()


# ---------- SAFE RUNNER ----------
def run_async_job():
    """Safely runs async functions from APScheduler"""
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(check_price_alerts())
    except Exception as e:
        print(f"⚠️ Scheduler async error: {e}")
    finally:
        loop.close()


# ---------- START SCHEDULER ----------
def start_scheduler():
    """Start background jobs: price checks + daily reports"""
    # Existing price alert job — runs every 10 minutes
    scheduler.add_job(run_async_job, "interval", minutes=10)

    # Smart Report job — runs daily at 8:00 PM IST
    scheduler.add_job(
        lambda: asyncio.run(send_daily_report()),
        "cron",
        hour=20,
        minute=0,
        timezone="Asia/Kolkata",
    )

    scheduler.start()
    print("✅ Optimized Price Drop Scheduler + Smart Report Mode Active")
