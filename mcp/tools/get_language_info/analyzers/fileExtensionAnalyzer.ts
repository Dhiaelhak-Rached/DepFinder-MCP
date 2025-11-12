import { IAnalyzer, FileExtensionResult } from '../types.js';
import { listFilesRecursively } from '../../../utils/fileSystem.js';

/**
 * File extension analyzer for language detection
 */
export class FileExtensionAnalyzer implements IAnalyzer<FileExtensionResult[]> {
  /**
   * Mapping of file extensions to languages
   */
  private extensionMap: Record<string, string> = {
    '.py': 'python',
    '.js': 'javascript',
    '.ts': 'typescript',
    '.jsx': 'react',
    '.tsx': 'react-typescript',
    '.java': 'java',
    '.rb': 'ruby',
    '.go': 'go',
    '.rs': 'rust',
    '.php': 'php',
    '.cs': 'csharp',
    '.vb': 'vbnet',
    '.swift': 'swift',
    '.kt': 'kotlin',
    '.scala': 'scala',
    '.dart': 'dart',
    '.cpp': 'cpp',
    '.c': 'c',
    '.h': 'c',
    '.hpp': 'cpp',
    '.cc': 'cpp',
    '.cxx': 'cpp',
    '.m': 'objective-c',
    '.mm': 'objective-c++',
    '.sh': 'shell',
    '.bash': 'shell',
    '.ps1': 'powershell',
    '.r': 'r',
    '.sql': 'sql',
    '.html': 'html',
    '.css': 'css',
    '.scss': 'scss',
    '.sass': 'sass',
    '.less': 'less',
    '.xml': 'xml',
    '.json': 'json',
    '.yaml': 'yaml',
    '.yml': 'yaml',
    '.toml': 'toml',
    '.md': 'markdown',
    '.vue': 'vue',
    '.svelte': 'svelte'
  };

  /**
   * Analyze file extensions in project directory
   * @param projectPath Path to the project directory
   * @param targetExtensions Optional array of extensions to focus on
   * @returns Promise<FileExtensionResult[]> Array of file extension results
   */
  async analyze(projectPath: string, targetExtensions?: string[]): Promise<FileExtensionResult[]> {
    // Get all files in the project
    const files = await listFilesRecursively(projectPath);
    
    // Count file extensions
    const extensionCounts: Record<string, number> = {};
    let totalFiles = 0;

    for (const file of files) {
      // Skip common non-code directories and files
      if (this.shouldSkipFile(file)) {
        continue;
      }

      const extension = this.getFileExtension(file);
      if (extension) {
        // Only count if targetExtensions is not specified or if extension is in targetExtensions
        if (!targetExtensions || targetExtensions.includes(extension)) {
          extensionCounts[extension] = (extensionCounts[extension] || 0) + 1;
          totalFiles++;
        }
      }
    }

    // Convert to result format
    const results: FileExtensionResult[] = [];
    for (const [extension, count] of Object.entries(extensionCounts)) {
      const language = this.extensionMap[extension] || 'unknown';
      const percentage = totalFiles > 0 ? (count / totalFiles) * 100 : 0;
      
      results.push({
        extension,
        count,
        percentage: Math.round(percentage * 100) / 100, // Round to 2 decimal places
        language
      });
    }

    // Sort by count (descending)
    return results.sort((a, b) => b.count - a.count);
  }

  /**
   * Get file extension from file path
   * @param filePath Path to the file
   * @returns File extension or null
   */
  private getFileExtension(filePath: string): string | null {
    const lastDotIndex = filePath.lastIndexOf('.');
    if (lastDotIndex === -1 || lastDotIndex === filePath.length - 1) {
      return null;
    }
    return filePath.substring(lastDotIndex).toLowerCase();
  }

  /**
   * Check if file should be skipped during analysis
   * @param filePath Path to the file
   * @returns True if file should be skipped
   */
  private shouldSkipFile(filePath: string): boolean {
    // Skip files in common directories that don't contain source code
    const skipDirectories = [
      'node_modules',
      '.git',
      '.vscode',
      '.idea',
      'dist',
      'build',
      'target',
      'bin',
      'out',
      'coverage',
      '.next',
      '.nuxt',
      'vendor',
      '__pycache__'
    ];

    const normalizedPath = filePath.replace(/\\/g, '/');
    const pathSegments = normalizedPath.split('/');
    
    for (const dir of skipDirectories) {
      if (pathSegments.includes(dir)) {
        return true;
      }
    }

    // Skip certain file types
    const skipExtensions = [
      '.lock',
      '.log',
      '.tmp',
      '.cache',
      '.map',
      '.min.js',
      '.min.css'
    ];

    // Check full filename for compound extensions
    const fileName = normalizedPath.split('/').pop() || '';
    const lowerFileName = fileName.toLowerCase();
    
    for (const skipExt of skipExtensions) {
      if (lowerFileName.endsWith(skipExt)) {
        return true;
      }
    }

    return false;
  }
}
