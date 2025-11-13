/**
 * Version constraint parser and normalizer
 */

/**
 * Parse and normalize version constraints
 * Supports semantic versioning, ranges, operators, and special values
 */
export class VersionParser {
  /**
   * Parse a version constraint string
   * @param constraint Version constraint (e.g., "^1.0.0", "~> 2.0", ">=1.0.0")
   * @returns Parsed version information
   */
  static parse(constraint: string): {
    operator?: string;
    version?: string;
    range?: { min?: string; max?: string };
    isExact: boolean;
    isRange: boolean;
  } {
    if (!constraint || constraint.trim() === '') {
      return { isExact: false, isRange: false };
    }

    const trimmed = constraint.trim();

    // Handle special values
    if (trimmed === '*' || trimmed === 'x' || trimmed === 'latest' || trimmed === 'any') {
      return { isExact: false, isRange: false };
    }

    // Handle exact version (semantic versioning)
    if (/^\d+\.\d+\.\d+/.test(trimmed)) {
      const versionMatch = trimmed.match(/^(\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?(?:\+[a-zA-Z0-9.-]+)?)/);
      if (versionMatch) {
        return {
          version: versionMatch[1],
          isExact: true,
          isRange: false
        };
      }
    }

    // Handle caret (^) - compatible version
    if (trimmed.startsWith('^')) {
      const version = trimmed.substring(1).trim();
      return {
        operator: '^',
        version,
        isExact: false,
        isRange: true
      };
    }

    // Handle tilde (~) - patch version
    if (trimmed.startsWith('~')) {
      const version = trimmed.substring(1).trim();
      return {
        operator: '~',
        version,
        isExact: false,
        isRange: true
      };
    }

    // Handle operators: ==, !=, >=, <=, >, <
    const operatorMatch = trimmed.match(/^(==|!=|>=|<=|>|<|~=)\s*(.+)/);
    if (operatorMatch) {
      return {
        operator: operatorMatch[1],
        version: operatorMatch[2].trim(),
        isExact: operatorMatch[1] === '==',
        isRange: operatorMatch[1] !== '=='
      };
    }

    // Handle Ruby pessimistic operator (~>)
    if (trimmed.includes('~>')) {
      const parts = trimmed.split('~>');
      if (parts.length === 2) {
        return {
          operator: '~>',
          version: parts[1].trim(),
          isExact: false,
          isRange: true
        };
      }
    }

    // Handle version ranges (e.g., ">=1.0.0 <2.0.0")
    const rangeMatch = trimmed.match(/(>=|<=|>|<)\s*(\d+\.\d+\.\d+)/g);
    if (rangeMatch && rangeMatch.length >= 2) {
      const minMatch = rangeMatch[0].match(/(>=|>)\s*(\d+\.\d+\.\d+)/);
      const maxMatch = rangeMatch[1].match(/(<=|<)\s*(\d+\.\d+\.\d+)/);
      return {
        range: {
          min: minMatch ? minMatch[2] : undefined,
          max: maxMatch ? maxMatch[2] : undefined
        },
        isExact: false,
        isRange: true
      };
    }

    // Default: treat as version string
    return {
      version: trimmed,
      isExact: false,
      isRange: false
    };
  }

  /**
   * Normalize version constraint to a standard format
   * @param constraint Version constraint
   * @returns Normalized constraint string
   */
  static normalize(constraint: string): string {
    const parsed = this.parse(constraint);
    
    if (parsed.isExact && parsed.version) {
      return parsed.version;
    }
    
    if (parsed.operator && parsed.version) {
      return `${parsed.operator}${parsed.version}`;
    }
    
    return constraint;
  }
}

