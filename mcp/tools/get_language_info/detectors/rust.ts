import { BaseLanguageDetector } from './base.js';
import { LanguageDetectionResult, DetectionOptions } from '../types.js';
import { FileUtils } from '../utils/fileUtils.js';
import { VersionUtils } from '../utils/versionUtils.js';

/**
 * Rust language detector
 */
export class RustDetector extends BaseLanguageDetector {
  protected languageName = 'rust';
  protected fileExtensions = ['.rs'];
  protected configFiles = [
    'Cargo.toml',
    'Cargo.lock',
    'rust-toolchain.toml'
  ];
  protected frameworkPatterns = {
    actix: [
      /use\s+actix_web::\{/g,
      /HttpServer::new\(/g,
      /App::new\(/g,
      /web::run\(/g,
      /route\(\)/g,
      /middleware\s*\(/g,
      /Responder\(\)/g,
      /State\(\)/g,
      /HttpRequest\(/g,
      /HttpResponse\(/g
    ],
    rocket: [
      /rocket::launch\(/g,
      /#\[rocket::main\]\s*\(/g,
      /#\[rocket\]/g,
      /routes\(\)/g,
      /get\(\)/g,
      /post\(\)/g,
      /put\(\)/g,
      /delete\(\)/g,
      /patch\(\)/g,
      /options\(\)/g,
      /from_rocket\(/g,
      /catch\(\)/g,
      /error\(\)/g,
      /Request\(\)/g,
      /Response\(\)/g,
      /Data\(\)/g,
      /Guard\(\)/g,
      /Outcome\(\)/g,
      /Shutdown\(\)/g
    ]
  };

  /**
   * Extract runtime version from configuration file analysis
   * @param configResult Configuration file analysis result
   * @returns Runtime version string or undefined
   */
  protected extractRuntimeVersion(configResult: any): string | undefined {
    // Check for version in rust-toolchain.toml
    if (configResult && configResult.version) {
      return configResult.version;
    }

    // Check for version in Cargo.toml
    if (configResult && configResult.language === 'rust' && configResult.filePath.endsWith('Cargo.toml')) {
      const cargoVersion = VersionUtils.extractVersion(configResult.details, /rust-version\s*=\s*["']([^"']+)["']/);
      if (cargoVersion) {
        return cargoVersion;
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

    // Check for Rust-specific files
    if (await FileUtils.fileExistsInProject('', 'src/main.rs')) {
      return 'Standard Library';
    }

    return undefined;
  }

  /**
   * Detect Rust language from project
   * @param projectPath Path to project directory
   * @param options Detection options
   * @returns Promise<LanguageDetectionResult> Detection result with confidence score
   */
  async detect(projectPath: string, options: DetectionOptions = {}): Promise<LanguageDetectionResult> {
    // Call parent class detect method
    const result = await super.detect(projectPath, options);
    
    // If confidence is below threshold, try additional detection methods
    if (result.confidence < (options.confidenceThreshold || 0.3)) {
      // Try to detect Rust version from rustup
      const rustupVersion = await this.detectFromRustup(projectPath);
      if (rustupVersion) {
        result.runtimeVersion = rustupVersion;
        result.confidence = Math.max(result.confidence, 0.4);
      }

      // Try to detect Rust version from rustc
      const rustcVersion = await this.detectFromRustc(projectPath);
      if (rustcVersion) {
        result.runtimeVersion = rustcVersion;
        result.confidence = Math.max(result.confidence, 0.3);
      }
    }

    return result;
  }

  /**
   * Detect Rust version from rustup
   * @param projectPath Path to project directory
   * @returns Rust version string or null
   */
  private async detectFromRustup(projectPath: string): Promise<string | null> {
    try {
      const { exec } = await import('child_process');
      return new Promise((resolve) => {
        exec('rustup show active-toolchain', { encoding: 'utf8' }, (error, stdout) => {
          if (!error && stdout) {
            const versionMatch = stdout.match(/active toolchain\s+(.*)/);
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
      console.error('Error detecting Rust version from rustup:', error);
      return null;
    }
  }

  /**
   * Detect Rust version from rustc
   * @param projectPath Path to project directory
   * @returns Rust version string or null
   */
  private async detectFromRustc(projectPath: string): Promise<string | null> {
    try {
      const { exec } = await import('child_process');
      return new Promise((resolve) => {
        exec('rustc --version', { encoding: 'utf8' }, (error, stdout) => {
          if (!error && stdout) {
            const versionMatch = stdout.match(/rustc ([0-9.]+)/);
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
      console.error('Error detecting Rust version from rustc:', error);
      return null;
    }
  }
}
