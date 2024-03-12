from fastapi import APIRouter, HTTPException, status
from app import analysis
from app.config import logger
from typing import Dict, Literal, List, Optional
from pydantic import BaseModel


class SuccessResponse(BaseModel):
    status: Literal["success"]
    message: str


class HealthResponse(BaseModel):
    status: Literal["success", "error"]
    result: Optional[list]
    message: Optional[str]


class BookmarksResponse(BaseModel):
    status: Literal["success"]
    result: Dict


class UnvisitedResponse(BaseModel):
    status: Literal["success"]
    result: List


router = APIRouter()


@router.get("/", response_model=SuccessResponse, status_code=status.HTTP_200_OK)
async def root():
    logger.info("Received root request")
    return SuccessResponse(
        status="success",
        message="This application helps you analyze your Chrome bookmarks.",
    )


@router.get("/health", response_model=HealthResponse, status_code=status.HTTP_200_OK)
async def health():
    is_healthy = True

    if is_healthy:
        return HealthResponse(
            status="success", result=[], message="Application is healthy."
        )
    else:
        return HealthResponse(
            status="error",
            result=[],
            message="Application is not healthy, there is an issue.",
        )


@router.get(
    "/bookmarks", response_model=BookmarksResponse, status_code=status.HTTP_200_OK
)
async def bookmarks():
    try:
        logger.info("Received bookmarks request")
        bookmarks = analysis.bookmarks_all_as_tree()
        return BookmarksResponse(status="success", result=bookmarks)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.get(
    "/unvisited", response_model=UnvisitedResponse, status_code=status.HTTP_200_OK
)
async def unvisited():
    try:
        logger.info("Received bookmarks request")
        bookmarks = analysis.bookmarks_unvisited()
        return UnvisitedResponse(status="success", result=bookmarks)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )
