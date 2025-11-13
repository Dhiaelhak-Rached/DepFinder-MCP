/**
 * Go dependency extractor
 */

import { BaseDependencyExtractor } from './base.js';
import { Dependency, DependencyExtractionResult } from '../types.js';
import { FileUtils } from '../utils/fileUtils.js';
import { GomodParser } from '../parsers/gomodParser.js';
import { fileExists } from '../../../utils/fileSystem.js';

/**
 * Extract Go dependencies
 * Priority: go.mod (primary source), go.sum (for verification, optional)
 */
export class GoExtractor extends BaseDependencyExtractor {
  protected languageName = 'go';

  /**
   * Extract dependencies from Go project
   * @param projectPath Path to project directory
   * @returns Dependency extraction result
   */
  async extract(projectPath: string): Promise<DependencyExtractionResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let dependencies: Dependency[] = [];

    // Parse go.mod (primary source)
    const gomodPath = FileUtils.joinPath(projectPath, 'go.mod');
    if (await fileExists(gomodPath)) {
      try {
        dependencies = await GomodParser.parse(gomodPath);
      } catch (error) {
        errors.push(`Failed to parse go.mod: ${error}`);
      }
    }

    // go.sum is for verification only, not for dependency extraction
    const gosumPath = FileUtils.joinPath(projectPath, 'go.sum');
    const hasGoSum = await fileExists(gosumPath);

    // Determine lock file
    let lockFile: { path: string; format: string; exists: boolean } | undefined;
    if (await fileExists(gomodPath)) {
      lockFile = { path: 'go.mod', format: 'go-mod', exists: true };
    }

    const group = this.createDependencyGroup(
      dependencies,
      undefined,
      undefined,
      undefined,
      lockFile
    );

    return this.createResult([group], errors.length > 0 ? errors : undefined, warnings.length > 0 ? warnings : undefined);
  }
}

