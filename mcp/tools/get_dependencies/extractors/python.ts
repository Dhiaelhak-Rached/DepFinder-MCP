/**
 * Python dependency extractor
 */

import { BaseDependencyExtractor } from './base.js';
import { Dependency, DependencyExtractionResult } from '../types.js';
import { FileUtils } from '../utils/fileUtils.js';
import { RequirementsParser } from '../parsers/requirementsParser.js';
import { PyprojectParser } from '../parsers/pyprojectParser.js';
import { fileExists } from '../../../utils/fileSystem.js';

/**
 * Extract Python dependencies
 * Priority: pyproject.toml > Pipfile/Pipfile.lock > poetry.lock > requirements.txt > setup.py/setup.cfg > environment.yml
 */
export class PythonExtractor extends BaseDependencyExtractor {
  protected languageName = 'python';

  /**
   * Extract dependencies from Python project
   * @param projectPath Path to project directory
   * @returns Dependency extraction result
   */
  async extract(projectPath: string): Promise<DependencyExtractionResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const allDependencies: Dependency[] = [];
    const allDevDependencies: Dependency[] = [];
    const allOptionalDependencies: Record<string, Dependency[]> = {};

    // Try pyproject.toml (modern standard)
    const pyprojectPath = FileUtils.joinPath(projectPath, 'pyproject.toml');
    if (await fileExists(pyprojectPath)) {
      try {
        const result = await PyprojectParser.parse(pyprojectPath);
        allDependencies.push(...result.dependencies);
        Object.assign(allOptionalDependencies, result.optionalDependencies);
      } catch (error) {
        errors.push(`Failed to parse pyproject.toml: ${error}`);
      }
    }

    // Try Pipfile / Pipfile.lock (Pipenv)
    const pipfilePath = FileUtils.joinPath(projectPath, 'Pipfile');
    const pipfileLockPath = FileUtils.joinPath(projectPath, 'Pipfile.lock');
    if (await fileExists(pipfilePath)) {
      try {
        // Parse Pipfile (TOML format similar to pyproject.toml)
        const content = await FileUtils.safeReadFile(pipfilePath);
        if (content) {
          const pipfileDeps = this.parsePipfile(content);
          allDependencies.push(...pipfileDeps.dependencies);
          allDevDependencies.push(...pipfileDeps.devDependencies);
        }

        // Try Pipfile.lock for exact versions
        if (await fileExists(pipfileLockPath)) {
          const lockContent = await FileUtils.safeReadFile(pipfileLockPath);
          if (lockContent) {
            const lockDeps = this.parsePipfileLock(lockContent);
            // Merge with Pipfile, preferring lock file versions
            this.mergeDependencies(allDependencies, lockDeps.dependencies);
            this.mergeDependencies(allDevDependencies, lockDeps.devDependencies);
          }
        }
      } catch (error) {
        errors.push(`Failed to parse Pipfile: ${error}`);
      }
    }

    // Try poetry.lock (Poetry)
    const poetryLockPath = FileUtils.joinPath(projectPath, 'poetry.lock');
    if (await fileExists(poetryLockPath)) {
      try {
        const lockContent = await FileUtils.safeReadFile(poetryLockPath);
        if (lockContent) {
          const poetryDeps = this.parsePoetryLock(lockContent);
          this.mergeDependencies(allDependencies, poetryDeps);
        }
      } catch (error) {
        errors.push(`Failed to parse poetry.lock: ${error}`);
      }
    }

    // Try requirements.txt / requirements-*.txt
    const requirementsPath = FileUtils.joinPath(projectPath, 'requirements.txt');
    if (await fileExists(requirementsPath)) {
      try {
        const content = await FileUtils.safeReadFile(requirementsPath);
        if (content) {
          const deps = RequirementsParser.parse(content);
          allDependencies.push(...deps);
        }
      } catch (error) {
        errors.push(`Failed to parse requirements.txt: ${error}`);
      }
    }

