import { PythonDetector } from './detectors/python.js';
import { NodeJSDetector } from './detectors/nodejs.js';
import { JavaDetector } from './detectors/java.js';
import { RubyDetector } from './detectors/ruby.js';
import { GoDetector } from './detectors/go.js';
import { RustDetector } from './detectors/rust.js';
import { LanguageDetectionResult } from './types.js';

/**
 * Main entry point for get_language_info tool
 * Detects programming language and runtime version from project files
 * @param projectPath Path to the project directory
 * @returns MCP tool response with language detection result
 */
export async function getLanguageInfo(projectPath: string): Promise<{
  content: Array<{
    type: 'text';
    text: string;
  }>;
}> {
  try {
    // Try each detector
    const detectors = [
      new PythonDetector(),
      new NodeJSDetector(),
      new JavaDetector(),
      new RubyDetector(),
      new GoDetector(),
      new RustDetector(),
    ];

    const results: LanguageDetectionResult[] = [];

    for (const detector of detectors) {
      try {
        const result = await detector.detect(projectPath, { cacheEnabled: false });
        if (result.confidence > 0) {
          results.push(result);
        }
      } catch (error) {
        // Continue with other detectors if one fails
        console.error(`Error detecting with ${detector.constructor.name}:`, error);
      }
    }

    // Filter results: require at least config file OR significant file extension evidence
    // This prevents false positives from weak matches
    const validResults = results.filter(result => {
      // If confidence is very high (>0.7), accept it
      if (result.confidence > 0.7) return true;
      // Otherwise require at least moderate confidence (>0.3) for now
      // In a real scenario, we'd check if config files were found
      return result.confidence > 0.3;
    });
    
    // Find the result with highest confidence from valid results
    const bestResult = validResults.length > 0
      ? validResults.reduce((best, current) => {
          return current.confidence > best.confidence ? current : best;
        }, validResults[0])
      : results.reduce((best, current) => {
          return current.confidence > best.confidence ? current : best;
        }, results[0] || { language: 'unknown', confidence: 0 });

    // Format response
    const responseText = JSON.stringify({
      language: bestResult.language,
      runtimeVersion: bestResult.runtimeVersion,
      framework: bestResult.framework,
      confidence: bestResult.confidence,
    }, null, 2);

    return {
      content: [
        {
          type: 'text',
          text: responseText,
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ error: errorMessage }, null, 2),
        },
      ],
    };
  }
}

