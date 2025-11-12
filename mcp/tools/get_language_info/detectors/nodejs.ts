import { BaseLanguageDetector } from './base.js';
import { LanguageDetectionResult, DetectionOptions } from '../types.js';
import { FileUtils } from '../utils/fileUtils.js';
import { VersionUtils } from '../utils/versionUtils.js';

/**
 * Node.js language detector
 */
export class NodeJSDetector extends BaseLanguageDetector {
  protected languageName = 'javascript';
  protected fileExtensions = ['.js', '.mjs', '.jsx', '.tsx', '.ts', '.mts', '.cts'];
  protected configFiles = [
    'package.json',
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml',
    'tsconfig.json',
    'jsconfig.json',
    '.nvmrc',
    '.node-version'
  ];
  protected frameworkPatterns = {
    javascript: [
      /require\s*\(\s*['"]express['"]\s*\)/g,
      /const\s+app\s*=\s*express\(\)/g,
      /app\.(get|post|put|delete|patch)\s*\(/g,
      /router\./g,
      /middleware\./g
    ],
    typescript: [
      /import\s+.*\bfrom\s+['"]typescript['"]\s*/g,
      /interface\s+\w+\b/g,
      /type\s+\w+\b/g,
      /enum\s+\w+\b/g,
      /implements\s+\w+\b/g,
      /@Component\(/g,
      /@NgModule\(/g,
      /@Injectable\(/g
    ],
    react: [
      /import\s+.*\bfrom\s+['"]react['"]\s*/g,
      /from\s+['"]react['"]\s*/g,
      /React\.createElement/g,
      /useState\(/g,
      /useEffect\(/g,
      /\.jsx$/g,
      /\.tsx$/g
    ],
    vue: [
      /import\s+.*\bfrom\s+['"]vue['"]\s*/g,
      /from\s+['"]vue['"]\s*/g,
      /Vue\.component/g,
      /new Vue\(/g,
      /\.vue$/g
    ],
    angular: [
      /import\s+.*\bfrom\s+['"]@angular\/core['"]\s*/g,
      /import\s+.*\bfrom\s+['"]@angular\/common['"]\s*/g,
      /import\s+.*\bfrom\s+['"]@angular\/platform-browser['"]\s*/g,
      /@Component\(/g,
      /@NgModule\(/g,
      /@Injectable\(/g
    ],
    nextjs: [
      /import\s+.*\bfrom\s+['"]next['"]\s*/g,
      /from\s+['"]next['"]\s*/g,
      /export\s+default\s+function\s+withApp\(/g,
      /export\s+default\s+function\s+withComponent\(/g,
      /_app\.js/g,
      /_document\.js/g
    ],
    express: [
      /require\s*\(\s*['"]express['"]\s*\)/g,
      /const\s+app\s*=\s*express\(\)/g,
      /app\.(get|post|put|delete|patch)\s*\(/g,
      /router\./g,
      /middleware\./g
    ]
  };

  /**
   * Extract runtime version from configuration file analysis
   * @param configResult Configuration file analysis result
   * @returns Runtime version string or undefined
   */
  protected extractRuntimeVersion(configResult: any): string | undefined {
    // Check for version in .node-version file
    if (configResult && configResult.version) {
      return configResult.version;
    }

    // Check for version in package.json engines field
    if (configResult && configResult.language === 'javascript') {
      const packageJson = configResult.details;
      if (packageJson && packageJson.engines && packageJson.engines.node) {
        return packageJson.engines.node;
      }
    }

    // Check for version in .nvmrc file
    if (configResult && configResult.filePath && configResult.filePath.endsWith('.nvmrc')) {
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

    // Check for Next.js specific files
    if (await FileUtils.fileExistsInProject('', '_app.js') || 
        await FileUtils.fileExistsInProject('', '_document.js')) {
      return 'Next.js';
    }

    // Check for Create React App specific files
    if (await FileUtils.fileExistsInProject('src', 'App.js')) {
      return 'Create React App';
    }

    return undefined;
  }
}
