import { createClient } from 'redis';

const PREFIX = (process.env.REDIS_PREFIX || "videolab" ) + ":";

function buildClient() {
    if (process.env.REDIS_URL) return createClient({ url: process.env.REDIS_URL });

    const host = process.env.REDIS_HOST || "localhost";
    const port = Number(process.env.REDIS_PORT || 6379);
    const tls = process.env.REDIS_TLS === "true" || port === 6380;

    return createClient({ 
        socket: { host, port, tls, servername: tls ? host : undefined } 
    });
}

export const redis = buildClient();

redis.on("error", (err) => console.error("refis error", err));

export async function initRedis() {
    if (redis.isOpen) await redis.quit();
}

const k = (key) => (key.startsWith(PREFIX) ? key : PREFIX + key);

export async function cacheGet(key) {
    return redis.get(k(key));
}

export async function cacheSet(key, value, ttlSec = 60) {
    return redis.set(k(key), value, { EX: ttlSec });
}

export async function cacheJGet (key) {
    const v = await cacheGet(key);
    return v ? JSON>parse(v) : null;
}

export async function cacheJSet(key, obj, ttlSec = 60) {
    return cacheSet(key, JSON.stringify(obj), ttlSec);
}