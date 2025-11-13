import { BaseLanguageDetector } from './base.js';
import { LanguageDetectionResult, DetectionOptions } from '../types.js';
import { FileUtils } from '../utils/fileUtils.js';
import { VersionUtils } from '../utils/versionUtils.js';
import { fileExists } from '../../../utils/fileSystem.js';

/**
 * Python language detector
 */
export class PythonDetector extends BaseLanguageDetector {
  protected languageName = 'python';
  protected fileExtensions = ['.py'];
  protected configFiles = [
    'requirements.txt',
    'requirements/*.txt',
    'pyproject.toml',
    'setup.py',
    'setup.cfg',
    'Pipfile',
    'poetry.lock',
    'environment.yml',
    'environment.yaml',
    'conda.yml',
    'conda.yaml',
    '.python-version'
  ];
  protected frameworkPatterns = {
    django: [
      /from\s+django\s+/g,
      /import\s+django\./g,
      /django\.setup\(/g,
      /DJANGO_SETTINGS_MODULE/g,
      /urlpatterns\s*=/g,
      /class\s+\w+\s*:\s*models\.Model/g,
      /@admin\.site/g,
      /manage\.py/g
    ],
    flask: [
      /from\s+flask\s+/g,
      /import\s+flask\s+/g,
      /Flask\(__name__\)/g,
      /app\s*=\s*Flask\(__name__\)/g,
      /@app\.route/g,
      /render_template/g
    ],
    fastapi: [
      /from\s+fastapi\s+/g,
      /import\s+fastapi\s+/g,
      /FastAPI\(/g,
      /@app\.(get|post|put|delete|patch)/g,
      /APIRouter\(/g,
      /pydantic\./g
    ]
  };

  /**
   * Extract runtime version from configuration file analysis
   * @param configResult Configuration file analysis result
   * @returns Runtime version string or undefined
   */
  protected extractRuntimeVersion(configResult: any): string | undefined {
    if (!configResult) return undefined;
    
    // First, check if version is directly available in the config result
    // (This handles cases where the config analyzer already extracted it from
    // requirements.txt, .python-version, pyproject.toml, setup.py, etc.)
    if (configResult.version) {
      // For Pipfile, the version might be in a specific format that needs parsing
      if (configResult.filePath && configResult.filePath.endsWith('Pipfile')) {
        // Extract version from python directive format: python = "3.11"
        const versionMatch = configResult.version.match(/python\s*=\s*["']([^"']+)["']/);
        if (versionMatch) {
          return versionMatch[1];
        }
      }
      return configResult.version;
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

    // Check for Django-specific files
    if (await FileUtils.fileExistsInProject('', 'manage.py')) {
      return 'Django';
    }

    // Check for Flask-specific patterns
    if (await FileUtils.fileExistsInProject('', 'app.py') || 
        await FileUtils.fileExistsInProject('', 'wsgi.py')) {
      return 'Flask';
    }

    return undefined;
  }

  /**
   * Detect Python language from project
   * @param projectPath Path to the project directory
   * @param options Detection options
   * @returns Promise<LanguageDetectionResult> Detection result with confidence score
   */
  async detect(projectPath: string, options: DetectionOptions = {}): Promise<LanguageDetectionResult> {
    // Call parent class detect method
    const result = await super.detect(projectPath, options);
    
    // Always try to detect runtime version from virtual environment if not already set
    // This is important even when confidence is high, as config files might not contain version info
    if (!result.runtimeVersion) {
      // Try to detect Python from virtual environment
      const venvVersion = await this.detectFromVirtualEnvironment(projectPath);
      if (venvVersion) {
        result.runtimeVersion = venvVersion;
      }

      // If still no version, try to detect from shebang lines
      if (!result.runtimeVersion) {
        const shebangVersion = await this.detectFromShebang(projectPath);
        if (shebangVersion) {
          result.runtimeVersion = shebangVersion;
        }
      }
    }
    
    // If confidence is below threshold, try additional detection methods to boost confidence
    if (result.confidence < (options.confidenceThreshold || 0.3)) {
      // Try to detect Python from virtual environment to boost confidence
      const venvVersion = await this.detectFromVirtualEnvironment(projectPath);
      if (venvVersion) {
        result.runtimeVersion = venvVersion;
        result.confidence = Math.max(result.confidence, 0.4);
      }

      // Try to detect from shebang lines to boost confidence
      const shebangVersion = await this.detectFromShebang(projectPath);
      if (shebangVersion) {
        result.runtimeVersion = shebangVersion;
        result.confidence = Math.max(result.confidence, 0.3);
      }
    }

    return result;
  }

  /**
   * Detect Python version from virtual environment
   * @param projectPath Path to the project directory
   * @returns Python version string or null
   */
  private async detectFromVirtualEnvironment(projectPath: string): Promise<string | null> {
    // Common virtual environment directory names
    const venvDirs = ['venv', '.venv', 'env', '.env', 'virtualenv', '.virtualenv'];
    
    for (const venvDir of venvDirs) {
      if (await FileUtils.directoryExistsInProject(projectPath, venvDir)) {
        const pyvenvCfgPath = FileUtils.joinPath(projectPath, venvDir, 'pyvenv.cfg');
        if (await fileExists(pyvenvCfgPath)) {
          try {
            const content = await FileUtils.safeReadFile(pyvenvCfgPath);
            if (content) {
              // Try version_info first (modern format: version_info = 3.13.3.final.0)
              let versionMatch = content.match(/version_info\s*=\s*([0-9.]+)/);
              if (versionMatch) {
                return versionMatch[1];
              }
              // Fallback to version (older format: version = 3.13.3)
              versionMatch = content.match(/version\s*=\s*([0-9.]+)/);
              if (versionMatch) {
                return versionMatch[1];
              }
            }
          } catch (error) {
            console.error(`Error reading pyvenv.cfg from ${venvDir}:`, error);
          }
        }
      }
    }

    // Check for virtualenv activation scripts (for older virtualenv setups)
    // Note: .virtualenv is already checked in the loop above, but this handles activation scripts
    if (await FileUtils.directoryExistsInProject(projectPath, '.virtualenv')) {
      // Try to find version in activation scripts
      const activateScriptPath = FileUtils.joinPath(projectPath, '.virtualenv', 'bin', 'activate');
      if (await fileExists(activateScriptPath)) {
        try {
          const content = await FileUtils.safeReadFile(activateScriptPath);
          if (content) {
            const versionMatch = content.match(/VIRTUAL_ENV_VERSION=([0-9.]+)/);
            return versionMatch ? versionMatch[1] : null;
          }
        } catch (error) {
          console.error('Error reading activate script:', error);
        }
      }
    }

    // Check for conda environment
    if (await FileUtils.directoryExistsInProject(projectPath, '.conda')) {
      // Try to find version in environment files
      const envFiles = ['environment.yml', 'environment.yaml', 'conda.yml', 'conda.yaml'];
      
      for (const file of envFiles) {
        if (await FileUtils.fileExistsInProject(projectPath, file)) {
          try {
            const envFilePath = FileUtils.joinPath(projectPath, file);
            const content = await FileUtils.safeReadFile(envFilePath);
            if (content) {
              const versionMatch = content.match(/python_version:\s*["']?([^"'\s]+)/);
              if (versionMatch) {
                return versionMatch[1].trim();
              }
            }
          } catch (error) {
            console.error(`Error reading ${file}:`, error);
          }
        }
      }
    }

    return null;
  }

  /**
   * Detect Python version from shebang lines
   * @param projectPath Path to the project directory
   * @returns Python version string or null
   */
  private async detectFromShebang(projectPath: string): Promise<string | null> {
    // Look for Python files with shebang
    const pythonFiles = await FileUtils.findFiles(projectPath, /^.*\.py$/);
    
    for (const file of pythonFiles.slice(0, 10)) { // Check up to 10 files
      try {
        const content = await FileUtils.safeReadFile(file);
        if (content) {
          const shebangMatch = content.match(/^#!\s*\/usr\/bin\/env\s+python([0-9.]+)/);
          if (shebangMatch) {
            return shebangMatch[1];
          }
        }
      } catch (error) {
        console.error(`Error reading file ${file}:`, error);
      }
    }

    return null;
  }
}

