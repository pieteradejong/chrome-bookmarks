import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getAllBookmarkStatuses } from '../api/client';
import type { BookmarkStatus } from '../types/bookmarks';

interface BookmarkStatusContextType {
  statuses: Record<string, BookmarkStatus>;
  loading: boolean;
  error: string | null;
  getStatus: (bookmarkId: string) => BookmarkStatus | undefined;
  refetch: () => Promise<void>;
}

const BookmarkStatusContext = createContext<BookmarkStatusContextType | undefined>(undefined);

interface BookmarkStatusProviderProps {
  children: React.ReactNode;
}

export function BookmarkStatusProvider({ children }: BookmarkStatusProviderProps) {
  const [statuses, setStatuses] = useState<Record<string, BookmarkStatus>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAllStatuses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getAllBookmarkStatuses();
      setStatuses(response.statuses);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch bookmark statuses';
      setError(errorMessage);
      console.error('Error fetching bookmark statuses:', err);
      
      // If it's a network error, don't retry automatically
      if (errorMessage.includes('ERR_NETWORK') || errorMessage.includes('ERR_INSUFFICIENT_RESOURCES')) {
        console.warn('Network error detected, not retrying automatically');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const getStatus = useCallback((bookmarkId: string): BookmarkStatus | undefined => {
    return statuses[bookmarkId];
  }, [statuses]);

  const refetch = useCallback(async () => {
    await fetchAllStatuses();
  }, [fetchAllStatuses]);

  useEffect(() => {
    fetchAllStatuses();
  }, [fetchAllStatuses]);

  return (
    <BookmarkStatusContext.Provider
      value={{
        statuses,
        loading,
        error,
        getStatus,
        refetch
      }}
    >
      {children}
    </BookmarkStatusContext.Provider>
  );
}

export function useBookmarkStatusContext(): BookmarkStatusContextType {
  const context = useContext(BookmarkStatusContext);
  if (context === undefined) {
    throw new Error('useBookmarkStatusContext must be used within a BookmarkStatusProvider');
  }
  return context;
} 