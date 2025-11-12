import { ILanguageDetector, LanguageDetectionResult, DetectionEvidence, DetectionOptions } from '../types.js';
import { FileExtensionAnalyzer } from '../analyzers/fileExtensionAnalyzer.js';
import { ConfigAnalyzer } from '../analyzers/configAnalyzer.js';
import { SourceCodeAnalyzer } from '../analyzers/sourceCodeAnalyzer.js';
import { ScoringUtils } from '../utils/scoringUtils.js';
import { getFromCache, setInCache } from '../cache/detectionCache.js';

/**
 * Base language detector with common functionality
 */
export abstract class BaseLanguageDetector implements ILanguageDetector {
  protected abstract languageName: string;
  protected abstract fileExtensions: string[];
  protected abstract configFiles: string[];
  protected abstract frameworkPatterns: Record<string, RegExp[]>;

  protected fileExtensionAnalyzer: FileExtensionAnalyzer;
  protected configAnalyzer: ConfigAnalyzer;
  protected sourceCodeAnalyzer: SourceCodeAnalyzer;

  constructor() {
    this.fileExtensionAnalyzer = new FileExtensionAnalyzer();
    this.configAnalyzer = new ConfigAnalyzer();
    this.sourceCodeAnalyzer = new SourceCodeAnalyzer();
  }

  /**
   * Detect language from project files
   * @param projectPath Path to the project directory
   * @param options Detection options
   * @returns Promise<LanguageDetectionResult> Detection result with confidence score
   */
  async detect(projectPath: string, options: DetectionOptions = {}): Promise<LanguageDetectionResult> {
    // Check cache first
    const cacheKey = this.generateCacheKey(projectPath, options);
    if (options.cacheEnabled !== false) {
      const cachedResult = await getFromCache<LanguageDetectionResult>(cacheKey);
      if (cachedResult) {
        return cachedResult;
      }
    }

    // Collect evidence from different sources
    const evidence: DetectionEvidence[] = [];

    // File extension analysis
    const extensionResults = await this.fileExtensionAnalyzer.analyze(projectPath, this.fileExtensions);
    if (extensionResults && extensionResults.length > 0) {
      // Find the best matching extension result for this language
      const matchingExtension = extensionResults.find(r => r.language === this.languageName) || extensionResults[0];
      evidence.push({
        type: 'file-extension',
        weight: 0.4,
        details: matchingExtension
      });
    }

    // Configuration file analysis
    const configResults = await this.configAnalyzer.analyze(projectPath, this.configFiles);
    if (configResults && configResults.length > 0) {
      // Find the best matching config result for this language
      const matchingConfig = configResults.find(r => r.language === this.languageName) || configResults[0];
      evidence.push({
        type: 'config-file',
        weight: 0.7,
        details: matchingConfig
      });
    }

    // Source code analysis
    const sourceCodeResults = await this.sourceCodeAnalyzer.analyze(projectPath, this.frameworkPatterns);
    if (sourceCodeResults && sourceCodeResults.length > 0) {
      // Find the best matching source code result for this language
      const matchingSourceCode = sourceCodeResults.find(r => r.language === this.languageName) || sourceCodeResults[0];
      evidence.push({
        type: 'source-code',
        weight: 0.3,
        details: matchingSourceCode
      });
    }

    // Calculate confidence score
    const confidence = ScoringUtils.calculateConfidenceScore(evidence);
    
    // Extract version and framework information
    // Find the matching config result for this language
    const matchingConfigResult = configResults?.find(r => r.language === this.languageName) || configResults?.[0];
    const matchingSourceCodeResult = sourceCodeResults?.find(r => r.language === this.languageName) || sourceCodeResults?.[0];
    
    const runtimeVersion = this.extractRuntimeVersion(matchingConfigResult);
    const framework = await this.detectFramework(matchingSourceCodeResult, matchingConfigResult);

    const result: LanguageDetectionResult = {
      language: this.languageName,
      runtimeVersion,
      framework,
      confidence
    };

    // Cache the result
    if (options.cacheEnabled !== false) {
      await setInCache(cacheKey, result, 30 * 60 * 1000); // 30 minutes TTL
    }

    return result;
  }

  /**
   * Generate cache key for detection result
   * @param projectPath Path to the project directory
   * @param options Detection options
   * @returns Cache key string
   */
  protected generateCacheKey(projectPath: string, options: DetectionOptions): string {
    return `${this.languageName}:${projectPath}:${JSON.stringify(options)}`;
  }

  /**
   * Extract runtime version from configuration file analysis
   * @param configResult Configuration file analysis result
   * @returns Runtime version string or undefined
   */
  protected abstract extractRuntimeVersion(configResult: any): string | undefined;

  /**
   * Detect framework from source code and configuration analysis
   * @param sourceCodeResult Source code analysis result
   * @param configResult Configuration file analysis result
   * @returns Framework name or undefined
   */
  protected abstract detectFramework(sourceCodeResult: any, configResult: any): Promise<string | undefined>;
}
