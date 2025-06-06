from fastapi import FastAPI, Depends
import uvicorn
from app.config import logger
from app import api
from app.bookmarks_data import BookmarkStore
from app.cache import cache
import os

# Chrome bookmarks file location
CHROME_PROFILE_NAME = os.getenv("CHROME_PROFILE_NAME", "Profile 1")
CHROME_BOOKMARKS_FILE = os.path.expanduser(
    f"~/Library/Application Support/Google/Chrome/{CHROME_PROFILE_NAME}/Bookmarks"
)

app = FastAPI(title="Chrome Bookmarks Manager")
app.include_router(api.router)

# Create a single BookmarkStore instance
bookmark_store = BookmarkStore(CHROME_BOOKMARKS_FILE)

# Override the dependency to use our instance
app.dependency_overrides[api.get_bookmark_store] = lambda: bookmark_store


@app.on_event("startup")
async def startup_event():
    """Initialize the application on startup."""
    logger.info("Starting application...")
    try:
        # Connect to Redis
        await cache.connect()
        logger.info("Redis connection established")
        
        # Load bookmarks data
        bookmark_store.load_data()
        logger.info("Bookmarks data loaded successfully")
    except Exception as e:
        logger.error(f"Failed to start application: {e}")
        # Don't raise here - let the health endpoint handle reporting the error


@app.on_event("shutdown")
async def shutdown_event():
    """Clean up resources on shutdown."""
    logger.info("Shutting down application...")
    try:
        await cache.disconnect()
        logger.info("Redis connection closed")
    except Exception as e:
        logger.error(f"Error during shutdown: {e}")


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
