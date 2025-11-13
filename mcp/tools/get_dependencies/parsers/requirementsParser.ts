/**
 * Parser for requirements.txt files
 */

import { Dependency } from '../types.js';
import { VersionParser } from '../utils/versionParser.js';

/**
 * Parse requirements.txt file content
 * Handles: package==version, package>=version, comments (#), continuation (\), constraints, extras, git/URL dependencies, environment markers
 */
export class RequirementsParser {
  /**
   * Parse requirements.txt content
   * @param content File content
   * @returns Array of dependencies
   */
  static parse(content: string): Dependency[] {
    const dependencies: Dependency[] = [];
    const lines = content.split('\n');
    let currentLine = '';

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();

      // Handle line continuation
      if (line.endsWith('\\')) {
        currentLine += line.slice(0, -1).trim() + ' ';
        continue;
      } else {
        currentLine += line;
        line = currentLine.trim();
        currentLine = '';
      }

      // Skip empty lines and comments
      if (!line || line.startsWith('#')) {
        continue;
      }

      // Parse the dependency line
      const dependency = this.parseLine(line);
      if (dependency) {
        dependencies.push(dependency);
      }
    }

    return dependencies;
  }

  /**
   * Parse a single line from requirements.txt
   * @param line Line content
   * @returns Dependency or null
   */
  private static parseLine(line: string): Dependency | null {
    // Remove inline comments
    const commentIndex = line.indexOf('#');
    if (commentIndex !== -1) {
      line = line.substring(0, commentIndex).trim();
    }

    if (!line) return null;

    // Handle git/URL dependencies
    if (line.startsWith('git+') || line.startsWith('http://') || line.startsWith('https://')) {
      return this.parseUrlDependency(line);
    }

    // Handle editable installs (-e)
    if (line.startsWith('-e ') || line.startsWith('--editable ')) {
      line = line.replace(/^(-e|--editable)\s+/, '');
    }

    // Parse package name, version, and extras
    // Format: package[extra1,extra2]==version; marker
    const parts = line.split(';');
    const marker = parts.length > 1 ? parts[1].trim() : undefined;
    const mainPart = parts[0].trim();

    // Extract extras: package[extra1,extra2]
    const extrasMatch = mainPart.match(/^([^\[]+)\[([^\]]+)\]/);
    const packagePart = extrasMatch ? extrasMatch[1] : mainPart;
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
        extras,
        ...(marker && { sourceUrl: `marker:${marker}` })
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

  /**
   * Parse URL/git dependency
   * @param line Line content
   * @returns Dependency
   */
  private static parseUrlDependency(line: string): Dependency | null {
    // Extract package name from URL if possible
    // Format: git+https://github.com/user/repo.git@branch#egg=package
    const eggMatch = line.match(/#egg=([^&]+)/);
    const name = eggMatch ? eggMatch[1] : 'unknown';

    return {
      name,
      type: 'runtime',
      source: 'git',
      sourceUrl: line
    };
  }
}

