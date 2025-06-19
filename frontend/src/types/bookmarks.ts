export interface Bookmark {
  id: string;
  name: string;
  url?: string;
  type: 'url' | 'folder';
  dateAdded?: number;
  dateLastUsed?: number;
  children?: Bookmark[];
  ageDisplay?: string;
  domain?: string;
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

export const ErrorCategory = {
  DNS_FAILURE: "DNS Failure",
  SSL_ERROR: "SSL Error",
  AUTH_REQUIRED: "Authentication Required",
  NOT_FOUND: "Not Found",
  SERVER_ERROR: "Server Error",
  TIMEOUT: "Timeout",
  CONNECTION_ERROR: "Connection Error",
  OTHER: "Other"
} as const;

export type ErrorCategory = typeof ErrorCategory[keyof typeof ErrorCategory];

export interface TechnicalDetails {
  dnsError?: string;
  sslError?: string;
  responseHeaders?: Record<string, string>;
  redirectChain?: string[];
  connectionError?: string;
  timeout?: number;
}

export interface ErrorDetails {
  category: ErrorCategory;
  message: string;
  statusCode?: number;
  technicalDetails?: TechnicalDetails;
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