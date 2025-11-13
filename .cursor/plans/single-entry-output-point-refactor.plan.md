<!-- e847324a-83c5-42e2-8fb0-4f1c11391506 1ff7a5e7-b4e5-4c09-a27c-2976e94a9703 -->
# Get Dependencies Tool - Complete Implementation Plan

## 1. Architecture Overview

The `get_dependencies` tool follows the same architectural pattern as `get_language_info`:

- Single entry point: `index.ts` exports `getDependencies(projectPath)`
- Single output point: Returns MCP response format with structured dependency data
- Language-specific extractors for each supported technology
- Shared utilities for parsing and version handling

## 2. Project Structure

```
mcp/tools/get_dependencies/
├── index.ts                    # Main entry point - orchestrates extraction
├── types.ts                    # Type definitions for dependencies
├── extractors/
│   ├── base.ts                 # Base extractor interface
│   ├── python.ts               # Python dependency extraction
│   ├── nodejs.ts               # Node.js/JavaScript dependency extraction
│   ├── java.ts                 # Java dependency extraction
│   ├── ruby.ts                 # Ruby dependency extraction
│   ├── go.ts                   # Go dependency extraction
│   └── rust.ts                 # Rust dependency extraction
├── parsers/
│   ├── requirementsParser.ts   # Parse requirements.txt
│   ├── pyprojectParser.ts     # Parse pyproject.toml
│   ├── packageJsonParser.ts   # Parse package.json
│   ├── pomParser.ts           # Parse pom.xml
│   ├── gradleParser.ts        # Parse build.gradle
│   ├── gemfileParser.ts       # Parse Gemfile
│   ├── gomodParser.ts         # Parse go.mod
│   └── cargoParser.ts         # Parse Cargo.toml
├── utils/
│   ├── versionParser.ts       # Parse version constraints
│   ├── dependencyNormalizer.ts # Normalize dependency names
│   └── fileUtils.ts           # File system utilities (reuse from get_language_info)
└── cache/
    └── dependencyCache.ts     # Cache extracted dependencies
```

## 3. Supported Technologies and Dependency Files

### 3.1 Python

**Dependency Files:**

- `requirements.txt` - Simple list format: `package==version` or `package>=version`
- `pyproject.toml` - TOML format with `[project.dependencies]` and `[project.optional-dependencies]`
- `setup.py` - Python script with `install_requires` and `extras_require`
- `setup.cfg` - INI format with `[options]` and `[options.extras_require]`
- `Pipfile` - TOML format with `[packages]` and `[dev-packages]`
- `Pipfile.lock` - Locked versions in JSON format
- `poetry.lock` - Poetry lock file (JSON)
- `environment.yml` / `conda.yml` - Conda environment files (YAML)

**Logic:**

- Parse version constraints: `==`, `>=`, `<=`, `>`, `<`, `~=`, `!=`
- Handle extras: `package[extra1,extra2]`
- Distinguish dev dependencies (requirements-dev.txt, Pipfile dev-packages)
- Support git/URL dependencies: `git+https://...`
- Handle environment markers: `package==1.0; python_version<"3.8"`

### 3.2 Node.js/JavaScript/TypeScript

**Dependency Files:**

- `package.json` - JSON format with `dependencies`, `devDependencies`, `peerDependencies`, `optionalDependencies`
- `package-lock.json` - NPM lock file (JSON, nested structure)
- `yarn.lock` - Yarn lock file (YAML-like format)
- `pnpm-lock.yaml` - pnpm lock file (YAML)
- `npm-shrinkwrap.json` - NPM shrinkwrap file

**Logic:**

- Extract from `dependencies`, `devDependencies`, `peerDependencies`, `optionalDependencies`
- Parse version ranges: `^`, `~`, `>=`, `<=`, `*`, `x`, `-` (ranges)
- Handle workspace dependencies: `workspace:*`
- Support git/URL dependencies: `git+https://...`, `github:user/repo`
- Parse lock files to get exact versions
- Handle scoped packages: `@scope/package`

### 3.3 Java

**Dependency Files:**

- `pom.xml` - Maven POM file (XML format)
- `build.gradle` - Gradle build file (Groovy/Kotlin DSL)
- `settings.gradle` - Gradle settings file
- `build.gradle.kts` - Kotlin DSL Gradle file
- `gradle.properties` - Gradle properties

**Logic:**

- Maven: Parse `<dependencies>` section, extract `<groupId>`, `<artifactId>`, `<version>`
- Handle Maven properties: `${property.name}`
- Parse parent POM inheritance
- Gradle: Parse `dependencies { }` block
- Handle different dependency configurations: `implementation`, `compile`, `runtime`, `testImplementation`
- Support repositories and BOM (Bill of Materials)
- Handle version catalogs in Gradle 7+

