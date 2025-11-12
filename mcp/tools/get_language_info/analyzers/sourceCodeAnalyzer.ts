import { IAnalyzer, SourceCodeResult } from '../types.js';
import { listFilesRecursively } from '../../../utils/fileSystem.js';
import { readTextFile } from '../../../utils/fileSystem.js';

/**
 * Source code analyzer for language detection
 */
export class SourceCodeAnalyzer implements IAnalyzer<SourceCodeResult[]> {
  /**
   * Analyze source code files in project directory
   * @param projectPath Path to the project directory
   * @param frameworkPatterns Framework patterns to look for (optional)
   * @returns Promise<SourceCodeResult[]> Array of source code analysis results
   */
  async analyze(projectPath: string, frameworkPatterns?: Record<string, RegExp[]>): Promise<SourceCodeResult[]> {
    // Get all source code files
    const files = await listFilesRecursively(projectPath, ['.py', '.js', '.ts', '.jsx', '.tsx', '.java', '.rb', '.go', '.rs', '.php', '.cs']);
    
    const results: SourceCodeResult[] = [];
    
    // Limit the number of files to analyze for performance
    const maxFilesToAnalyze = 20;
    const filesToAnalyze = files.slice(0, maxFilesToAnalyze);
    
    for (const file of filesToAnalyze) {
      // Skip files in common directories that don't contain source code
      if (this.shouldSkipFile(file)) {
        continue;
      }
      
      try {
        const content = await readTextFile(file);
        const language = this.detectLanguageFromContent(content, file);
        const framework = frameworkPatterns ? this.detectFrameworkFromContent(content, frameworkPatterns) : undefined;
        
        // Normalize language to frameworkPatterns key
        const normalizedLanguage = this.normalizeLanguageForPatterns(language);
        const patterns = frameworkPatterns ? this.extractPatterns(content, frameworkPatterns[normalizedLanguage] ?? []) : [];
        
        if (language) {
          results.push({
            filePath: file,
            language,
            framework,
            patterns
          });
        }
      } catch (error) {
        console.error(`Error analyzing source file ${file}:`, error);
      }
    }
    
    return results;
  }

