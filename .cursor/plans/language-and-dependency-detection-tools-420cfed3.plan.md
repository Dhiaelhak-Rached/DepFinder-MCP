<!-- 420cfed3-b6ae-4851-99c3-00d69c25901b 45593467-57de-49fb-b696-da8e838c3491 -->
# getlanguageinfo Tool Architecture Plan

## 1. Project Structure

```
mcp/tools/get_language_info/
├── index.ts                    # Main entry point and orchestration
├── types.ts                    # Type definitions for the tool
├── detectors/
│   ├── base.ts                 # Base detector interface
│   ├── python.ts               # Python language detection
│   ├── nodejs.ts               # Node.js language detection
│   ├── java.ts                 # Java language detection
│   ├── ruby.ts                 # Ruby language detection
│   ├── go.ts                   # Go language detection
│   ├── rust.ts                 # Rust language detection
│   ├── php.ts                  # PHP language detection
│   └── csharp.ts              # C# language detection
├── analyzers/
│   ├── base.ts                 # Base analyzer interface
│   ├── fileExtensionAnalyzer.ts  # File extension analysis
│   ├── configAnalyzer.ts        # Configuration file analysis
│   └── sourceCodeAnalyzer.ts    # Source code pattern analysis
├── utils/
│   ├── fileUtils.ts            # File system utilities
│   ├── versionUtils.ts         # Version parsing utilities
│   └── scoringUtils.ts        # Confidence scoring utilities
└── cache/
    └── detectionCache.ts       # Caching mechanism
```

## 2. Core Functionality

The get_language_info tool will:

1. Scan project directory for language indicators
2. Analyze file extensions and content
3. Parse configuration files for version information
4. Detect frameworks based on patterns
5. Calculate confidence scores for each detected language
6. Return the most likely language with version and framework info

## 3. File Responsibilities

### 3.1. index.ts

- Main entry point for the tool
- Orchestrates the detection process
- Combines results from all detectors
- Applies confidence scoring
- Returns final language info

### 3.2. types.ts

- Defines interfaces for language detection results
- Defines types for version information
- Defines types for framework detection
- Defines types for confidence scoring

### 3.3. detectors/base.ts

- Defines the base detector interface
- Provides common functionality for all detectors
- Implements shared detection logic

### 3.4. detectors/[language].ts

- Each file handles detection for one specific language
- Implements the base detector interface
- Contains language-specific detection logic
- Returns detection result with confidence score

### 3.5. analyzers/base.ts

- Defines the base analyzer interface
- Provides common functionality for all analyzers
- Implements shared analysis logic

### 3.6. analyzers/fileExtensionAnalyzer.ts

- Analyzes file extensions in the project
- Counts occurrences of each extension
- Determines primary language based on file distribution

### 3.7. analyzers/configAnalyzer.ts

- Parses configuration files for language indicators
- Extracts version information from config files
- Identifies framework-specific configurations

### 3.8. analyzers/sourceCodeAnalyzer.ts

- Analyzes source code for language patterns
- Detects framework-specific imports and patterns
- Identifies language-specific syntax

### 3.9. utils/fileUtils.ts

- Provides file system utilities
- Handles file reading and directory traversal
- Implements file filtering and pattern matching

### 3.10. utils/versionUtils.ts

- Provides version parsing utilities
- Validates version strings
- Normalizes version formats

### 3.11. utils/scoringUtils.ts

- Implements confidence scoring algorithms
- Combines evidence from different sources
- Resolves conflicts between languages

### 3.12. cache/detectionCache.ts

- Implements caching mechanism
- Stores detection results with TTL
- Improves performance for repeated scans

## 4. Detection Logic

### 4.1. File Extension Analysis

- Scan project directory for all files
- Count occurrences of each file extension
- Map extensions to programming languages
- Calculate percentage distribution

### 4.2. Configuration File Analysis

- Look for language-specific configuration files
- Parse configuration files for version information
- Extract framework indicators from configurations

### 4.3. Source Code Analysis

- Sample source files for language patterns
- Look for language-specific keywords and syntax
- Detect framework-specific imports and patterns

### 4.4. Confidence Scoring

- Combine evidence from all analysis methods
- Apply weights to different types of evidence
- Calculate confidence score for each language
- Resolve conflicts between languages

## 5. Language-Specific Detection

### 5.1. Python Detection

- Look for .py files, requirements.txt, pyproject.toml, setup.py
- Parse Python version from .python-version or pyproject.toml
- Detect Django, Flask, FastAPI frameworks

### 5.2. Node.js Detection

- Look for .js/.ts files, package.json, tsconfig.json
- Parse Node.js version from .node-version or package.json
- Detect Express, React, Vue, Angular frameworks

### 5.3. Java Detection

- Look for .java files, pom.xml, build.gradle
- Parse Java version from pom.xml or build.gradle
- Detect Spring, Jakarta EE frameworks

### 5.4. Ruby Detection

- Look for .rb files, Gemfile, Gemfile.lock
- Parse Ruby version from .ruby-version or Gemfile
- Detect Rails, Sinatra frameworks

### 5.5. Go Detection

- Look for .go files, go.mod
- Parse Go version from go.mod
- Detect Gin, Echo frameworks

### 5.6. Rust Detection

- Look for .rs files, Cargo.toml
- Parse Rust version from Cargo.toml
- Detect Actix, Rocket frameworks

### 5.7. PHP Detection

- Look for .php files, composer.json
- Parse PHP version from composer.json
- Detect Laravel, Symfony frameworks

### 5.8. C# Detection

- Look for .cs files, *.csproj
- Parse .NET version from *.csproj
- Detect ASP.NET, .NET MAUI frameworks

## 6. Implementation Approach

### 6.1. Single Responsibility Principle

- Each file has one clear responsibility
- No mixing of unrelated functionality
- Clear interfaces between components

### 6.2. Modular Design

- Detectors are independent and interchangeable
- Analyzers can be used by multiple detectors
- Utilities are shared across components

### 6.3. Extensibility

- Easy to add new language detectors
- Simple to extend analyzers for new patterns
- Clear interfaces for future enhancements

## 7. Error Handling

### 7.1. Graceful Degradation

- Continue detection even if some methods fail
- Provide partial results when possible
- Clear error messages for debugging

### 7.2. Validation

- Validate input parameters
- Check for required files and permissions
- Handle edge cases and malformed files

## 8. Performance Considerations

### 8.1. Efficient Scanning

- Limit file scanning to relevant directories
- Use efficient file system operations
- Implement caching for expensive operations

### 8.2. Memory Management

- Process large files in chunks
- Limit memory usage for large projects
- Clean up resources properly

## 9. Testing Strategy

### 9.1. Unit Tests

- Test each detector independently
- Test each analyzer with sample data
- Test utility functions with edge cases

### 9.2. Integration Tests

- Test the complete detection process
- Test with real-world projects
- Test performance with large codebases

## 10. Dependencies

### 10.1. External Libraries

- `file-type` - Detect file types by content
- `semver` - Parse and validate version strings
- `toml` - Parse TOML configuration files
- `xml2js` - Parse XML files
- `yaml` - Parse YAML files
- `glob` - Pattern matching for file discovery

### 10.2. Internal Dependencies

- Use existing file system utilities from mcp/utils
- Use existing cache implementation from mcp/utils
- Follow established patterns from other tools