### 3.4 Ruby

**Dependency Files:**

- `Gemfile` - Ruby gem dependencies (Ruby DSL)
- `Gemfile.lock` - Locked versions (text format)
- `*.gemspec` - Gem specification files

**Logic:**

- Parse `gem` declarations: `gem 'name', '~> 1.0'`
- Handle version operators: `~>`, `>=`, `<=`, `>`, `<`, `=`
- Distinguish groups: `:development`, `:test`, `:production`
- Support git/URL sources: `gem 'name', git: 'https://...'`
- Parse Gemfile.lock for exact versions
- Handle platform-specific gems: `gem 'name', platform: :ruby`

### 3.5 Go

**Dependency Files:**

- `go.mod` - Go module file (text format)
- `go.sum` - Checksum file (text format)

**Logic:**

- Parse `require` directives: `require module/path v1.2.3`
- Handle `replace` directives: `replace old => new`
- Parse `exclude` directives
- Support version suffixes: `v1.2.3+incompatible`, `v0.0.0-20210101000000-abcdef123456`
- Handle indirect dependencies (marked in go.mod)
- Parse go.sum for checksums (optional, for verification)

### 3.6 Rust

**Dependency Files:**

- `Cargo.toml` - Rust manifest (TOML format)
- `Cargo.lock` - Locked versions (TOML format)

**Logic:**

- Parse `[dependencies]` and `[dev-dependencies]` sections
- Handle version constraints: `^`, `~`, `=`, `>=`, `<=`
- Support path dependencies: `path = "../local"`
- Handle git dependencies: `git = "https://..."`
- Parse features: `features = ["feature1"]`
- Support workspace dependencies
- Parse Cargo.lock for exact versions

## 4. Core Types and Interfaces

```typescript
// types.ts
export interface Dependency {
  name: string;
  version?: string;
  versionConstraint?: string;  // e.g., "^1.0.0", "~> 2.0", ">=1.0.0"
  type: 'runtime' | 'development' | 'peer' | 'optional' | 'build';
  source?: 'registry' | 'git' | 'path' | 'local';
  sourceUrl?: string;
  extras?: string[];  // For Python extras
  scope?: string;     // For scoped packages like @scope/package
}

export interface DependencyGroup {
  language: string;
  dependencies: Dependency[];
  devDependencies?: Dependency[];
  peerDependencies?: Dependency[];
  optionalDependencies?: Dependency[];
  lockFile?: {
    path: string;
    format: string;
    exists: boolean;
  };
}

export interface DependencyExtractionResult {
  language: string;
  groups: DependencyGroup[];
  errors?: string[];
  warnings?: string[];
}
```

## 5. Implementation Logic by Technology

### 5.1 Python Extractor (`extractors/python.ts`)

**Priority Order:**

1. `pyproject.toml` (modern standard)
2. `Pipfile` / `Pipfile.lock` (Pipenv)
3. `poetry.lock` (Poetry)
4. `requirements.txt` / `requirements-*.txt`
5. `setup.py` / `setup.cfg`
6. `environment.yml` (Conda)

**Parsing Logic:**

