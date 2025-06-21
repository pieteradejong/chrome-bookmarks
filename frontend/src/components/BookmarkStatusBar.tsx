import React from 'react';
import { Box, Group, Text, Loader, Badge } from '@mantine/core';
import { IconCheck, IconX, IconLock, IconRobot, IconClock, IconServerOff, IconTrash, IconQuestionMark } from '@tabler/icons-react';
import type { BookmarkStatus } from '../types/bookmarks';

interface BookmarkStatusBarProps {
  status: BookmarkStatus | null;
  loading?: boolean;
}

export const BookmarkStatusBar: React.FC<BookmarkStatusBarProps> = ({ status, loading }) => {
  const getStatusInfo = () => {
    if (!status) {
      return {
        icon: <IconQuestionMark size={14} />,
        text: 'Status unknown',
        color: 'gray',
        bgColor: 'gray.1',
        description: null
      };
    }
    
    // Use the new fields if available, fall back to old logic
    if (status.broken_status === 'ok' || status.accessible === true) {
      if (status.login_required === 'yes' || status.loginRequired) {
        return {
          icon: <IconLock size={14} />,
          text: 'Login required',
          color: 'yellow.7',
          bgColor: 'yellow.1',
          description: 'This page exists but requires authentication'
        };
      }
      if (status.login_required === 'bot_protected') {
        return {
          icon: <IconRobot size={14} />,
          text: 'Bot protection',
          color: 'blue.7',
          bgColor: 'blue.1',
          description: 'This page blocks automated requests'
        };
      }
      return {
        icon: <IconCheck size={14} />,
        text: 'Link works',
        color: 'green.7',
        bgColor: 'green.1',
        description: null
      };
    }
    
    // Handle broken status with different reasons
    if (status.broken_status === 'broken' || status.accessible === false) {
      const statusCode = status.error_details?.status_code || status.statusCode;
      
      if (statusCode === 404) {
        return {
          icon: <IconX size={14} />,
          text: 'Page not found',
          color: 'red.7',
          bgColor: 'red.1',
          description: 'This page does not exist (404)'
        };
      }
      
      if (statusCode === 410) {
        return {
          icon: <IconTrash size={14} />,
          text: 'Page removed',
          color: 'orange.7',
          bgColor: 'orange.1',
          description: 'This page was permanently removed (410)'
        };
      }
      
      if (statusCode === 500 || statusCode === 503) {
        return {
          icon: <IconServerOff size={14} />,
          text: 'Server error',
          color: 'grape.7',
          bgColor: 'grape.1',
          description: `Server is having issues (${statusCode})`
        };
      }
      
      if (statusCode === 429) {
        return {
          icon: <IconClock size={14} />,
          text: 'Rate limited',
          color: 'yellow.8',
          bgColor: 'yellow.2',
          description: 'Too many requests - try again later'
        };
      }
      
      if (statusCode === 403) {
        return {
          icon: <IconLock size={14} />,
          text: 'Access forbidden',
          color: 'red.7',
          bgColor: 'red.1',
          description: 'Access to this page is forbidden (403)'
        };
      }
      
      if (!statusCode && status.error_details?.error) {
        return {
          icon: <IconX size={14} />,
          text: 'Connection error',
          color: 'red.7',
          bgColor: 'red.1',
          description: 'Could not connect to the server'
        };
      }
      
      return {
        icon: <IconX size={14} />,
        text: 'Link broken',
        color: 'red.7',
        bgColor: 'red.1',
        description: statusCode ? `HTTP ${statusCode} error` : 'Unknown error'
      };
    }
    
    return {
      icon: <IconQuestionMark size={14} />,
      text: 'Status unknown',
      color: 'gray.6',
      bgColor: 'gray.1',
      description: null
    };
  };

  if (loading) {
    return (
      <Box 
        bg="gray.1" 
        p="xs" 
        style={{ 
          borderTop: '1px solid var(--mantine-color-gray-3)'
        }}
      >
        <Group gap="xs" justify="center">
          <Loader size="xs" />
          <Text size="xs" c="dimmed">Checking status...</Text>
        </Group>
      </Box>
    );
  }

  const statusInfo = getStatusInfo();
  const lastChecked = status?.lastChecked ? new Date(status.lastChecked) : null;
  const statusCode = status?.error_details?.status_code || status?.statusCode;

  return (
    <Box 
      bg={statusInfo.bgColor}
      p="sm"
      style={{ 
        borderTop: '1px solid var(--mantine-color-gray-3)'
      }}
    >
      <Group justify="space-between" gap="xs">
        <Group gap="xs">
          <Box c={statusInfo.color}>
            {statusInfo.icon}
          </Box>
          <Text size="sm" c={statusInfo.color} fw={500}>
            {statusInfo.text}
          </Text>
          {statusCode && (
            <Badge size="xs" variant="light" color={statusCode < 400 ? 'green' : 'red'}>
              HTTP {statusCode}
            </Badge>
          )}
        </Group>
        
        {lastChecked && (
          <Text size="xs" c="dimmed">
            Checked: {lastChecked.toLocaleDateString()}
          </Text>
        )}
      </Group>
      
      {statusInfo.description && (
        <Text size="xs" c="dimmed" mt="xs">
          {statusInfo.description}
        </Text>
      )}
    </Box>
  );
}; 