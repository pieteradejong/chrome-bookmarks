from fastapi import APIRouter, HTTPException, status
from app import analysis
from app.config import logger
from typing import Dict, Literal
from pydantic import BaseModel


class SuccessResponse(BaseModel):
    status: Literal["success"]
    message: str


class BookmarksResponse(BaseModel):
    status: Literal["success"]
    result: Dict


router = APIRouter()


@router.get("/", response_model=SuccessResponse, status_code=status.HTTP_200_OK)
async def root():
    logger.info("Received root request")
    return SuccessResponse(
        status="success",
        message="This application helps you analyze your Chrome bookmarks.",
    )


@router.get(
    "/bookmarks", response_model=BookmarksResponse, status_code=status.HTTP_200_OK
)
async def bookmarks():
    try:
        logger.info("Received bookmarks request")
        bookmarks = analysis.bookmarks_all()
        return BookmarksResponse(status="success", result=bookmarks)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )
