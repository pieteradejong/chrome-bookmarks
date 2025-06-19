import axios from 'axios';
import type { 
  BookmarksResponse, 
  UnvisitedResponse, 
  HealthResponse,
  BrokenBookmarksResponse 
} from '../types/bookmarks';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getBookmarks = async (): Promise<BookmarksResponse> => {
  const { data } = await api.get<BookmarksResponse>('/bookmarks');
  return data;
};

export const getUnvisitedBookmarks = async (): Promise<UnvisitedResponse> => {
  const { data } = await api.get<UnvisitedResponse>('/unvisited');
  return data;
};

export const getHealth = async (): Promise<HealthResponse> => {
  const { data } = await api.get<HealthResponse>('/health');
  return data;
};

export const getBrokenBookmarks = async (includeDetails: boolean = false): Promise<BrokenBookmarksResponse> => {
  const { data } = await api.get<BrokenBookmarksResponse>(`/broken${includeDetails ? '?include_details=true' : ''}`);
  return data;
};

export interface CacheStats {
  total_cached: number;
  valid_entries: number;
  expired_entries: number;
  cache_expiry_days: number;
}

export interface CacheResponse {
  status: 'success';
  result: CacheStats;
}

export const getCacheStats = async (): Promise<CacheStats> => {
  try {
    const response = await fetch('/api/broken/cache');
    if (!response.ok) {
      throw new Error('Failed to fetch cache stats');
    }
    const data: CacheResponse = await response.json();
    // Always return a value, never undefined
    return data.result ?? {
      total_cached: 0,
      valid_entries: 0,
      expired_entries: 0,
      cache_expiry_days: 7,
    };
  } catch (error) {
    // Return a default value on error
    return {
      total_cached: 0,
      valid_entries: 0,
      expired_entries: 0,
      cache_expiry_days: 7,
    };
  }
};

export const clearCache = async (): Promise<void> => {
  const response = await fetch('/api/broken/cache/clear', {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error('Failed to clear cache');
  }
}; 