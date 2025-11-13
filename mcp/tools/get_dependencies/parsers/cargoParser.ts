/**
 * Parser for Cargo.toml files (Rust)
 */

import { Dependency } from '../types.js';
import { FileUtils } from '../utils/fileUtils.js';

/**
 * Parse Cargo.toml file
 * Extracts from [dependencies] and [dev-dependencies] sections
 */
export class CargoParser {
  /**
   * Parse Cargo.toml file
   * @param filePath Path to Cargo.toml
   * @returns Object with dependencies and dev dependencies
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
      console.error(`Error parsing Cargo.toml: ${error}`);
      return { dependencies: [], devDependencies: [] };
    }
  }

  /**
   * Parse Cargo.toml content
   * @param content File content
   * @returns Parsed dependencies
   */
  private static parseContent(content: string): {
    dependencies: Dependency[];
    devDependencies: Dependency[];
  } {
    const dependencies: Dependency[] = [];
    const devDependencies: Dependency[] = [];

    let inDependencies = false;
    let inDevDependencies = false;

    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Check for [dependencies] section
      if (line === '[dependencies]') {
        inDependencies = true;
        inDevDependencies = false;
        continue;
      }

      // Check for [dev-dependencies] section
      if (line === '[dev-dependencies]') {
        inDependencies = false;
        inDevDependencies = true;
        continue;
      }

      // Check if we're leaving a section
      if (line.startsWith('[') && line !== '[dependencies]' && line !== '[dev-dependencies]') {
        inDependencies = false;
        inDevDependencies = false;
        continue;
      }

      // Parse dependency line
      if (inDependencies || inDevDependencies) {
        // Skip comments and empty lines
        if (!line || line.startsWith('#')) {
          continue;
        }

        const dep = this.parseDependencyLine(line);
        if (dep) {
          if (inDependencies) {
            dependencies.push(dep);
          } else {
            devDependencies.push(dep);
          }
        }
      }
    }

    return { dependencies, devDependencies };
  }

  /**
   * Parse a single dependency line
   * @param line Line content
   * @returns Dependency or null
   */
  private static parseDependencyLine(line: string): Dependency | null {
    // Format: name = "version" or name = { version = "1.0", features = ["feature1"] }
    // or: name = { path = "../local" } or name = { git = "https://..." }

    // Extract package name
    const nameMatch = line.match(/^([^=]+)\s*=/);
    if (!nameMatch) {
      return null;
    }

    const name = nameMatch[1].trim();

    // Check for simple version format: name = "version"
    const simpleVersionMatch = line.match(/=\s*["']([^"']+)["']/);
    if (simpleVersionMatch) {
      const version = simpleVersionMatch[1];
      return {
        name,
        versionConstraint: version,
        version: version.match(/^\d+\.\d+\.\d+/) ? version : undefined,
        type: 'runtime',
        source: 'registry'
      };
    }

    // Check for table format: name = { ... }
    const tableMatch = line.match(/\{([^}]+)\}/);
    if (tableMatch) {
      const tableContent = tableMatch[1];

      // Check for path dependency
      const pathMatch = tableContent.match(/path\s*=\s*["']([^"']+)["']/);
      if (pathMatch) {
        return {
          name,
          type: 'runtime',
          source: 'path',
          sourceUrl: pathMatch[1]
        };
      }

      // Check for git dependency
      const gitMatch = tableContent.match(/git\s*=\s*["']([^"']+)["']/);
      if (gitMatch) {
        return {
          name,
          type: 'runtime',
          source: 'git',
          sourceUrl: gitMatch[1]
        };
      }

      // Check for version
      const versionMatch = tableContent.match(/version\s*=\s*["']([^"']+)["']/);
      if (versionMatch) {
        const version = versionMatch[1];
        return {
          name,
          versionConstraint: version,
          version: version.match(/^\d+\.\d+\.\d+/) ? version : undefined,
          type: 'runtime',
          source: 'registry'
        };
      }
    }

    return null;
  }
}

