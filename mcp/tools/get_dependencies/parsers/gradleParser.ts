/**
 * Parser for build.gradle files (Gradle)
 */

import { Dependency } from '../types.js';
import { FileUtils } from '../utils/fileUtils.js';

/**
 * Parse build.gradle file
 * Extracts from dependencies {} block, handles different configurations
 */
export class GradleParser {
  /**
   * Parse build.gradle file
   * @param filePath Path to build.gradle
   * @returns Object with dependencies by configuration
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
      console.error(`Error parsing build.gradle: ${error}`);
      return { dependencies: [], devDependencies: [] };
    }
  }

  /**
   * Parse build.gradle content
   * @param content File content
   * @returns Parsed dependencies
   */
  private static parseContent(content: string): {
    dependencies: Dependency[];
    devDependencies: Dependency[];
  } {
    const dependencies: Dependency[] = [];
    const devDependencies: Dependency[] = [];

    // Extract dependencies block
    const dependenciesMatch = content.match(/dependencies\s*\{([\s\S]*?)\}/);
    if (!dependenciesMatch) {
      return { dependencies, devDependencies };
    }

    const dependenciesSection = dependenciesMatch[1];

    // Parse each dependency line
    // Format: configuration 'groupId:artifactId:version'
    // or: configuration group: 'groupId', name: 'artifactId', version: 'version'
    const lines = dependenciesSection.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip comments and empty lines
      if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*')) {
        continue;
      }

      // Parse dependency
      const dep = this.parseDependencyLine(trimmed);
      if (dep) {
        if (dep.type === 'development') {
          devDependencies.push(dep);
        } else {
          dependencies.push(dep);
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
    // Determine configuration (implementation, compile, runtime, testImplementation, etc.)
    const configMatch = line.match(/^(implementation|compile|runtime|api|testImplementation|testCompile|testRuntime)\s+/);
    const config = configMatch ? configMatch[1] : 'implementation';
    const isTest = config.includes('test');
    const isCompile = config === 'compile' || config === 'api';

    // Parse short format: 'groupId:artifactId:version'
    const shortFormatMatch = line.match(/['"]([^'"]+)['"]/);
    if (shortFormatMatch) {
      const parts = shortFormatMatch[1].split(':');
      if (parts.length >= 2) {
        const groupId = parts[0];
        const artifactId = parts[1];
        const version = parts[2] || undefined;
        const name = `${groupId}:${artifactId}`;

        return {
          name,
          version,
          versionConstraint: version ? `==${version}` : undefined,
          type: isTest ? 'development' : 'runtime',
          source: 'registry'
        };
      }
    }

    // Parse map format: group: 'groupId', name: 'artifactId', version: 'version'
    const groupMatch = line.match(/group:\s*['"]([^'"]+)['"]/);
    const nameMatch = line.match(/name:\s*['"]([^'"]+)['"]/);
    const versionMatch = line.match(/version:\s*['"]([^'"]+)['"]/);

    if (groupMatch && nameMatch) {
      const groupId = groupMatch[1];
      const artifactId = nameMatch[1];
      const version = versionMatch ? versionMatch[1] : undefined;
      const name = `${groupId}:${artifactId}`;

      return {
        name,
        version,
        versionConstraint: version ? `==${version}` : undefined,
        type: isTest ? 'development' : 'runtime',
        source: 'registry'
      };
    }

    return null;
  }
}

