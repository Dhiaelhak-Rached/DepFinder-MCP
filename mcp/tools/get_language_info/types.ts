/**
 * Language detection result interface
 */
export interface LanguageDetectionResult {
  language: string;
  runtimeVersion?: string;
  framework?: string;
  confidence: number; // 0-1 scale
}

/**
 * Framework detection result interface
 */
export interface FrameworkDetectionResult {
  name: string;
  version?: string;
  confidence: number;
}

/**
 * Version information interface
 */
export interface VersionInfo {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
  build?: string;
  raw: string;
}

/**
 * File extension analysis result
 */
export interface FileExtensionResult {
  extension: string;
  count: number;
  percentage: number;
  language: string;
}

/**
 * Configuration file analysis result
 */
export interface ConfigFileResult {
  filePath: string;
  language: string;
  version?: string;
  framework?: string;
  dependencies?: string[];
}

/**
 * Source code analysis result
 */
export interface SourceCodeResult {
  filePath: string;
  language: string;
  framework?: string;
  patterns: string[];
}

/**
 * Directory structure analysis result
 */
export interface DirectoryStructureResult {
  matchedDirectories: string[];
  matchedPaths: string[];
  confidence?: number;
}

/**
 * Detection evidence interface
 */
export interface DetectionEvidence {
  type: 'file-extension' | 'config-file' | 'source-code' | 'directory-structure';
  weight: number;
  details: FileExtensionResult | ConfigFileResult | SourceCodeResult | DirectoryStructureResult;
}

/**
 * Language detector interface
 */
export interface ILanguageDetector {
  /**
   * Detect language from project files
   * @param projectPath Path to the project directory
   * @returns Promise<LanguageDetectionResult> Detection result with confidence score
   */
  detect(projectPath: string): Promise<LanguageDetectionResult>;
}

/**
 * Analyzer interface
 */
export interface IAnalyzer<T> {
  /**
   * Analyze project for language indicators
   * @param projectPath Path to the project directory
   * @returns Promise<T> Analysis result
   */
  analyze(projectPath: string): Promise<T>;
}

/**
 * Cache entry interface
 */
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * Detection options interface
 */
export interface DetectionOptions {
  includeDevFiles?: boolean;
  maxFilesToAnalyze?: number;
  cacheEnabled?: boolean;
  confidenceThreshold?: number;
}
