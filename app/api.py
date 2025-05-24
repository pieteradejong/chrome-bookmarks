from fastapi import APIRouter, HTTPException, status, Depends
from typing import Dict, List
import logging

from app.models import (
    SuccessResponse, HealthResponse, BookmarksResponse,
    UnvisitedResponse, StatsResponse
)
from app.bookmarks_data import BookmarkStore
from app.config import logger

router = APIRouter()

# Dependency to get the BookmarkStore instance
def get_bookmark_store(store: BookmarkStore = Depends(lambda: BookmarkStore)) -> BookmarkStore:
    return store


@router.get("/", response_model=SuccessResponse, status_code=status.HTTP_200_OK)
async def root():
    """Root endpoint with basic information about the application."""
    logger.info("Received root request")
    return SuccessResponse(
        status="success",
        message="This application helps you analyze your Chrome bookmarks.",
    )


@router.get("/health", response_model=HealthResponse, status_code=status.HTTP_200_OK)
async def health(store: BookmarkStore = Depends(get_bookmark_store)):
    """Health check endpoint."""
    try:
        # Try to load bookmarks as a health check
        store.load_data()
        return HealthResponse(
            status="success",
            result=[],
            message="Application is healthy and bookmarks are accessible."
        )
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return HealthResponse(
            status="error",
            result=[],
            message=f"Application is not healthy: {str(e)}"
        )


@router.get(
    "/bookmarks", response_model=BookmarksResponse, status_code=status.HTTP_200_OK
)
async def bookmarks(store: BookmarkStore = Depends(get_bookmark_store)):
    """Get the complete bookmark tree."""
    try:
        logger.info("Received bookmarks request")
        bookmark_tree = store.get_bookmark_tree()
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
async def unvisited(store: BookmarkStore = Depends(get_bookmark_store)):
    """Get a list of unvisited bookmarks."""
    try:
        logger.info("Received unvisited bookmarks request")
        unvisited_bookmarks = store.get_unvisited_bookmarks()
        return UnvisitedResponse(status="success", result=unvisited_bookmarks)
    except Exception as e:
        logger.error(f"Error retrieving unvisited bookmarks: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get(
    "/stats", response_model=StatsResponse, status_code=status.HTTP_200_OK
)
async def stats(store: BookmarkStore = Depends(get_bookmark_store)):
    """Get bookmark statistics."""
    try:
        logger.info("Received stats request")
        stats = store.get_stats()
        return StatsResponse(status="success", result=stats)
    except Exception as e:
        logger.error(f"Error retrieving bookmark stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
