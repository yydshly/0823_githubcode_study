export const ASSET_CACHE_SCHEMA = 'kindergrimm-runtime-cache/0.1';

export function assetCacheKey(record = {}) {
  const asset = record.assetFingerprint ?? record.fingerprint;
  if (!asset) throw new Error('asset fingerprint is required');
  return [record.packFingerprint ?? 'no-pack', record.rendererFingerprint ?? 'no-renderer', asset, record.visualFingerprint ?? 'no-visual'].join(':');
}

export function createAssetCache(options = {}) {
  const maxEntries = Math.max(1, Number(options.maxEntries) || 128);
  const entries = new Map();
  const metrics = { hits: 0, misses: 0, builds: 0, evictions: 0 };

  function touch(key, entry) {
    entries.delete(key);
    entries.set(key, entry);
  }

  function evict() {
    while (entries.size > maxEntries) {
      const [key, entry] = entries.entries().next().value;
      entries.delete(key);
      entry.value?.dispose?.();
      metrics.evictions += 1;
    }
  }

  async function resolve(record, factory) {
    const key = assetCacheKey(record);
    const current = entries.get(key);
    if (current) {
      metrics.hits += 1;
      current.uses += 1;
      touch(key, current);
      return current.promise ?? current.value;
    }
    if (typeof factory !== 'function') throw new Error(`cache miss for ${key} requires a factory`);
    metrics.misses += 1;
    const entry = { key, value: null, promise: null, uses: 1 };
    entry.promise = Promise.resolve().then(factory).then(value => {
      entry.value = value;
      entry.promise = null;
      metrics.builds += 1;
      return value;
    }).catch(error => {
      entries.delete(key);
      throw error;
    });
    entries.set(key, entry);
    evict();
    return entry.promise;
  }

  function has(record) { return entries.has(assetCacheKey(record)); }

  function remove(record) {
    const key = assetCacheKey(record);
    const entry = entries.get(key);
    if (!entry) return false;
    entries.delete(key);
    entry.value?.dispose?.();
    return true;
  }

  function clear() {
    for (const entry of entries.values()) entry.value?.dispose?.();
    entries.clear();
  }

  function snapshot() {
    return {
      schemaVersion: ASSET_CACHE_SCHEMA,
      maxEntries,
      entries: entries.size,
      keys: [...entries.keys()],
      ...metrics
    };
  }

  return { resolve, has, remove, clear, snapshot };
}
