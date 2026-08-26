import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

async function sourceFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(root, entry.name);
    return entry.isDirectory() ? sourceFiles(fullPath) : [fullPath];
  }));
  return files.flat();
}

describe('clean implementation boundary', () => {
  it('does not import or fetch assets from the research reference', async () => {
    const root = path.resolve(import.meta.dirname, '..');
    const files = [path.join(root, 'index.html'), ...(await sourceFiles(path.join(root, 'src')))];
    const prohibited = [
      /\.\.\/upstream/i,
      /\/upstream\//i,
      /three\.min\.js/i,
      /Gandalf/i,
      /NotoSerifJP/i,
      /img-(hero|sanmon|gardens|craft|afterlight)/i
    ];
    for (const file of files) {
      const content = await readFile(file, 'utf8');
      prohibited.forEach((pattern) => expect(content, `${file} contains ${pattern}`).not.toMatch(pattern));
    }
  });
});
