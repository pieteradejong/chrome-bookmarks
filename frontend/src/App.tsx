import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppShell, Container, Title, Stack, Tabs, LoadingOverlay, Text } from '@mantine/core';
import { useBookmarks, useUnvisitedBookmarks, flattenBookmarks } from './hooks/useBookmarks';
import { BookmarkItem } from './components/BookmarkItem';
import type { Bookmark } from './types/bookmarks';
import '@mantine/core/styles.css';

const queryClient = new QueryClient();

function BookmarkList() {
  const { data: bookmarksData, isLoading: isLoadingBookmarks, error: bookmarksError } = useBookmarks();
  const { data: unvisitedData, isLoading: isLoadingUnvisited, error: unvisitedError } = useUnvisitedBookmarks();

  const handleBookmarkClick = (bookmark: Bookmark) => {
    if (bookmark.url) {
      window.open(bookmark.url, '_blank');
    }
  };

  // Handle the root bookmark object
  const rootBookmark = bookmarksData?.result || { id: 'root', name: 'Bookmarks', type: 'folder', children: [] };
  const allBookmarks = flattenBookmarks(rootBookmark);
  const unvisitedBookmarks = unvisitedData?.result || [];

  if (bookmarksError || unvisitedError) {
    return (
      <Text c="red" size="lg">
        Error loading bookmarks: {bookmarksError?.message || unvisitedError?.message}
      </Text>
    );
  }

  return (
    <Tabs defaultValue="all">
      <Tabs.List>
        <Tabs.Tab value="all">All Bookmarks</Tabs.Tab>
        <Tabs.Tab value="unvisited">Unvisited</Tabs.Tab>
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
    </Tabs>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
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
    </QueryClientProvider>
  );
}
