import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Check if a file exists
 * @param filePath Path to the file
 * @returns True if file exists, false otherwise
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Read a JSON file and parse it
 * @param filePath Path to the JSON file
 * @returns Parsed JSON object
 */
export async function readJsonFile(filePath: string): Promise<Record<string, unknown>> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to read or parse JSON file ${filePath}: ${error}`);
  }
}

/**
 * Write data to a JSON file
 * @param filePath Path to the JSON file
 * @param data Data to write
 */
export async function writeJsonFile(filePath: string, data: Record<string, unknown>): Promise<void> {
  try {
    const content = JSON.stringify(data, null, 2);
    await fs.writeFile(filePath, content, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to write JSON file ${filePath}: ${error}`);
  }
}

/**
 * Read a text file
 * @param filePath Path to the text file
 * @returns File content as string
 */
export async function readTextFile(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to read file ${filePath}: ${error}`);
  }
}

/**
 * Write content to a text file
 * @param filePath Path to the text file
 * @param content Content to write
 */
export async function writeTextFile(filePath: string, content: string): Promise<void> {
  try {
    await fs.writeFile(filePath, content, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to write file ${filePath}: ${error}`);
  }
}

/**
 * Check if a directory exists
 * @param dirPath Path to the directory
 * @returns True if directory exists, false otherwise
 */
export async function directoryExists(dirPath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(dirPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Create a directory if it doesn't exist
 * @param dirPath Path to the directory
 */
export async function ensureDirectoryExists(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    throw new Error(`Failed to create directory ${dirPath}: ${error}`);
  }
}

/**
 * List all files in a directory recursively
 * @param dirPath Path to the directory
 * @param extensions Optional array of file extensions to filter by
 * @returns Array of file paths
 */
export async function listFilesRecursively(
  dirPath: string,
  extensions?: string[]
): Promise<string[]> {
  const files: string[] = [];
  
  async function traverse(currentPath: string): Promise<void> {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      
      if (entry.isDirectory()) {
        await traverse(fullPath);
      } else if (entry.isFile()) {
        if (!extensions || extensions.includes(path.extname(entry.name))) {
          files.push(fullPath);
        }
      }
    }
  }
  
  await traverse(dirPath);
  return files;
}
