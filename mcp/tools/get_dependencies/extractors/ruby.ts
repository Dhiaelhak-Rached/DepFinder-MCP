/**
 * Ruby dependency extractor
 */

import { BaseDependencyExtractor } from './base.js';
import { Dependency, DependencyExtractionResult } from '../types.js';
import { FileUtils } from '../utils/fileUtils.js';
import { GemfileParser } from '../parsers/gemfileParser.js';
import { fileExists } from '../../../utils/fileSystem.js';

/**
 * Extract Ruby dependencies
 * Priority: Gemfile.lock > Gemfile
 */
export class RubyExtractor extends BaseDependencyExtractor {
  protected languageName = 'ruby';

  /**
   * Extract dependencies from Ruby project
   * @param projectPath Path to project directory
   * @returns Dependency extraction result
   */
  async extract(projectPath: string): Promise<DependencyExtractionResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let dependencies: Dependency[] = [];
    let devDependencies: Dependency[] = [];

    // Try Gemfile.lock (exact versions)
    const gemfileLockPath = FileUtils.joinPath(projectPath, 'Gemfile.lock');
    if (await fileExists(gemfileLockPath)) {
      try {
        const result = await this.parseGemfileLock(gemfileLockPath);
        dependencies = result.dependencies;
        devDependencies = result.devDependencies;
      } catch (error) {
        errors.push(`Failed to parse Gemfile.lock: ${error}`);
      }
    }

    // Try Gemfile (version constraints)
    const gemfilePath = FileUtils.joinPath(projectPath, 'Gemfile');
    if (await fileExists(gemfilePath)) {
      try {
        const result = await GemfileParser.parse(gemfilePath);
        // If we don't have exact versions from lock file, use Gemfile
        if (dependencies.length === 0) {
          dependencies = result.dependencies;
          devDependencies = result.devDependencies;
        } else {
          // Merge to update version constraints
          this.mergeDependencies(dependencies, result.dependencies);
          this.mergeDependencies(devDependencies, result.devDependencies);
        }
      } catch (error) {
        errors.push(`Failed to parse Gemfile: ${error}`);
      }
    }

    // Determine lock file
    let lockFile: { path: string; format: string; exists: boolean } | undefined;
    if (await fileExists(gemfileLockPath)) {
      lockFile = { path: 'Gemfile.lock', format: 'gemfile-lock', exists: true };
    } else if (await fileExists(gemfilePath)) {
      lockFile = { path: 'Gemfile', format: 'gemfile', exists: true };
    }

    const group = this.createDependencyGroup(
      dependencies,
      devDependencies.length > 0 ? devDependencies : undefined,
      undefined,
      undefined,
      lockFile
    );

    return this.createResult([group], errors.length > 0 ? errors : undefined, warnings.length > 0 ? warnings : undefined);
  }

  /**
   * Parse Gemfile.lock
   */
  private async parseGemfileLock(filePath: string): Promise<{
    dependencies: Dependency[];
    devDependencies: Dependency[];
  }> {
    const content = await FileUtils.safeReadFile(filePath);
    if (!content) {
      return { dependencies: [], devDependencies: [] };
    }

    const dependencies: Dependency[] = [];
    const devDependencies: Dependency[] = [];
    const lines = content.split('\n');

    let inGems = false;
    let inDevDependencies = false;

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed === 'GEM') {
        inGems = true;
        inDevDependencies = false;
        continue;
      }

      if (trimmed === 'DEPENDENCIES') {
        inGems = false;
        inDevDependencies = true;
        continue;
      }

      if (trimmed.startsWith('  ') && inGems) {
        // Format: "    gem-name (version)"
        const match = trimmed.match(/^\s+([^\s(]+)\s+\(([^)]+)\)/);
        if (match) {
          dependencies.push({
            name: match[1],
            version: match[2],
            versionConstraint: `==${match[2]}`,
            type: 'runtime',
            source: 'registry'
          });
        }
      }

      if (trimmed.startsWith('  ') && inDevDependencies) {
        // Format: "    gem-name (version)"
        const match = trimmed.match(/^\s+([^\s(]+)\s+\(([^)]+)\)/);
        if (match) {
          devDependencies.push({
            name: match[1],
            version: match[2],
            versionConstraint: `==${match[2]}`,
            type: 'development',
            source: 'registry'
          });
        }
      }
    }

    return { dependencies, devDependencies };
  }

  /**
   * Merge dependencies, preferring versions from second array
   */
  private mergeDependencies(target: Dependency[], source: Dependency[]): void {
    for (const sourceDep of source) {
      const existingIndex = target.findIndex(d => d.name === sourceDep.name);
      if (existingIndex !== -1) {
        // Update version constraint if source has one
        if (sourceDep.versionConstraint) {
          target[existingIndex].versionConstraint = sourceDep.versionConstraint;
        }
      } else {
        target.push(sourceDep);
      }
    }
  }
}

