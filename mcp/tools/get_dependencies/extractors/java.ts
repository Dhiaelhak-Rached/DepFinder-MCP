/**
 * Java dependency extractor
 */

import { BaseDependencyExtractor } from './base.js';
import { Dependency, DependencyExtractionResult } from '../types.js';
import { FileUtils } from '../utils/fileUtils.js';
import { PomParser } from '../parsers/pomParser.js';
import { GradleParser } from '../parsers/gradleParser.js';
import { fileExists } from '../../../utils/fileSystem.js';

/**
 * Extract Java dependencies
 * Priority: build.gradle/build.gradle.kts > pom.xml
 */
export class JavaExtractor extends BaseDependencyExtractor {
  protected languageName = 'java';

  /**
   * Extract dependencies from Java project
   * @param projectPath Path to project directory
   * @returns Dependency extraction result
   */
  async extract(projectPath: string): Promise<DependencyExtractionResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let dependencies: Dependency[] = [];
    let devDependencies: Dependency[] = [];

    // Try build.gradle / build.gradle.kts (Gradle)
    const gradlePath = FileUtils.joinPath(projectPath, 'build.gradle');
    const gradleKtsPath = FileUtils.joinPath(projectPath, 'build.gradle.kts');
    const gradleFile = await fileExists(gradlePath) ? gradlePath : 
                       await fileExists(gradleKtsPath) ? gradleKtsPath : null;

    if (gradleFile) {
      try {
        const result = await GradleParser.parse(gradleFile);
        dependencies = result.dependencies;
        devDependencies = result.devDependencies;
      } catch (error) {
        errors.push(`Failed to parse build.gradle: ${error}`);
      }
    }

    // Try pom.xml (Maven)
    const pomPath = FileUtils.joinPath(projectPath, 'pom.xml');
    if (await fileExists(pomPath) && dependencies.length === 0) {
      try {
        const deps = await PomParser.parse(pomPath);
        dependencies = deps;
      } catch (error) {
        errors.push(`Failed to parse pom.xml: ${error}`);
      }
    }

    // Determine lock file
    let lockFile: { path: string; format: string; exists: boolean } | undefined;
    if (gradleFile) {
      lockFile = { path: gradleFile.endsWith('.kts') ? 'build.gradle.kts' : 'build.gradle', format: 'gradle', exists: true };
    } else if (await fileExists(pomPath)) {
      lockFile = { path: 'pom.xml', format: 'maven', exists: true };
    }

    const group = this.createDependencyGroup(
      dependencies,
      devDependencies.length > 0 ? devDependencies : undefined,
      undefined,
      undefined,
      lockFile
    );

    return this.createResult([group], errors.length > 0 ? errors : undefined, warnings.length > 0 ? warnings : undefined);
  }
}

