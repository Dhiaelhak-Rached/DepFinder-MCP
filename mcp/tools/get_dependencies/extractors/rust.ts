/**
 * Rust dependency extractor
 */

import { BaseDependencyExtractor } from './base.js';
import { Dependency, DependencyExtractionResult } from '../types.js';
import { FileUtils } from '../utils/fileUtils.js';
import { CargoParser } from '../parsers/cargoParser.js';
import { fileExists } from '../../../utils/fileSystem.js';

/**
 * Extract Rust dependencies
 * Priority: Cargo.lock > Cargo.toml
 */
export class RustExtractor extends BaseDependencyExtractor {
  protected languageName = 'rust';

  /**
   * Extract dependencies from Rust project
   * @param projectPath Path to project directory
   * @returns Dependency extraction result
   */
  async extract(projectPath: string): Promise<DependencyExtractionResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let dependencies: Dependency[] = [];
    let devDependencies: Dependency[] = [];

    // Try Cargo.lock (exact versions)
    const cargoLockPath = FileUtils.joinPath(projectPath, 'Cargo.lock');
    if (await fileExists(cargoLockPath)) {
      try {
        const result = await this.parseCargoLock(cargoLockPath);
        dependencies = result.dependencies;
        devDependencies = result.devDependencies;
      } catch (error) {
        errors.push(`Failed to parse Cargo.lock: ${error}`);
      }
    }

    // Try Cargo.toml (version constraints)
    const cargoTomlPath = FileUtils.joinPath(projectPath, 'Cargo.toml');
    if (await fileExists(cargoTomlPath)) {
      try {
        const result = await CargoParser.parse(cargoTomlPath);
        // If we don't have exact versions from lock file, use Cargo.toml
        if (dependencies.length === 0) {
          dependencies = result.dependencies;
          devDependencies = result.devDependencies;
        } else {
          // Merge to update version constraints
          this.mergeDependencies(dependencies, result.dependencies);
          this.mergeDependencies(devDependencies, result.devDependencies);
        }
      } catch (error) {
        errors.push(`Failed to parse Cargo.toml: ${error}`);
      }
    }

    // Determine lock file
    let lockFile: { path: string; format: string; exists: boolean } | undefined;
    if (await fileExists(cargoLockPath)) {
      lockFile = { path: 'Cargo.lock', format: 'cargo-lock', exists: true };
    } else if (await fileExists(cargoTomlPath)) {
      lockFile = { path: 'Cargo.toml', format: 'cargo-toml', exists: true };
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
   * Parse Cargo.lock
   */
  private async parseCargoLock(filePath: string): Promise<{
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

    let currentPackage: { name?: string; version?: string; isDev?: boolean } = {};

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Package entry: [[package]]
      if (line === '[[package]]') {
        if (currentPackage.name && currentPackage.version) {
          const dep: Dependency = {
            name: currentPackage.name,
            version: currentPackage.version,
            versionConstraint: `==${currentPackage.version}`,
            type: currentPackage.isDev ? 'development' : 'runtime',
            source: 'registry'
          };
          if (currentPackage.isDev) {
            devDependencies.push(dep);
          } else {
            dependencies.push(dep);
          }
        }
        currentPackage = {};
        continue;
      }

      // Name field
      if (line.startsWith('name = ')) {
        const match = line.match(/name\s*=\s*["']([^"']+)["']/);
        if (match) {
          currentPackage.name = match[1];
        }
      }

      // Version field
      if (line.startsWith('version = ')) {
        const match = line.match(/version\s*=\s*["']([^"']+)["']/);
        if (match) {
          currentPackage.version = match[1];
        }
      }
    }

    // Add last package
    if (currentPackage.name && currentPackage.version) {
      const dep: Dependency = {
        name: currentPackage.name,
        version: currentPackage.version,
        versionConstraint: `==${currentPackage.version}`,
        type: currentPackage.isDev ? 'development' : 'runtime',
        source: 'registry'
      };
      if (currentPackage.isDev) {
        devDependencies.push(dep);
      } else {
        dependencies.push(dep);
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

