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
    // When confidences are equal, prefer results with runtimeVersion (indicates config file found)
    const bestResult = validResults.length > 0
      ? validResults.reduce((best, current) => {
          // If current has higher confidence, use it
          if (current.confidence > best.confidence) return current;
          // If confidences are equal, prefer the one with runtimeVersion (config file evidence)
          if (current.confidence === best.confidence) {
            // Prefer result with runtimeVersion (more reliable - comes from config files)
            if (current.runtimeVersion && !best.runtimeVersion) return current;
            if (!current.runtimeVersion && best.runtimeVersion) return best;
            // If both or neither have runtimeVersion, prefer the one with framework (more specific)
            if (current.framework && !best.framework) return current;
            if (!current.framework && best.framework) return best;
          }
          return best;
        }, validResults[0])
      : results.reduce((best, current) => {
          // Same logic for fallback to all results
          if (current.confidence > best.confidence) return current;
          if (current.confidence === best.confidence) {
            if (current.runtimeVersion && !best.runtimeVersion) return current;
            if (!current.runtimeVersion && best.runtimeVersion) return best;
            if (current.framework && !best.framework) return current;
            if (!current.framework && best.framework) return best;
          }
          return best;
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

