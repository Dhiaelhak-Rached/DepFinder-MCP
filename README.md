# DepFinder MCP Server

A Model Context Protocol (MCP) server for analyzing project dependencies and ensuring compatibility across different programming languages and ecosystems.

## Features

- **Language Detection**: Automatically detect programming languages and runtime versions from project files
- **Dependency Extraction**: Extract and list all dependencies from various package managers
- **Version Compatibility**: Find compatible versions for specific dependencies
- **Requirements Generation**: Generate requirements files with compatible dependencies
- **Compatibility Verification**: Verify compatibility between multiple dependencies

## Installation

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```

## Usage

### Development

```bash
# Run in development mode
npm run dev

# Build the project
npm run build

# Start the built server
npm start
```

### Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Code Quality

```bash
# Lint and fix code
npm run lint

# Format code
npm run format
```

## MCP Tools

### get_language_info

Detects the programming language and runtime version from project files.

**Parameters:**
- `projectPath` (string, required): Path to the project directory

**Returns:**
- `language` (string): Detected programming language
- `runtimeVersion` (string): Version of the runtime
- `framework` (string, optional): Detected framework if any

### get_dependencies

Extracts and lists all dependencies from project files.

**Parameters:**
- `projectPath` (string, required): Path to the project directory

**Returns:**
- `dependencies` (array): List of dependencies with name and version
- `devDependencies` (array): List of development dependencies
- `packageManager` (string): Detected package manager

### search_compatible_versions

Finds compatible versions for a given dependency.

**Parameters:**
- `packageName` (string, required): Name of the package to search
- `currentVersion` (string, optional): Current version of the package
- `language` (string, required): Programming language/runtime

**Returns:**
- `compatibleVersions` (array): List of compatible versions
- `recommendedVersion` (string): Recommended version to use

### generate_requirements

Generates a requirements file with compatible dependencies.

**Parameters:**
- `projectPath` (string, required): Path to the project directory
- `outputPath` (string, optional): Path where to save the requirements file

**Returns:**
- `filePath` (string): Path to the generated requirements file
- `dependenciesCount` (number): Number of dependencies included

### verify_compatibility

Verifies compatibility between dependencies.

**Parameters:**
- `dependencies` (array, required): List of dependencies to verify
- `language` (string, required): Programming language/runtime

**Returns:**
- `isCompatible` (boolean): Whether the dependencies are compatible
- `conflicts` (array): List of compatibility conflicts if any
- `recommendations` (array): Recommendations to resolve conflicts

## Architecture

```
DepFinder_MCP/
├── mcp/
│   ├── tools/
│   │   ├── get_language_info/
│   │   ├── get_dependencies/
│   │   ├── search_compatible_versions/
│   │   ├── generate_requirements/
│   │   └── verify_compatibility/
│   ├── utils/
│   └── cache/
├── src/
│   └── index.ts
├── tests/
├── output/
└── README.md
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

ISC
