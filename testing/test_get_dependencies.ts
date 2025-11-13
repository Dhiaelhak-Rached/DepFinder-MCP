import { getDependencies } from '../mcp/tools/get_dependencies/index.js';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Test script for get_dependencies tool
 * Tests dependency extraction functionality for multiple languages using the tool's entry point
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testGetDependencies() {
  console.log('='.repeat(60));
  console.log('Testing get_dependencies Tool');
  console.log('='.repeat(60));
  console.log();

  // Paths to testing projects
  const pythonProjectPath = path.join(
    __dirname,
    'get_dependencies_testing',
    'pythontesting'
  );

  const nodeProjectPath = path.join(
    __dirname,
    'get_dependencies_testing',
    'nodetesting'
  );

  const rubyProjectPath = path.join(
    __dirname,
    'get_dependencies_testing',
    'rubytesting'
  );

  const goProjectPath = path.join(
    __dirname,
    'get_dependencies_testing',
    'gotesting'
  );

  const javaProjectPath = path.join(
    __dirname,
    'get_dependencies_testing',
    'javatesting'
  );

  const rustProjectPath = path.join(
    __dirname,
    'get_dependencies_testing',
    'rusttesting'
  );

  try {
    // Test 1: Python project
    console.log('Test 1: Python project');
    console.log('-'.repeat(60));
    console.log(`Testing project path: ${pythonProjectPath}`);
    const pythonResult = await getDependencies(pythonProjectPath);
    const pythonData = JSON.parse(pythonResult.content[0].text);
    
    console.log('Result:');
    console.log(JSON.stringify(pythonData, null, 2));
    console.log();

    // Test 2: Node.js project
    console.log('Test 2: Node.js project');
    console.log('-'.repeat(60));
    console.log(`Testing project path: ${nodeProjectPath}`);
    const nodeResult = await getDependencies(nodeProjectPath);
    const nodeData = JSON.parse(nodeResult.content[0].text);
    
    console.log('Result:');
    console.log(JSON.stringify(nodeData, null, 2));
    console.log();

    // Test 3: Ruby project
    console.log('Test 3: Ruby project');
    console.log('-'.repeat(60));
    console.log(`Testing project path: ${rubyProjectPath}`);
    const rubyResult = await getDependencies(rubyProjectPath);
    const rubyData = JSON.parse(rubyResult.content[0].text);
    
    console.log('Result:');
    console.log(JSON.stringify(rubyData, null, 2));
    console.log();

    // Test 4: Go project
    console.log('Test 4: Go project');
    console.log('-'.repeat(60));
    console.log(`Testing project path: ${goProjectPath}`);
    const goResult = await getDependencies(goProjectPath);
    const goData = JSON.parse(goResult.content[0].text);
    
    console.log('Result:');
    console.log(JSON.stringify(goData, null, 2));
    console.log();

    // Test 5: Java project
    console.log('Test 5: Java project');
    console.log('-'.repeat(60));
    console.log(`Testing project path: ${javaProjectPath}`);
    const javaResult = await getDependencies(javaProjectPath);
    const javaData = JSON.parse(javaResult.content[0].text);
    
    console.log('Result:');
    console.log(JSON.stringify(javaData, null, 2));
    console.log();

    // Test 6: Rust project
    console.log('Test 6: Rust project');
    console.log('-'.repeat(60));
    console.log(`Testing project path: ${rustProjectPath}`);
    const rustResult = await getDependencies(rustProjectPath);
    const rustData = JSON.parse(rustResult.content[0].text);
    
    console.log('Result:');
    console.log(JSON.stringify(rustData, null, 2));
    console.log();

    // Summary
    console.log('='.repeat(60));
    console.log('Test Summary');
    console.log('='.repeat(60));
    
    console.log('Python Project:');
    console.log(`  Language: ${pythonData.language || 'Not detected'}`);
    console.log(`  Dependencies: ${pythonData.dependencies?.length || 0}`);
    console.log(`  Dev Dependencies: ${pythonData.devDependencies?.length || 0}`);
    console.log(`  Lock File: ${pythonData.lockFile?.path || 'None'}`);
    console.log();

    console.log('Node.js Project:');
    console.log(`  Language: ${nodeData.language || 'Not detected'}`);
    console.log(`  Dependencies: ${nodeData.dependencies?.length || 0}`);
    console.log(`  Dev Dependencies: ${nodeData.devDependencies?.length || 0}`);
    console.log(`  Peer Dependencies: ${nodeData.peerDependencies?.length || 0}`);
    console.log(`  Optional Dependencies: ${nodeData.optionalDependencies?.length || 0}`);
    console.log(`  Lock File: ${nodeData.lockFile?.path || 'None'}`);
    console.log();

    console.log('Ruby Project:');
    console.log(`  Language: ${rubyData.language || 'Not detected'}`);
    console.log(`  Dependencies: ${rubyData.dependencies?.length || 0}`);
    console.log(`  Dev Dependencies: ${rubyData.devDependencies?.length || 0}`);
    console.log(`  Lock File: ${rubyData.lockFile?.path || 'None'}`);
    console.log();

    console.log('Go Project:');
    console.log(`  Language: ${goData.language || 'Not detected'}`);
    console.log(`  Dependencies: ${goData.dependencies?.length || 0}`);
    console.log(`  Lock File: ${goData.lockFile?.path || 'None'}`);
    console.log();

    console.log('Java Project:');
    console.log(`  Language: ${javaData.language || 'Not detected'}`);
    console.log(`  Dependencies: ${javaData.dependencies?.length || 0}`);
    console.log(`  Dev Dependencies: ${javaData.devDependencies?.length || 0}`);
    console.log(`  Lock File: ${javaData.lockFile?.path || 'None'}`);
    console.log();

    console.log('Rust Project:');
    console.log(`  Language: ${rustData.language || 'Not detected'}`);
    console.log(`  Dependencies: ${rustData.dependencies?.length || 0}`);
    console.log(`  Dev Dependencies: ${rustData.devDependencies?.length || 0}`);
    console.log(`  Lock File: ${rustData.lockFile?.path || 'None'}`);
    console.log('='.repeat(60));

    // Detailed dependency lists
    console.log();
    console.log('='.repeat(60));
    console.log('Detailed Dependency Lists');
    console.log('='.repeat(60));
    
    if (pythonData.dependencies && pythonData.dependencies.length > 0) {
      console.log('\nPython Dependencies:');
      pythonData.dependencies.forEach((dep: any) => {
        console.log(`  - ${dep.name}${dep.version ? ` (${dep.version})` : ''}${dep.versionConstraint ? ` [${dep.versionConstraint}]` : ''}`);
      });
    }

    if (nodeData.dependencies && nodeData.dependencies.length > 0) {
      console.log('\nNode.js Runtime Dependencies:');
      nodeData.dependencies.forEach((dep: any) => {
        console.log(`  - ${dep.name}${dep.version ? ` (${dep.version})` : ''}${dep.versionConstraint ? ` [${dep.versionConstraint}]` : ''}`);
      });
    }

    if (nodeData.devDependencies && nodeData.devDependencies.length > 0) {
      console.log('\nNode.js Dev Dependencies:');
      nodeData.devDependencies.forEach((dep: any) => {
        console.log(`  - ${dep.name}${dep.version ? ` (${dep.version})` : ''}${dep.versionConstraint ? ` [${dep.versionConstraint}]` : ''}`);
      });
    }

    if (rubyData.dependencies && rubyData.dependencies.length > 0) {
      console.log('\nRuby Dependencies:');
      rubyData.dependencies.forEach((dep: any) => {
        console.log(`  - ${dep.name}${dep.version ? ` (${dep.version})` : ''}${dep.versionConstraint ? ` [${dep.versionConstraint}]` : ''}`);
      });
    }

    if (goData.dependencies && goData.dependencies.length > 0) {
      console.log('\nGo Dependencies:');
      goData.dependencies.forEach((dep: any) => {
        console.log(`  - ${dep.name}${dep.version ? ` (${dep.version})` : ''}${dep.versionConstraint ? ` [${dep.versionConstraint}]` : ''}`);
      });
    }

    if (javaData.dependencies && javaData.dependencies.length > 0) {
      console.log('\nJava Dependencies:');
      javaData.dependencies.forEach((dep: any) => {
        console.log(`  - ${dep.name}${dep.version ? ` (${dep.version})` : ''}${dep.versionConstraint ? ` [${dep.versionConstraint}]` : ''}`);
      });
    }

    if (rustData.dependencies && rustData.dependencies.length > 0) {
      console.log('\nRust Dependencies:');
      rustData.dependencies.forEach((dep: any) => {
        console.log(`  - ${dep.name}${dep.version ? ` (${dep.version})` : ''}${dep.versionConstraint ? ` [${dep.versionConstraint}]` : ''}`);
      });
    }

    if (rustData.devDependencies && rustData.devDependencies.length > 0) {
      console.log('\nRust Dev Dependencies:');
      rustData.devDependencies.forEach((dep: any) => {
        console.log(`  - ${dep.name}${dep.version ? ` (${dep.version})` : ''}${dep.versionConstraint ? ` [${dep.versionConstraint}]` : ''}`);
      });
    }

    console.log('\n' + '='.repeat(60));

  } catch (error) {
    console.error('Error during testing:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
  }
}

// Run the test
testGetDependencies().catch(console.error);

