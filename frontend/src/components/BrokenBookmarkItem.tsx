import { Card, Text, Group, Badge, Stack, Collapse, Button } from '@mantine/core';
import { 
  IconAlertCircle, 
  IconChevronDown, 
  IconChevronUp,
  IconLock,
  IconWorld,
  IconServer,
  IconClock,
  IconPlug,
  IconShieldLock
} from '@tabler/icons-react';
import { format } from 'date-fns';
import { useState } from 'react';
import { ErrorCategory } from '../types/bookmarks';
import type { BrokenBookmark } from '../types/bookmarks';

interface BrokenBookmarkItemProps {
  brokenBookmark: BrokenBookmark;
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

export function BrokenBookmarkItem({ brokenBookmark }: BrokenBookmarkItemProps) {
  const [showDetails, setShowDetails] = useState(false);
  const { bookmark, error, details } = brokenBookmark;

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Group justify="space-between" mb="xs">
        <Group gap="xs">
          {getErrorCategoryIcon(error.category)}
          <Text fw={500}>{bookmark.name}</Text>
        </Group>
        <Badge color={getErrorCategoryColor(error.category)}>
          {error.category}
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
        <Text size="sm" c={getErrorCategoryColor(error.category)}>
          {error.message}
        </Text>

        {details && (
          <>
            <Button
              variant="subtle"
              size="xs"
              rightSection={showDetails ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? 'Hide Details' : 'Show Details'}
            </Button>

            <Collapse in={showDetails}>
              <Stack gap="xs" pl="md">
                {details.dnsResolved !== undefined && (
                  <Text size="sm">
                    DNS Resolution: {details.dnsResolved ? '✓' : '✗'}
                  </Text>
                )}
                {details.sslValid !== undefined && (
                  <Text size="sm">
                    SSL Valid: {details.sslValid ? '✓' : '✗'}
                  </Text>
                )}
                {details.statusCode && (
                  <Text size="sm">
                    Status Code: {details.statusCode}
                  </Text>
                )}
                {details.contentType && (
                  <Text size="sm">
                    Content Type: {details.contentType}
                  </Text>
                )}
                {details.responseTime && (
                  <Text size="sm">
                    Response Time: {details.responseTime.toFixed(2)}s
                  </Text>
                )}
                {details.finalUrl && details.finalUrl !== bookmark.url && (
                  <Text size="sm">
                    Final URL: {details.finalUrl}
                  </Text>
                )}
              </Stack>
            </Collapse>
          </>
        )}
      </Stack>
    </Card>
  );
} 