import { readTextFile, fileExists, directoryExists } from '../../../utils/fileSystem.js';

/**
 * File utilities for language detection
 */
export class FileUtils {
  /**
   * Check if a file exists and is readable
   * @param filePath Path to the file
   * @returns True if file exists and is readable
   */
  static async isReadableFile(filePath: string): Promise<boolean> {
    try {
      return await fileExists(filePath);
    } catch (error) {
      return false;
    }
  }

  /**
   * Read a file and handle errors gracefully
   * @param filePath Path to the file
   * @returns File content or null if error
   */
  static async safeReadFile(filePath: string): Promise<string | null> {
    try {
      return await readTextFile(filePath);
    } catch (error) {
      console.error(`Error reading file ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Get the relative path from an absolute path
   * @param basePath Base path
   * @param filePath Full path
   * @returns Relative path
   */
  static getRelativePath(basePath: string, filePath: string): string {
    // Normalize paths
    let normalizedBase = basePath.replace(/\\/g, '/');
    const normalizedFile = filePath.replace(/\\/g, '/');
    
    // Trim trailing slash from base
    normalizedBase = normalizedBase.replace(/\/+$/, '');
    
    // Check if the file path starts with the base path
    if (normalizedFile.startsWith(normalizedBase)) {
      // Ensure it's a true path boundary
      if (normalizedFile.length === normalizedBase.length || 
          normalizedFile[normalizedBase.length] === '/') {
        // Remove the base path and the leading slash if present
        let relativePath = normalizedFile.substring(normalizedBase.length);
        if (relativePath.startsWith('/')) {
          relativePath = relativePath.substring(1);
        }
        return relativePath;
      }
    }
    
    // If not a subpath, return the original file path
    return normalizedFile;
  }

  /**
   * Get the directory path from a file path
   * @param filePath Path to the file
   * @returns Directory path
   */
  static getDirectoryPath(filePath: string): string {
    const lastSlashIndex = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'));
    
    if (lastSlashIndex === -1) {
      return '';
    }
    
    return filePath.substring(0, lastSlashIndex);
  }

  /**
   * Get the file name from a file path
   * @param filePath Path to the file
   * @returns File name with extension
   */
  static getFileName(filePath: string): string {
    const lastSlashIndex = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'));
    
    if (lastSlashIndex === -1) {
      return filePath;
    }
    
    return filePath.substring(lastSlashIndex + 1);
  }

  /**
   * Get the file name without extension from a file path
   * @param filePath Path to the file
   * @returns File name without extension
   */
  static getFileNameWithoutExtension(filePath: string): string {
    const fileName = this.getFileName(filePath);
    const lastDotIndex = fileName.lastIndexOf('.');
    
    if (lastDotIndex === -1) {
      return fileName;
    }
    
    return fileName.substring(0, lastDotIndex);
  }

  /**
   * Get the file extension from a file path
   * @param filePath Path to the file
   * @returns File extension without dot
   */
  static getFileExtension(filePath: string): string {
    const fileName = this.getFileName(filePath);
    const lastDotIndex = fileName.lastIndexOf('.');
    
    if (lastDotIndex === -1) {
      return '';
    }
    
    return fileName.substring(lastDotIndex + 1).toLowerCase();
  }

  /**
   * Check if a path is an absolute path
   * @param path Path to check
   * @returns True if path is absolute
   */
  static isAbsolutePath(path: string): boolean {
    return /^([a-zA-Z]:)?(\\|\/)/.test(path);
  }

  /**
   * Join path segments into a single path
   * @param segments Path segments
   * @returns Joined path
   */
  static joinPath(...segments: string[]): string {
    return segments
      .filter(segment => segment !== '')
      .join('/')
      .replace(/\/+/g, '/');
  }

  /**
   * Normalize path separators to forward slashes
   * @param path Path to normalize
   * @returns Normalized path
   */
  static normalizePath(path: string): string {
    return path.replace(/\\/g, '/');
  }

  /**
   * Check if a directory exists in the project
   * @param projectPath Path to the project
   * @param dirName Directory name to check
   * @returns True if directory exists
   */
  static async directoryExistsInProject(projectPath: string, dirName: string): Promise<boolean> {
    const dirPath = this.joinPath(projectPath, dirName);
    return await directoryExists(dirPath);
  }

  /**
   * Check if a file exists in the project
   * @param projectPath Path to the project
   * @param fileName File name to check
   * @returns True if file exists
   */
  static async fileExistsInProject(projectPath: string, fileName: string): Promise<boolean> {
    const filePath = this.joinPath(projectPath, fileName);
    return await fileExists(filePath);
  }

  /**
   * Find files matching a pattern in a directory
   * @param directoryPath Path to the directory
   * @param pattern Pattern to match
   * @returns Array of matching file paths
   */
  static async findFiles(directoryPath: string, pattern: RegExp): Promise<string[]> {
    const { readdir } = await import('fs/promises');
    const { join } = await import('path');
    
    try {
      const files = await readdir(directoryPath);
      const matchingFiles: string[] = [];
      
      for (const file of files) {
        if (pattern.test(file)) {
          matchingFiles.push(join(directoryPath, file));
        }
      }
      
      return matchingFiles;
    } catch (error) {
      console.error(`Error finding files in directory ${directoryPath}:`, error);
      return [];
    }
  }

  /**
   * Check if a file is a configuration file
   * @param filePath Path to the file
   * @returns True if file is a configuration file
   */
  static isConfigFile(filePath: string): boolean {
    const fileName = this.getFileName(filePath).toLowerCase();
    
    const configFiles = [
      'package.json',
      'package-lock.json',
      'yarn.lock',
      'pnpm-lock.yaml',
      'tsconfig.json',
      'jsconfig.json',
      'pyproject.toml',
      'setup.py',
      'requirements.txt',
      'pipfile',
      'pipfile.lock',
      'poetry.lock',
      'environment.yml',
      'environment.yaml',
      'conda.yml',
      'conda.yaml',
      'pom.xml',
      'build.gradle',
      'settings.gradle',
      'gradle.properties',
      'gemfile',
      'gemfile.lock',
      '.ruby-version',
      'go.mod',
      'go.sum',
      '.go-version',
      'cargo.toml',
      'cargo.lock',
      'rust-toolchain.toml',
      'composer.json',
      'composer.lock',
      '.php-version',
      'artisan',
      '.csproj',
      'packages.config',
      'project.json',
      'global.json'
    ];
    
    return configFiles.includes(fileName);
  }

  /**
   * Check if a file is a source code file
   * @param filePath Path to the file
   * @returns True if file is a source code file
   */
  static isSourceFile(filePath: string): boolean {
    const extension = this.getFileExtension(filePath);
    
    const sourceExtensions = [
      'py',
      'js',
      'ts',
      'jsx',
      'tsx',
      'java',
      'rb',
      'go',
      'rs',
      'php',
      'cs',
      'cpp',
      'c',
      'h',
      'hpp',
      'cc',
      'cxx',
      'm',
      'mm',
      'swift',
      'kt',
      'scala',
      'dart',
      'vb',
      'sh',
      'bash',
      'ps1',
      'r',
      'sql',
      'html',
      'css',
      'scss',
      'sass',
      'less',
      'xml',
      'json',
      'yaml',
      'yml',
      'toml',
      'md',
      'vue',
      'svelte'
    ];
    
    return sourceExtensions.includes(extension);
  }

  /**
   * Check if a file is a build artifact
   * @param filePath Path to the file
   * @returns True if file is a build artifact
   */
  static isBuildArtifact(filePath: string): boolean {
    const fileName = this.getFileName(filePath).toLowerCase();
    
    const buildArtifacts = [
      'dist',
      'build',
      'target',
      'out',
      'bin',
      'obj',
      'lib',
      'node_modules',
      '.next',
      '.nuxt',
      'vendor',
      '__pycache__',
      '.git',
      '.idea',
      '.vscode',
      'coverage',
      '.nyc_output',
      '.pytest_cache',
      '.mypy_cache',
      'cache',
      'tmp',
      'temp'
    ];
    
    // Check if the file path contains any of the build artifact directories
    for (const artifact of buildArtifacts) {
      if (filePath.includes(`/${artifact}/`) || filePath.includes(`\\${artifact}\\`) || 
          filePath.endsWith(`/${artifact}`) || filePath.endsWith(`\\${artifact}`)) {
        return true;
      }
    }
    
    // Check if the file has a build artifact extension
    // Use filename for compound extensions (fileName already declared above)
    const buildExtensions = [
      '.min.js',
      '.min.css',
      '.map',
      '.lock',
      '.log',
      '.tmp',
      '.cache'
    ];
    
    // Check compound extensions first
    for (const buildExt of buildExtensions) {
      if (fileName.endsWith(buildExt)) {
        return true;
      }
    }
    
    // Fallback to single-segment extension check
    const extension = this.getFileExtension(filePath);
    const singleSegmentExtensions = ['map', 'lock', 'log', 'tmp', 'cache'];
    return singleSegmentExtensions.includes(extension);
  }
}
