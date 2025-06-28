import { useQuery } from '@tanstack/react-query';
import { getBookmarks, getUnvisitedBookmarks, getBrokenBookmarks } from '../api/client';
import type { Bookmark } from '../types/bookmarks';

// Cache time constants (in milliseconds)
const GC_TIME = {
  BOOKMARKS: 5 * 60 * 1000,     // 5 minutes for bookmarks (changes less frequently)
  BROKEN: 7 * 24 * 60 * 60 * 1000,  // 7 days for broken bookmarks (matches backend cache)
  UNVISITED: 5 * 60 * 1000,     // 5 minutes for unvisited bookmarks
};

// Stale time constants (in milliseconds)
const STALE_TIME = {
  BOOKMARKS: 60 * 1000,         // 1 minute
  BROKEN: 24 * 60 * 60 * 1000,  // 1 day (since broken links rarely change)
  UNVISITED: 60 * 1000,         // 1 minute
};

export const useBookmarks = () => {
  return useQuery({
    queryKey: ['bookmarks'],
    queryFn: getBookmarks,
    gcTime: GC_TIME.BOOKMARKS,
    staleTime: STALE_TIME.BOOKMARKS,
  });
};

export const useUnvisitedBookmarks = () => {
  return useQuery({
    queryKey: ['unvisited-bookmarks'],
    queryFn: getUnvisitedBookmarks,
    gcTime: GC_TIME.UNVISITED,
    staleTime: STALE_TIME.UNVISITED,
  });
};

export const useBrokenBookmarks = (includeDetails: boolean = false) => {
  return useQuery({
    queryKey: ['broken-bookmarks', includeDetails],
    queryFn: () => getBrokenBookmarks(includeDetails),
    gcTime: GC_TIME.BROKEN,
    staleTime: STALE_TIME.BROKEN,
    // Don't refetch on window focus since this is expensive
    refetchOnWindowFocus: false,
  });
};

export const flattenBookmarks = (bookmark: Bookmark, parentId: string = ''): Bookmark[] => {
  // Create a unique ID by combining parent and current IDs
  const uniqueId = parentId ? `${parentId}-${bookmark.id}` : bookmark.id;
  const bookmarkWithUniqueId = { ...bookmark, id: uniqueId };
  
  const result: Bookmark[] = [bookmarkWithUniqueId];
  if (bookmark.children) {
    bookmark.children.forEach((child) => {
      result.push(...flattenBookmarks(child, uniqueId));
    });
  }
  return result;
}; 