from fastapi import APIRouter
from app.utils.scraper_static_selenium import AppleWatchPriceScraper

router = APIRouter()

@router.get("/applewatch")
async def scrape_apple_watch_prices():
    """
    Run the Apple Watch Selenium scraper across all e-commerce sites.
    Returns JSON data for Amazon, Flipkart, Croma, Reliance, Vijay Sales.
    """
    scraper = AppleWatchPriceScraper(headless=True)
    results = scraper.run_scraper()
    return {"success": True, "total_sites": len(results), "data": results}
