type CacheEntry<T> = {
  expiresAt: number;
  timeout: Timer;
  value: T;
};

export class TTLCache<K, V> {
  private readonly entries = new Map<K, CacheEntry<V>>();

  constructor(private readonly ttlMs: number) {}

  get(key: K): V | undefined {
    const entry = this.entries.get(key);
    if (!entry) {
      return undefined;
    }

    if (Date.now() >= entry.expiresAt) {
      this.delete(key);
      return undefined;
    }

    return entry.value;
  }

  set(key: K, value: V): V {
    this.delete(key);

    const timeout = setTimeout(() => {
      this.entries.delete(key);
    }, this.ttlMs);

    this.entries.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs,
      timeout,
    });

    return value;
  }

  delete(key: K): void {
    const existing = this.entries.get(key);
    if (!existing) {
      return;
    }

    clearTimeout(existing.timeout);
    this.entries.delete(key);
  }
}
