/**
 * Parser for pyproject.toml files
 */

import { Dependency } from '../types.js';
import { readJsonFile } from '../../../utils/fileSystem.js';
import { FileUtils } from '../utils/fileUtils.js';

/**
 * Parse pyproject.toml file
 * Extracts from [project.dependencies] and [project.optional-dependencies]
 */
export class PyprojectParser {
  /**
   * Parse pyproject.toml file
   * @param filePath Path to pyproject.toml
   * @returns Object with dependencies and optional dependencies
   */
  static async parse(filePath: string): Promise<{
    dependencies: Dependency[];
    optionalDependencies: Record<string, Dependency[]>;
  }> {
    try {
      // Note: pyproject.toml is TOML format, not JSON
      // For now, we'll read as text and parse manually
      // In production, use a TOML parser library
      const content = await FileUtils.safeReadFile(filePath);
      if (!content) {
        return { dependencies: [], optionalDependencies: {} };
      }

      return this.parseContent(content);
    } catch (error) {
      console.error(`Error parsing pyproject.toml: ${error}`);
      return { dependencies: [], optionalDependencies: {} };
    }
  }

  /**
   * Parse pyproject.toml content
   * @param content File content
   * @returns Parsed dependencies
   */
  private static parseContent(content: string): {
    dependencies: Dependency[];
    optionalDependencies: Record<string, Dependency[]>;
  } {
    const dependencies: Dependency[] = [];
    const optionalDependencies: Record<string, Dependency[]> = {};

    let inProjectSection = false;
    let inDependencies = false;
    let inOptionalDependencies = false;
    let currentOptionalGroup = '';

    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Check for [project] section
      if (line === '[project]') {
        inProjectSection = true;
        inDependencies = false;
        inOptionalDependencies = false;
        continue;
      }

      // Check for [project.dependencies]
      if (line === '[project.dependencies]') {
        inDependencies = true;
        inOptionalDependencies = false;
        continue;
      }

      // Check for [project.optional-dependencies]
      if (line === '[project.optional-dependencies]') {
        inDependencies = false;
        inOptionalDependencies = true;
        continue;
      }

      // Check for optional dependency group: [project.optional-dependencies.groupname]
      const optionalGroupMatch = line.match(/^\[project\.optional-dependencies\.([^\]]+)\]$/);
      if (optionalGroupMatch) {
        currentOptionalGroup = optionalGroupMatch[1];
        if (!optionalDependencies[currentOptionalGroup]) {
          optionalDependencies[currentOptionalGroup] = [];
        }
        continue;
      }

      // Check if we're leaving project section
      if (line.startsWith('[') && !line.startsWith('[project')) {
        inProjectSection = false;
        inDependencies = false;
        inOptionalDependencies = false;
        continue;
      }

      // Parse dependency line
      if (inDependencies || inOptionalDependencies) {
        // Skip comments and empty lines
        if (!line || line.startsWith('#')) {
          continue;
        }

        // Parse dependency: "package==version" or "package>=version"
        const dep = this.parseDependencyLine(line);
        if (dep) {
          if (inDependencies) {
            dependencies.push(dep);
          } else if (inOptionalDependencies && currentOptionalGroup) {
            optionalDependencies[currentOptionalGroup].push(dep);
          }
        }
      }
    }

    return { dependencies, optionalDependencies };
  }

  /**
   * Parse a single dependency line
   * @param line Line content
   * @returns Dependency or null
   */
  private static parseDependencyLine(line: string): Dependency | null {
    // Remove quotes
    line = line.replace(/^["']|["']$/g, '');

    // Handle extras: package[extra1,extra2]
    const extrasMatch = line.match(/^([^\[]+)\[([^\]]+)\]/);
    const packagePart = extrasMatch ? extrasMatch[1] : line;
    const extras = extrasMatch ? extrasMatch[2].split(',').map(e => e.trim()) : undefined;

    // Extract version constraint
    const versionMatch = packagePart.match(/^([^\s=<>!~]+)\s*(==|>=|<=|>|<|!=|~=)\s*(.+)$/);
    
    if (versionMatch) {
      const name = versionMatch[1].trim();
      const operator = versionMatch[2];
      const version = versionMatch[3].trim();

      return {
        name,
        versionConstraint: `${operator}${version}`,
        version: operator === '==' ? version : undefined,
        type: 'runtime',
        source: 'registry',
        extras
      };
    }

    // No version specified
    const nameMatch = packagePart.match(/^([^\s=<>!~]+)/);
    if (nameMatch) {
      return {
        name: nameMatch[1].trim(),
        type: 'runtime',
        source: 'registry',
        extras
      };
    }

    return null;
  }
}