    // Try requirements-dev.txt, requirements-dev.txt, etc.
    const requirementsFiles = ['requirements-dev.txt', 'requirements-test.txt', 'requirements-*.txt'];
    for (const pattern of requirementsFiles) {
      // For now, check specific files (full glob support would require additional utilities)
      if (pattern === 'requirements-dev.txt') {
        const devPath = FileUtils.joinPath(projectPath, 'requirements-dev.txt');
        if (await fileExists(devPath)) {
          try {
            const content = await FileUtils.safeReadFile(devPath);
            if (content) {
              const deps = RequirementsParser.parse(content);
              allDevDependencies.push(...deps);
            }
          } catch (error) {
            warnings.push(`Failed to parse ${pattern}: ${error}`);
          }
        }
      }
    }

    // Try setup.py / setup.cfg
    const setupPyPath = FileUtils.joinPath(projectPath, 'setup.py');
    const setupCfgPath = FileUtils.joinPath(projectPath, 'setup.cfg');
    if (await fileExists(setupPyPath)) {
      try {
        const content = await FileUtils.safeReadFile(setupPyPath);
        if (content) {
          const deps = this.parseSetupPy(content);
          allDependencies.push(...deps);
        }
      } catch (error) {
        warnings.push(`Failed to parse setup.py: ${error}`);
      }
    }

    if (await fileExists(setupCfgPath)) {
      try {
        const content = await FileUtils.safeReadFile(setupCfgPath);
        if (content) {
          const deps = this.parseSetupCfg(content);
          allDependencies.push(...deps);
        }
      } catch (error) {
        warnings.push(`Failed to parse setup.cfg: ${error}`);
      }
    }

    // Try environment.yml (Conda)
    const envYmlPath = FileUtils.joinPath(projectPath, 'environment.yml');
    const condaYmlPath = FileUtils.joinPath(projectPath, 'conda.yml');
    const envPath = envYmlPath;
    if (await fileExists(envYmlPath) || await fileExists(condaYmlPath)) {
      const finalPath = await fileExists(envYmlPath) ? envYmlPath : condaYmlPath;
      try {
        const content = await FileUtils.safeReadFile(finalPath);
        if (content) {
          const deps = this.parseEnvironmentYml(content);
          allDependencies.push(...deps);
        }
      } catch (error) {
        warnings.push(`Failed to parse environment.yml: ${error}`);
      }
    }

    // Determine lock file
    let lockFile: { path: string; format: string; exists: boolean } | undefined;
    if (await fileExists(pipfileLockPath)) {
      lockFile = { path: 'Pipfile.lock', format: 'pipfile-lock', exists: true };
    } else if (await fileExists(poetryLockPath)) {
      lockFile = { path: 'poetry.lock', format: 'poetry-lock', exists: true };
    } else if (await fileExists(requirementsPath)) {
      lockFile = { path: 'requirements.txt', format: 'requirements', exists: true };
    }

    const group = this.createDependencyGroup(
      allDependencies,
      allDevDependencies.length > 0 ? allDevDependencies : undefined,
      undefined,
      Object.keys(allOptionalDependencies).length > 0 ? Object.values(allOptionalDependencies).flat() : undefined,
      lockFile
    );

