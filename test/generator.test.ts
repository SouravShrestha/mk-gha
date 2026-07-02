import { describe, expect, it } from 'vitest';
import { getGeneratedFiles } from '../src/generator.js';

describe('generator', () => {
  describe('getGeneratedFiles', () => {
    it('returns standard files', () => {
      const files = getGeneratedFiles('/test/dir');
      expect(files.length).toBe(4); // 2 workflows + 2 release-please configs
      expect(files.map(f => f.outputPath)).toContain('/test/dir/.github/workflows/ci-main.yml');
    });
  });
});
