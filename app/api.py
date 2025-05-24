from fastapi import APIRouter, HTTPException, status
from app import analysis
from app.config import logger
from typing import Dict, Literal, List, Optional
from pydantic import BaseModel
import logging

logger = logging.getLogger(__name__)

class Bookmark(BaseModel):
    id: str
    name: str
    url: Optional[str] = None
    type: Literal["url", "folder"]
    dateAdded: Optional[int] = None
    lastVisited: Optional[int] = None
    children: Optional[List['Bookmark']] = None

class SuccessResponse(BaseModel):
    status: Literal["success"]
    message: str


class HealthResponse(BaseModel):
    status: Literal["success", "error"]
    result: Optional[List[str]] = None
    message: Optional[str] = None


class BookmarksResponse(BaseModel):
    status: Literal["success"]
    result: Bookmark


class UnvisitedResponse(BaseModel):
    status: Literal["success"]
    result: List[Bookmark]


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
        bookmark_tree = analysis.bookmarks_all_as_tree()
        if not bookmark_tree:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No bookmarks found"
            )
        return BookmarksResponse(status="success", result=bookmark_tree)
    except Exception as e:
        logger.error(f"Error retrieving bookmarks: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get(
    "/unvisited", response_model=UnvisitedResponse, status_code=status.HTTP_200_OK
)
async def unvisited():
    try:
        logger.info("Received unvisited bookmarks request")
        unvisited_bookmarks = analysis.bookmarks_unvisited()
        if not unvisited_bookmarks:
            logger.info("No unvisited bookmarks found")
            return UnvisitedResponse(status="success", result=[])
        return UnvisitedResponse(status="success", result=unvisited_bookmarks)
    except Exception as e:
        logger.error(f"Error retrieving unvisited bookmarks: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
