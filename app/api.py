from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import Dict, List, Optional
import logging
from fastapi.responses import JSONResponse
from datetime import datetime, timedelta

from app.models import (
    SuccessResponse, HealthResponse, BookmarksResponse,
    UnvisitedResponse, StatsResponse, BrokenBookmarksResponse,
    DeleteBookmarkResponse, AnalysisResponse,
    BookmarkResponse, 
    BookmarkStats
)
from app.bookmarks_data import BookmarkStore, ErrorDetails
from app.config import logger
from app.cache import cache

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


@router.get(
    "/broken", response_model=BrokenBookmarksResponse, status_code=status.HTTP_200_OK
)
async def broken_bookmarks(
    include_details: bool = Query(False, description="Include detailed URL check information"),
    store: BookmarkStore = Depends(get_bookmark_store)
):
    """Get a list of broken bookmarks."""
    try:
        logger.info("Received broken bookmarks request")
        
        # Try to get from cache first
        cache_key = f"broken_bookmarks:{include_details}"
        cached_result = await cache.get(cache_key)
        if cached_result:
            logger.info("Returning cached broken bookmarks")
            return BrokenBookmarksResponse(**cached_result)
        
        # If not in cache, get fresh data
        broken_bookmarks = await store.get_broken_bookmarks(include_details=include_details)
        result = BrokenBookmarksResponse(
            status="success",
            result=[{"bookmark": b, "error": e, "details": d} for b, e, d in broken_bookmarks]
        )
        
        # Cache the result
        await cache.set(cache_key, result.dict())
        return result
        
    except Exception as e:
        logger.error(f"Error retrieving broken bookmarks: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get(
    "/analysis", response_model=AnalysisResponse, status_code=status.HTTP_200_OK
)
async def analyze_bookmarks(store: BookmarkStore = Depends(get_bookmark_store)):
    """Get detailed analysis of bookmarks."""
    try:
        logger.info("Received bookmark analysis request")
        analysis = store.get_bookmark_analysis()
        return AnalysisResponse(status="success", result=analysis)
    except Exception as e:
        logger.error(f"Error analyzing bookmarks: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.delete(
    "/bookmarks/{title}", response_model=DeleteBookmarkResponse, status_code=status.HTTP_200_OK
)
async def delete_bookmark(title: str, store: BookmarkStore = Depends(get_bookmark_store)):
    """Delete a bookmark by its title."""
    try:
        logger.info(f"Received delete bookmark request for title: {title}")
        if store.delete_bookmark_by_title(title):
            return DeleteBookmarkResponse(
                status="success",
                message=f"Bookmark '{title}' deleted successfully",
                deleted=True
            )
        return DeleteBookmarkResponse(
            status="error",
            message=f"Bookmark '{title}' not found",
            deleted=False
        )
    except Exception as e:
        logger.error(f"Error deleting bookmark: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/broken/cache", response_model=dict)
async def get_broken_bookmarks_cache_stats() -> dict:
    """Get statistics about the broken bookmarks cache."""
    return await cache.get_stats()


@router.post("/broken/cache/clear", response_model=dict)
async def clear_broken_bookmarks_cache() -> dict:
    """Clear the broken bookmarks cache."""
    success = await cache.clear()
    if success:
        return {"status": "success", "message": "Cache cleared successfully"}
    return {"status": "error", "message": "Failed to clear cache"}
