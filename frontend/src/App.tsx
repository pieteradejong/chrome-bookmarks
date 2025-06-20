import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppShell, Container, Title, Stack, Tabs, LoadingOverlay, Text, Switch, Group } from '@mantine/core';
import { useBookmarks, useUnvisitedBookmarks, useBrokenBookmarks, flattenBookmarks } from './hooks/useBookmarks';
// import { deleteBookmark } from './api/client';
import { BookmarkItem } from './components/BookmarkItem';
import { BrokenBookmarkItem } from './components/BrokenBookmarkItem';
// import { CacheStats } from './components/CacheStats';
import type { Bookmark, BrokenBookmark } from './types/bookmarks';
import { BookmarkStatusProvider } from './contexts/BookmarkStatusContext';
import { useState } from 'react';
import '@mantine/core/styles.css';

const queryClient = new QueryClient();

function BookmarkList() {
  const [includeDetails, setIncludeDetails] = useState(false);
  // const queryClient = useQueryClient();
  const { data: bookmarksData, isLoading: isLoadingBookmarks, error: bookmarksError } = useBookmarks();
  const { data: unvisitedData, isLoading: isLoadingUnvisited, error: unvisitedError } = useUnvisitedBookmarks();
  const { data: brokenData, isLoading: isLoadingBroken, error: brokenError } = useBrokenBookmarks(includeDetails);

  // const deleteMutation = useMutation({
  //   mutationFn: (title: string) => deleteBookmark(title),
  //   onSuccess: () => {
  //     // Invalidate and refetch all bookmark queries
  //     queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
  //     queryClient.invalidateQueries({ queryKey: ['unvisited'] });
  //     queryClient.invalidateQueries({ queryKey: ['broken'] });
  //   },
  // });

  const handleBookmarkClick = (bookmark: Bookmark) => {
    if (bookmark.url) {
      window.open(bookmark.url, '_blank');
    }
  };

  const handleBrokenBookmarkClick = (brokenBookmark: BrokenBookmark) => {
    if (brokenBookmark.bookmark.url) {
      window.open(brokenBookmark.bookmark.url, '_blank');
    }
  };

  // const handleDeleteBookmark = (brokenBookmark: BrokenBookmark) => {
  //   if (confirm(`Are you sure you want to delete "${brokenBookmark.bookmark.name}"?`)) {
  //     deleteMutation.mutate(brokenBookmark.bookmark.name);
  //   }
  // };

  // Handle the root bookmark object
  const rootBookmark = bookmarksData?.result || { id: 'root', name: 'Bookmarks', type: 'folder', children: [] };
  const allBookmarks = flattenBookmarks(rootBookmark);
  const unvisitedBookmarks = unvisitedData?.result || [];
  const brokenBookmarks = brokenData?.result || [];

  if (bookmarksError || unvisitedError || brokenError) {
    return (
      <Text c="red" size="lg">
        Error loading bookmarks: {bookmarksError?.message || unvisitedError?.message || brokenError?.message}
      </Text>
    );
  }

  return (
    <Tabs defaultValue="all">
      <Tabs.List>
        <Tabs.Tab value="all">All Bookmarks</Tabs.Tab>
        <Tabs.Tab value="unvisited">Unvisited</Tabs.Tab>
        <Tabs.Tab value="broken">Broken</Tabs.Tab>
      </Tabs.List>

      <Tabs.Panel value="all">
        <Stack mt="md">
          <LoadingOverlay visible={isLoadingBookmarks} />
          {allBookmarks.length > 0 ? (
            allBookmarks.map((bookmark) => (
              <BookmarkItem
                key={bookmark.id}
                bookmark={bookmark}
                onClick={handleBookmarkClick}
              />
            ))
          ) : (
            <Text c="dimmed">No bookmarks found</Text>
          )}
        </Stack>
      </Tabs.Panel>

      <Tabs.Panel value="unvisited">
        <Stack mt="md">
          <LoadingOverlay visible={isLoadingUnvisited} />
          {unvisitedBookmarks.length > 0 ? (
            unvisitedBookmarks.map((bookmark) => (
              <BookmarkItem
                key={bookmark.id}
                bookmark={bookmark}
                onClick={handleBookmarkClick}
              />
            ))
          ) : (
            <Text c="dimmed">No unvisited bookmarks found</Text>
          )}
        </Stack>
      </Tabs.Panel>

      <Tabs.Panel value="broken">
        <Stack mt="md">
          <Group justify="space-between" align="flex-start">
            <Switch
              label="Show detailed information"
              checked={includeDetails}
              onChange={(event) => setIncludeDetails(event.currentTarget.checked)}
            />
            {/* <CacheStats /> */}
          </Group>
          <LoadingOverlay visible={isLoadingBroken} />
          {brokenBookmarks.length > 0 ? (
            brokenBookmarks.map((brokenBookmark) => (
              <BrokenBookmarkItem
                key={brokenBookmark.bookmark.id}
                brokenBookmark={brokenBookmark}
                onClick={handleBrokenBookmarkClick}
              />
            ))
          ) : (
            <Text c="dimmed">No broken bookmarks found</Text>
          )}
        </Stack>
      </Tabs.Panel>
    </Tabs>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BookmarkStatusProvider>
        <MantineProvider>
          <AppShell header={{ height: 60 }} padding="md">
            <AppShell.Header>
              <Container h="100%" py="md">
                <Title order={1}>Chrome Bookmarks Manager</Title>
              </Container>
            </AppShell.Header>

            <AppShell.Main>
              <Container>
                <BookmarkList />
              </Container>
            </AppShell.Main>
          </AppShell>
        </MantineProvider>
      </BookmarkStatusProvider>
    </QueryClientProvider>
  );
}
