import { RedisClient } from "bun";
import { CACHE_TTL_MS, REDIS_CACHE_PREFIX, REDIS_URL } from "../config";

const redisUrl = REDIS_URL.trim();
const redisAvailable = redisUrl.length > 0;
let redisClient: RedisClient | null = null;
let redisDisabled = false;

const getClient = (): RedisClient | null => {
  if (!redisAvailable || redisDisabled) {
    return null;
  }

  if (!redisClient) {
    redisClient = new RedisClient(redisUrl);
    redisClient.onclose = function (error) {
      console.error("Redis connection closed:", error);
    };
  }

  return redisClient;
};

const makeKey = (key: string) => `${REDIS_CACHE_PREFIX}${key}`;

export const isRedisEnabled = (): boolean => Boolean(getClient());

export const getCachedJson = async <T>(key: string): Promise<T | null> => {
  const client = getClient();
  if (!client) {
    return null;
  }

  try {
    const value = await client.get(makeKey(key));
    if (!value) {
      return null;
    }
    return JSON.parse(value) as T;
  } catch (error) {
    console.error("Redis GET failed, disabling Redis cache:", error);
    redisDisabled = true;
    return null;
  }
};

export const setCachedJson = async <T>(
  key: string,
  value: T,
  ttlMs = CACHE_TTL_MS,
): Promise<void> => {
  const client = getClient();
  if (!client) {
    return;
  }

  const ttlSeconds = Math.max(1, Math.ceil(ttlMs / 1000));

  try {
    await client.set(makeKey(key), JSON.stringify(value), "EX", ttlSeconds);
  } catch (error) {
    console.error("Redis SET failed, disabling Redis cache:", error);
    redisDisabled = true;
  }
};
