import { BaseLanguageDetector } from './base.js';
import { LanguageDetectionResult, DetectionOptions } from '../types.js';
import { FileUtils } from '../utils/fileUtils.js';
import { VersionUtils } from '../utils/versionUtils.js';

/**
 * Go language detector
 */
export class GoDetector extends BaseLanguageDetector {
  protected languageName = 'go';
  protected fileExtensions = ['.go'];
  protected configFiles = [
    'go.mod',
    'go.sum',
    '.go-version'
  ];
  protected frameworkPatterns = {
    gin: [
      /gin\.Default\(\)/g,
      /gin\.New\(/g,
      /router\./g,
      /r\.GET\(/g,
      /r\.POST\(/g,
      /r\.PUT\(/g,
      /r\.DELETE\(/g,
      /r\.PATCH\(/g,
      /Use\(/g,
      /HandlerFunc\(/g,
      /Handler\(/g,
      /Middleware\(/g
    ],
    echo: [
      /echo\.New\(/g,
      /fmt\.Println\(/g,
      /fmt\.Sprintln\(/g,
      /fmt\.Errorf\(/g,
      /fmt\.Errorln\(/g,
      /fmt\.Fprintf\(/g
    ],
    gorilla: [
      /gorilla\/mux\(/g,
      /gorilla\/websocket\(/g,
      /gorilla\/rpc\(/g,
      /gorilla\/context\(/g,
      /gorilla\/schema\(/g
    ],
    chi: [
      /chi\.Router\(/g,
      /chi\.Middleware\(/g,
      /chi\.New\(/g
    ],
    fiber: [
      /fiber\.New\(/g,
      /go-fiber\(/g,
      /fiber\.Sleep\(/g,
      /fiber\.Yield\(/g
    ]
  };

  /**
   * Extract runtime version from configuration file analysis
   * @param configResult Configuration file analysis result
   * @returns Runtime version string or undefined
   */
  protected extractRuntimeVersion(configResult: any): string | undefined {
    // Check for version in .go-version file
    if (configResult && configResult.version) {
      return configResult.version;
    }

    // Check for version in go.mod file
    if (configResult && configResult.filePath && configResult.filePath.endsWith('go.mod')) {
      if (configResult.details && typeof configResult.details === 'string') {
        const goVersion = VersionUtils.extractVersion(configResult.details, /go\s+([0-9.]+)/);
        if (goVersion) {
          return goVersion;
        }
      }
    }

    return undefined;
  }

  /**
   * Detect framework from source code and configuration analysis
   * @param sourceCodeResult Source code analysis result
   * @param configResult Configuration file analysis result
   * @returns Framework name or undefined
   */
  protected async detectFramework(sourceCodeResult: any, configResult: any): Promise<string | undefined> {
    // Check configuration files first
    if (configResult && configResult.framework) {
      return configResult.framework;
    }

    // Check source code patterns
    if (sourceCodeResult && sourceCodeResult.framework) {
      return sourceCodeResult.framework;
    }

    // Check for Go-specific files
    if (await FileUtils.fileExistsInProject('', 'main.go')) {
      return 'Standard Library';
    }

    return undefined;
  }

  /**
   * Detect Go language from project
   * @param projectPath Path to project directory
   * @param options Detection options
   * @returns Promise<LanguageDetectionResult> Detection result with confidence score
   */
  async detect(projectPath: string, options: DetectionOptions = {}): Promise<LanguageDetectionResult> {
    // Call parent class detect method
    const result = await super.detect(projectPath, options);
    
    // If confidence is below threshold, try additional detection methods
    if (result.confidence < (options.confidenceThreshold || 0.3)) {
      // Try to detect Go version from environment
      const goVersion = await this.detectFromGoEnv(projectPath);
      if (goVersion) {
        result.runtimeVersion = goVersion;
        result.confidence = Math.max(result.confidence, 0.4);
      }

      // Try to detect Go version from GOROOT
      const gorootVersion = await this.detectFromGoRoot(projectPath);
      if (gorootVersion) {
        result.runtimeVersion = gorootVersion;
        result.confidence = Math.max(result.confidence, 0.4);
      }
    }

    return result;
  }

  /**
   * Detect Go version from Go environment
   * @param projectPath Path to project directory
   * @returns Go version string or null
   */
  private async detectFromGoEnv(projectPath: string): Promise<string | null> {
    try {
      const { exec } = await import('child_process');
      return new Promise((resolve) => {
        exec('go version', { encoding: 'utf8' }, (error, stdout) => {
          if (!error && stdout) {
            const versionMatch = stdout.match(/go version go([0-9.]+)/);
            if (versionMatch) {
              resolve(versionMatch[1]);
            } else {
              resolve(null);
            }
          } else {
            resolve(null);
          }
        });
      });
    } catch (error) {
      console.error('Error detecting Go version from go env:', error);
      return null;
    }
  }

  /**
   * Detect Go version from GOROOT
   * @param projectPath Path to project directory
   * @returns Go version string or null
   */
  private async detectFromGoRoot(projectPath: string): Promise<string | null> {
    try {
      const { exec } = await import('child_process');
      return new Promise((resolve) => {
        exec('go env GOROOT', { encoding: 'utf8' }, (error, stdout) => {
          if (!error && stdout) {
            const gorootMatch = stdout.match(/GOROOT="([^"]+)"/);
            if (gorootMatch) {
              // Try to get version from GOROOT/bin/go using promisified exec
              const goPath = `${gorootMatch[1]}/bin/go`;
              exec(`"${goPath}" version`, { encoding: 'utf8' }, (versionError, versionStdout) => {
                if (!versionError && versionStdout) {
                  const versionMatch = versionStdout.match(/go version go([0-9.]+)/);
                  if (versionMatch) {
                    resolve(versionMatch[1]);
                  } else {
                    resolve(null);
                  }
                } else {
                  resolve(null);
                }
              });
            } else {
              resolve(null);
            }
          } else {
            resolve(null);
          }
        });
      });
    } catch (error) {
      console.error('Error detecting Go version from GOROOT:', error);
      return null;
    }
  }
}
