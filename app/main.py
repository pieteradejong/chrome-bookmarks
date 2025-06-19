from fastapi import FastAPI, Depends, Request, HTTPException
import uvicorn
from fastapi.responses import JSONResponse
from app.config import logger
from app import api
from app.bookmarks_data import BookmarkStore
import os
from app.models import APIError

# Chrome bookmarks file location
CHROME_PROFILE_NAME = os.getenv("CHROME_PROFILE_NAME", "Profile 1")
CHROME_BOOKMARKS_FILE = os.path.expanduser(
    f"~/Library/Application Support/Google/Chrome/{CHROME_PROFILE_NAME}/Bookmarks"
)

app = FastAPI(title="Chrome Bookmarks Manager")
app.include_router(api.router)

# Create a single BookmarkStore instance
bookmark_store = BookmarkStore(CHROME_BOOKMARKS_FILE)
bookmark_store.load_data()  # Load once at startup

# Override the dependency to use our instance
app.dependency_overrides[api.get_bookmark_store] = lambda: bookmark_store


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    error = APIError(detail=exc.detail, code=getattr(exc, "code", None))
    return JSONResponse(status_code=exc.status_code, content=error.dict())

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    error = APIError(detail=str(exc), code="internal_error")
    return JSONResponse(status_code=500, content=error.dict())


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
