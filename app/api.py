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
from app.sqlite_cache import sqlite_cache
import aiohttp
import asyncio
from datetime import datetime

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
async def broken_bookmarks():
    """Get a list of broken bookmarks from the cache only (no network checks)."""
    try:
        entries = sqlite_cache.get_all()
        broken = [
            {
                "bookmark": {
                    "id": entry.id,
                    "name": entry.name or "Untitled Bookmark",
                    "url": entry.url,
                    "type": "url",
                    "date_added": None,
                    "date_last_used": None,
                },
                "error": entry.error_details["message"] if isinstance(entry.error_details, dict) and "message" in entry.error_details else str(entry.error_details),
                "details": entry.error_details if entry.broken_status == "broken" else None,
            }
            for entry in entries if entry.broken_status == "broken"
        ]
        return {"status": "success", "result": broken}
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


@router.get("/login-required", response_model=dict)
async def get_login_required_bookmarks():
    """Get bookmarks that require login or authentication."""
    try:
        entries = sqlite_cache.get_all()
        login_required = [
            {
                "bookmark": {
                    "id": entry.id,
                    "name": entry.name or "Untitled Bookmark",
                    "url": entry.url,
                    "type": "url",
                    "date_added": None,
                    "date_last_used": None,
                },
                "reason": entry.error_details.get("reason", "unknown") if isinstance(entry.error_details, dict) else "unknown",
                "status_code": entry.error_details.get("status_code") if isinstance(entry.error_details, dict) else None,
                "last_checked": entry.last_checked,
            }
            for entry in entries if entry.login_required == "yes"
        ]
        return {"status": "success", "result": login_required}
    except Exception as e:
        logger.error(f"Error retrieving login-required bookmarks: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/broken/cache", response_model=dict)
async def get_broken_bookmarks_cache_stats() -> dict:
    """Get statistics about the broken bookmarks cache."""
    # Get basic stats from SQLite cache
    entries = sqlite_cache.get_all()
    total_entries = len(entries)
    broken_entries = len([e for e in entries if e.broken_status == "broken"])
    ok_entries = len([e for e in entries if e.broken_status == "ok"])
    login_required_entries = len([e for e in entries if e.login_required == "yes"])
    
    return {
        "total_entries": total_entries,
        "broken_entries": broken_entries,
        "ok_entries": ok_entries,
        "login_required_entries": login_required_entries,
        "cache_type": "sqlite"
    }


@router.post("/broken/cache/clear", response_model=dict)
async def clear_broken_bookmarks_cache() -> dict:
    """Clear the broken bookmarks cache."""
    try:
        sqlite_cache.clear()
        return {"status": "success", "message": "Cache cleared successfully"}
    except Exception as e:
        return {"status": "error", "message": f"Failed to clear cache: {str(e)}"}


async def check_url_simple(url: str) -> dict:
    """Simple HEAD request check - only marks as broken for definitive failures"""
    try:
        async with aiohttp.ClientSession() as session:
            async with session.head(url, timeout=aiohttp.ClientTimeout(total=10)) as response:
                status_code = response.status
                
                # Only these are definitive "broken" - page doesn't exist
                definitely_broken = status_code in [404, 410]
                
                # These indicate the site exists but requires auth/login
                login_required = status_code in [401, 403, 999, 429]
                
                # Determine reason
                if status_code == 404:
                    reason = "not_found"
                elif status_code == 410:
                    reason = "gone"
                elif status_code == 401:
                    reason = "login_required"
                elif status_code == 403:
                    reason = "access_forbidden"
                elif status_code == 999:
                    reason = "bot_blocked"
                elif status_code == 429:
                    reason = "rate_limited"
                elif 200 <= status_code < 300:
                    reason = "ok"
                elif 300 <= status_code < 400:
                    reason = "redirect"
                else:
                    reason = "server_error"
                
                return {
                    "url": url,
                    "status_code": status_code,
                    "is_broken": definitely_broken,
                    "login_required": login_required,
                    "reason": reason
                }
    except aiohttp.ClientConnectorError:
        # DNS/connection failed - domain doesn't exist
        return {"url": url, "status_code": None, "is_broken": True, "login_required": False, "reason": "connection_error"}
    except Exception as e:
        # Other errors - don't mark as broken
        return {"url": url, "status_code": None, "is_broken": False, "login_required": False, "reason": f"error: {str(e)}"}

