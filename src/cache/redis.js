import { createClient } from 'redis';

const PREFIX = (process.env.REDIS_PREFIX || 'videolab') + ':';

export const redis = createClient(process.env.REDIS_URL ? { url: process.env.REDIS_URL } : {
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT || 6379),
    tls: process.env.REDIS_TLS === 'true' || Number(process.env.REDIS_PORT || 6379) === 6380 ? {} : undefined
  }
});

redis.on('error', (err) => {
  // eslint-disable-next-line no-console
  console.error('Redis error', err?.message || err);
});

let connected = false;
export async function ensureRedis() {
  if (!connected) {
    await redis.connect();
    connected = true;
  }
}

const k = (key) => PREFIX + key;

export async function cacheGet(key) {
  await ensureRedis();
  return redis.get(k(key));
}

export async function cacheSet(key, value, ttlSec = 60) {
  await ensureRedis();
  return redis.set(k(key), value, { EX: ttlSec });
}

export async function cacheJGet(key) {
  const v = await cacheGet(key);
  return v ? JSON.parse(v) : null;
}

export async function cacheJSet(key, obj, ttlSec = 60) {
  return cacheSet(key, JSON.stringify(obj), ttlSec);
}
