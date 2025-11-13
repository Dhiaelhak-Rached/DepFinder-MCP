/**
 * Node.js/JavaScript/TypeScript dependency extractor
 */

import { BaseDependencyExtractor } from './base.js';
import { Dependency, DependencyExtractionResult } from '../types.js';
import { FileUtils } from '../utils/fileUtils.js';
import { PackageJsonParser } from '../parsers/packageJsonParser.js';
import { fileExists, readJsonFile } from '../../../utils/fileSystem.js';

/**
 * Extract Node.js dependencies
 * Priority: package-lock.json > yarn.lock > pnpm-lock.yaml > package.json
 */
export class NodeJSExtractor extends BaseDependencyExtractor {
  protected languageName = 'javascript';

  /**
   * Extract dependencies from Node.js project
   * @param projectPath Path to project directory
   * @returns Dependency extraction result
   */
  async extract(projectPath: string): Promise<DependencyExtractionResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let dependencies: Dependency[] = [];
    let devDependencies: Dependency[] = [];
    let peerDependencies: Dependency[] = [];
    let optionalDependencies: Dependency[] = [];

    // Try package-lock.json (exact versions)
    const packageLockPath = FileUtils.joinPath(projectPath, 'package-lock.json');
    if (await fileExists(packageLockPath)) {
      try {
        const result = await this.parsePackageLock(packageLockPath);
        dependencies = result.dependencies;
        devDependencies = result.devDependencies;
        peerDependencies = result.peerDependencies;
        optionalDependencies = result.optionalDependencies;
      } catch (error) {
        errors.push(`Failed to parse package-lock.json: ${error}`);
      }
    }

    // Try yarn.lock (exact versions)
    const yarnLockPath = FileUtils.joinPath(projectPath, 'yarn.lock');
    if (await fileExists(yarnLockPath) && dependencies.length === 0) {
      try {
        const result = await this.parseYarnLock(yarnLockPath);
        dependencies = result.dependencies;
        devDependencies = result.devDependencies;
      } catch (error) {
        errors.push(`Failed to parse yarn.lock: ${error}`);
      }
    }

    // Try pnpm-lock.yaml (exact versions)
    const pnpmLockPath = FileUtils.joinPath(projectPath, 'pnpm-lock.yaml');
    if (await fileExists(pnpmLockPath) && dependencies.length === 0) {
      try {
        const result = await this.parsePnpmLock(pnpmLockPath);
        dependencies = result.dependencies;
        devDependencies = result.devDependencies;
      } catch (error) {
        errors.push(`Failed to parse pnpm-lock.yaml: ${error}`);
      }
    }

    // Try package.json (version ranges) - fallback or supplement
    const packageJsonPath = FileUtils.joinPath(projectPath, 'package.json');
    if (await fileExists(packageJsonPath)) {
      try {
        const result = await PackageJsonParser.parse(packageJsonPath);
        // If we don't have exact versions from lock files, use package.json
        if (dependencies.length === 0) {
          dependencies = result.dependencies;
          devDependencies = result.devDependencies;
          peerDependencies = result.peerDependencies;
          optionalDependencies = result.optionalDependencies;
        } else {
          // Merge to get peer and optional dependencies that might not be in lock files
          peerDependencies = result.peerDependencies;
          optionalDependencies = result.optionalDependencies;
        }
      } catch (error) {
        errors.push(`Failed to parse package.json: ${error}`);
      }
    }

    // Determine lock file
    let lockFile: { path: string; format: string; exists: boolean } | undefined;
    if (await fileExists(packageLockPath)) {
      lockFile = { path: 'package-lock.json', format: 'package-lock', exists: true };
    } else if (await fileExists(yarnLockPath)) {
      lockFile = { path: 'yarn.lock', format: 'yarn-lock', exists: true };
    } else if (await fileExists(pnpmLockPath)) {
      lockFile = { path: 'pnpm-lock.yaml', format: 'pnpm-lock', exists: true };
    } else if (await fileExists(packageJsonPath)) {
      lockFile = { path: 'package.json', format: 'package-json', exists: true };
    }

    const group = this.createDependencyGroup(
      dependencies,
      devDependencies.length > 0 ? devDependencies : undefined,
      peerDependencies.length > 0 ? peerDependencies : undefined,
      optionalDependencies.length > 0 ? optionalDependencies : undefined,
      lockFile
    );