    return this.createResult([group], errors.length > 0 ? errors : undefined, warnings.length > 0 ? warnings : undefined);
  }

  /**
   * Parse Pipfile content
   */
  private parsePipfile(content: string): { dependencies: Dependency[]; devDependencies: Dependency[] } {
    const dependencies: Dependency[] = [];
    const devDependencies: Dependency[] = [];

    let inPackages = false;
    let inDevPackages = false;

    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed === '[packages]') {
        inPackages = true;
        inDevPackages = false;
        continue;
      }

      if (trimmed === '[dev-packages]') {
        inPackages = false;
        inDevPackages = true;
        continue;
      }

      if (trimmed.startsWith('[')) {
        inPackages = false;
        inDevPackages = false;
        continue;
      }

      if (inPackages || inDevPackages) {
        if (!trimmed || trimmed.startsWith('#')) continue;

        const dep = this.parsePipfileDependency(trimmed);
        if (dep) {
          if (inPackages) {
            dependencies.push(dep);
          } else {
            devDependencies.push(dep);
          }
        }
      }
    }

    return { dependencies, devDependencies };
  }

  /**
   * Parse a Pipfile dependency line
   */
  private parsePipfileDependency(line: string): Dependency | null {
    const match = line.match(/^([^=]+)\s*=\s*["']([^"']+)["']/);
    if (match) {
      return {
        name: match[1].trim(),
        versionConstraint: match[2],
        type: 'runtime',
        source: 'registry'
      };
    }
    return null;
  }

  /**
   * Parse Pipfile.lock content
   */
  private parsePipfileLock(content: string): { dependencies: Dependency[]; devDependencies: Dependency[] } {
    try {
      const lock = JSON.parse(content);
      const dependencies: Dependency[] = [];
      const devDependencies: Dependency[] = [];

      if (lock.default) {
        for (const [name, info] of Object.entries(lock.default)) {
          if (info && typeof info === 'object' && 'version' in info) {
            dependencies.push({
              name,
              version: (info as any).version,
              versionConstraint: `==${(info as any).version}`,
              type: 'runtime',
              source: 'registry'
            });
          }
        }
      }

      if (lock.develop) {
        for (const [name, info] of Object.entries(lock.develop)) {
          if (info && typeof info === 'object' && 'version' in info) {
            devDependencies.push({
              name,
              version: (info as any).version,
              versionConstraint: `==${(info as any).version}`,
              type: 'development',
              source: 'registry'
            });
          }
        }
      }

      return { dependencies, devDependencies };
    } catch (error) {
      return { dependencies: [], devDependencies: [] };
    }
  }

  /**
   * Parse poetry.lock content
   */
  private parsePoetryLock(content: string): Dependency[] {
    try {
      const lock = JSON.parse(content);
      const dependencies: Dependency[] = [];

      if (lock.package && Array.isArray(lock.package)) {
        for (const pkg of lock.package) {
          if (pkg.name && pkg.version) {
            dependencies.push({
              name: pkg.name,
              version: pkg.version,
              versionConstraint: `==${pkg.version}`,
              type: 'runtime',
              source: 'registry'
            });
          }
        }
      }

      return dependencies;
    } catch (error) {
      return [];
    }
  }

  /**
   * Parse setup.py content
   */
  private parseSetupPy(content: string): Dependency[] {
    const dependencies: Dependency[] = [];

    // Try to find install_requires
    const installRequiresMatch = content.match(/install_requires\s*=\s*\[([^\]]+)\]/);
    if (installRequiresMatch) {
      const packages = installRequiresMatch[1].match(/["']([^"']+)["']/g);
      if (packages) {
        for (const pkg of packages) {
          const name = pkg.replace(/["']/g, '');
          dependencies.push({
            name,
            type: 'runtime',
            source: 'registry'
          });
        }
      }
    }

    return dependencies;
  }

  /**
   * Parse setup.cfg content
   */
  private parseSetupCfg(content: string): Dependency[] {
    const dependencies: Dependency[] = [];
    let inOptions = false;

    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed === '[options]') {
        inOptions = true;
        continue;
      }

      if (trimmed.startsWith('[')) {
        inOptions = false;
        continue;
      }

      if (inOptions && trimmed.startsWith('install_requires')) {
        const deps = trimmed.split('=')[1]?.trim();
        if (deps) {
          const packages = deps.split(',').map(p => p.trim().replace(/["']/g, ''));
          for (const pkg of packages) {
            dependencies.push({
              name: pkg,
              type: 'runtime',
              source: 'registry'
            });
          }
        }
      }
    }

    return dependencies;
  }

  /**
   * Parse environment.yml content
   */
  private parseEnvironmentYml(content: string): Dependency[] {
    const dependencies: Dependency[] = [];
    const lines = content.split('\n');
    let inDependencies = false;

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed === 'dependencies:' || trimmed.startsWith('dependencies:')) {
        inDependencies = true;
        continue;
      }

      if (trimmed.startsWith('-') && inDependencies) {
        const name = trimmed.substring(1).trim().split('=')[0];
        if (name && !name.startsWith('python')) {
          dependencies.push({
            name,
            type: 'runtime',
            source: 'registry'
          });
        }
      }
    }

    return dependencies;
  }

  /**
   * Merge dependencies, preferring versions from second array
   */
  private mergeDependencies(target: Dependency[], source: Dependency[]): void {
    for (const sourceDep of source) {
      const existingIndex = target.findIndex(d => d.name === sourceDep.name);
      if (existingIndex !== -1) {
        // Prefer source version if it exists
        if (sourceDep.version) {
          target[existingIndex] = { ...target[existingIndex], ...sourceDep };
        }
      } else {
        target.push(sourceDep);
      }
    }
  }
}

