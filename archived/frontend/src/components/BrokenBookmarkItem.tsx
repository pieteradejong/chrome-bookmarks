import { Card, Text, Group, Stack } from '@mantine/core';
import { 
  IconAlertCircle, 
  IconLock,
  IconWorld,
  IconServer,
  IconClock,
  IconPlug,
  IconShieldLock
} from '@tabler/icons-react';
import { format } from 'date-fns';
import { ErrorCategory } from '../types/bookmarks';
import type { BrokenBookmark } from '../types/bookmarks';
import { BookmarkStatusBar } from './BookmarkStatusBar';
import { useBookmarkStatusContext } from '../contexts/BookmarkStatusContext';

interface BrokenBookmarkItemProps {
  brokenBookmark: BrokenBookmark;
  onClick?: (brokenBookmark: BrokenBookmark) => void;
  // onDelete?: (brokenBookmark: BrokenBookmark) => void;
}

const getErrorCategoryIcon = (category: ErrorCategory) => {
  switch (category) {
    case ErrorCategory.AUTH_REQUIRED:
      return <IconLock size={20} />;
    case ErrorCategory.DNS_FAILURE:
      return <IconWorld size={20} />;
    case ErrorCategory.SERVER_ERROR:
      return <IconServer size={20} />;
    case ErrorCategory.TIMEOUT:
      return <IconClock size={20} />;
    case ErrorCategory.CONNECTION_ERROR:
      return <IconPlug size={20} />;
    case ErrorCategory.SSL_ERROR:
      return <IconShieldLock size={20} />;
    default:
      return <IconAlertCircle size={20} />;
  }
};

const getErrorCategoryColor = (category: ErrorCategory): string => {
  switch (category) {
    case ErrorCategory.AUTH_REQUIRED:
      return 'yellow';
    case ErrorCategory.DNS_FAILURE:
      return 'blue';
    case ErrorCategory.SERVER_ERROR:
      return 'red';
    case ErrorCategory.TIMEOUT:
      return 'orange';
    case ErrorCategory.CONNECTION_ERROR:
      return 'grape';
    case ErrorCategory.SSL_ERROR:
      return 'cyan';
    case ErrorCategory.NOT_FOUND:
      return 'gray';
    default:
      return 'red';
  }
};

export function BrokenBookmarkItem({ brokenBookmark, onClick }: BrokenBookmarkItemProps) {
  const { bookmark, error } = brokenBookmark;
  const { getStatus, loading } = useBookmarkStatusContext();
  
  const status = getStatus(bookmark.id);

  return (
    <Card 
      shadow="sm" 
      padding={0}
      radius="md" 
      withBorder
      style={{ cursor: 'pointer', overflow: 'hidden' }}
      onClick={() => onClick?.(brokenBookmark)}
    >
      <div style={{ padding: 'var(--mantine-spacing-lg)' }}>
        <Group justify="space-between" mb="xs">
          <Group gap="xs">
            {getErrorCategoryIcon(error.category)}
            <Text fw={500}>{bookmark.name}</Text>
          </Group>
          <Group gap="xs">
            {/* <ActionIcon
              color="red"
              variant="subtle"
              onClick={(e) => {
                e.stopPropagation(); // Prevent card click event
                onDelete?.(brokenBookmark);
              }}
            >
              <IconTrash size={16} />
            </ActionIcon> */}
            {/* <Badge color={getErrorCategoryColor(error.category)}>
              {error.category}
            </Badge> */}
          </Group>
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
          <Text size="sm" c={getErrorCategoryColor(error.category)}>
            {error.message}
          </Text>
        </Stack>
      </div>
      
      {/* Status bar showing broken bookmark status */}
      <BookmarkStatusBar 
        status={status}
        loading={loading && !status}
      />
    </Card>
  );
} 