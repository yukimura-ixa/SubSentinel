interface KvLike {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
}

const memory = new Map<string, { value: unknown; expiresAt?: number }>();

export const kv: KvLike = {
  async get(key) {
    const entry = memory.get(key);
    if (!entry) return null;
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      memory.delete(key);
      return null;
    }
    return entry.value as unknown;
  },
  async set(key, value, ttl) {
    memory.set(key, { value, expiresAt: ttl ? Date.now() + ttl * 1000 : undefined });
  }
};

export function withKvFallback<T>(key: string, ttl: number, compute: () => Promise<T>) {
  return async () => {
    const cached = await kv.get<T>(key);
    if (cached) return cached;
    const value = await compute();
    await kv.set(key, value, ttl);
    return value;
  };
}
