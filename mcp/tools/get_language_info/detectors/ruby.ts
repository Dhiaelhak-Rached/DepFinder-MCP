import { BaseLanguageDetector } from './base.js';
import { LanguageDetectionResult, DetectionOptions } from '../types.js';
import { FileUtils } from '../utils/fileUtils.js';
import { VersionUtils } from '../utils/versionUtils.js';
import { fileExists } from '../../../utils/fileSystem.js';

/**
 * Ruby language detector
 */
export class RubyDetector extends BaseLanguageDetector {
  protected languageName = 'ruby';
  protected fileExtensions = ['.rb', '.rbw'];
  protected configFiles = [
    'Gemfile',
    'Gemfile.lock',
    '.ruby-version',
    'Rakefile'
  ];
  protected frameworkPatterns = {
    rails: [
      /Rails\.application/g,
      /class\s+\w+\s*<\s*ApplicationController::Base/g,
      /ActiveRecord::Base/g,
      /has_many\s*:/g,
      /belongs_to\s*:/g,
      /validates\s*:/g,
      /before_action\s*:/g,
      /after_action\s*:/g,
      /config\/routes\.rb/g,
      /config\/application\.rb/g,
      /config\/environments\/.*\.rb/g,
      /app\/controllers\/.*\.rb/g,
      /app\/models\/.*\.rb/g,
      /app\/views\/.*\.rb/g,
      /config\/initializers\/.*\.rb/g,
      /db\/migrate\/.*\.rb/g,
      /config\/locales\/.*\.rb/g,
      /app\/helpers\/.*\.rb/g,
      /lib\/tasks\/.*\.rb/g,
      /vendor\/gems\/.*\.rb/g,
      /public\/.*\.rb/g,
      /app\/mailers\/.*\.rb/g,
      /spec\/.*_spec\.rb/g,
      /test\/.*_test\.rb/g
    ],
    sinatra: [
      /require\s+['"]sinatra['"]\s*/g,
      /Sinatra::Base/g,
      /get\s+/g,
      /post\s+/g,
      /put\s+/g,
      /delete\s+/g,
      /helpers\s+/g,
      /set\s*:/g,
      /template\s*:/g,
      /erb\s*:/g,
      /haml\s*:/g,
      /configure\s*:/g,
      /register\s*:/g,
      /error\s*:/g,
      /not_found\s*:/g,
      /before\s*:/g,
      /after\s*:/g
    ]
  };

  /**
   * Extract runtime version from configuration file analysis
   * @param configResult Configuration file analysis result
   * @returns Runtime version string or undefined
   */
  protected extractRuntimeVersion(configResult: any): string | undefined {
    // Check for version in .ruby-version file
    if (configResult && configResult.version) {
      return configResult.version;
    }

    // Check for version in Gemfile
    if (configResult && configResult.filePath && configResult.filePath.endsWith('Gemfile')) {
      // Extract version from ruby directive
      const versionMatch = configResult.version?.match(/ruby\s+["']([^"']+)["']/);
      return versionMatch ? versionMatch[1] : undefined;
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

    // Check for Rails-specific files
    if (await FileUtils.fileExistsInProject('', 'config/application.rb')) {
      return 'Rails';
    }

    // Check for Sinatra-specific patterns
    if (await FileUtils.fileExistsInProject('', 'app.rb')) {
      return 'Sinatra';
    }

    return undefined;
  }

  /**
   * Detect Ruby language from project
   * @param projectPath Path to project directory
   * @param options Detection options
   * @returns Promise<LanguageDetectionResult> Detection result with confidence score
   */
  async detect(projectPath: string, options: DetectionOptions = {}): Promise<LanguageDetectionResult> {
    // Call parent class detect method
    const result = await super.detect(projectPath, options);
    
    // If confidence is below threshold, try additional detection methods
    if (result.confidence < (options.confidenceThreshold || 0.3)) {
      // Try to detect Ruby version from RVM
      const rvmVersion = await this.detectFromRVM(projectPath);
      if (rvmVersion) {
        result.runtimeVersion = rvmVersion;
        result.confidence = Math.max(result.confidence, 0.4);
      }

      // Try to detect Ruby version from rbenv
      const rbenvVersion = await this.detectFromRbenv(projectPath);
      if (rbenvVersion) {
        result.runtimeVersion = rbenvVersion;
        result.confidence = Math.max(result.confidence, 0.4);
      }

      // Try to detect Ruby version from chruby
      const chrubyVersion = await this.detectFromChruby(projectPath);
      if (chrubyVersion) {
        result.runtimeVersion = chrubyVersion;
        result.confidence = Math.max(result.confidence, 0.4);
      }
    }

    return result;
  }

  /**
   * Detect Ruby version from RVM
   * @param projectPath Path to project directory
   * @returns Ruby version string or null
   */
  private async detectFromRVM(projectPath: string): Promise<string | null> {
    try {
      // Check for .ruby-version file in RVM environment
      const rvmPath = `${projectPath}/.ruby-version`;
    if (await fileExists(rvmPath)) {
        const content = await FileUtils.safeReadFile(rvmPath);
        if (content) {
          return content.trim();
        }
      }

      // Check for RVM environment variable
      const { exec } = await import('child_process');
      return new Promise((resolve) => {
        exec('rvm current', { encoding: 'utf8' }, (error, stdout) => {
          if (!error && stdout) {
            const version = stdout.trim();
            if (version && version !== 'system') {
              resolve(version);
            } else {
              resolve(null);
            }
          } else {
            resolve(null);
          }
        });
      });
    } catch (error) {
      console.error('Error detecting Ruby version from RVM:', error);
      return null;
    }
  }

  /**
   * Detect Ruby version from rbenv
   * @param projectPath Path to project directory
   * @returns Ruby version string or null
   */
  private async detectFromRbenv(projectPath: string): Promise<string | null> {
    try {
      // Check for .ruby-version file in rbenv environment
      const rbenvPath = `${projectPath}/.ruby-version`;
    if (await fileExists(rbenvPath)) {
        const content = await FileUtils.safeReadFile(rbenvPath);
        if (content) {
          return content.trim();
        }
      }

      // Check for rbenv environment variable
      const { exec } = await import('child_process');
      return new Promise((resolve) => {
        exec('rbenv version', { encoding: 'utf8' }, (error, stdout) => {
          if (!error && stdout) {
            const version = stdout.trim();
            if (version && version !== 'system') {
              resolve(version);
            } else {
              resolve(null);
            }
          } else {
            resolve(null);
          }
        });
      });
    } catch (error) {
      console.error('Error detecting Ruby version from rbenv:', error);
      return null;
    }
  }

  /**
   * Detect Ruby version from chruby
   * @param projectPath Path to project directory
   * @returns Ruby version string or null
   */
  private async detectFromChruby(projectPath: string): Promise<string | null> {
    try {
      const { exec } = await import('child_process');
      return new Promise((resolve) => {
        exec('ruby --version', { encoding: 'utf8' }, (error, stdout) => {
          if (!error && stdout) {
            const versionMatch = stdout.match(/ruby\s+([0-9.]+)/);
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
      console.error('Error detecting Ruby version from chruby:', error);
      return null;
    }
  }
}
