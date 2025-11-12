import { IAnalyzer, ConfigFileResult } from '../types.js';
import { fileExists, readJsonFile, readTextFile } from '../../../utils/fileSystem.js';

/**
 * Configuration file analyzer for language detection
 */
export class ConfigAnalyzer implements IAnalyzer<ConfigFileResult[]> {  /**
   * Analyze configuration files in project directory
   * @param projectPath Path to the project directory
   * @param targetFiles Array of configuration files to look for
   * @returns Promise<ConfigFileResult[]> Array of configuration file results
   */
  async analyze(projectPath: string, targetFiles: string[]): Promise<ConfigFileResult[]> {
    const results: ConfigFileResult[] = [];

    for (const configFile of targetFiles) {
      const configPath = `${projectPath}/${configFile}`;
      
      if (await fileExists(configPath)) {
        try {
          const result = await this.parseConfigFile(configPath, configFile);
          if (result) {
            results.push(result);
          }
        } catch (error) {
          console.error(`Error parsing config file ${configPath}:`, error);
        }
      }
    }

    return results;
  }

  /**
   * Parse configuration file based on its type
   * @param filePath Path to the configuration file
   * @param fileName Name of the configuration file
   * @returns Promise<ConfigFileResult | null> Parsed configuration result
   */
  private async parseConfigFile(filePath: string, fileName: string): Promise<ConfigFileResult | null> {
    const extension = this.getFileExtension(fileName);
    
    switch (extension) {
      case '.json':
        return this.parseJsonConfig(filePath, fileName);
      case '.toml':
        return this.parseTomlConfig(filePath, fileName);
      case '.xml':
        return this.parseXmlConfig(filePath, fileName);
      case '.yml':
      case '.yaml':
        return this.parseYamlConfig(filePath, fileName);
      case '.txt':
        return this.parseTextConfig(filePath, fileName);
      case '.py':
        return this.parsePythonConfig(filePath, fileName);
      case '.rb':
        return this.parseRubyConfig(filePath, fileName);
      default:
        return this.parseGenericConfig(filePath, fileName);
    }
  }

