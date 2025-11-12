import * as fs from 'fs/promises';
import * as path from 'path';
import { ensureDirectoryExists } from './fileSystem';

/**
 * Cache entry with timestamp
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl?: number; // Time to live in milliseconds
}

/**
 * Simple file-based cache implementation
 */
export class FileCache {
  private cacheDir: string;

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
      const filePath = this.getCacheFilePath(key);
      const entry = await this.readCacheEntry<T>(filePath);
      
      if (!entry) {
        return null;
      }
      
      // Check if the entry has expired
      if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
        await fs.unlink(filePath); // Remove expired entry
        return null;
      }
      
      return entry.data;
    } catch {
      return null;
    }
  }

  /**
   * Set a value in cache
   * @param key Cache key
   * @param data Data to cache
   * @param ttl Optional time to live in milliseconds
   */
  async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    await this.init();
    
    const filePath = this.getCacheFilePath(key);
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
    };
    
    await fs.writeFile(filePath, JSON.stringify(entry), 'utf-8');
  }

  /**
   * Delete a value from cache
   * @param key Cache key
   */
  async delete(key: string): Promise<void> {
    try {
      const filePath = this.getCacheFilePath(key);
      await fs.unlink(filePath);
    } catch {
      // Ignore errors if file doesn't exist
    }
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    try {
      const entries = await fs.readdir(this.cacheDir);
      await Promise.all(
        entries.map(entry => fs.unlink(path.join(this.cacheDir, entry)))
      );
    } catch {
      // Ignore errors if directory doesn't exist
    }
  }

  /**
   * Get the file path for a cache key
   * @param key Cache key
   * @returns File path
   */
  private getCacheFilePath(key: string): string {
    // Sanitize key to be a valid filename
    const sanitizedKey = key.replace(/[^a-zA-Z0-9]/g, '_');
    return path.join(this.cacheDir, `${sanitizedKey}.json`);
  }

  /**
   * Read a cache entry from file
   * @param filePath Path to cache file
   * @returns Cache entry or null if file doesn't exist
   */
  private async readCacheEntry<T>(filePath: string): Promise<CacheEntry<T> | null> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content) as CacheEntry<T>;
    } catch {
      return null;
    }
  }
}

// Default cache instance
export const defaultCache = new FileCache();
