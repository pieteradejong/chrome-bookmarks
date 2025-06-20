import { Box, Group, Text, Loader, Badge } from '@mantine/core';
import { IconCheck, IconX, IconClock, IconLock, IconQuestionMark } from '@tabler/icons-react';
import { formatDistanceToNow } from 'date-fns';
import type { BookmarkStatus } from '../types/bookmarks';

interface BookmarkStatusBarProps {
  status?: BookmarkStatus;
  loading?: boolean;
}

export function BookmarkStatusBar({ status, loading }: BookmarkStatusBarProps) {
  if (loading) {
    return (
      <Box 
        bg="gray.1" 
        p="xs" 
        style={{ 
          borderTop: '1px solid #e9ecef',
          borderRadius: '0 0 var(--mantine-radius-md) var(--mantine-radius-md)'
        }}
      >
        <Group gap="xs" justify="center">
          <Loader size="xs" />
          <Text size="xs" c="dimmed">Checking status...</Text>
        </Group>
      </Box>
    );
  }

  if (!status || !status.checked) {
    return (
      <Box 
        bg="gray.1" 
        p="xs" 
        style={{ 
          borderTop: '1px solid #e9ecef',
          borderRadius: '0 0 var(--mantine-radius-md) var(--mantine-radius-md)'
        }}
      >
        <Group gap="xs" justify="center">
          <IconQuestionMark size={12} color="gray" />
          <Text size="xs" c="dimmed">Status unknown</Text>
        </Group>
      </Box>
    );
  }

  const getStatusContent = () => {
    if (status.accessible === true) {
      return {
        icon: <IconCheck size={12} color="green" />,
        text: "Link works",
        color: "green.1",
        textColor: "green.7"
      };
    } else if (status.accessible === false) {
      if (status.loginRequired) {
        return {
          icon: <IconLock size={12} color="yellow" />,
          text: "Login required",
          color: "yellow.1",
          textColor: "yellow.7"
        };
      } else {
        return {
          icon: <IconX size={12} color="red" />,
          text: "Link broken",
          color: "red.1",
          textColor: "red.7"
        };
      }
    } else {
      return {
        icon: <IconQuestionMark size={12} color="gray" />,
        text: "Status unclear",
        color: "gray.1",
        textColor: "gray.6"
      };
    }
  };

  const { icon, text, color, textColor } = getStatusContent();
  
  const lastCheckedText = status.lastChecked 
    ? `Checked ${formatDistanceToNow(new Date(status.lastChecked), { addSuffix: true })}`
    : 'Never checked';

  return (
    <Box 
      bg={color} 
      p="xs" 
      style={{ 
        borderTop: '1px solid #e9ecef',
        borderRadius: '0 0 var(--mantine-radius-md) var(--mantine-radius-md)'
      }}
    >
      <Group justify="space-between" gap="xs">
        <Group gap="xs">
          {icon}
          <Text size="xs" c={textColor} fw={500}>
            {text}
          </Text>
          {status.statusCode && (
            <Badge size="xs" variant="light" color={status.statusCode < 400 ? 'green' : 'red'}>
              {status.statusCode}
            </Badge>
          )}
        </Group>
        
        <Group gap="xs">
          {status.responseTime && (
            <Text size="xs" c="dimmed">
              {Math.round(status.responseTime * 1000)}ms
            </Text>
          )}
          <Text size="xs" c="dimmed">
            <IconClock size={10} style={{ marginRight: 2 }} />
            {lastCheckedText}
          </Text>
        </Group>
      </Group>
    </Box>
  );
} 