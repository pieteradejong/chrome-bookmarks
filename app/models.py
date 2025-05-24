from dataclasses import dataclass
from typing import Optional, Dict, List, Literal
from pydantic import BaseModel, HttpUrl
from datetime import datetime


# Internal data models (dataclasses)
@dataclass
class URL:
    full: str
    scheme: str
    hostname: str
    port: Optional[int]
    path: Optional[str]
    query: Optional[str]
    params: Optional[str]
    fragment: Optional[str]
    query_params: Optional[Dict[str, list]]
    hash: int


@dataclass
class Bookmark:
    url: URL
    date_added: int
    date_last_used: int
    guid: str
    id: str
    name: str
    type: Literal["url"]


@dataclass
class Folder:
    children: list
    date_added: int
    date_last_used: int
    date_modified: int
    guid: str
    id: str
    name: str
    type: Literal["folder"]


# API models (Pydantic)
class BookmarkBase(BaseModel):
    id: str
    name: str
    type: Literal["url", "folder"]
    date_added: Optional[int] = None
    date_last_used: Optional[int] = None


class BookmarkResponse(BookmarkBase):
    url: Optional[str] = None
    children: Optional[List['BookmarkResponse']] = None


class FolderResponse(BookmarkBase):
    children: List[BookmarkResponse]
    date_modified: Optional[int] = None


class BookmarkStats(BaseModel):
    total_bookmarks: int
    total_folders: int
    empty_folders: int
    unvisited_bookmarks: int
    duplicate_urls: int
    unique_hostnames: Dict[str, int]


class SuccessResponse(BaseModel):
    status: Literal["success"]
    message: str


class HealthResponse(BaseModel):
    status: Literal["success", "error"]
    result: Optional[List[str]] = None
    message: Optional[str] = None


class BookmarksResponse(BaseModel):
    status: Literal["success"]
    result: BookmarkResponse


class UnvisitedResponse(BaseModel):
    status: Literal["success"]
    result: List[BookmarkResponse]


class StatsResponse(BaseModel):
    status: Literal["success"]
    result: BookmarkStats 