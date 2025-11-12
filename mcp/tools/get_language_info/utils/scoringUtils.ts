import { DetectionEvidence, LanguageDetectionResult, FileExtensionResult, ConfigFileResult, SourceCodeResult } from '../types.js';

/**
 * Confidence scoring utilities for language detection
 */
export class ScoringUtils {
  /**
   * Calculate confidence score from evidence
   * @param evidence Array of detection evidence
   * @returns Confidence score between 0 and 1
   */
  static calculateConfidenceScore(evidence: DetectionEvidence[]): number {
    if (evidence.length === 0) {
      return 0;
    }

    // Group evidence by type
    const evidenceByType: Record<string, DetectionEvidence[]> = {};
    
    for (const item of evidence) {
      if (!evidenceByType[item.type]) {
        evidenceByType[item.type] = [];
      }
      evidenceByType[item.type].push(item);
    }

    // Calculate weighted score
    let totalScore = 0;
    let totalWeight = 0;
    
    for (const [type, items] of Object.entries(evidenceByType)) {
      for (const item of items) {
        // Accumulate weighted score (weight * score/confidence)
        // Default score to 1 if not available
        const itemScore = this.getItemScore(item);
        totalScore += item.weight * itemScore;
        totalWeight += item.weight;
      }
    }

    // Normalize to 0-1 range
    const confidence = totalWeight > 0 ? totalScore / totalWeight : 0;
    
    // Apply penalties for conflicting evidence
    const penalty = this.calculateConflictPenalty(evidenceByType);
    
    return Math.max(0, Math.min(1, confidence - penalty));
  }

  /**
   * Get score/confidence for an evidence item
   * @param item Evidence item
   * @returns Score value (0-1)
   */
  private static getItemScore(item: DetectionEvidence): number {
    // For now, default to 1.0 for all evidence types
    // This can be enhanced to extract actual confidence from details
    return 1.0;
  }

  /**
   * Calculate penalty for conflicting evidence
   * @param evidenceByType Evidence grouped by type
   * @returns Penalty value
   */
  static calculateConflictPenalty(evidenceByType: Record<string, DetectionEvidence[]>): number {
    let penalty = 0;
    
    // Check for conflicting language indicators
    const languageConflicts = this.detectLanguageConflicts(evidenceByType);
    
    for (const conflict of languageConflicts) {
      penalty += 0.2; // Penalty for each conflict
    }
    
    return penalty;
  }

  /**
   * Detect conflicting language indicators
   * @param evidenceByType Evidence grouped by type
   * @returns Array of conflicts
   */
  static detectLanguageConflicts(evidenceByType: Record<string, DetectionEvidence[]>): string[] {
    const conflicts: string[] = [];
    
    // Get all detected languages from evidence
    const detectedLanguages = new Set<string>();
    
    for (const [type, items] of Object.entries(evidenceByType)) {
      for (const item of items) {
        let language: string | undefined;
        if (item.type === 'file-extension') {
          language = (item.details as FileExtensionResult).language;
        } else if (item.type === 'config-file') {
          language = (item.details as ConfigFileResult).language;
        } else if (item.type === 'source-code') {
          language = (item.details as SourceCodeResult).language;
        }
        if (language) {
          detectedLanguages.add(language);
        }
      }
    }
    
    // If more than one language is detected, it's a conflict
    if (detectedLanguages.size > 1) {
      conflicts.push('Multiple languages detected');
    }
    
    return conflicts;
  }

  /**
   * Calculate confidence for a specific language
   * @param language Language to calculate confidence for
   * @param evidence Array of detection evidence
   * @returns Confidence score for the language
   */
  static calculateLanguageConfidence(language: string, evidence: DetectionEvidence[]): number {
    let totalScore = 0;
    let totalWeight = 0;
    
    for (const item of evidence) {
      // Check if this evidence is relevant to the language
      if (this.isEvidenceRelevantToLanguage(item, language)) {
        totalScore += item.weight;
        totalWeight += item.weight;
      }
    }
    
    return totalWeight > 0 ? totalScore / totalWeight : 0;
  }

  /**
   * Check if evidence is relevant to a specific language
   * @param evidence Detection evidence
   * @param language Language to check relevance for
   * @returns True if evidence is relevant to the language
   */
  static isEvidenceRelevantToLanguage(evidence: DetectionEvidence, language: string): boolean {
    // For file extension evidence
    if (evidence.type === 'file-extension') {
      const extensionResult = evidence.details as FileExtensionResult;
      return extensionResult.language === language;
    }
    
    // For configuration file evidence
    if (evidence.type === 'config-file') {
      const configResult = evidence.details as ConfigFileResult;
      return configResult.language === language;
    }
    
    // For source code evidence
    if (evidence.type === 'source-code') {
      const sourceResult = evidence.details as SourceCodeResult;
      return sourceResult.language === language;
    }
    
    // For directory structure evidence
    if (evidence.type === 'directory-structure') {
      // This would need to be implemented based on the directory structure
      return true; // Assume relevant for now
    }
    
    return false;
  }