@router.post("/validate-broken", status_code=status.HTTP_200_OK)
async def validate_broken_bookmarks(limit: int = 10):
    """Validate broken bookmarks using simple HEAD requests"""
    try:
        # Get broken bookmarks from existing cache
        all_entries = sqlite_cache.get_all()
        broken_entries = [entry for entry in all_entries if entry.broken_status == "broken"][:limit]
        
        if not broken_entries:
            return {"status": "success", "results": [], "validated_count": 0}
        
        # Extract URLs for checking
        urls = [entry.url for entry in broken_entries]
        
        # Check URLs concurrently
        tasks = [check_url_simple(url) for url in urls]
        results = await asyncio.gather(*tasks)
        
        # Update database with results using the existing cache methods
        for result in results:
            # Find the original entry to update
            entry = next((e for e in broken_entries if e.url == result["url"]), None)
            if entry:
                # Update the entry
                entry.broken_status = "broken" if result["is_broken"] else "ok"
                entry.login_required = "yes" if result["login_required"] else "no"
                entry.last_checked = datetime.now().isoformat()
                
                # Keep existing error_details structure but update with new info
                if entry.error_details and isinstance(entry.error_details, dict):
                    entry.error_details.update({
                        "revalidated_reason": result["reason"],
                        "revalidated_status_code": result["status_code"]
                    })
                else:
                    entry.error_details = {
                        "reason": result["reason"], 
                        "status_code": result["status_code"]
                    }
                
                # Save back to cache
                sqlite_cache.upsert(entry)
        
        return {
            "status": "success",
            "results": results,
            "validated_count": len(results)
        }
    except Exception as e:
        logger.error(f"Error validating broken bookmarks: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to validate broken bookmarks: {str(e)}"
        )

@router.get("/bookmark-status/{bookmark_id}", response_model=dict)
async def get_bookmark_status(bookmark_id: str):
    """Get the current status of a specific bookmark from cache."""
    try:
        entry = sqlite_cache.get(bookmark_id)
        if not entry:
            return {
                "status": "not_found",
                "bookmarkId": bookmark_id,
                "checked": False,
                "accessible": None,
                "lastChecked": None,
                "statusCode": None,
                "responseTime": None,
                "loginRequired": False
            }
        
        return {
            "status": "found",
            "bookmarkId": bookmark_id,
            "checked": entry.last_checked is not None,
            "accessible": entry.broken_status == "ok" if entry.broken_status else None,
            "lastChecked": entry.last_checked,
            "statusCode": entry.error_details.get("status_code") if isinstance(entry.error_details, dict) else None,
            "responseTime": entry.error_details.get("response_time") if isinstance(entry.error_details, dict) else None,
            "loginRequired": entry.login_required == "yes"
        }
    except Exception as e:
        logger.error(f"Error retrieving bookmark status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/bookmark-statuses", response_model=dict)
async def get_all_bookmark_statuses():
    """Get status information for all bookmarks in cache."""
    try:
        entries = sqlite_cache.get_all()
        statuses = {}
        
        for entry in entries:
            statuses[entry.id] = {
                "checked": entry.last_checked is not None,
                "accessible": entry.broken_status == "ok" if entry.broken_status else None,
                "lastChecked": entry.last_checked,
                "statusCode": entry.error_details.get("status_code") if isinstance(entry.error_details, dict) else None,
                "responseTime": entry.error_details.get("response_time") if isinstance(entry.error_details, dict) else None,
                "loginRequired": entry.login_required == "yes"
            }
            
        return {
            "status": "success",
            "statuses": statuses,
            "totalCount": len(statuses)
        }
    except Exception as e:
        logger.error(f"Error retrieving bookmark statuses: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