  /**
   * Parse JSON configuration file
   * @param filePath Path to the JSON file
   * @param fileName Name of the configuration file
   * @returns Promise<ConfigFileResult | null> Parsed configuration result
   */
  private async parseJsonConfig(filePath: string, fileName: string): Promise<ConfigFileResult | null> {
    try {
      const config = await readJsonFile(filePath);
      
      // Handle package.json
      if (fileName === 'package.json') {
        return {
          filePath,
          language: 'javascript',
          version: config.engines?.node,
          framework: this.detectFrameworkFromPackageJson(config),
          dependencies: Object.keys(config.dependencies || {})
        };
      }
      
      // Handle composer.json
      if (fileName === 'composer.json') {
        return {
          filePath,
          language: 'php',
          version: config.require?.php,
          framework: this.detectFrameworkFromComposerJson(config),
          dependencies: Object.keys(config.require || {})
        };
      }
      
      // Handle tsconfig.json
      if (fileName === 'tsconfig.json') {
        return {
          filePath,
          language: 'typescript',
          framework: this.detectFrameworkFromTsConfig(config),
          dependencies: []
        };
      }
      
      return {
        filePath,
        language: this.detectLanguageFromFileName(fileName),
        dependencies: []
      };
    } catch (error) {
      console.error(`Error parsing JSON config ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Parse TOML configuration file
   * @param filePath Path to the TOML file
   * @param fileName Name of the configuration file
   * @returns Promise<ConfigFileResult | null> Parsed configuration result
   */
  private async parseTomlConfig(filePath: string, fileName: string): Promise<ConfigFileResult | null> {
    try {
      const content = await readTextFile(filePath);
      // Note: In a real implementation, we would use a TOML parser library
      // For now, we'll do basic text parsing
      
      // Handle pyproject.toml
      if (fileName === 'pyproject.toml') {
        const pythonVersion = this.extractPythonVersionFromToml(content);
        const framework = this.detectFrameworkFromPyprojectToml(content);
        
        return {
          filePath,
          language: 'python',
          version: pythonVersion,
          framework,
          dependencies: this.extractDependenciesFromToml(content)
        };
      }
      
      // Handle Cargo.toml
      if (fileName === 'Cargo.toml') {
        const rustVersion = this.extractRustVersionFromToml(content);
        const framework = this.detectFrameworkFromCargoToml(content);
        
        return {
          filePath,
          language: 'rust',
          version: rustVersion,
          framework,
          dependencies: this.extractDependenciesFromToml(content)
        };
      }
      
      // Handle go.mod
      if (fileName === 'go.mod') {
        const goVersion = this.extractGoVersionFromMod(content);
        
        return {
          filePath,
          language: 'go',
          version: goVersion,
          dependencies: this.extractDependenciesFromGoMod(content)
        };
      }
      
      return {
        filePath,
        language: this.detectLanguageFromFileName(fileName),
        dependencies: []
      };
    } catch (error) {
      console.error(`Error parsing TOML config ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Parse XML configuration file
   * @param filePath Path to the XML file
   * @param fileName Name of the configuration file
   * @returns Promise<ConfigFileResult | null> Parsed configuration result
   */
  private async parseXmlConfig(filePath: string, fileName: string): Promise<ConfigFileResult | null> {
    try {
      const content = await readTextFile(filePath);
      // Note: In a real implementation, we would use an XML parser library
      // For now, we'll do basic text parsing
      
      // Handle pom.xml
      if (fileName === 'pom.xml') {
        const javaVersion = this.extractJavaVersionFromPom(content);
        const framework = this.detectFrameworkFromPom(content);
        
        return {
          filePath,
          language: 'java',
          version: javaVersion,
          framework,
          dependencies: this.extractDependenciesFromPom(content)
        };
      }
      
      // Handle *.csproj
      if (fileName.endsWith('.csproj')) {
        const dotnetVersion = this.extractDotnetVersionFromCsproj(content);
        const framework = this.detectFrameworkFromCsproj(content);
        
        return {
          filePath,
          language: 'csharp',
          version: dotnetVersion,
          framework,
          dependencies: this.extractDependenciesFromCsproj(content)
        };
      }
      
      return {
        filePath,
        language: this.detectLanguageFromFileName(fileName),
        dependencies: []
      };
    } catch (error) {
      console.error(`Error parsing XML config ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Parse YAML configuration file
   * @param filePath Path to the YAML file
   * @param fileName Name of the configuration file
   * @returns Promise<ConfigFileResult | null> Parsed configuration result
   */
  private async parseYamlConfig(filePath: string, fileName: string): Promise<ConfigFileResult | null> {
    try {
      const content = await readTextFile(filePath);
      // Note: In a real implementation, we would use a YAML parser library
      // For now, we'll do basic text parsing
      
      // Handle environment.yml
      if (fileName === 'environment.yml' || fileName === 'environment.yaml') {
        const pythonVersion = this.extractPythonVersionFromYaml(content);
        
        return {
          filePath,
          language: 'python',
          version: pythonVersion,
          dependencies: []
        };
      }
      
      return {
        filePath,
        language: this.detectLanguageFromFileName(fileName),
        dependencies: []
      };
    } catch (error) {
      console.error(`Error parsing YAML config ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Parse text configuration file
   * @param filePath Path to the text file
   * @param fileName Name of the configuration file
   * @returns Promise<ConfigFileResult | null> Parsed configuration result
   */
  private async parseTextConfig(filePath: string, fileName: string): Promise<ConfigFileResult | null> {
    try {
      const content = await readTextFile(filePath);
      
      // Handle requirements.txt
      if (fileName === 'requirements.txt') {
        const pythonVersion = this.extractPythonVersionFromRequirements(content);
        
        return {
          filePath,
          language: 'python',
          version: pythonVersion,
          dependencies: this.extractDependenciesFromRequirements(content)
        };
      }
      
      // Handle .python-version
      if (fileName === '.python-version') {
        return {
          filePath,
          language: 'python',
          version: content.trim(),
          dependencies: []
        };
      }
      
      // Handle .node-version
      if (fileName === '.node-version') {
        return {
          filePath,
          language: 'javascript',
          version: content.trim(),
          dependencies: []
        };
      }
      
      // Handle .ruby-version
      if (fileName === '.ruby-version') {
        return {
          filePath,
          language: 'ruby',
          version: content.trim(),
          dependencies: []
        };
      }
      
      // Handle .go-version
      if (fileName === '.go-version') {
        return {
          filePath,
          language: 'go',
          version: content.trim(),
          dependencies: []
        };
      }
      
      return {
        filePath,
        language: this.detectLanguageFromFileName(fileName),
        dependencies: []
      };
    } catch (error) {
      console.error(`Error parsing text config ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Parse Python configuration file
   * @param filePath Path to the Python file
   * @param fileName Name of the configuration file
   * @returns Promise<ConfigFileResult | null> Parsed configuration result
   */
  private async parsePythonConfig(filePath: string, fileName: string): Promise<ConfigFileResult | null> {
    try {
      const content = await readTextFile(filePath);
      
      // Handle setup.py
      if (fileName === 'setup.py') {
        const pythonVersion = this.extractPythonVersionFromSetup(content);
        
        return {
          filePath,
          language: 'python',
          version: pythonVersion,
          dependencies: this.extractDependenciesFromSetup(content)
        };
      }
      
      return {
        filePath,
        language: 'python',
        dependencies: []
      };
    } catch (error) {
      console.error(`Error parsing Python config ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Parse Ruby configuration file
   * @param filePath Path to the Ruby file
   * @param fileName Name of the configuration file
   * @returns Promise<ConfigFileResult | null> Parsed configuration result
   */
  private async parseRubyConfig(filePath: string, fileName: string): Promise<ConfigFileResult | null> {
    try {
      const content = await readTextFile(filePath);
      
      // Handle Gemfile
      if (fileName === 'Gemfile') {
        const rubyVersion = this.extractRubyVersionFromGemfile(content);
        
        return {
          filePath,
          language: 'ruby',
          version: rubyVersion,
          dependencies: this.extractDependenciesFromGemfile(content)
        };
      }
      
      return {
        filePath,
        language: 'ruby',
        dependencies: []
      };
    } catch (error) {
      console.error(`Error parsing Ruby config ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Parse generic configuration file
   * @param filePath Path to the configuration file
   * @param fileName Name of the configuration file
   * @returns Promise<ConfigFileResult | null> Parsed configuration result
   */
  private async parseGenericConfig(filePath: string, fileName: string): Promise<ConfigFileResult | null> {
    try {
      return {
        filePath,
        language: this.detectLanguageFromFileName(fileName),
        dependencies: []
      };
    } catch (error) {
      console.error(`Error parsing generic config ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Get file extension from file name
   * @param fileName Name of the file
   * @returns File extension
   */
  private getFileExtension(fileName: string): string {
    const lastDotIndex = fileName.lastIndexOf('.');
    return lastDotIndex === -1 ? '' : fileName.substring(lastDotIndex);
  }

  /**
   * Detect language from file name
   * @param fileName Name of the file
   * @returns Detected language
   */
  private detectLanguageFromFileName(fileName: string): string {
    if (fileName.includes('package.json') || fileName.includes('tsconfig.json')) {
      return 'javascript';
    }
    if (fileName.includes('composer.json')) {
      return 'php';
    }
    if (fileName.includes('Cargo.toml')) {
      return 'rust';
    }
    if (fileName.includes('pyproject.toml') || fileName.includes('setup.py') || fileName.includes('requirements.txt')) {
      return 'python';
    }
    if (fileName.includes('pom.xml') || fileName.includes('build.gradle')) {
      return 'java';
    }
    if (fileName.includes('Gemfile')) {
      return 'ruby';
    }
    if (fileName.includes('go.mod')) {
      return 'go';
    }
    if (fileName.endsWith('.csproj')) {
      return 'csharp';
    }
    return 'unknown';
  }

  // Framework detection methods
  private detectFrameworkFromPackageJson(config: any): string | undefined {
    const deps = config.dependencies || {};
    
    if (deps.react || deps['react-dom']) {
      return 'React';
    }
    if (deps.vue) {
      return 'Vue';
    }
    if (deps.angular || deps['@angular/core']) {
      return 'Angular';
    }
    if (deps.express) {
      return 'Express';
    }
    if (deps.next) {
      return 'Next.js';
    }
    if (deps.gatsby) {
      return 'Gatsby';
    }
    
    return undefined;
  }

  private detectFrameworkFromComposerJson(config: any): string | undefined {
    const deps = config.require || {};
    
    if (deps['laravel/framework'] || deps['laravel/laravel']) {
      return 'Laravel';
    }
    if (deps['symfony/console'] || deps['symfony/process']) {
      return 'Symfony';
    }
    
    return undefined;
  }

  private detectFrameworkFromTsConfig(config: any): string | undefined {
    if (config.compilerOptions?.jsx === 'react') {
      return 'React';
    }
    
    return undefined;
  }

  private detectFrameworkFromPyprojectToml(content: string): string | undefined {
    if (content.includes('django') || content.includes('Django')) {
      return 'Django';
    }
    if (content.includes('flask') || content.includes('Flask')) {
      return 'Flask';
    }
    if (content.includes('fastapi') || content.includes('FastAPI')) {
      return 'FastAPI';
    }
    
    return undefined;
  }

  private detectFrameworkFromCargoToml(content: string): string | undefined {
    if (content.includes('actix') || content.includes('Actix')) {
      return 'Actix';
    }
    if (content.includes('rocket') || content.includes('Rocket')) {
      return 'Rocket';
    }
    
    return undefined;
  }

  private detectFrameworkFromPom(content: string): string | undefined {
    if (content.includes('spring') || content.includes('Spring')) {
      return 'Spring';
    }
    
    return undefined;
  }

  private detectFrameworkFromCsproj(content: string): string | undefined {
    if (content.includes('Microsoft.AspNetCore') || content.includes('aspnet')) {
      return 'ASP.NET';
    }
    
    return undefined;
  }

  // Version extraction methods
  private extractPythonVersionFromToml(content: string): string | undefined {
    const match = content.match(/requires-python\s*=\s*["']([^"']+)["']/);
    return match ? match[1] : undefined;
  }

  private extractRustVersionFromToml(content: string): string | undefined {
    const match = content.match(/rust-version\s*=\s*["']([^"']+)["']/);
    return match ? match[1] : undefined;
  }

  private extractGoVersionFromMod(content: string): string | undefined {
    const match = content.match(/go\s+([0-9.]+)/);
    return match ? match[1] : undefined;
  }

  private extractJavaVersionFromPom(content: string): string | undefined {
    const match = content.match(/java\.version\s*>\s*([^<]+)/);
    return match ? match[1].trim() : undefined;
  }

  private extractDotnetVersionFromCsproj(content: string): string | undefined {
    const match = content.match(/<TargetFramework>([^<]+)<\/TargetFramework>/);
    return match ? match[1] : undefined;
  }

  private extractPythonVersionFromYaml(content: string): string | undefined {
    const match = content.match(/python_version:\s*["']?([^"'\s]+)/);
    return match ? match[1].trim() : undefined;
  }

  private extractPythonVersionFromRequirements(content: string): string | undefined {
    // This is a simplified approach - in reality, this would be more complex
    return undefined;
  }

  private extractPythonVersionFromSetup(content: string): string | undefined {
    const match = content.match(/python_requires\s*=\s*["']([^"']+)["']/);
    return match ? match[1] : undefined;
  }

  private extractRubyVersionFromGemfile(content: string): string | undefined {
    const match = content.match(/ruby\s+["']?([^"'\s]+)/);
    return match ? match[1].trim() : undefined;
  }

  // Dependency extraction methods
  private extractDependenciesFromToml(content: string): string[] {
    const dependencies: string[] = [];
    const lines = content.split('\n');
    
    for (const line of lines) {
      const match = line.match(/^\s*([a-zA-Z0-9\-_]+)\s*=/);
      if (match && !match[1].includes('version') && !match[1].includes('rust-version')) {
        dependencies.push(match[1]);
      }
    }
    
    return dependencies;
  }

  private extractDependenciesFromGoMod(content: string): string[] {
    const dependencies: string[] = [];
    const lines = content.split('\n');
    
    for (const line of lines) {
      const match = line.match(/^\s*require\s+([a-zA-Z0-9\-_/.]+)\s+/);
      if (match) {
        // Extract just the package name, not the version
        const parts = match[1].split(' ');
        if (parts.length > 0) {
          dependencies.push(parts[0]);
        }
      }
    }
    
    return dependencies;
  }

  private extractDependenciesFromPom(content: string): string[] {
    const dependencies: string[] = [];
    const lines = content.split('\n');
    
    for (const line of lines) {
      const match = line.match(/<artifactId>([^<]+)<\/artifactId>/);
      if (match) {
        dependencies.push(match[1]);
      }
    }
    
    return dependencies;
  }

  private extractDependenciesFromCsproj(content: string): string[] {
    const dependencies: string[] = [];
    const lines = content.split('\n');
    
    for (const line of lines) {
      const match = line.match(/<PackageReference\s+Include="([^"]+)"/);
      if (match) {
        dependencies.push(match[1]);
      }
    }
    
    return dependencies;
  }

  private extractDependenciesFromRequirements(content: string): string[] {
    const dependencies: string[] = [];
    const lines = content.split('\n');
    
    for (const line of lines) {
      const match = line.match(/^([a-zA-Z0-9\-_]+)==/);
      if (match) {
        dependencies.push(match[1]);
      }
    }
    
    return dependencies;
  }

  private extractDependenciesFromSetup(content: string): string[] {
    const dependencies: string[] = [];
    const lines = content.split('\n');
    
    for (const line of lines) {
      const match = line.match(/install_requires\s*=\s*\[([^\]]+)\]/);
      if (match) {
        // Extract package names from the list
        const packages = match[1].match(/["']([^"']+)["']/g);
        if (packages) {
          for (const pkg of packages) {
            dependencies.push(pkg.replace(/["']/g, ''));
          }
        }
      }
    }
    
    return dependencies;
  }

  private extractDependenciesFromGemfile(content: string): string[] {
    const dependencies: string[] = [];
    const lines = content.split('\n');
    
    for (const line of lines) {
      const match = line.match(/gem\s+["']?([^"'\s,]+)/);
      if (match) {
        dependencies.push(match[1]);
      }
    }
    
    return dependencies;
  }
}

