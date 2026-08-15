const Redis = require('ioredis');

// Check if Redis is enabled or configured
// If REDIS_URL is provided, or REDIS_HOST is provided, or in development with local Redis
const shouldConnect = Boolean(
  process.env.REDIS_URL || 
  process.env.REDIS_HOST || 
  process.env.ENABLE_REDIS === 'true' ||
  process.env.NODE_ENV !== 'production'
);

let isRedisConnected = false;
let redis = null;

if (shouldConnect) {
  const redisUrl = process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || '127.0.0.1'}:${process.env.REDIS_PORT || 6379}`;
  
  try {
    redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      retryStrategy(times) {
        if (times > 2) {
          // Stop retrying quickly so it doesn't block or spam logs
          return null;
        }
        return Math.min(times * 300, 1000);
      },
      connectTimeout: 2000,
      enableOfflineQueue: false,
      lazyConnect: true // Don't block app startup
    });

    redis.connect().then(() => {
      isRedisConnected = true;
      console.log('⚡ [Redis] Connected successfully - In-memory cache is active!');
    }).catch((err) => {
      isRedisConnected = false;
      // Graceful silence on Render / non-Redis environments
      if (process.env.NODE_ENV === 'production' && !process.env.REDIS_URL) {
        // Expected on Render without Redis
      } else {
        console.log('ℹ️ [Redis] Running without Redis cache (serving directly from MongoDB).');
      }
    });

    redis.on('error', (err) => {
      isRedisConnected = false;
    });

    redis.on('close', () => {
      isRedisConnected = false;
    });
  } catch (err) {
    isRedisConnected = false;
  }
} else {
  console.log('ℹ️ [Redis] Running in direct MongoDB mode.');
}

/**
 * Safe Get Cache
 */
async function getCache(key) {
  if (!isRedisConnected || !redis) return null;
  try {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    return null;
  }
}

/**
 * Safe Set Cache with TTL (default 2 hours)
 */
async function setCache(key, value, ttlSeconds = 7200) {
  if (!isRedisConnected || !redis) return;
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch (err) {
    // Ignore cache set error
  }
}

/**
 * Safe Delete Cache
 */
async function delCache(key) {
  if (!isRedisConnected || !redis) return;
  try {
    await redis.del(key);
  } catch (err) {
    // Ignore cache delete error
  }
}

/**
 * Safe Delete Cache by Prefix Pattern (e.g., 'pyqset:*')
 */
async function delCachePattern(pattern) {
  if (!isRedisConnected || !redis) return;
  try {
    const keys = await redis.keys(pattern);
    if (keys && keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (err) {
    // Ignore cache delete error
  }
}

module.exports = {
  redis,
  getCache,
  setCache,
  delCache,
  delCachePattern,
  isConnected: () => isRedisConnected
};
