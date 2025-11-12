#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

/**
 * Main MCP server for DepFinder
 * Provides tools for analyzing project dependencies and compatibility
 */
const server = new Server(
  {
    name: 'depfinder-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'get_language_info',
        description: 'Detect programming language and runtime version from project files',
        inputSchema: {
          type: 'object',
          properties: {
            projectPath: {
              type: 'string',
              description: 'Path to the project directory',
            },
          },
          required: ['projectPath'],
        },
      },
      {
        name: 'get_dependencies',
        description: 'Extract and list all dependencies from project files',
        inputSchema: {
          type: 'object',
          properties: {
            projectPath: {
              type: 'string',
              description: 'Path to the project directory',
            },
          },
          required: ['projectPath'],
        },
      },
      {
        name: 'search_compatible_versions',
        description: 'Find compatible versions for a given dependency',
        inputSchema: {
          type: 'object',
          properties: {
            packageName: {
              type: 'string',
              description: 'Name of the package to search',
            },
            currentVersion: {
              type: 'string',
              description: 'Current version of the package',
            },
            language: {
              type: 'string',
              description: 'Programming language/runtime',
            },
          },
          required: ['packageName', 'language'],
        },
      },
      {
        name: 'generate_requirements',
        description: 'Generate a requirements file with compatible dependencies',
        inputSchema: {
          type: 'object',
          properties: {
            projectPath: {
              type: 'string',
              description: 'Path to the project directory',
            },
            outputPath: {
              type: 'string',
              description: 'Path where to save the requirements file',
            },
          },
          required: ['projectPath'],
        },
      },
      {
        name: 'verify_compatibility',
        description: 'Verify compatibility between dependencies',
        inputSchema: {
          type: 'object',
          properties: {
            dependencies: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  version: { type: 'string' },
                },
              },
              description: 'List of dependencies to verify',
            },
            language: {
              type: 'string',
              description: 'Programming language/runtime',
            },
          },
          required: ['dependencies', 'language'],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  // Validate args is defined
  if (!args) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ error: 'Missing arguments' }, null, 2),
        },
      ],
    };
  }

  try {
    switch (name) {
      case 'get_language_info': {
        // Import and call the tool implementation
        const { getLanguageInfo } = await import('../mcp/tools/get_language_info/index.js');
        const projectPath = typeof args.projectPath === 'string' ? args.projectPath : '';
        if (!projectPath) {
          throw new Error('projectPath is required');
        }
        return await getLanguageInfo(projectPath);
      }

      case 'get_dependencies': {
        const { getDependencies } = await import('../mcp/tools/get_dependencies/index.js');
        const projectPath = typeof args.projectPath === 'string' ? args.projectPath : '';
        if (!projectPath) {
          throw new Error('projectPath is required');
        }
        return await getDependencies(projectPath);
      }

      case 'search_compatible_versions': {
        const { searchCompatibleVersions } = await import('../mcp/tools/search_compatible_versions/index.js');
        const packageName = typeof args.packageName === 'string' ? args.packageName : '';
        const currentVersion = typeof args.currentVersion === 'string' ? args.currentVersion : undefined;
        const language = typeof args.language === 'string' ? args.language : '';
        if (!packageName || !language) {
          throw new Error('packageName and language are required');
        }
        return await searchCompatibleVersions(packageName, currentVersion, language);
      }

      case 'generate_requirements': {
        const { generateRequirements } = await import('../mcp/tools/generate_requirements/index.js');
        const projectPath = typeof args.projectPath === 'string' ? args.projectPath : '';
        const outputPath = typeof args.outputPath === 'string' ? args.outputPath : undefined;
        if (!projectPath) {
          throw new Error('projectPath is required');
        }
        return await generateRequirements(projectPath, outputPath);
      }

      case 'verify_compatibility': {
        const { verifyCompatibility } = await import('../mcp/tools/verify_compatibility/index.js');
        const dependencies = Array.isArray(args.dependencies) 
          ? args.dependencies.filter((dep: unknown): dep is { name: string; version: string } => 
              typeof dep === 'object' && 
              dep !== null && 
              'name' in dep && 
              'version' in dep &&
              typeof (dep as { name: unknown }).name === 'string' &&
              typeof (dep as { version: unknown }).version === 'string'
            )
          : [];
        const language = typeof args.language === 'string' ? args.language : '';
        if (!dependencies.length || !language) {
          throw new Error('dependencies and language are required');
        }
        return await verifyCompatibility(dependencies, language);
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
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
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('DepFinder MCP server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
