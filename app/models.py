from dataclasses import dataclass
from typing import Optional, Dict, List, Literal, Any
from pydantic import BaseModel, HttpUrl, ConfigDict
from pydantic.alias_generators import to_camel
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
    model_config = ConfigDict(alias_generator=to_camel, exclude_none=False, populate_by_name=True)
    
    id: str
    name: str
    type: Literal["url", "folder"]
    date_added: Optional[int] = None
    date_last_used: Optional[int] = None


class BookmarkResponse(BookmarkBase):
    url: Optional[str] = None
    children: Optional[List['BookmarkResponse']] = None
    age_display: Optional[str] = None
    domain: Optional[str] = None


class FolderResponse(BookmarkBase):
    children: List[BookmarkResponse]
    date_modified: Optional[int] = None


class BookmarkStats(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, exclude_none=False, populate_by_name=True)
    
    total_bookmarks: int
    total_folders: int
    empty_folders: int
    unvisited_bookmarks: int
    duplicate_urls: int
    unique_hostnames: Dict[str, int]


class SuccessResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
    
    status: Literal["success"]
    message: str


class HealthResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
    
    status: Literal["success", "error"]
    result: Optional[List[str]] = None
    message: Optional[str] = None


class BookmarksResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
    
    status: Literal["success"]
    result: BookmarkResponse


class UnvisitedResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
    
    status: Literal["success"]
    result: List[BookmarkResponse]


class StatsResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
    
    status: Literal["success"]
    result: BookmarkStats


class BookmarkDetails(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
    
    status_code: Optional[int] = None
    content_type: Optional[str] = None
    response_time: Optional[float] = None
    final_url: Optional[str] = None
    ssl_valid: Optional[bool] = None
    dns_resolved: Optional[bool] = None


class BrokenBookmarkResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
    
    bookmark: BookmarkResponse
    error: str
    details: Optional[BookmarkDetails] = None


class BrokenBookmarksResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
    
    status: Literal["success"]
    result: List[BrokenBookmarkResponse]


class DeleteBookmarkResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
    
    status: Literal["success", "error"]
    message: str
    deleted: bool


class BookmarkAnalysis(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
    
    total_bookmarks: int
    total_folders: int
    by_scheme: Dict[str, int]
    by_tld: Dict[str, int]
    by_status: Dict[str, int]
    empty_folders: List[Dict[str, str]]
    potential_duplicates: List[Dict[str, Any]]


class AnalysisResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
    
    status: Literal["success"]
    result: BookmarkAnalysis


class APIError(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
    
    detail: str
    code: Optional[str] = None
    extra: Optional[Any] = None 