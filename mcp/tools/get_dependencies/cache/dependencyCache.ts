/**
 * Dependency extraction cache
 */

import { DependencyExtractionResult } from '../types.js';
import { getFromCache, setInCache } from '../../get_language_info/cache/detectionCache.js';
import { fileExists } from '../../../utils/fileSystem.js';
import { FileUtils } from '../utils/fileUtils.js';

/**
 * Cache for dependency extraction results
 * Cache key: projectPath + file modification times
 * TTL: 30 minutes (dependencies don't change frequently)
 */
export class DependencyCache {
  private static readonly TTL = 30 * 60 * 1000; // 30 minutes

  /**
   * Get cached dependency extraction result
   * @param projectPath Path to project directory
   * @returns Cached result or null
   */
  static async get(projectPath: string): Promise<DependencyExtractionResult | null> {
    const cacheKey = await this.generateCacheKey(projectPath);
    if (!cacheKey) {
      return null;
    }
    return await getFromCache<DependencyExtractionResult>(cacheKey);
  }

  /**
   * Set cached dependency extraction result
   * @param projectPath Path to project directory
   * @param result Extraction result to cache
   */
  static async set(projectPath: string, result: DependencyExtractionResult): Promise<void> {
    const cacheKey = await this.generateCacheKey(projectPath);
    if (!cacheKey) {
      return;
    }
    await setInCache(cacheKey, result, this.TTL);
  }

  /**
   * Generate cache key from project path and file modification times
   * @param projectPath Path to project directory
   * @returns Cache key or null
   */
  private static async generateCacheKey(projectPath: string): Promise<string | null> {
    try {
      // Common dependency files to check
      const dependencyFiles = [
        'package.json',
        'package-lock.json',
        'yarn.lock',
        'pnpm-lock.yaml',
        'requirements.txt',
        'pyproject.toml',
        'Pipfile',
        'Pipfile.lock',
        'poetry.lock',
        'Gemfile',
        'Gemfile.lock',
        'go.mod',
        'Cargo.toml',
        'Cargo.lock',
        'pom.xml',
        'build.gradle',
        'build.gradle.kts'
      ];

      const fileTimes: string[] = [];
      for (const file of dependencyFiles) {
        const filePath = FileUtils.joinPath(projectPath, file);
        if (await fileExists(filePath)) {
          try {
            const { stat } = await import('fs/promises');
            const stats = await stat(filePath);
            fileTimes.push(`${file}:${stats.mtimeMs}`);
          } catch (error) {
            // Ignore errors getting file stats
          }
        }
      }

      return `dependencies:${projectPath}:${fileTimes.join(',')}`;
    } catch (error) {
      return null;
    }
  }
}

