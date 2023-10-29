from fastapi import APIRouter, status
from app import analysis
from app import analysis
from app.config import logger
from typing import Dict, Literal
from pydantic import BaseModel

class SuccessResponse(BaseModel):
    status: Literal["success"]
    message: str


class BookmarkResponse(BaseModel):
    success: Literal["success"]
    result: Dict

router = APIRouter()

@router.get("/", response_model=SuccessResponse, status_code=status.HTTP_200_OK)
async def root():
    logger.info("Received root request")
    return SuccessResponse(
        status="success", message="This application helps you analyze your Chrome bookmarks."
    )

@router.get("/bookmarks", response_model=BookmarkResponse, status_code=status.HTTP_200_OK)
async def bookmarks():
    logger.info("Received root request")
    # Retrieve all bookmarks from get_all analysis.py
    # Return as an HTTP OK JSON object
    bookmarks = analysis.bookmarks()
    
