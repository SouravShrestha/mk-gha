import { describe, expect, it, vi, afterEach } from 'vitest';
import { detectAppName, detectNodeVersion, detectProjectType } from '../src/detector.js';
import fs from 'node:fs';

vi.mock('node:fs');

describe('detector', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('detectAppName', () => {
    it('returns package name if exists', () => {
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ name: 'my-cool-app' }));
      expect(detectAppName('/fake/dir')).toBe('my-cool-app');
    });

    it('returns directory name as fallback', () => {
      vi.mocked(fs.readFileSync).mockImplementation(() => { throw new Error('ENOENT'); });
      expect(detectAppName('/fake/dir')).toBe('dir');
    });
  });

  describe('detectNodeVersion', () => {
    it('returns highest version from engines', () => {
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ engines: { node: '18 || 20' } }));
      expect(detectNodeVersion('/fake/dir')).toBe('20');
    });

    it('handles exact versions', () => {
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ engines: { node: '^22.0.0' } }));
      expect(detectNodeVersion('/fake/dir')).toBe('22');
    });
  });

  describe('detectProjectType', () => {
    it('detects nextjs', () => {
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ dependencies: { next: '14.0.0' } }));
      expect(detectProjectType('/fake/dir')).toBe('nextjs');
    });
    it('detects react', () => {
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ dependencies: { react: '18.0.0' } }));
      expect(detectProjectType('/fake/dir')).toBe('react');
    });
  });
});
