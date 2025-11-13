import { getLanguageInfo } from '../mcp/tools/get_language_info/index.js';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Test script for get_language_info tool
 * Tests Python and Node.js language detection functionality using the tool's entry point
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

  // Path to the Ruby testing project
  const rubyProjectPath = path.join(
    __dirname,
    'get_language_info_testing',
    'rubytesting'
  );

  try {
    // Test 1: Python project
    console.log('Test 1: Python project');
    console.log('-'.repeat(60));
    console.log(`Testing project path: ${pythonProjectPath}`);
    const pythonResult = await getLanguageInfo(pythonProjectPath);
    const pythonData = JSON.parse(pythonResult.content[0].text);
    
    console.log('Result:');
    console.log(JSON.stringify(pythonData, null, 2));
    console.log();

    // Test 2: Node.js project
    console.log('Test 2: Node.js project');
    console.log('-'.repeat(60));
    console.log(`Testing project path: ${nodeProjectPath}`);
    const nodeResult = await getLanguageInfo(nodeProjectPath);
    const nodeData = JSON.parse(nodeResult.content[0].text);
    
    console.log('Result:');
    console.log(JSON.stringify(nodeData, null, 2));
    console.log();

    // Test 3: Ruby project
    console.log('Test 3: Ruby project');
    console.log('-'.repeat(60));
    console.log(`Testing project path: ${rubyProjectPath}`);
    const rubyResult = await getLanguageInfo(rubyProjectPath);
    const rubyData = JSON.parse(rubyResult.content[0].text);
    
    console.log('Result:');
    console.log(JSON.stringify(rubyData, null, 2));
    console.log();

    // Summary
    console.log('='.repeat(60));
    console.log('Test Summary');
    console.log('='.repeat(60));
    
    console.log('Python Project:');
    console.log(`  Language detected: ${pythonData.language || 'Not detected'}`);
    console.log(`  Runtime version: ${pythonData.runtimeVersion || 'Not detected'}`);
    console.log(`  Framework: ${pythonData.framework || 'Not detected'}`);
    console.log(`  Confidence: ${pythonData.confidence || 0}`);
    console.log();
    
    console.log('Node.js Project:');
    console.log(`  Language detected: ${nodeData.language || 'Not detected'}`);
    console.log(`  Runtime version: ${nodeData.runtimeVersion || 'Not detected'}`);
    console.log(`  Framework: ${nodeData.framework || 'Not detected'}`);
    console.log(`  Confidence: ${nodeData.confidence || 0}`);
    console.log();
    
    console.log('Ruby Project:');
    console.log(`  Language detected: ${rubyData.language || 'Not detected'}`);
    console.log(`  Runtime version: ${rubyData.runtimeVersion || 'Not detected'}`);
    console.log(`  Framework: ${rubyData.framework || 'Not detected'}`);
    console.log(`  Confidence: ${rubyData.confidence || 0}`);
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

