const { Redis } = require('@upstash/redis');

// automaticDeserialization is off so big Discord IDs stay strings (they overflow JS numbers).
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN,
  automaticDeserialization: false,
});
const getJSON = async k => { const v = await redis.get(k); return v == null ? null : JSON.parse(v); };
const setJSON = (k, v, opts) => redis.set(k, JSON.stringify(v), opts);

module.exports = { redis, getJSON, setJSON };
