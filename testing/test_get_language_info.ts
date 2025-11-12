import { getLanguageInfo } from '../mcp/tools/get_language_info/index.js';
import { PythonDetector } from '../mcp/tools/get_language_info/detectors/python.js';
import { NodeJSDetector } from '../mcp/tools/get_language_info/detectors/nodejs.js';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Test script for get_language_info tool
 * Tests Python and Node.js language detection functionality
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testGetLanguageInfo() {
  console.log('='.repeat(60));
  console.log('Testing get_language_info Tool');
  console.log('='.repeat(60));
  console.log();

  // Path to the Python testing project
  const pythonProjectPath = path.join(
    __dirname,
    'get_language_info_testing',
    'pythontesting'
  );

  // Path to the Node.js testing project
  const nodeProjectPath = path.join(
    __dirname,
    'get_language_info_testing',
    'nodetesting'
  );

  try {
    // Test 1: Python project with getLanguageInfo function
    console.log('Test 1: Python project with getLanguageInfo function');
    console.log('-'.repeat(60));
    console.log(`Testing project path: ${pythonProjectPath}`);
    const pythonResult = await getLanguageInfo(pythonProjectPath);
    
    console.log('Result:');
    console.log(JSON.stringify(JSON.parse(pythonResult.content[0].text), null, 2));
    console.log();

    // Test 2: Python project with PythonDetector directly
    console.log('Test 2: Python project with PythonDetector directly');
    console.log('-'.repeat(60));
    const pythonDetector = new PythonDetector();
    const pythonDetectorResult = await pythonDetector.detect(pythonProjectPath, {
      cacheEnabled: false,
    });

    console.log('PythonDetector Result:');
    const pythonResultDisplay = {
      language: pythonDetectorResult.language,
      runtimeVersion: pythonDetectorResult.runtimeVersion || undefined,
      framework: pythonDetectorResult.framework || undefined,
      confidence: pythonDetectorResult.confidence
    };
    console.log(JSON.stringify(pythonResultDisplay, null, 2));
    console.log();

    // Test 3: Node.js project with getLanguageInfo function
    console.log('Test 3: Node.js project with getLanguageInfo function');
    console.log('-'.repeat(60));
    console.log(`Testing project path: ${nodeProjectPath}`);
    const nodeResult = await getLanguageInfo(nodeProjectPath);
    
    console.log('Result:');
    console.log(JSON.stringify(JSON.parse(nodeResult.content[0].text), null, 2));
    console.log();

    // Test 4: Node.js project with NodeJSDetector directly
    console.log('Test 4: Node.js project with NodeJSDetector directly');
    console.log('-'.repeat(60));
    const nodeDetector = new NodeJSDetector();
    const nodeDetectorResult = await nodeDetector.detect(nodeProjectPath, {
      cacheEnabled: false,
    });

    console.log('NodeJSDetector Result:');
    const nodeResultDisplay = {
      language: nodeDetectorResult.language,
      runtimeVersion: nodeDetectorResult.runtimeVersion || undefined,
      framework: nodeDetectorResult.framework || undefined,
      confidence: nodeDetectorResult.confidence
    };
    console.log(JSON.stringify(nodeResultDisplay, null, 2));
    console.log();

    // Summary
    console.log('='.repeat(60));
    console.log('Test Summary');
    console.log('='.repeat(60));
    
    console.log('Python Project:');
    console.log(`  Language detected: ${pythonDetectorResult.language}`);
    console.log(`  Runtime version: ${pythonDetectorResult.runtimeVersion || 'Not detected'}`);
    console.log(`  Framework: ${pythonDetectorResult.framework || 'Not detected'}`);
    console.log(`  Confidence: ${pythonDetectorResult.confidence}`);
    console.log();
    
    console.log('Node.js Project:');
    console.log(`  Language detected: ${nodeDetectorResult.language}`);
    console.log(`  Runtime version: ${nodeDetectorResult.runtimeVersion || 'Not detected'}`);
    console.log(`  Framework: ${nodeDetectorResult.framework || 'Not detected'}`);
    console.log(`  Confidence: ${nodeDetectorResult.confidence}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('Error during testing:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
  }
}

// Run the test
testGetLanguageInfo().catch(console.error);

