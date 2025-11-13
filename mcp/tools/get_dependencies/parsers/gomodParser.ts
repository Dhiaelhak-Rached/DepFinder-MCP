/**
 * Parser for go.mod files (Go)
 */

import { Dependency } from '../types.js';
import { FileUtils } from '../utils/fileUtils.js';

/**
 * Parse go.mod file
 * Extracts require directives, handles replace and exclude
 */
export class GomodParser {
  /**
   * Parse go.mod file
   * @param filePath Path to go.mod
   * @returns Array of dependencies
   */
  static async parse(filePath: string): Promise<Dependency[]> {
    try {
      const content = await FileUtils.safeReadFile(filePath);
      if (!content) {
        return [];
      }

      return this.parseContent(content);
    } catch (error) {
      console.error(`Error parsing go.mod: ${error}`);
      return [];
    }
  }

  /**
   * Parse go.mod content
   * @param content File content
   * @returns Array of dependencies
   */
  private static parseContent(content: string): Dependency[] {
    const dependencies: Dependency[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip comments and empty lines
      if (!trimmed || trimmed.startsWith('//')) {
        continue;
      }

      // Parse require directive
      if (trimmed.startsWith('require ')) {
        const dep = this.parseRequireLine(trimmed);
        if (dep) {
          dependencies.push(dep);
        }
      }

      // Handle replace directives (modify existing dependencies)
      if (trimmed.startsWith('replace ')) {
        const replaceMatch = trimmed.match(/replace\s+([^\s]+)\s+=>\s+([^\s]+)(?:\s+([^\s]+))?/);
        if (replaceMatch) {
          const oldPath = replaceMatch[1];
          const newPath = replaceMatch[2];
          const version = replaceMatch[3];

          // Find and update the dependency
          const depIndex = dependencies.findIndex(d => d.name === oldPath);
          if (depIndex !== -1) {
            dependencies[depIndex] = {
              ...dependencies[depIndex],
              name: newPath,
              source: newPath.startsWith('./') || newPath.startsWith('../') ? 'path' : 'registry',
              sourceUrl: newPath,
              version: version,
              versionConstraint: version ? `==${version}` : undefined
            };
          }
        }
      }
    }

    return dependencies;
  }

  /**
   * Parse a require directive line
   * @param line Line content
   * @returns Dependency or null
   */
  private static parseRequireLine(line: string): Dependency | null {
    // Format: require module/path v1.2.3
    // or: require ( multi-line )
    const requireMatch = line.match(/require\s+([^\s]+)(?:\s+([^\s]+))?/);
    if (!requireMatch) {
      return null;
    }

    const modulePath = requireMatch[1];
    const version = requireMatch[2];

    // Handle version suffixes: v1.2.3+incompatible, v0.0.0-20210101000000-abcdef123456
    let cleanVersion = version;
    if (version) {
      cleanVersion = version.split('+')[0].split('-')[0];
    }

    return {
      name: modulePath,
      version: cleanVersion,
      versionConstraint: version ? `==${version}` : undefined,
      type: 'runtime',
      source: 'registry'
    };
  }
}

