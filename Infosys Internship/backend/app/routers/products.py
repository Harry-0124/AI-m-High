from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from app.db import get_database
from app.utils.scraper_static_selenium import AppleWatchPriceScraper
import json

router = APIRouter()

@router.get("/")
async def list_products(db=Depends(get_database)):
    products_collection = db["products"]
    products = await products_collection.find().to_list(100)
    for p in products:
        p["_id"] = str(p["_id"])
    return {"count": len(products), "products": products}

# Alias to serve fresh scraped data for milestone compatibility
@router.get("/scraped")
async def list_scraped_products():
    scraper = AppleWatchPriceScraper(headless=True)
    data = scraper.run_scraper()
    return {"success": True, "count": len(data), "products": data}

# Progressive stream of scraped products as SSE
@router.get("/scraped/stream")
def stream_scraped_products():
    def event_stream():
        scraper = AppleWatchPriceScraper(headless=True)
        try:
            scraper.setup_driver()
            # Scrape per-site and emit as each completes
            for fn_name in [
                "scrape_amazon",
                "scrape_flipkart",
                "scrape_reliance_digital",
                "scrape_croma",
                "scrape_vijay_sales",
            ]:
                try:
                    getattr(scraper, fn_name)()
                    if scraper.results:
                        item = scraper.results[-1]
                        yield f"data: {json.dumps(item, ensure_ascii=False)}\n\n"
                except Exception as e:
                    # Emit an error item but keep the stream alive
                    error_data = {"error": str(e), "site": fn_name}
                    yield f"data: {json.dumps(error_data, ensure_ascii=False)}\n\n"
            # Signal end
            end_data = {"success": True, "count": len(scraper.results)}
            yield f"event: end\ndata: {json.dumps(end_data, ensure_ascii=False)}\n\n"
        finally:
            try:
                scraper.close_driver()
            except Exception:
                pass
    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
