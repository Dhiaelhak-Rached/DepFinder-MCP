import { Dependency, DependencyExtractionResult, DependencyGroup } from '../types.js';

/**
 * Base extractor interface for dependency extraction
 */
export interface IDependencyExtractor {
  /**
   * Extract dependencies from project files
   * @param projectPath Path to the project directory
   * @returns Promise<DependencyExtractionResult> Extraction result with dependencies
   */
  extract(projectPath: string): Promise<DependencyExtractionResult>;
}

/**
 * Base dependency extractor with common functionality
 */
export abstract class BaseDependencyExtractor implements IDependencyExtractor {
  protected abstract languageName: string;

  /**
   * Extract dependencies from project files
   * @param projectPath Path to the project directory
   * @returns Promise<DependencyExtractionResult> Extraction result
   */
  abstract extract(projectPath: string): Promise<DependencyExtractionResult>;

  /**
   * Create a dependency group
   * @param dependencies Runtime dependencies
   * @param devDependencies Development dependencies
   * @param peerDependencies Peer dependencies
   * @param optionalDependencies Optional dependencies
   * @param lockFile Lock file information
   * @returns DependencyGroup
   */
  protected createDependencyGroup(
    dependencies: Dependency[],
    devDependencies?: Dependency[],
    peerDependencies?: Dependency[],
    optionalDependencies?: Dependency[],
    lockFile?: { path: string; format: string; exists: boolean }
  ): DependencyGroup {
    return {
      language: this.languageName,
      dependencies,
      ...(devDependencies && devDependencies.length > 0 && { devDependencies }),
      ...(peerDependencies && peerDependencies.length > 0 && { peerDependencies }),
      ...(optionalDependencies && optionalDependencies.length > 0 && { optionalDependencies }),
      ...(lockFile && { lockFile })
    };
  }

  /**
   * Create extraction result
   * @param groups Dependency groups
   * @param errors Errors encountered during extraction
   * @param warnings Warnings encountered during extraction
   * @returns DependencyExtractionResult
   */
  protected createResult(
    groups: DependencyGroup[],
    errors?: string[],
    warnings?: string[]
  ): DependencyExtractionResult {
    return {
      language: this.languageName,
      groups,
      ...(errors && errors.length > 0 && { errors }),
      ...(warnings && warnings.length > 0 && { warnings })
    };
  }
}

