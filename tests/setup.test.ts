describe('DepFinder MCP Server Setup', () => {
  test('should be able to import utility functions', async () => {
    const { fileExists, readJsonFile } = await import('../mcp/utils/fileSystem');
    expect(typeof fileExists).toBe('function');
    expect(typeof readJsonFile).toBe('function');
  });

  test('should be able to import cache utilities', async () => {
    const { FileCache, defaultCache } = await import('../mcp/utils/cache');
    expect(typeof FileCache).toBe('function');
    expect(defaultCache).toBeInstanceOf(FileCache);
  });
});
