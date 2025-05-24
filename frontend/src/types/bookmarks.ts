export interface Bookmark {
  id: string;
  name: string;
  url?: string;
  type: 'url' | 'folder';
  dateAdded?: number;
  lastVisited?: number;
  children?: Bookmark[];
}

export interface BookmarksResponse {
  status: 'success';
  result: Bookmark;
}

export interface UnvisitedResponse {
  status: 'success';
  result: Bookmark[];
}

export interface HealthResponse {
  status: 'success' | 'error';
  result: string[] | null;
  message: string | null;
}

export interface BookmarkDetails {
  statusCode?: number;
  contentType?: string;
  responseTime?: number;
  finalUrl?: string;
  sslValid?: boolean;
  dnsResolved?: boolean;
}

export enum ErrorCategory {
  DNS_FAILURE = "DNS Failure",
  SSL_ERROR = "SSL Error",
  AUTH_REQUIRED = "Authentication Required",
  NOT_FOUND = "Not Found",
  SERVER_ERROR = "Server Error",
  TIMEOUT = "Timeout",
  CONNECTION_ERROR = "Connection Error",
  OTHER = "Other"
}

export interface ErrorDetails {
  category: ErrorCategory;
  message: string;
  statusCode?: number;
  technicalDetails?: Record<string, any>;
}

export interface BrokenBookmark {
  bookmark: Bookmark;
  error: ErrorDetails;
  details?: BookmarkDetails;
}

export interface BrokenBookmarksResponse {
  status: 'success';
  result: BrokenBookmark[];
} 