/**
 * Main entry point for get_dependencies tool
 * Extracts and lists all dependencies from project files
 * @param projectPath Path to the project directory
 * @returns MCP tool response with dependencies list
 */

import { PythonExtractor } from './extractors/python.js';
import { NodeJSExtractor } from './extractors/nodejs.js';
import { JavaExtractor } from './extractors/java.js';
import { RubyExtractor } from './extractors/ruby.js';
import { GoExtractor } from './extractors/go.js';
import { RustExtractor } from './extractors/rust.js';
import { DependencyExtractionResult } from './types.js';
import { DependencyNormalizer } from './utils/dependencyNormalizer.js';
import { DependencyCache } from './cache/dependencyCache.js';
import { getLanguageInfo } from '../get_language_info/index.js';

/**
 * Extract dependencies from project
 * @param projectPath Path to project directory
 * @returns MCP tool response with dependencies
 */
export async function getDependencies(projectPath: string): Promise<{
  content: Array<{
    type: 'text';
    text: string;
  }>;
}> {
  try {
    // Check cache first
    const cachedResult = await DependencyCache.get(projectPath);
    if (cachedResult) {
      return formatResponse(cachedResult);
    }

    // Detect language first
    let detectedLanguage = 'unknown';
    try {
      const languageResult = await getLanguageInfo(projectPath);
      const languageData = JSON.parse(languageResult.content[0].text);
      detectedLanguage = languageData.language || 'unknown';
    } catch (error) {
      console.error('Error detecting language:', error);
    }

    // Select extractor based on detected language
    const extractors = [
      new PythonExtractor(),
      new NodeJSExtractor(),
      new JavaExtractor(),
      new RubyExtractor(),
      new GoExtractor(),
      new RustExtractor()
    ];

    let result: DependencyExtractionResult | null = null;
    const errors: string[] = [];
    const warnings: string[] = [];

    // Try extractor for detected language first
    if (detectedLanguage !== 'unknown') {
      const languageMap: Record<string, typeof extractors[number]> = {
        'python': extractors[0],
        'javascript': extractors[1],
        'java': extractors[2],
        'ruby': extractors[3],
        'go': extractors[4],
        'rust': extractors[5]
      };

      const extractor = languageMap[detectedLanguage];
      if (extractor) {
        try {
          result = await extractor.extract(projectPath);
        } catch (error) {
          errors.push(`Failed to extract dependencies for ${detectedLanguage}: ${error}`);
        }
      }
    }

    // If extraction failed or language unknown, try all extractors and pick the best result
    if (!result || result.groups.length === 0 || (result.groups[0] && result.groups[0].dependencies.length === 0)) {
      let bestResult: DependencyExtractionResult | null = null;
      let maxDependencies = 0;

      for (const extractor of extractors) {
        try {
          const extractResult = await extractor.extract(projectPath);
          if (extractResult.groups.length > 0) {
            const group = extractResult.groups[0];
            const totalDeps = (group.dependencies?.length || 0) + 
                             (group.devDependencies?.length || 0) + 
                             (group.peerDependencies?.length || 0) + 
                             (group.optionalDependencies?.length || 0);
            
            if (totalDeps > maxDependencies) {
              maxDependencies = totalDeps;
              bestResult = extractResult;
            }
          }
        } catch (error) {
          // Continue with other extractors
          warnings.push(`Extractor ${extractor.constructor.name} failed: ${error}`);
        }
      }

      if (bestResult) {
        result = bestResult;
      }
    }

    // If still no result, return empty result
    if (!result) {
      result = {
        language: detectedLanguage,
        groups: [],
        errors: errors.length > 0 ? errors : undefined,
        warnings: warnings.length > 0 ? warnings : undefined
      };
    }

    // Normalize dependencies
    if (result.groups.length > 0) {
      for (const group of result.groups) {
        group.dependencies = DependencyNormalizer.normalizeAll(group.dependencies);
        if (group.devDependencies) {
          group.devDependencies = DependencyNormalizer.normalizeAll(group.devDependencies);
        }
        if (group.peerDependencies) {
          group.peerDependencies = DependencyNormalizer.normalizeAll(group.peerDependencies);
        }
        if (group.optionalDependencies) {
          group.optionalDependencies = DependencyNormalizer.normalizeAll(group.optionalDependencies);
        }
      }
    }

    // Cache the result
    await DependencyCache.set(projectPath, result);

    return formatResponse(result);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ 
            language: 'unknown',
            groups: [],
            errors: [errorMessage]
          }, null, 2),
        },
      ],
    };
  }
}

/**
 * Format extraction result as MCP response
 * @param result Extraction result
 * @returns MCP response
 */
function formatResponse(result: DependencyExtractionResult): {
  content: Array<{
    type: 'text';
    text: string;
  }>;
} {
  // Flatten groups into single response format
  const response: any = {
    language: result.language
  };

  if (result.groups.length > 0) {
    const group = result.groups[0];
    response.dependencies = group.dependencies;
    if (group.devDependencies) {
      response.devDependencies = group.devDependencies;
    }
    if (group.peerDependencies) {
      response.peerDependencies = group.peerDependencies;
    }
    if (group.optionalDependencies) {
      response.optionalDependencies = group.optionalDependencies;
    }
    if (group.lockFile) {
      response.lockFile = group.lockFile;
    }
  } else {
    response.dependencies = [];
  }

  if (result.errors && result.errors.length > 0) {
    response.errors = result.errors;
  }

  if (result.warnings && result.warnings.length > 0) {
    response.warnings = result.warnings;
  }

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(response, null, 2),
      },
    ],
  };
}
