from typing import Any, Optional
import json
from datetime import datetime, timedelta
from redis.asyncio import Redis
from app.config import logger

class RedisCache:
    def __init__(self, redis_url: str = "redis://localhost:6379"):
        self.redis_url = redis_url
        self._redis: Optional[Redis] = None
        self._prefix = "bookmarks:"
        self._default_expiry = timedelta(days=7)

    async def connect(self) -> None:
        """Connect to Redis server."""
        if not self._redis:
            try:
                self._redis = Redis.from_url(self.redis_url, decode_responses=True)
                await self._redis.ping()  # Test connection
                logger.info("Connected to Redis server")
            except Exception as e:
                logger.error(f"Failed to connect to Redis: {e}")
                raise

    async def disconnect(self) -> None:
        """Disconnect from Redis server."""
        if self._redis:
            await self._redis.close()
            self._redis = None
            logger.info("Disconnected from Redis server")

    async def get(self, key: str) -> Optional[Any]:
        """Get a value from cache."""
        if not self._redis:
            await self.connect()
        
        try:
            data = await self._redis.get(f"{self._prefix}{key}")
            if data:
                return json.loads(data)
            return None
        except Exception as e:
            logger.error(f"Error getting cache key {key}: {e}")
            return None

    async def set(
        self, 
        key: str, 
        value: Any, 
        expiry: Optional[timedelta] = None
    ) -> bool:
        """Set a value in cache."""
        if not self._redis:
            await self.connect()
        
        try:
            expiry = expiry or self._default_expiry
            await self._redis.set(
                f"{self._prefix}{key}",
                json.dumps(value),
                ex=int(expiry.total_seconds())
            )
            return True
        except Exception as e:
            logger.error(f"Error setting cache key {key}: {e}")
            return False

    async def delete(self, key: str) -> bool:
        """Delete a value from cache."""
        if not self._redis:
            await self.connect()
        
        try:
            await self._redis.delete(f"{self._prefix}{key}")
            return True
        except Exception as e:
            logger.error(f"Error deleting cache key {key}: {e}")
            return False

    async def clear(self) -> bool:
        """Clear all cached values."""
        if not self._redis:
            await self.connect()
        
        try:
            keys = await self._redis.keys(f"{self._prefix}*")
            if keys:
                await self._redis.delete(*keys)
            return True
        except Exception as e:
            logger.error(f"Error clearing cache: {e}")
            return False

    async def get_stats(self) -> dict:
        """Get cache statistics."""
        if not self._redis:
            await self.connect()
        
        try:
            keys = await self._redis.keys(f"{self._prefix}*")
            total_keys = len(keys)
            
            # Get TTL for each key
            now = datetime.now()
            valid_keys = 0
            expired_keys = 0
            
            for key in keys:
                ttl = await self._redis.ttl(key)
                if ttl > 0:
                    valid_keys += 1
                else:
                    expired_keys += 1
            
            return {
                "total_keys": total_keys,
                "valid_keys": valid_keys,
                "expired_keys": expired_keys,
                "default_expiry_days": self._default_expiry.days
            }
        except Exception as e:
            logger.error(f"Error getting cache stats: {e}")
            return {
                "total_keys": 0,
                "valid_keys": 0,
                "expired_keys": 0,
                "default_expiry_days": self._default_expiry.days,
                "error": str(e)
            }

# Create a singleton instance
cache = RedisCache() 