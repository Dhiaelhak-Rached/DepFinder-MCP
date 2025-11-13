/**
 * Parser for package.json files
 */

import { Dependency } from '../types.js';
import { readJsonFile } from '../../../utils/fileSystem.js';
import { FileUtils } from '../utils/fileUtils.js';

/**
 * Parse package.json file
 * Extracts from dependencies, devDependencies, peerDependencies, optionalDependencies
 */
export class PackageJsonParser {
  /**
   * Parse package.json file
   * @param filePath Path to package.json
   * @returns Object with all dependency types
   */
  static async parse(filePath: string): Promise<{
    dependencies: Dependency[];
    devDependencies: Dependency[];
    peerDependencies: Dependency[];
    optionalDependencies: Dependency[];
  }> {
    try {
      const content = await readJsonFile(filePath);
      if (!content) {
        return {
          dependencies: [],
          devDependencies: [],
          peerDependencies: [],
          optionalDependencies: []
        };
      }

      return {
        dependencies: this.parseDependencyObject((content.dependencies || {}) as Record<string, string>, 'runtime'),
        devDependencies: this.parseDependencyObject((content.devDependencies || {}) as Record<string, string>, 'development'),
        peerDependencies: this.parseDependencyObject((content.peerDependencies || {}) as Record<string, string>, 'peer'),
        optionalDependencies: this.parseDependencyObject((content.optionalDependencies || {}) as Record<string, string>, 'optional')
      };
    } catch (error) {
      console.error(`Error parsing package.json: ${error}`);
      return {
        dependencies: [],
        devDependencies: [],
        peerDependencies: [],
        optionalDependencies: []
      };
    }
  }

  /**
   * Parse a dependency object from package.json
   * @param deps Dependency object (name -> version)
   * @param type Dependency type
   * @returns Array of dependencies
   */
  private static parseDependencyObject(
    deps: Record<string, string>,
    type: Dependency['type']
  ): Dependency[] {
    const dependencies: Dependency[] = [];

    for (const [name, version] of Object.entries(deps)) {
      const dependency = this.parseDependency(name, version, type);
      if (dependency) {
        dependencies.push(dependency);
      }
    }

    return dependencies;
  }

  /**
   * Parse a single dependency entry
   * @param name Package name
   * @param version Version constraint
   * @param type Dependency type
   * @returns Dependency
   */
  private static parseDependency(
    name: string,
    version: string,
    type: Dependency['type']
  ): Dependency | null {
    // Handle scoped packages: @scope/package
    const scopeMatch = name.match(/^@([^/]+)\/(.+)$/);
    const scope = scopeMatch ? scopeMatch[1] : undefined;
    const packageName = scopeMatch ? scopeMatch[2] : name;

    // Handle git/URL dependencies
    if (version.startsWith('git+') || version.startsWith('http://') || version.startsWith('https://') || version.startsWith('github:')) {
      return {
        name: packageName,
        type,
        source: 'git',
        sourceUrl: version,
        scope
      };
    }

    // Handle workspace dependencies
    if (version.startsWith('workspace:')) {
      return {
        name: packageName,
        type,
        source: 'local',
        versionConstraint: version,
        scope
      };
    }

    // Handle path dependencies
    if (version.startsWith('file:') || version.startsWith('./') || version.startsWith('../')) {
      return {
        name: packageName,
        type,
        source: 'path',
        sourceUrl: version,
        scope
      };
    }

    // Regular version constraint
    return {
      name: packageName,
      versionConstraint: version,
      type,
      source: 'registry',
      scope
    };
  }
}

