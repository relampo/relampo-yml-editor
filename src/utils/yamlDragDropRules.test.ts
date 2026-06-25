import { describe, expect, it } from 'vitest';
import { canContain, canDrop, getValidDropTargets, validateTreeStructure } from './yamlDragDropRules';

describe('yamlDragDropRules', () => {
  it('allows parallel controllers to contain step-level children', () => {
    expect(canContain('parallel', 'get')).toBe(true);
    expect(canContain('parallel', 'group')).toBe(true);
    expect(canContain('parallel', 'retry')).toBe(true);
  });

  it('accepts inside drops into parallel controllers', () => {
    expect(canDrop('get', 'parallel', 'inside')).toBe(true);
    expect(canDrop('loop', 'parallel', 'inside')).toBe(true);
  });

  it('reports parallel as a valid container for step-level targets', () => {
    const targets = getValidDropTargets('get');
    expect(targets.containers).toContain('parallel');
  });

  it('treats populated parallel nodes as valid tree structure', () => {
    const result = validateTreeStructure({
      type: 'parallel',
      children: [{ type: 'get' }],
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  describe('balanced controller containment (RLP-475)', () => {
    it('rejects think_time as a direct balanced child', () => {
      expect(canContain('balanced', 'think_time')).toBe(false);
    });

    it('rejects sql as a direct balanced child', () => {
      expect(canContain('balanced', 'sql')).toBe(false);
    });

    it('blocks dropping think_time inside a balanced controller', () => {
      expect(canDrop('think_time', 'balanced', 'inside')).toBe(false);
    });

    it('blocks dropping sql inside a balanced controller', () => {
      expect(canDrop('sql', 'balanced', 'inside')).toBe(false);
    });

    it('does not list balanced as a valid container for think_time', () => {
      const targets = getValidDropTargets('think_time');
      expect(targets.containers).not.toContain('balanced');
    });

    it('allows valid step types inside balanced', () => {
      expect(canContain('balanced', 'get')).toBe(true);
      expect(canContain('balanced', 'post')).toBe(true);
      expect(canContain('balanced', 'group')).toBe(true);
      expect(canContain('balanced', 'transaction')).toBe(true);
      expect(canContain('balanced', 'loop')).toBe(true);
      expect(canContain('balanced', 'retry')).toBe(true);
    });
  });
});
