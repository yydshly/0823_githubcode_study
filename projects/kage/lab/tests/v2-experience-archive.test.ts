import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { V2_EXPERIENCE_ARCHIVE } from '../src/v2/experience-archive.ts';

const root = path.resolve(import.meta.dirname, '..');

describe('V2 experience archive', () => {
  it('keeps a bounded set of verified mood and multimodal studies', () => {
    expect(V2_EXPERIENCE_ARCHIVE).toHaveLength(12);
    expect(new Set(V2_EXPERIENCE_ARCHIVE.map((item) => item.id)).size).toBe(12);
    expect(V2_EXPERIENCE_ARCHIVE.every((item) => item.status === 'research-reference')).toBe(true);
    expect(V2_EXPERIENCE_ARCHIVE.map((item) => item.id)).not.toContain('fridge-tonight');
    expect(V2_EXPERIENCE_ARCHIVE.map((item) => item.id)).not.toContain('modular-room-sound');
    expect(V2_EXPERIENCE_ARCHIVE.map((item) => item.id)).not.toContain('aurora-radio-postcard');
    expect(V2_EXPERIENCE_ARCHIVE.map((item) => item.id)).not.toContain('same-table-tonight');
    expect(V2_EXPERIENCE_ARCHIVE.map((item) => item.id)).toContain('thunderhead-score');
    expect(V2_EXPERIENCE_ARCHIVE.map((item) => item.id)).toContain('sea-fiber-scope');
    expect(V2_EXPERIENCE_ARCHIVE.map((item) => item.id)).toContain('sonic-pressing-room');
    expect(V2_EXPERIENCE_ARCHIVE.map((item) => item.id)).toContain('windborne-letter-valley');
    expect(V2_EXPERIENCE_ARCHIVE.map((item) => item.id)).toContain('lighthouse-chart-reveal');
    expect(V2_EXPERIENCE_ARCHIVE.map((item) => item.id)).not.toContain('ten-second-callsign-decode');
  });

  it('binds every archive card to its final delivery and its own browser evidence', () => {
    for (const item of V2_EXPERIENCE_ARCHIVE) {
      const routeIndex = path.join(root, item.route.replace(/^\//, ''), 'index.html');
      const preview = path.join(root, 'public', item.previewUrl.replace(/^\/creative-assets\//, 'creative-assets/'));

      expect(fs.existsSync(routeIndex), `${item.id} route`).toBe(true);
      expect(fs.existsSync(preview), `${item.id} preview`).toBe(true);
      expect(fs.statSync(preview).size, `${item.id} preview bytes`).toBeGreaterThan(50_000);
    }
  });
});
