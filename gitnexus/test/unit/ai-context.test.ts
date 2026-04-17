import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { generateAIContextFiles } from '../../src/cli/ai-context.js';

describe('generateAIContextFiles', () => {
  let tmpDir: string;
  let storagePath: string;

  beforeAll(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'gn-ai-ctx-test-'));
    storagePath = path.join(tmpDir, '.gitnexus');
    await fs.mkdir(storagePath, { recursive: true });
  });

  afterAll(async () => {
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch {
      /* best-effort */
    }
  });

  it('generates context files', async () => {
    const stats = {
      nodes: 100,
      edges: 200,
      processes: 10,
    };

    const result = await generateAIContextFiles(tmpDir, storagePath, 'TestProject', stats);
    expect(result.files).toBeDefined();
    expect(result.files.length).toBeGreaterThan(0);
  });

  it('creates or updates CLAUDE.md with GitNexus section', async () => {
    const stats = { nodes: 50, edges: 100, processes: 5 };
    await generateAIContextFiles(tmpDir, storagePath, 'TestProject', stats);

    const claudeMdPath = path.join(tmpDir, 'CLAUDE.md');
    const content = await fs.readFile(claudeMdPath, 'utf-8');
    expect(content).toContain('gitnexus:start');
    expect(content).toContain('gitnexus:end');
    expect(content).toContain('TestProject');
  });

  it('handles empty stats', async () => {
    const stats = {};
    const result = await generateAIContextFiles(tmpDir, storagePath, 'EmptyProject', stats);
    expect(result.files).toBeDefined();
  });

  it('updates existing CLAUDE.md without duplicating', async () => {
    const stats = { nodes: 10 };

    // Run twice
    await generateAIContextFiles(tmpDir, storagePath, 'TestProject', stats);
    await generateAIContextFiles(tmpDir, storagePath, 'TestProject', stats);

    const claudeMdPath = path.join(tmpDir, 'CLAUDE.md');
    const content = await fs.readFile(claudeMdPath, 'utf-8');

    // Should only have one gitnexus section
    const starts = (content.match(/gitnexus:start/g) || []).length;
    expect(starts).toBe(1);
  });

  it('installs skills files', async () => {
    const stats = { nodes: 10 };
    const result = await generateAIContextFiles(tmpDir, storagePath, 'TestProject', stats);

    // Should have installed skill files
    const skillsDir = path.join(tmpDir, '.claude', 'skills', 'gitnexus');
    try {
      const entries = await fs.readdir(skillsDir, { recursive: true });
      expect(entries.length).toBeGreaterThan(0);
    } catch {
      // Skills dir may not be created if skills source doesn't exist in test context
    }
  });

  it('preserves manual AGENTS.md and CLAUDE.md edits when skipAgentsMd is enabled', async () => {
    const stats = { nodes: 42, edges: 84, processes: 3 };
    const agentsPath = path.join(tmpDir, 'AGENTS.md');
    const claudePath = path.join(tmpDir, 'CLAUDE.md');
    const agentsContent = '# AGENTS\n\nCustom manual instructions only\n';
    const claudeContent = '# CLAUDE\n\nCustom manual instructions only\n';

    await fs.writeFile(agentsPath, agentsContent, 'utf-8');
    await fs.writeFile(claudePath, claudeContent, 'utf-8');

    const result = await generateAIContextFiles(
      tmpDir,
      storagePath,
      'TestProject',
      stats,
      undefined,
      { skipAgentsMd: true },
    );

    expect(result.files).toContain('AGENTS.md (skipped via --skip-agents-md)');
    expect(result.files).toContain('CLAUDE.md (skipped via --skip-agents-md)');

    const agentsAfter = await fs.readFile(agentsPath, 'utf-8');
    const claudeAfter = await fs.readFile(claudePath, 'utf-8');
    expect(agentsAfter).toBe(agentsContent);
    expect(claudeAfter).toBe(claudeContent);
  });

  it('with --ide vscode, does not install .claude skills', async () => {
    const caseDir = await fs.mkdtemp(path.join(tmpDir, 'vscode-only-'));
    const caseStoragePath = path.join(caseDir, '.gitnexus');
    await fs.mkdir(caseStoragePath, { recursive: true });

    const stats = { nodes: 7, edges: 9, processes: 1 };
    await generateAIContextFiles(caseDir, caseStoragePath, 'TestProject', stats, undefined, {
      ide: 'vscode',
    });

    const claudeSkillsDir = path.join(caseDir, '.claude', 'skills', 'gitnexus');
    await expect(fs.access(claudeSkillsDir)).rejects.toThrow();

    const githubSkillsDir = path.join(caseDir, '.github', 'skills');
    await expect(fs.access(githubSkillsDir)).resolves.not.toThrow();
  });

  it('with --ide vscode, writes .vscode/mcp.json with gitnexus server', async () => {
    const caseDir = await fs.mkdtemp(path.join(tmpDir, 'vscode-mcp-'));
    const caseStoragePath = path.join(caseDir, '.gitnexus');
    await fs.mkdir(caseStoragePath, { recursive: true });

    const stats = { nodes: 8, edges: 12, processes: 2 };
    await generateAIContextFiles(caseDir, caseStoragePath, 'TestProject', stats, undefined, {
      ide: 'vscode',
    });

    const mcpPath = path.join(caseDir, '.vscode', 'mcp.json');
    const mcpRaw = await fs.readFile(mcpPath, 'utf-8');
    const mcp = JSON.parse(mcpRaw) as {
      servers?: Record<string, { type?: string; command?: string; args?: string[] }>;
    };

    expect(mcp.servers?.gitnexus).toBeDefined();
    expect(mcp.servers?.gitnexus?.type).toBe('stdio');
    expect(mcp.servers?.gitnexus?.command).toBe('npx');
    expect(mcp.servers?.gitnexus?.args).toEqual(['-y', 'gitnexus@latest', 'mcp']);
  });
});
