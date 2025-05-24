import { useQuery } from '@tanstack/react-query';
import { getBookmarks, getUnvisitedBookmarks } from '../api/client';
import type { Bookmark } from '../types/bookmarks';

export const useBookmarks = () => {
  return useQuery({
    queryKey: ['bookmarks'],
    queryFn: getBookmarks,
  });
};

export const useUnvisitedBookmarks = () => {
  return useQuery({
    queryKey: ['unvisited-bookmarks'],
    queryFn: getUnvisitedBookmarks,
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