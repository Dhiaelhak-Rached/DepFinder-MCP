/**
 * Type definitions for dependency extraction
 */

export interface Dependency {
  name: string;
  version?: string;
  versionConstraint?: string;  // e.g., "^1.0.0", "~> 2.0", ">=1.0.0"
  type: 'runtime' | 'development' | 'peer' | 'optional' | 'build';
  source?: 'registry' | 'git' | 'path' | 'local';
  sourceUrl?: string;
  extras?: string[];  // For Python extras
  scope?: string;     // For scoped packages like @scope/package
}

export interface DependencyGroup {
  language: string;
  dependencies: Dependency[];
  devDependencies?: Dependency[];
  peerDependencies?: Dependency[];
  optionalDependencies?: Dependency[];
  lockFile?: {
    path: string;
    format: string;
    exists: boolean;
  };
}

export interface DependencyExtractionResult {
  language: string;
  groups: DependencyGroup[];
  errors?: string[];
  warnings?: string[];
}

