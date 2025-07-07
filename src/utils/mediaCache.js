class MediaCache {
  constructor() {
    this.cache = new Map();
    this.maxSize = 50; // Maximum number of cached items
  }

  set(key, value) {
    // Remove oldest item if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      data: value,
      timestamp: Date.now()
    });
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    // Check if item is expired (1 hour)
    if (Date.now() - item.timestamp > 3600000) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  clear() {
    this.cache.clear();
  }
}

export const mediaCache = new MediaCache();
