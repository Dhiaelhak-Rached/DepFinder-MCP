/**
 * Dependency name and version normalizer
 */

import { Dependency } from '../types.js';

/**
 * Normalize dependency names and versions
 */
export class DependencyNormalizer {
  /**
   * Normalize a dependency name
   * @param name Dependency name
   * @returns Normalized name
   */
  static normalizeName(name: string): string {
    if (!name) return '';
    
    // Remove leading/trailing whitespace
    let normalized = name.trim();
    
    // For scoped packages (e.g., @scope/package), keep as is
    if (normalized.startsWith('@')) {
      return normalized;
    }
    
    // Convert to lowercase for consistency (some registries are case-insensitive)
    normalized = normalized.toLowerCase();
    
    // Remove any invalid characters (keep alphanumeric, dash, underscore, dot, slash)
    normalized = normalized.replace(/[^a-z0-9\-_.\/]/g, '');
    
    return normalized;
  }

  /**
   * Normalize a dependency object
   * @param dependency Dependency to normalize
   * @returns Normalized dependency
   */
  static normalize(dependency: Dependency): Dependency {
    return {
      ...dependency,
      name: this.normalizeName(dependency.name),
      versionConstraint: dependency.versionConstraint 
        ? dependency.versionConstraint.trim() 
        : undefined,
      version: dependency.version 
        ? dependency.version.trim() 
        : undefined
    };
  }

  /**
   * Normalize an array of dependencies
   * @param dependencies Dependencies to normalize
   * @returns Normalized dependencies
   */
  static normalizeAll(dependencies: Dependency[]): Dependency[] {
    return dependencies.map(dep => this.normalize(dep));
  }
}

