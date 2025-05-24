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