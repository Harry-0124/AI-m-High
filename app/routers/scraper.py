from fastapi import APIRouter, HTTPException
from requests_html import HTMLSession
from bs4 import BeautifulSoup
import re

router = APIRouter()

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                  "AppleWebKit/537.36 (KHTML, like Gecko) "
                  "Chrome/120.0.0.0 Safari/537.36"
}

def clean_price(price_str: str):
    """Extract numeric value from price string like ₹1,499"""
    if not price_str:
        return None
    match = re.search(r'[\d,]+', price_str)
    return int(match.group(0).replace(",", "")) if match else None


# ---------- BASE SCRAPER (Helper) ----------
def get_rendered_html(url: str):
    """Fetch and render dynamic page content"""
    session = HTMLSession()
    try:
        res = session.get(url, headers=HEADERS, timeout=20)
        res.html.render(timeout=40, sleep=2)  # JS rendering
        return res.html.html
    finally:
        session.close()


# ---------- FLIPKART ----------
def scrape_flipkart(query: str):
    url = f"https://www.flipkart.com/search?q={query}"
    html = get_rendered_html(url)
    soup = BeautifulSoup(html, "html.parser")

    products = []
    for item in soup.select("div[data-id]"):
        name = item.select_one("a.IRpwTa, div._4rR01T, a.s1Q9rs")
        price = item.select_one("div._30jeq3")
        rating = item.select_one("div._3LWZlK")
        link_tag = item.select
