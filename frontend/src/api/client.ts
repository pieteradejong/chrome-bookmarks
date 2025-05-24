import axios from 'axios';
import type { BookmarksResponse, UnvisitedResponse, HealthResponse } from '../types/bookmarks';

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