    return this.createResult([group], errors.length > 0 ? errors : undefined, warnings.length > 0 ? warnings : undefined);
  }

  /**
   * Parse package-lock.json
   */
  private async parsePackageLock(filePath: string): Promise<{
    dependencies: Dependency[];
    devDependencies: Dependency[];
    peerDependencies: Dependency[];
    optionalDependencies: Dependency[];
  }> {
    const lock = await readJsonFile(filePath);
    const dependencies: Dependency[] = [];
    const devDependencies: Dependency[] = [];
    const peerDependencies: Dependency[] = [];
    const optionalDependencies: Dependency[] = [];

    // package-lock.json v2+ uses "packages" field
    if (lock.packages) {
      for (const [path, pkg] of Object.entries(lock.packages)) {
        if (path === 'node_modules' || !path) continue;
        if (pkg && typeof pkg === 'object' && 'version' in pkg) {
          const pkgInfo = pkg as any;
          const name = path.replace(/^node_modules\//, '').split('/')[0];
          const isDev = pkgInfo.dev === true;
          const isPeer = pkgInfo.peer === true;
          const isOptional = pkgInfo.optional === true;

          const dep: Dependency = {
            name,
            version: pkgInfo.version,
            versionConstraint: `==${pkgInfo.version}`,
            type: isDev ? 'development' : isPeer ? 'peer' : isOptional ? 'optional' : 'runtime',
            source: 'registry'
          };

          if (isDev) devDependencies.push(dep);
          else if (isPeer) peerDependencies.push(dep);
          else if (isOptional) optionalDependencies.push(dep);
          else dependencies.push(dep);
        }
      }
    }
    // package-lock.json v1 uses "dependencies" tree
    else if (lock.dependencies) {
      this.extractFromDependencyTree(lock.dependencies, dependencies, devDependencies, peerDependencies, optionalDependencies);
    }

    return { dependencies, devDependencies, peerDependencies, optionalDependencies };
  }

  /**
   * Extract from dependency tree (package-lock.json v1)
   */
  private extractFromDependencyTree(
    tree: any,
    dependencies: Dependency[],
    devDependencies: Dependency[],
    peerDependencies: Dependency[],
    optionalDependencies: Dependency[],
    seen = new Set<string>()
  ): void {
    for (const [name, info] of Object.entries(tree)) {
      if (seen.has(name)) continue;
      seen.add(name);

      if (info && typeof info === 'object' && 'version' in info) {
        const pkgInfo = info as any;
        const isDev = pkgInfo.dev === true;
        const isPeer = pkgInfo.peer === true;
        const isOptional = pkgInfo.optional === true;

        const dep: Dependency = {
          name,
          version: pkgInfo.version,
          versionConstraint: `==${pkgInfo.version}`,
          type: isDev ? 'development' : isPeer ? 'peer' : isOptional ? 'optional' : 'runtime',
          source: 'registry'
        };

        if (isDev) devDependencies.push(dep);
        else if (isPeer) peerDependencies.push(dep);
        else if (isOptional) optionalDependencies.push(dep);
        else dependencies.push(dep);

        // Recurse into nested dependencies
        if (pkgInfo.dependencies) {
          this.extractFromDependencyTree(pkgInfo.dependencies, dependencies, devDependencies, peerDependencies, optionalDependencies, seen);
        }
      }
    }
  }

  /**
   * Parse yarn.lock
   */
  private async parseYarnLock(filePath: string): Promise<{
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

      // Package entry: "package-name@version:"
      const packageMatch = line.match(/^"([^"]+)"@([^:]+):$/);
      if (packageMatch) {
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
        currentPackage = { name: packageMatch[1], version: packageMatch[2] };
        continue;
      }

      // Version line
      if (line.startsWith('version ')) {
        const versionMatch = line.match(/version\s+"([^"]+)"/);
        if (versionMatch) {
          currentPackage.version = versionMatch[1];
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
   * Parse pnpm-lock.yaml
   */
  private async parsePnpmLock(filePath: string): Promise<{
    dependencies: Dependency[];
    devDependencies: Dependency[];
  }> {
    const content = await FileUtils.safeReadFile(filePath);
    if (!content) {
      return { dependencies: [], devDependencies: [] };
    }

    // Simple YAML parsing (for production, use a YAML library)
    const dependencies: Dependency[] = [];
    const devDependencies: Dependency[] = [];

    // Extract from dependencies section
    const depsMatch = content.match(/dependencies:\s*\n((?:\s+[^\n]+\n?)+)/);
    if (depsMatch) {
      const depsSection = depsMatch[1];
      const depLines = depsSection.split('\n');
      for (const line of depLines) {
        const match = line.match(/^\s+([^:]+):\s*(.+)$/);
        if (match) {
          dependencies.push({
            name: match[1].trim(),
            version: match[2].trim(),
            versionConstraint: `==${match[2].trim()}`,
            type: 'runtime',
            source: 'registry'
          });
        }
      }
    }

    // Extract from devDependencies section
    const devDepsMatch = content.match(/devDependencies:\s*\n((?:\s+[^\n]+\n?)+)/);
    if (devDepsMatch) {
      const devDepsSection = devDepsMatch[1];
      const devDepLines = devDepsSection.split('\n');
      for (const line of devDepLines) {
        const match = line.match(/^\s+([^:]+):\s*(.+)$/);
        if (match) {
          devDependencies.push({
            name: match[1].trim(),
            version: match[2].trim(),
            versionConstraint: `==${match[2].trim()}`,
            type: 'development',
            source: 'registry'
          });
        }
      }
    }

    return { dependencies, devDependencies };
  }
}

