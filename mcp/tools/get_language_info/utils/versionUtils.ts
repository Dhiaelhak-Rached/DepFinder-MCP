import { VersionInfo } from '../types.js';

/**
 * Version utilities for language detection
 */
export class VersionUtils {
  /**
   * Parse a semantic version string
   * @param versionString Version string to parse
   * @returns Parsed version information
   */
  static parseVersion(versionString: string): VersionInfo | null {
    if (!versionString) {
      return null;
    }

    // Remove 'v' prefix if present
    const cleanVersion = versionString.startsWith('v') 
      ? versionString.substring(1) 
      : versionString;

    // Match semantic version pattern
    const match = cleanVersion.match(/^(\d+)\.(\d+)\.(\d+)(?:-([a-zA-Z0-9]+))?(?:\+([a-zA-Z0-9]+))?$/);
    
    if (!match) {
      return null;
    }

    return {
      major: parseInt(match[1], 10),
      minor: parseInt(match[2], 10),
      patch: parseInt(match[3], 10),
      prerelease: match[4] || undefined,
      build: match[5] || undefined,
      raw: cleanVersion
    };
  }

  /**
   * Check if a version satisfies a constraint
   * @param version Version to check
   * @param constraint Version constraint
   * @returns True if version satisfies constraint
   */
  static satisfiesConstraint(version: VersionInfo, constraint: string): boolean {
    // Parse constraint
    const constraintParts = constraint.split(' ');
    if (constraintParts.length === 0) {
      return true; // No constraint means any version is acceptable
    }

    // Handle simple equality (e.g., "1.2.3")
    if (constraintParts.length === 1 && !constraintParts[0].includes('>')) {
      const constraintVersion = this.parseVersion(constraintParts[0]);
      if (!constraintVersion) {
        return false;
      }
      return this.compareVersions(version, constraintVersion) === 0;
    }

    // Handle range constraints (e.g., ">=1.2.3 <2.0.0")
    if (constraintParts.length >= 2) {
      const operator = constraintParts[0];
      const constraintVersion = this.parseVersion(constraintParts[1]);
      
      if (!constraintVersion) {
        return false;
      }

      switch (operator) {
        case '>':
          return this.compareVersions(version, constraintVersion) > 0;
        case '>=':
          return this.compareVersions(version, constraintVersion) >= 0;
        case '<':
          return this.compareVersions(version, constraintVersion) < 0;
        case '<=':
          return this.compareVersions(version, constraintVersion) <= 0;
        case '~>':
          // Compatible with version (e.g., ~>1.2.3 means >=1.2.3 <1.3.0)
          if (version.major !== constraintVersion.major) {
            return false;
          }
          if (version.minor > constraintVersion.minor) {
            return false;
          }
          return true;
        default:
          return false;
      }
    }

    return false;
  }

  /**
   * Compare two versions
   * @param version1 First version
   * @param version2 Second version
   * @returns -1 if version1 < version2, 0 if equal, 1 if version1 > version2
   */
  static compareVersions(version1: VersionInfo, version2: VersionInfo): number {
    // Compare major version
    if (version1.major !== version2.major) {
      return version1.major < version2.major ? -1 : 1;
    }

    // Compare minor version
    if (version1.minor !== version2.minor) {
      return version1.minor < version2.minor ? -1 : 1;
    }

    // Compare patch version
    if (version1.patch !== version2.patch) {
      return version1.patch < version2.patch ? -1 : 1;
    }

    // Compare prerelease
    if (version1.prerelease && !version2.prerelease) {
      return -1; // Release is newer than prerelease
    }
    
    if (!version1.prerelease && version2.prerelease) {
      return 1; // Prerelease is older than release
    }
    
    if (version1.prerelease && version2.prerelease) {
      return version1.prerelease.localeCompare(version2.prerelease);
    }

    // Versions are equal
    return 0;
  }

  /**
   * Normalize a version string
   * @param versionString Version string to normalize
   * @returns Normalized version string
   */
  static normalizeVersion(versionString: string): string {
    if (!versionString) {
      return '';
    }

    // Remove 'v' prefix
    let normalized = versionString.startsWith('v') 
      ? versionString.substring(1) 
      : versionString;

    // Remove trailing whitespace
    normalized = normalized.trim();

    // Ensure at least major.minor.patch format
    const parts = normalized.split('.');
    while (parts.length < 3) {
      parts.push('0');
    }

    return parts.join('.');
  }