  /**
   * Get the primary language from evidence
   * @param evidence Array of detection evidence
   * @returns Primary language with highest confidence
   */
  static getPrimaryLanguage(evidence: DetectionEvidence[]): string | null {
    if (evidence.length === 0) {
      return null;
    }

    // Calculate confidence for each language
    const languageConfidences: Record<string, number> = {};
    
    for (const item of evidence) {
      let language: string | undefined;
      if (item.type === 'file-extension') {
        language = (item.details as FileExtensionResult).language;
      } else if (item.type === 'config-file') {
        language = (item.details as ConfigFileResult).language;
      } else if (item.type === 'source-code') {
        language = (item.details as SourceCodeResult).language;
      }
      if (language) {
        if (!languageConfidences[language]) {
          languageConfidences[language] = 0;
        }
        languageConfidences[language] += item.weight;
      }
    }
    
    // Find language with highest confidence
    let maxConfidence = 0;
    let primaryLanguage = null;
    
    for (const [language, confidence] of Object.entries(languageConfidences)) {
      if (confidence > maxConfidence) {
        maxConfidence = confidence;
        primaryLanguage = language;
      }
    }
    
    return primaryLanguage;
  }

  /**
   * Get the framework with highest confidence
   * @param evidence Array of detection evidence
   * @returns Framework with highest confidence or null
   */
  static getPrimaryFramework(evidence: DetectionEvidence[]): string | null {
    let maxConfidence = 0;
    let primaryFramework = null;
    
    for (const item of evidence) {
      if (item.type === 'source-code') {
        const framework = (item.details as SourceCodeResult).framework;
        if (framework && item.weight > maxConfidence) {
          maxConfidence = item.weight;
          primaryFramework = framework;
        }
      }
    }
    
    return primaryFramework;
  }

  /**
   * Get the runtime version with highest confidence
   * @param evidence Array of detection evidence
   * @returns Runtime version with highest confidence or null
   */
  static getPrimaryRuntimeVersion(evidence: DetectionEvidence[]): string | null {
    let maxConfidence = 0;
    let primaryVersion = null;
    
    for (const item of evidence) {
      if (item.type === 'config-file') {
        const version = (item.details as ConfigFileResult).version;
        if (version && item.weight > maxConfidence) {
          maxConfidence = item.weight;
          primaryVersion = version;
        }
      }
    }
    
    return primaryVersion;
  }

  /**
   * Normalize confidence score to a fixed precision
   * @param score Raw confidence score
   * @returns Normalized confidence score
   */
  static normalizeConfidence(score: number): number {
    // Round to 2 decimal places
    return Math.round(score * 100) / 100;
  }

  /**
   * Get confidence level description
   * @param confidence Confidence score
   * @returns Description of confidence level
   */
  static getConfidenceLevel(confidence: number): string {
    if (confidence >= 0.8) {
      return 'High';
    } else if (confidence >= 0.5) {
      return 'Medium';
    } else if (confidence >= 0.2) {
      return 'Low';
    } else {
      return 'Very Low';
    }
  }

  /**
   * Check if confidence meets threshold
   * @param confidence Confidence score
   * @param threshold Minimum confidence threshold
   * @returns True if confidence meets threshold
   */
  static meetsThreshold(confidence: number, threshold: number): boolean {
    return confidence >= threshold;
  }

  /**
   * Combine multiple confidence scores
   * @param scores Array of confidence scores
   * @returns Combined confidence score
   */
  static combineConfidenceScores(scores: number[]): number {
    if (scores.length === 0) {
      return 0;
    }
    
    // Use weighted average
    const totalWeight = scores.length;
    const weightedSum = scores.reduce((sum, score) => sum + score, 0);
    
    return weightedSum / totalWeight;
  }

  /**
   * Calculate confidence for mixed-language projects
   * @param evidence Array of detection evidence
   * @returns Array of language detection results
   */
  static calculateMixedLanguageConfidence(evidence: DetectionEvidence[]): LanguageDetectionResult[] {
    // Group evidence by language
    const evidenceByLanguage: Record<string, DetectionEvidence[]> = {};
    
    for (const item of evidence) {
      let language: string | undefined;
      if (item.type === 'file-extension') {
        language = (item.details as FileExtensionResult).language;
      } else if (item.type === 'config-file') {
        language = (item.details as ConfigFileResult).language;
      } else if (item.type === 'source-code') {
        language = (item.details as SourceCodeResult).language;
      }
      if (language) {
        if (!evidenceByLanguage[language]) {
          evidenceByLanguage[language] = [];
        }
        evidenceByLanguage[language].push(item);
      }
    }
    
    // Calculate confidence for each language
    const results: LanguageDetectionResult[] = [];
    
    for (const [language, items] of Object.entries(evidenceByLanguage)) {
      const confidence = this.calculateConfidenceScore(items);
      
      // Extract framework and version if available
      const framework = this.getPrimaryFramework(items);
      const runtimeVersion = this.getPrimaryRuntimeVersion(items);
      
      results.push({
        language,
        framework,
        runtimeVersion,
        confidence
      });
    }
    
    // Sort by confidence (descending)
    return results.sort((a, b) => b.confidence - a.confidence);
  }
}
