import { Card, Text, Group, Button, Stack, Progress, Tooltip } from '@mantine/core';
import { IconRefresh, IconTrash } from '@tabler/icons-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCacheStats, clearCache, type CacheStats } from '../api/client';

export function CacheStats() {
  const queryClient = useQueryClient();

  const { data: stats, isLoading } = useQuery<CacheStats>({
    queryKey: ['cache-stats'],
    queryFn: getCacheStats,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const clearCacheMutation = useMutation({
    mutationFn: clearCache,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cache-stats'] });
      queryClient.invalidateQueries({ queryKey: ['broken-bookmarks'] });
    },
  });

  if (isLoading || !stats) {
    return null;
  }

  const validPercentage = (stats.valid_entries / stats.total_cached) * 100;
  const expiredPercentage = (stats.expired_entries / stats.total_cached) * 100;

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Stack gap="xs">
        <Group justify="space-between" align="center">
          <Text fw={500} size="lg">Cache Statistics</Text>
          <Group gap="xs">
            <Tooltip label="Refresh Stats">
              <Button
                variant="light"
                size="xs"
                onClick={() => queryClient.invalidateQueries({ queryKey: ['cache-stats'] })}
              >
                <IconRefresh size={16} />
              </Button>
            </Tooltip>
            <Tooltip label="Clear Cache">
              <Button
                variant="light"
                color="red"
                size="xs"
                onClick={() => clearCacheMutation.mutate()}
                loading={clearCacheMutation.isPending}
              >
                <IconTrash size={16} />
              </Button>
            </Tooltip>
          </Group>
        </Group>

        <Stack gap="xs">
          <Group justify="space-between">
            <Text size="sm">Total Cached URLs</Text>
            <Text size="sm" fw={500}>{stats.total_cached}</Text>
          </Group>

          <Stack gap={4}>
            <Group justify="space-between">
              <Text size="sm">Cache Status</Text>
              <Text size="sm" c="dimmed">
                {stats.valid_entries} valid, {stats.expired_entries} expired
              </Text>
            </Group>
            <Progress.Root size="sm">
              <Tooltip label={`${validPercentage.toFixed(1)}% valid`}>
                <Progress.Section
                  value={validPercentage}
                  color="green"
                >
                  <Progress.Label>{stats.valid_entries}</Progress.Label>
                </Progress.Section>
              </Tooltip>
              <Tooltip label={`${expiredPercentage.toFixed(1)}% expired`}>
                <Progress.Section
                  value={expiredPercentage}
                  color="red"
                >
                  <Progress.Label>{stats.expired_entries}</Progress.Label>
                </Progress.Section>
              </Tooltip>
            </Progress.Root>
          </Stack>

          <Text size="xs" c="dimmed" ta="right">
            Cache expires after {stats.cache_expiry_days} days
          </Text>
        </Stack>
      </Stack>
    </Card>
  );
} 