  /**
   * Get the latest version from an array of versions
   * @param versions Array of version strings
   * @returns Latest version string
   */
  static getLatestVersion(versions: string[]): string | null {
    if (versions.length === 0) {
      return null;
    }

    const parsedVersions = versions
      .map(v => this.parseVersion(v))
      .filter(v => v !== null) as VersionInfo[];

    if (parsedVersions.length === 0) {
      return null;
    }

    // Sort versions in descending order
    parsedVersions.sort((a, b) => this.compareVersions(b, a));

    return parsedVersions[0].raw;
  }

  /**
   * Check if a version is a prerelease
   * @param version Version to check
   * @returns True if version is a prerelease
   */
  static isPrerelease(version: VersionInfo): boolean {
    return !!version.prerelease;
  }

  /**
   * Check if a version is stable
   * @param version Version to check
   * @returns True if version is stable
   */
  static isStable(version: VersionInfo): boolean {
    return !this.isPrerelease(version);
  }

  /**
   * Get the major version from a version string
   * @param versionString Version string
   * @returns Major version number
   */
  static getMajorVersion(versionString: string): number | null {
    const version = this.parseVersion(versionString);
    return version ? version.major : null;
  }

  /**
   * Get the minor version from a version string
   * @param versionString Version string
   * @returns Minor version number
   */
  static getMinorVersion(versionString: string): number | null {
    const version = this.parseVersion(versionString);
    return version ? version.minor : null;
  }

  /**
   * Get the patch version from a version string
   * @param versionString Version string
   * @returns Patch version number
   */
  static getPatchVersion(versionString: string): number | null {
    const version = this.parseVersion(versionString);
    return version ? version.patch : null;
  }

  /**
   * Format a version object to a string
   * @param version Version object
   * @returns Formatted version string
   */
  static formatVersion(version: VersionInfo): string {
    let result = `${version.major}.${version.minor}.${version.patch}`;
    
    if (version.prerelease) {
      result += `-${version.prerelease}`;
    }
    
    if (version.build) {
      result += `+${version.build}`;
    }
    
    return result;
  }

  /**
   * Extract version from a string using a pattern
   * @param text Text to search in
   * @param pattern Pattern to match
   * @returns Extracted version string or null
   */
  static extractVersion(text: string, pattern: RegExp): string | null {
    const match = text.match(pattern);
    return match ? match[1] : null;
  }

  /**
   * Check if a version string is valid
   * @param versionString Version string to validate
   * @returns True if version string is valid
   */
  static isValidVersion(versionString: string): boolean {
    const version = this.parseVersion(versionString);
    return version !== null;
  }

  /**
   * Get the minimum version that satisfies a constraint
   * @param versions Array of version strings
   * @param constraint Version constraint
   * @returns Minimum version that satisfies constraint or null
   */
  static getMinimumSatisfyingVersion(versions: string[], constraint: string): string | null {
    const parsedVersions = versions
      .map(v => this.parseVersion(v))
      .filter(v => v !== null) as VersionInfo[];

    if (parsedVersions.length === 0) {
      return null;
    }

    // Sort versions in ascending order
    parsedVersions.sort((a, b) => this.compareVersions(a, b));

    for (const version of parsedVersions) {
      if (this.satisfiesConstraint(version, constraint)) {
        return version.raw;
      }
    }

    return null;
  }

  /**
   * Get the maximum version that satisfies a constraint
   * @param versions Array of version strings
   * @param constraint Version constraint
   * @returns Maximum version that satisfies constraint or null
   */
  static getMaximumSatisfyingVersion(versions: string[], constraint: string): string | null {
    const parsedVersions = versions
      .map(v => this.parseVersion(v))
      .filter(v => v !== null) as VersionInfo[];

    if (parsedVersions.length === 0) {
      return null;
    }

    // Sort versions in descending order
    parsedVersions.sort((a, b) => this.compareVersions(b, a));

    for (const version of parsedVersions) {
      if (this.satisfiesConstraint(version, constraint)) {
        return version.raw;
      }
    }

    return null;
  }
}
