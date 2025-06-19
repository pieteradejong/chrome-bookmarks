import { Card, Text, Group, Badge, Stack } from '@mantine/core';
import { IconFolder, IconLink } from '@tabler/icons-react';
import { format } from 'date-fns';
import type { Bookmark } from '../types/bookmarks';

// Convert Chrome timestamp (microseconds since 1601) to JavaScript Date
function chromeTimeToDate(chromeTimestamp: number): Date {
  // Chrome timestamps are microseconds since January 1, 1601 UTC
  const epochStart = new Date('1601-01-01T00:00:00.000Z');
  return new Date(epochStart.getTime() + chromeTimestamp / 1000);
}

interface BookmarkItemProps {
  bookmark: Bookmark;
  onClick?: (bookmark: Bookmark) => void;
}

export function BookmarkItem({ bookmark, onClick }: BookmarkItemProps) {
  const isFolder = bookmark.type === 'folder';
  const Icon = isFolder ? IconFolder : IconLink;

  return (
    <Card
      shadow="sm"
      padding="lg"
      radius="md"
      withBorder
      style={{ cursor: 'pointer' }}
      onClick={() => onClick?.(bookmark)}
    >
      <Group justify="space-between" mb="xs">
        <Group gap="xs">
          <Icon size={20} />
          <Text fw={500}>{bookmark.name}</Text>
        </Group>
        <Badge color={isFolder ? 'blue' : 'green'}>
          {isFolder ? 'Folder' : 'URL'}
        </Badge>
      </Group>

      <Stack gap="xs">
        {bookmark.url && (
          <Text size="sm" c="dimmed" truncate>
            {bookmark.url}
          </Text>
        )}
        {bookmark.domain && (
          <Text size="sm" c="blue" fw={500}>
            {bookmark.domain}
          </Text>
        )}
        {bookmark.ageDisplay && (
          <Text size="xs" c="dimmed">
            Added: {bookmark.ageDisplay}
          </Text>
        )}
        {bookmark.dateAdded && !bookmark.ageDisplay && (
          <Text size="xs" c="dimmed">
            Added: {format(chromeTimeToDate(bookmark.dateAdded), 'PPp')}
          </Text>
        )}
        {bookmark.dateLastUsed !== undefined && (
          <Text size="xs" c="dimmed">
            {bookmark.dateLastUsed === 0 ? 'Never visited' : 'Previously visited'}
          </Text>
        )}
        {bookmark.dateLastUsed !== undefined && bookmark.dateLastUsed > 0 && (
          <Text size="xs" c="dimmed">
            Last visited: {format(chromeTimeToDate(bookmark.dateLastUsed), 'PPp')}
          </Text>
        )}
      </Stack>
    </Card>
  );
} 