  /**
   * Detect language from file content and extension
   * @param content File content
   * @param filePath Path to the file
   * @returns Detected language
   */
  private detectLanguageFromContent(content: string, filePath: string): string {
    const extension = this.getFileExtension(filePath);
    
    // First, try to determine from extension
    if (extension) {
      const languageFromExtension = this.getLanguageFromExtension(extension);
      if (languageFromExtension !== 'unknown') {
        return languageFromExtension;
      }
    }
    
    // If extension is ambiguous, analyze content
    const languagePatterns = {
      python: [
        /\bimport\s+[a-zA-Z0-9_.]+\b/g,
        /\bdef\s+[a-zA-Z0-9_]+\s*\(/g,
        /\bclass\s+[a-zA-Z0-9_]+\s*:/g,
        /\bif\s+__name__\s*==\s*["']__main__["']/g
      ],
      javascript: [
        /\bfunction\s+[a-zA-Z0-9_]+\s*\(/g,
        /\bconst\s+[a-zA-Z0-9_]+\s*=/g,
        /\blet\s+[a-zA-Z0-9_]+\s*=/g,
        /\bvar\s+[a-zA-Z0-9_]+\s*=/g,
        /\brequire\s*\(/g,
        /\bimport\s+.*\bfrom\b/g
      ],
      typescript: [
        /\binterface\s+[a-zA-Z0-9_]+\s*{/g,
        /\btype\s+[a-zA-Z0-9_]+\s*=/g,
        /\benum\s+[a-zA-Z0-9_]+\s*{/g,
        /\bimplements\s+[a-zA-Z0-9_]+\b/g,
        /\bpublic\s+class\b/g,
        /\bprivate\s+class\b/g
      ],
      java: [
        /\bpublic\s+class\s+[a-zA-Z0-9_]+\b/g,
        /\bimport\s+java\.[a-zA-Z0-9.]+/g,
        /\bpackage\s+[a-zA-Z0-9_.]+\b/g,
        /@\w+/g
      ],
      ruby: [
        /\brequire\s+["'][^"']+["']/g,
        /\bclass\s+[a-zA-Z0-9_]+\b/g,
        /\bdef\s+[a-zA-Z0-9_]+\b/g,
        /\bmodule\s+[a-zA-Z0-9_]+\b/g,
        /\bend\b/g
      ],
      go: [
        /\bpackage\s+[a-zA-Z0-9_]+\b/g,
        /\bimport\s+\(/g,
        /\bfunc\s+[a-zA-Z0-9_]+\s*\(/g,
        /\btype\s+[a-zA-Z0-9_]+\s+struct\b/g,
        /\bvar\s+[a-zA-Z0-9_]+\s+/g,
        /\bconst\s+[a-zA-Z0-9_]+\s+/g
      ],
      rust: [
        /\buse\s+[a-zA-Z0-9_:]+::/g,
        /\bfn\s+[a-zA-Z0-9_]+\s*\(/g,
        /\bstruct\s+[a-zA-Z0-9_]+\s*{/g,
        /\benum\s+[a-zA-Z0-9_]+\s*{/g,
        /\bimpl\s+[a-zA-Z0-9_]+\s+for\b/g,
        /\bpub\s+fn\s+main\b/g
      ],
      php: [
        /<\?php/g,
        /\bfunction\s+[a-zA-Z0-9_]+\s*\(/g,
        /\bclass\s+[a-zA-Z0-9_]+\s+/g,
        /\bnamespace\s+[a-zA-Z0-9_\\]+;/g,
        /\$[a-zA-Z0-9_]+\s*=/g,
        /\buse\s+[a-zA-Z0-9_\\]+;/g
      ],
      csharp: [
        /\busing\s+[a-zA-Z0-9.]+;/g,
        /\bnamespace\s+[a-zA-Z0-9_.]+\b/g,
        /\bpublic\s+class\s+[a-zA-Z0-9_]+\b/g,
        /\bprivate\s+class\s+[a-zA-Z0-9_]+\b/g,
        /\bstatic\s+void\s+Main\b/g,
        /\bpublic\s+static\s+void\s+Main\b/g
      ]
    };
    
    // Count matches for each language
    const scores: Record<string, number> = {};
    
    for (const [language, patterns] of Object.entries(languagePatterns)) {
      let score = 0;
      for (const pattern of patterns) {
        const matches = content.match(pattern);
        if (matches) {
          score += matches.length;
        }
      }
      scores[language] = score;
    }
    
    // Find the language with the highest score
    let maxScore = 0;
    let detectedLanguage = 'unknown';
    
    for (const [language, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        detectedLanguage = language;
      }
    }
    
    return detectedLanguage;
  }

  /**
   * Detect framework from content using provided patterns
   * @param content File content
   * @param frameworkPatterns Framework patterns to look for
   * @returns Detected framework or undefined
   */
  private detectFrameworkFromContent(content: string, frameworkPatterns: Record<string, RegExp[]>): string | undefined {
    for (const [framework, patterns] of Object.entries(frameworkPatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(content)) {
          return framework;
        }
      }
    }
    
    return undefined;
  }

  /**
   * Extract patterns that matched in the content
   * @param content File content
   * @param patterns Patterns to look for
   * @returns Array of matched patterns
   */
  private extractPatterns(content: string, patterns?: RegExp[]): string[] {
    if (!patterns) {
      return [];
    }
    
    const matchedPatterns: string[] = [];
    
    for (const pattern of patterns) {
      const matches = content.match(pattern);
      if (matches) {
        for (const match of matches) {
          if (match && !matchedPatterns.includes(match)) {
            matchedPatterns.push(match);
          }
        }
      }
    }
    
    return matchedPatterns;
  }

  /**
   * Normalize language name to match frameworkPatterns keys
   * @param language Language name from detector
   * @returns Normalized language name
   */
  private normalizeLanguageForPatterns(language: string): string {
    // Map detector language values to frameworkPatterns keys
    const languageMap: Record<string, string> = {
      'react': 'javascript',
      'react-typescript': 'typescript',
      'csharp': 'csharp',
      'unknown': 'javascript' // fallback
    };
    
    return languageMap[language] || language;
  }

  /**
   * Get language from file extension
   * @param extension File extension
   * @returns Language name
   */
  private getLanguageFromExtension(extension: string): string {
    const extensionMap: Record<string, string> = {
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
      '.cs': 'csharp'
    };
    
    return extensionMap[extension] || 'unknown';
  }

  /**
   * Get file extension from file path
   * @param filePath Path to the file
   * @returns File extension
   */
  private getFileExtension(filePath: string): string {
    const lastDotIndex = filePath.lastIndexOf('.');
    if (lastDotIndex === -1 || lastDotIndex === filePath.length - 1) {
      return '';
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
    
    for (const dir of skipDirectories) {
      if (normalizedPath.includes(`/${dir}/`) || normalizedPath.endsWith(`/${dir}`)) {
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
