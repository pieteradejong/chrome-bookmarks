import { Card, Text, Group, Badge, Stack } from '@mantine/core';
import { IconFolder, IconLink } from '@tabler/icons-react';
import { format } from 'date-fns';
import type { Bookmark } from '../types/bookmarks';

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
        {bookmark.dateAdded && (
          <Text size="xs" c="dimmed">
            Added: {format(bookmark.dateAdded, 'PPp')}
          </Text>
        )}
        {bookmark.lastVisited && (
          <Text size="xs" c="dimmed">
            Last visited: {format(bookmark.lastVisited, 'PPp')}
          </Text>
        )}
      </Stack>
    </Card>
  );
} 