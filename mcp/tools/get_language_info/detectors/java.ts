import { BaseLanguageDetector } from './base.js';
import { LanguageDetectionResult, DetectionOptions } from '../types.js';
import { FileUtils } from '../utils/fileUtils.js';
import { VersionUtils } from '../utils/versionUtils.js';

/**
 * Java language detector
 */
export class JavaDetector extends BaseLanguageDetector {
  protected languageName = 'java';
  protected fileExtensions = ['.java', '.class', '.jar', '.war'];
  protected configFiles = [
    'pom.xml',
    'build.gradle',
    'settings.gradle',
    'gradle.properties',
    '.java-version'
  ];
  protected frameworkPatterns = {
    spring: [
      /@SpringBootApplication\(/g,
      /@RestController\(/g,
      /@Controller\(/g,
      /@Service\(/g,
      /@Repository\(/g,
      /@Autowired\(/g,
      /@Component\(/g,
      /@Configuration\(/g,
      /import\s+org\.springframework\./g,
      /extends\s+SpringBootServletInitializer\(/g,
      /spring-boot-starter/g
    ],
    jakarta: [
      /@Path\(/g,
      /@GET\(/g,
      /@POST\(/g,
      /@Produces\(/g,
      /@Consumes\(/g,
      /@ApplicationPath\(/g,
      /import\s+jakarta\./g,
      /extends\s+HttpServlet\(/g,
      /@WebServlet\(/g
    ],
    maven: [
      /<project\s*>/g,
      /<modelVersion>/g,
      /<groupId>/g,
      /<artifactId>/g,
      /<dependencies>/g,
      /<build>/g,
      /<profiles>/g,
      /<repositories>/g
    ],
    gradle: [
      /plugins\s*\{/g,
      /dependencies\s*\{/g,
      /implementation\s+['"]org\.gradle\.api\.plugins\.java-api['"]\s*\)/g,
      /sourceCompatibility\s*=/g,
      /targetCompatibility\s*=/g,
      /java\s+toolchain\(/g
    ]
  };

  /**
   * Extract runtime version from configuration file analysis
   * @param configResult Configuration file analysis result
   * @returns Runtime version string or undefined
   */
  protected extractRuntimeVersion(configResult: any): string | undefined {
    // Check for version in .java-version file
    if (configResult && configResult.version) {
      return configResult.version;
    }

    // Check for version in pom.xml
    if (configResult && configResult.language === 'java' && configResult.filePath && configResult.filePath.endsWith('pom.xml')) {
      if (configResult.details && typeof configResult.details === 'string') {
        const pomVersion = VersionUtils.extractVersion(configResult.details, /java\.version\s*>\s*([^<]+)/);
        if (pomVersion) {
          return pomVersion;
        }
      }
    }

    // Check for version in build.gradle
    if (configResult && configResult.language === 'java' && configResult.filePath && configResult.filePath.endsWith('build.gradle')) {
      const gradleVersion = VersionUtils.extractVersion(configResult.details, /sourceCompatibility\s*=\s*['"]([^"']+)['"]/);
      if (gradleVersion) {
        return gradleVersion;
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

    // Check for Spring-specific files
    if (await FileUtils.fileExistsInProject('', 'src/main/resources/application.properties') ||
        await FileUtils.fileExistsInProject('', 'src/main/resources/application.yml')) {
      return 'Spring';
    }

    // Check for Jakarta EE-specific files
    if (await FileUtils.fileExistsInProject('', 'src/main/webapp/WEB-INF/web.xml') ||
        await FileUtils.fileExistsInProject('', 'src/main/resources/META-INF/beans.xml') ||
        await FileUtils.fileExistsInProject('', 'src/main/resources/META-INF/persistence.xml')) {
      return 'Jakarta EE';
    }

    return undefined;
  }
}
