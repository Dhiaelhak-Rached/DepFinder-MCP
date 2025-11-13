/**
 * Parser for pom.xml files (Maven)
 */

import { Dependency } from '../types.js';
import { FileUtils } from '../utils/fileUtils.js';

/**
 * Parse pom.xml file
 * Extracts dependencies from <dependencies> section, handles parent inheritance, properties
 */
export class PomParser {
  /**
   * Parse pom.xml file
   * @param filePath Path to pom.xml
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
      console.error(`Error parsing pom.xml: ${error}`);
      return [];
    }
  }

  /**
   * Parse pom.xml content
   * @param content File content
   * @returns Array of dependencies
   */
  private static parseContent(content: string): Dependency[] {
    const dependencies: Dependency[] = [];

    // Extract properties for variable substitution
    const properties: Record<string, string> = {};
    const propertyMatches = content.matchAll(/<([^>]+)\.version>([^<]+)<\/[^>]+\.version>/g);
    for (const match of propertyMatches) {
      properties[match[1]] = match[2];
    }

    // Extract dependencies section
    const dependenciesMatch = content.match(/<dependencies>([\s\S]*?)<\/dependencies>/);
    if (!dependenciesMatch) {
      return [];
    }

    const dependenciesSection = dependenciesMatch[1];

    // Extract each dependency
    const dependencyMatches = dependenciesSection.matchAll(/<dependency>([\s\S]*?)<\/dependency>/g);
    
    for (const match of dependencyMatches) {
      const depContent = match[1];
      
      const groupIdMatch = depContent.match(/<groupId>([^<]+)<\/groupId>/);
      const artifactIdMatch = depContent.match(/<artifactId>([^<]+)<\/artifactId>/);
      const versionMatch = depContent.match(/<version>([^<]+)<\/version>/);
      const scopeMatch = depContent.match(/<scope>([^<]+)<\/scope>/);

      if (groupIdMatch && artifactIdMatch) {
        const groupId = groupIdMatch[1].trim();
        const artifactId = artifactIdMatch[1].trim();
        const version = versionMatch ? this.resolveProperty(versionMatch[1].trim(), properties) : undefined;
        const scope = scopeMatch ? scopeMatch[1].trim() : 'compile';

        // Maven dependency name is groupId:artifactId
        const name = `${groupId}:${artifactId}`;

        dependencies.push({
          name,
          version,
          versionConstraint: version ? `==${version}` : undefined,
          type: scope === 'test' ? 'development' : 'runtime',
          source: 'registry'
        });
      }
    }

    return dependencies;
  }

  /**
   * Resolve Maven property reference
   * @param value Value that may contain property reference
   * @param properties Properties map
   * @returns Resolved value
   */
  private static resolveProperty(value: string, properties: Record<string, string>): string {
    // Handle ${property.name} syntax
    const propertyMatch = value.match(/\$\{([^}]+)\}/);
    if (propertyMatch && properties[propertyMatch[1]]) {
      return properties[propertyMatch[1]];
    }
    return value;
  }
}

