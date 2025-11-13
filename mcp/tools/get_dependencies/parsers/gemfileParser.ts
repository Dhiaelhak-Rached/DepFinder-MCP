/**
 * Parser for Gemfile files (Ruby)
 */

import { Dependency } from '../types.js';
import { FileUtils } from '../utils/fileUtils.js';

/**
 * Parse Gemfile
 * Extracts gem declarations, handles groups and version operators
 */
export class GemfileParser {
  /**
   * Parse Gemfile
   * @param filePath Path to Gemfile
   * @returns Object with dependencies by group
   */
  static async parse(filePath: string): Promise<{
    dependencies: Dependency[];
    devDependencies: Dependency[];
  }> {
    try {
      const content = await FileUtils.safeReadFile(filePath);
      if (!content) {
        return { dependencies: [], devDependencies: [] };
      }

      return this.parseContent(content);
    } catch (error) {
      console.error(`Error parsing Gemfile: ${error}`);
      return { dependencies: [], devDependencies: [] };
    }
  }

  /**
   * Parse Gemfile content
   * @param content File content
   * @returns Parsed dependencies
   */
  private static parseContent(content: string): {
    dependencies: Dependency[];
    devDependencies: Dependency[];
  } {
    const dependencies: Dependency[] = [];
    const devDependencies: Dependency[] = [];

    let inGroup = false;
    let currentGroup: string[] = [];

    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();

      // Skip comments and empty lines
      if (!line || line.startsWith('#')) {
        continue;
      }

      // Handle group blocks
      if (line.startsWith('group ')) {
        const groupMatch = line.match(/group\s+([:a-z,\s]+)\s+do/i);
        if (groupMatch) {
          inGroup = true;
          currentGroup = groupMatch[1].split(',').map(g => g.trim().replace(/:/g, ''));
          continue;
        }
      }

      if (line === 'end' && inGroup) {
        inGroup = false;
        currentGroup = [];
        continue;
      }

      // Parse gem declaration
      if (line.startsWith('gem ')) {
        const dep = this.parseGemLine(line);
        if (dep) {
          const isDev = inGroup && (currentGroup.includes('development') || currentGroup.includes('test'));
          if (isDev) {
            dep.type = 'development';
            devDependencies.push(dep);
          } else {
            dependencies.push(dep);
          }
        }
      }
    }

    return { dependencies, devDependencies };
  }

  /**
   * Parse a gem declaration line
   * @param line Line content
   * @returns Dependency or null
   */
  private static parseGemLine(line: string): Dependency | null {
    // Format: gem 'name', '~> 1.0' or gem "name", "~> 1.0"
    // Remove 'gem' keyword
    line = line.replace(/^gem\s+/, '').trim();

    // Extract gem name and version
    const matches = line.matchAll(/['"]([^'"]+)['"]/g);
    const values = Array.from(matches).map(m => m[1]);

    if (values.length === 0) {
      return null;
    }

    const name = values[0];
    const version = values[1];

    // Determine source
    let source: Dependency['source'] = 'registry';
    let sourceUrl: string | undefined;

    // Check for git source
    if (line.includes('git:')) {
      const gitMatch = line.match(/git:\s*['"]([^'"]+)['"]/);
      if (gitMatch) {
        source = 'git';
        sourceUrl = gitMatch[1];
      }
    }

    // Check for path source
    if (line.includes('path:')) {
      const pathMatch = line.match(/path:\s*['"]([^'"]+)['"]/);
      if (pathMatch) {
        source = 'path';
        sourceUrl = pathMatch[1];
      }
    }

    return {
      name,
      versionConstraint: version,
      version: version && !version.match(/[~><=]/) ? version : undefined,
      type: 'runtime',
      source,
      sourceUrl
    };
  }
}

