import { CacheEntry } from '../types.js';
import { ensureDirectoryExists, fileExists, readTextFile, writeTextFile } from '../../../utils/fileSystem.js';
import { createHash } from 'crypto';
import { join } from 'path';

/**
 * File-based cache implementation for language detection
 */
export class DetectionCache {
  private cacheDir: string;
  private defaultTTL: number = 30 * 60 * 1000; // 30 minutes in milliseconds

  constructor(cacheDir: string = './mcp/cache') {
    this.cacheDir = cacheDir;
  }

  /**
   * Initialize the cache directory
   */
  async init(): Promise<void> {
    await ensureDirectoryExists(this.cacheDir);
  }

  /**
   * Get a value from cache
   * @param key Cache key
   * @returns Cached value or null if not found or expired
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const cacheFile = this.getCacheFilePath(key);
      
      // Directly attempt to read and parse, eliminating TOCTOU window
      const content = await readTextFile(cacheFile);
      const entry: CacheEntry<T> = JSON.parse(content);
      
      // Check if entry has expired
      if (Date.now() - entry.timestamp > entry.ttl) {
        // Remove expired entry
        await this.delete(key);
        return null;
      }

      return entry.data;
    } catch (error) {
      // File doesn't exist or parse error - return null
      return null;
    }
  }

  /**
   * Set a value in cache
   * @param key Cache key
   * @param data Data to cache
   * @param ttl Time to live in milliseconds
   */
  async set<T>(key: string, data: T, ttl: number = this.defaultTTL): Promise<void> {
    try {
      await this.init();
      
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl
      };
      
      const content = JSON.stringify(entry);
      const cacheFile = this.getCacheFilePath(key);
      
      await writeTextFile(cacheFile, content);
    } catch (error) {
      console.error(`Error setting cache entry for key ${key}:`, error);
    }
  }

  /**
   * Delete a value from cache
   * @param key Cache key to delete
   */
  async delete(key: string): Promise<void> {
    try {
      const cacheFile = this.getCacheFilePath(key);
      
      if (await fileExists(cacheFile)) {
        const { unlink } = await import('fs/promises');
        await unlink(cacheFile);
      }
    } catch (error) {
      console.error(`Error deleting cache entry for key ${key}:`, error);
    }
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    try {
      const { readdir, unlink } = await import('fs/promises');
      const files = await readdir(this.cacheDir);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          await unlink(`${this.cacheDir}/${file}`);
        }
      }
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  /**
   * Get cache file path for a key
   * @param key Cache key
   * @returns File path for the cache entry
   */
  private getCacheFilePath(key: string): string {
    // Generate hash of the full key to avoid collisions
    const hash = createHash('sha256').update(key).digest('hex').substring(0, 16);
    
    // Create a short sanitized prefix for readability (first 20 alphanumeric chars)
    const sanitizedPrefix = key.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
    
    // Build path with prefix and hash
    const filename = sanitizedPrefix ? `${sanitizedPrefix}-${hash}.json` : `${hash}.json`;
    return join(this.cacheDir, filename);
  }

  /**
   * Generate a cache key from parameters
   * @param params Parameters to include in the key
   * @returns Generated cache key
   */
  static generateKey(params: Record<string, any>): string {
    // Sort keys to ensure consistent ordering
    const sortedKeys = Object.keys(params).sort();
    
    // Build key string
    let key = '';
    for (const k of sortedKeys) {
      if (key) {
        key += ':';
      }
      key += `${k}=${params[k]}`;
    }
    
    return key;
  }

  /**
   * Get cache statistics
   * @returns Cache statistics
   */
  async getStats(): Promise<{
    totalEntries: number;
    totalSize: number;
    expiredEntries: number;
  }> {
    try {
      const { readdir, stat } = await import('fs/promises');
      const files = await readdir(this.cacheDir);
      
      let totalEntries = 0;
      let totalSize = 0;
      let expiredEntries = 0;
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          totalEntries++;
          
          const filePath = `${this.cacheDir}/${file}`;
          const stats = await stat(filePath);
          totalSize += stats.size;
          
          try {
            const content = await readTextFile(filePath);
            const entry: CacheEntry<any> = JSON.parse(content);
            
            if (Date.now() - entry.timestamp > entry.ttl) {
              expiredEntries++;
            }
          } catch (error) {
            // If we can't parse the file, assume it's expired
            expiredEntries++;
          }
        }
      }
      
      return {
        totalEntries,
        totalSize,
        expiredEntries
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return {
        totalEntries: 0,
        totalSize: 0,
        expiredEntries: 0
      };
    }
  }

  /**
   * Clean up expired cache entries
   */
  async cleanup(): Promise<number> {
    try {
      const { readdir, unlink } = await import('fs/promises');
      const files = await readdir(this.cacheDir);
      
      let cleanedCount = 0;
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = `${this.cacheDir}/${file}`;
          
          try {
            const content = await readTextFile(filePath);
            const entry: CacheEntry<any> = JSON.parse(content);
            
            if (Date.now() - entry.timestamp > entry.ttl) {
              await unlink(filePath);
              cleanedCount++;
            }
          } catch (error) {
            // If we can't parse the file, delete it
            await unlink(filePath);
            cleanedCount++;
          }
        }
      }
      
      return cleanedCount;
    } catch (error) {
      console.error('Error cleaning up cache:', error);
      return 0;
    }
  }
}

// Default cache instance
const defaultCache = new DetectionCache();

// Helper functions for easy access
export async function getFromCache<T>(key: string): Promise<T | null> {
  return await defaultCache.get<T>(key);
}

export async function setInCache<T>(key: string, data: T, ttl?: number): Promise<void> {
  return await defaultCache.set<T>(key, data, ttl);
}