- **requirements.txt**: Line-by-line parsing, handle comments (`#`), continuation (`\`), and constraints
- **pyproject.toml**: Parse TOML, extract from `[project.dependencies]`, handle optional dependencies
- **Pipfile**: Parse TOML, extract from `[packages]` and `[dev-packages]`
- **setup.py**: AST parsing or regex for `install_requires` and `extras_require`
- **poetry.lock**: Parse JSON, extract from `package` entries

### 5.2 Node.js Extractor (`extractors/nodejs.ts`)

**Priority Order:**

1. `package-lock.json` (exact versions)
2. `yarn.lock` (exact versions)
3. `pnpm-lock.yaml` (exact versions)
4. `package.json` (version ranges)

**Parsing Logic:**

- **package.json**: Direct JSON parsing, extract all dependency types
- **package-lock.json**: Parse nested structure, extract from `packages` or `dependencies` tree
- **yarn.lock**: Parse YAML-like format, handle multi-line entries
- **pnpm-lock.yaml**: Parse YAML, extract from `dependencies` section

### 5.3 Java Extractor (`extractors/java.ts`)

**Priority Order:**

1. `build.gradle` / `build.gradle.kts` (Gradle)
2. `pom.xml` (Maven)

**Parsing Logic:**

- **pom.xml**: XML parsing, extract `<dependency>` elements, handle parent inheritance, properties
- **build.gradle**: Parse Groovy/Kotlin DSL, extract from `dependencies {}` block, handle different configurations

### 5.4 Ruby Extractor (`extractors/ruby.ts`)

**Priority Order:**

1. `Gemfile.lock` (exact versions)
2. `Gemfile` (version constraints)

**Parsing Logic:**

- **Gemfile**: Parse Ruby DSL, extract `gem` declarations, handle groups and version operators
- **Gemfile.lock**: Parse text format, extract from `GEM` section

### 5.5 Go Extractor (`extractors/go.ts`)

**Priority Order:**

1. `go.mod` (primary source)
2. `go.sum` (for verification, optional)

**Parsing Logic:**

- **go.mod**: Parse module format, extract `require` directives, handle `replace` and `exclude`
- **go.sum**: Parse checksums (optional, for verification only)

### 5.6 Rust Extractor (`extractors/rust.ts`)

**Priority Order:**

1. `Cargo.lock` (exact versions)
2. `Cargo.toml` (version constraints)

**Parsing Logic:**

- **Cargo.toml**: Parse TOML, extract from `[dependencies]` and `[dev-dependencies]`
- **Cargo.lock**: Parse TOML, extract from `[[package]]` entries

## 6. Main Entry Point Logic (`index.ts`)

1. **Detect Language**: Use `get_language_info` tool to determine project language
2. **Select Extractor**: Choose appropriate extractor based on detected language
3. **Extract Dependencies**: Call extractor with project path
4. **Aggregate Results**: Combine dependencies from multiple files if present
5. **Normalize**: Normalize package names and versions
6. **Format Response**: Return structured MCP response

**Error Handling:**

- If language detection fails, try all extractors
- If extraction fails for one file, try other files
- Collect errors and warnings, don't fail completely

## 7. Version Constraint Parsing (`utils/versionParser.ts`)

Parse and normalize version constraints:

- Semantic versioning: `1.2.3`, `1.2.3-beta.1`
- Ranges: `^1.0.0`, `~1.0.0`, `>=1.0.0 <2.0.0`
- Operators: `==`, `!=`, `>=`, `<=`, `>`, `<`
- Special: `*`, `x`, `latest`, `any`

## 8. Caching Strategy (`cache/dependencyCache.ts`)

- Cache key: `projectPath + file modification times`
- TTL: 30 minutes (dependencies don't change frequently)
- Invalidate on file changes

## 9. Output Format

```json
{
  "language": "python",
  "dependencies": [
    {
      "name": "requests",
      "version": "2.31.0",
      "versionConstraint": "==2.31.0",
      "type": "runtime",
      "source": "registry"
    }
  ],
  "devDependencies": [...],
  "lockFile": {
    "path": "requirements.txt",
    "format": "requirements",
    "exists": true
  },
  "errors": [],
  "warnings": []
}
```

## 10. Implementation Steps

1. Create base extractor interface and types
2. Implement version parser utility
3. Implement Python extractor (start with requirements.txt, then pyproject.toml)
4. Implement Node.js extractor (package.json, then lock files)
5. Implement Java extractor (pom.xml, then build.gradle)
6. Implement Ruby extractor (Gemfile, then Gemfile.lock)
7. Implement Go extractor (go.mod)
8. Implement Rust extractor (Cargo.toml, then Cargo.lock)
9. Create main index.ts orchestrator
10. Add caching
11. Add error handling and validation
12. Test with real projects

## 11. Edge Cases to Handle

- Multiple dependency files (e.g., both requirements.txt and pyproject.toml)
- Missing or corrupted files
- Unsupported file formats
- Git/URL dependencies
- Local/path dependencies
- Workspace/monorepo structures
- Version conflicts between files
- Comments and whitespace in files
- Encoding issues
- Large files (streaming for lock files)

### To-dos

- [ ] Create types.ts with Dependency, DependencyGroup, and DependencyExtractionResult interfaces
- [ ] Create extractors/base.ts with base extractor interface and common functionality
- [ ] Create utils/versionParser.ts for parsing and normalizing version constraints
- [ ] Create parser utilities for each file format (requirementsParser, packageJsonParser, etc.)
- [ ] Implement extractors/python.ts supporting requirements.txt, pyproject.toml, Pipfile, setup.py
- [ ] Implement extractors/nodejs.ts supporting package.json, package-lock.json, yarn.lock, pnpm-lock.yaml
- [ ] Implement extractors/java.ts supporting pom.xml and build.gradle
- [ ] Implement extractors/ruby.ts supporting Gemfile and Gemfile.lock
- [ ] Implement extractors/go.ts supporting go.mod and go.sum
- [ ] Implement extractors/rust.ts supporting Cargo.toml and Cargo.lock
- [ ] Implement index.ts to detect language, select extractor, and aggregate results
- [ ] Implement cache/dependencyCache.ts for caching extracted dependencies
- [ ] Add comprehensive error handling, validation, and edge case handling